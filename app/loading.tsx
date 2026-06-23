export default function RootLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center animate-pulse">
        <div className="h-7 w-56 bg-[var(--color-line)] rounded mx-auto mb-3" />
        <div className="h-4 w-44 bg-[var(--color-line)] rounded mx-auto" />
      </div>
    </div>
  );
}
