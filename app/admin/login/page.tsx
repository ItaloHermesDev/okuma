import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getOptionalAdmin } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Entrar",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <Suspense fallback={<p className="text-zinc-500">Carregando…</p>}>
        <LoginCard />
      </Suspense>
    </main>
  );
}

async function LoginCard() {
  const admin = await getOptionalAdmin();

  if (admin) {
    redirect("/admin");
  }

  return (
    <section className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-8 dark:border-white/10 dark:bg-zinc-950">
      <p className="text-sm font-medium text-zinc-500">Okuma</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">
        Área administrativa
      </h1>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        Acesso restrito a administradores.
      </p>
      <div className="mt-8">
        <LoginForm />
      </div>
    </section>
  );
}
