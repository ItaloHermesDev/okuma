import type { ReactNode } from "react";
import { CartProvider } from "@/components/store/cart-provider";
import { StoreFooter } from "@/components/store/footer";
import { StoreHeader } from "@/components/store/header";
import { getStoreSettings } from "@/lib/store";

export default async function LojaLayout({ children }: { children: ReactNode }) {
  const settings = await getStoreSettings();

  return (
    <CartProvider>
      <div className="flex min-h-full flex-1 flex-col bg-black font-sans text-white">
        <StoreHeader />
        <div className="flex-1">{children}</div>
        <StoreFooter whatsapp={settings.whatsapp} />
      </div>
    </CartProvider>
  );
}
