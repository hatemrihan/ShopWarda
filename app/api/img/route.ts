import { NextRequest, NextResponse } from 'next/server';
import { getCdnUrl, getPublicBucket } from '@/lib/storage/aws';
import { snapWidth } from '@/lib/images/widths';

/**
 * GET /api/img?url=<remote image>&w=<width>&q=<quality>
 *
 * Self-hosted replacement for `/_next/image` (see lib/images/loader.ts for
 * why). Resizes a catalogue image with sharp and hands it to the CDN with a
 * one-year cache lifetime, so each (image, width) pair is computed once.
 *
 * Deliberately strict about what it will fetch — this must not become an
 * open proxy.
 */

export const runtime = 'nodejs';

type Sharp = typeof import('sharp').default;

/**
 * sharp is a native module. It is loaded on first use rather than at import
 * time: a static import that fails to load (as it did on Vercel when libvips
 * was missing from the bundle) crashes the whole route with a 500 before any
 * of our code runs — every photo on the site then disappears. Loaded lazily,
 * a failure is caught and the original image is served instead.
 */
let sharpModule: Promise<Sharp | null> | null = null;

function loadSharp(): Promise<Sharp | null> {
  sharpModule ??= import('sharp')
    .then((mod) => (mod as unknown as { default?: Sharp }).default ?? (mod as unknown as Sharp))
    .catch((error) => {
      console.error('[GET /api/img] sharp unavailable — serving original images', error);
      return null;
    });
  return sharpModule;
}

/**
 * Send the browser straight to the original photo. Short cache, so the
 * resized version takes over again as soon as resizing works.
 */
function redirectToOriginal(source: URL): NextResponse {
  return NextResponse.redirect(source, {
    status: 307,
    headers: { 'Cache-Control': 'public, max-age=300' },
  });
}

const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 10_000;
const ONE_YEAR = 60 * 60 * 24 * 365;

/** Hosts we are willing to fetch from: our own bucket, our CDN, and Unsplash. */
function isAllowedSource(url: URL): boolean {
  if (url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();
  const bucket = getPublicBucket().toLowerCase();

  // <bucket>.s3.amazonaws.com and <bucket>.s3.<region>.amazonaws.com
  if (host.startsWith(`${bucket}.s3.`) && host.endsWith('.amazonaws.com')) return true;

  const cdn = getCdnUrl();
  if (cdn) {
    try {
      if (new URL(cdn).hostname.toLowerCase() === host) return true;
    } catch {
      /* malformed CLOUDFRONT_URL — ignore */
    }
  }

  return host === 'images.unsplash.com';
}

function passthrough(body: ArrayBuffer, contentType: string): NextResponse {
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': `public, max-age=${ONE_YEAR}, immutable`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const rawUrl = params.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'url is required' }, { status: 400 });
  }

  let source: URL;
  try {
    source = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!isAllowedSource(source)) {
    return NextResponse.json({ error: 'Source not allowed' }, { status: 400 });
  }

  const sharp = await loadSharp();
  if (!sharp) return redirectToOriginal(source);

  const width = snapWidth(Math.max(1, Number(params.get('w')) || 1200));
  const quality = Math.min(90, Math.max(40, Number(params.get('q')) || 75));

  let upstream: Response;
  try {
    upstream = await fetch(source, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // Never follow a redirect off the allow-listed host.
      redirect: 'error',
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch source image' }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'Source image unavailable' },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const contentType = upstream.headers.get('content-type')?.split(';')[0].trim() ?? '';
  if (!contentType.startsWith('image/') || contentType === 'image/svg+xml') {
    return NextResponse.json({ error: 'Unsupported media type' }, { status: 415 });
  }

  const declaredLength = Number(upstream.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_SOURCE_BYTES) {
    return NextResponse.json({ error: 'Source image too large' }, { status: 413 });
  }

  const original = await upstream.arrayBuffer();
  if (original.byteLength > MAX_SOURCE_BYTES) {
    return NextResponse.json({ error: 'Source image too large' }, { status: 413 });
  }

  // Animated GIFs are passed through; flattening them would drop the animation.
  if (contentType === 'image/gif') {
    return passthrough(original, contentType);
  }

  try {
    const accept = req.headers.get('accept') ?? '';
    const pipeline = sharp(Buffer.from(original), { failOn: 'none' })
      .rotate() // honour EXIF orientation before the metadata is stripped
      .resize({ width, withoutEnlargement: true });

    let output: Buffer;
    let outputType: string;

    if (accept.includes('image/webp')) {
      output = await pipeline.webp({ quality }).toBuffer();
      outputType = 'image/webp';
    } else if (contentType === 'image/png') {
      output = await pipeline.png({ compressionLevel: 9 }).toBuffer();
      outputType = 'image/png';
    } else {
      output = await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();
      outputType = 'image/jpeg';
    }

    return new NextResponse(new Uint8Array(output), {
      headers: {
        'Content-Type': outputType,
        // Upload keys are unique per file, so a given URL never changes.
        'Cache-Control': `public, max-age=${ONE_YEAR}, immutable`,
        'CDN-Cache-Control': `public, s-maxage=${ONE_YEAR}`,
        Vary: 'Accept',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    // A photo we cannot transform is still better shown than broken.
    console.error('[GET /api/img] transform failed, serving original', error);
    return passthrough(original, contentType);
  }
}
