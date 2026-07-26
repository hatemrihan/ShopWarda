import Link from 'next/link';

export default function ProductNotFound() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Product not found</h1>
      <p className="mt-2 text-muted-foreground">
        This product doesn&apos;t exist or has been removed.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Browse Shop
      </Link>
    </div>
  );
}
