export default function AppLoading() {
  return (
    <div className="px-10 py-10 max-w-6xl animate-pulse">
      <div className="h-3 w-24 bg-[var(--color-line)] rounded mb-3" />
      <div className="h-10 w-72 bg-[var(--color-line)] rounded mb-3" />
      <div className="h-4 w-48 bg-[var(--color-line)] rounded mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Card />
        <Card />
        <Card />
      </div>

      <div className="space-y-2">
        <Row />
        <Row />
        <Row />
      </div>
    </div>
  );
}

function Card() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-line)] rounded-2xl p-6">
      <div className="h-3 w-20 bg-[var(--color-line)] rounded mb-3" />
      <div className="h-9 w-16 bg-[var(--color-line)] rounded" />
    </div>
  );
}

function Row() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="w-11 h-11 rounded-full bg-[var(--color-line)] shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 bg-[var(--color-line)] rounded" />
        <div className="h-3 w-24 bg-[var(--color-line)] rounded" />
      </div>
    </div>
  );
}
