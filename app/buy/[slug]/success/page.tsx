import Link from "next/link";

export default async function SuccessPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="text-6xl mb-6">✓</div>
        <h1 className="text-3xl font-extrabold tracking-tight mb-3">Payment received</h1>
        <p className="text-[var(--color-muted)] mb-8">
          Your coach will reach out shortly to get you set up. Check your email for the receipt.
        </p>
        <Link href={`/buy/${slug}`} className="text-sm text-[var(--color-blue-glow)]">
          Back to packages
        </Link>
      </div>
    </main>
  );
}
