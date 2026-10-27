import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { ProductEditor } from "@/components/admin/product-editor";
import { removeProduct } from "@/app/admin/store-actions";
import { getAdminProduct } from "@/lib/store";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="px-6 py-10">Carregando tênis…</p>}>
      <Editor params={params} />
    </Suspense>
  );
}

async function Editor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getAdminProduct(Number(id));

  if (!product) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-8">
      <h1 className="text-3xl font-semibold">{product.name}</h1>
      <ProductEditor product={product} />
      <form action={removeProduct}>
        <input type="hidden" name="id" value={product.id} />
        <ConfirmSubmit label="Excluir tênis" message="Excluir este tênis da loja?" />
      </form>
    </main>
  );
}
