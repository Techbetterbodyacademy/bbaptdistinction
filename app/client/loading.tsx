export default function ClientLoading() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10 animate-pulse">
      <div className="h-3 w-24 bg-[var(--color-line)] rounded mb-3" />
      <div className="h-9 w-64 bg-[var(--color-line)] rounded mb-3" />
      <div className="h-4 w-80 bg-[var(--color-line)] rounded mb-10" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <Card />
        <Card />
        <Card />
      </div>

      <div className="space-y-3">
        <Row />
        <Row />
      </div>
    </div>
  );
}

function Card() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5">
      <div className="h-3 w-16 bg-[var(--color-line)] rounded mb-2" />
      <div className="h-7 w-20 bg-[var(--color-line)] rounded" />
    </div>
  );
}

function Row() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-xl p-5">
      <div className="h-4 w-40 bg-[var(--color-line)] rounded mb-3" />
      <div className="h-3 w-72 bg-[var(--color-line)] rounded" />
    </div>
  );
}
