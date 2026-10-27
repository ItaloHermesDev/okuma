import { Suspense, type ReactNode } from "react";
import { AdminNav } from "@/components/admin/nav";
import { getCurrentAdmin } from "@/lib/auth";

export const metadata = {
  title: "Admin",
};

export default function PrivateAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1 bg-zinc-50 font-sans text-zinc-950 dark:bg-black dark:text-zinc-50">
      <Suspense fallback={<AdminHeaderFallback />}>
        <AdminFrame>{children}</AdminFrame>
      </Suspense>
    </div>
  );
}

async function AdminFrame({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();

  return (
    <>
      <AdminNav name={admin.name} />
      <div className="min-w-0 flex-1 pt-14 md:pt-0">{children}</div>
    </>
  );
}

function AdminHeaderFallback() {
  return (
    <header className="border-b border-black/10 px-6 py-4 text-sm text-zinc-500 dark:border-white/10">
      Carregando sessão…
    </header>
  );
}
