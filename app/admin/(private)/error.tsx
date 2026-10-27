"use client";

export default function AdminError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="text-2xl font-semibold">Não foi possível abrir o painel</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="h-11 w-fit rounded-full bg-foreground px-5 font-medium text-background"
      >
        Tentar de novo
      </button>
    </main>
  );
}
