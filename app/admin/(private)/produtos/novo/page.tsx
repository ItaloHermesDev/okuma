import { ProductEditor } from "@/components/admin/product-editor";

export const metadata = { title: "Novo tênis" };

export default function NewProductPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-3xl font-semibold">Novo tênis</h1>
      <ProductEditor />
    </main>
  );
}
