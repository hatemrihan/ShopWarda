import Image from 'next/image';
import { WhoWeAreSection } from '@/components/sections/who-we-are';

export const metadata = {
  title: 'About — Warda',
  description:
    'Learn about Warda — our story, philosophy, and commitment to natural beauty.',
};

export default function AboutPage() {
  return (
    <div>
      {/* Who We Are */}
      <WhoWeAreSection />

      {/* Full-width hero image — edge-to-edge, no padding */}
      <section className="relative w-full bg-[#faf6f1]">
        <div className="mx-auto max-w-[1200px] px-4 md:px-8 pb-24 md:pb-32">
          <div className="relative aspect-[4/3] w-full overflow-hidden">
            <Image
              src="/images/Logo.with.bg.jpeg"
              alt="Warda — our story"
              fill
              priority
              className="object-cover"
              sizes="(max-width: 1200px) 100vw, 1200px"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
