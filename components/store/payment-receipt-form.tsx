"use client";

import { useActionState } from "react";
import { sendPaymentReceipt } from "@/app/(loja)/actions";

function isImage(path: string) {
  return /\.(jpe?g|png|webp)$/i.test(path);
}

export function PaymentReceiptForm({
  code,
  receipt,
  locked,
}: {
  code: string;
  receipt: string | null;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(sendPaymentReceipt, {});

  return (
    <section className="mt-4 border border-white/10 p-5">
      <h2 className="text-lg font-semibold">Comprovante de pagamento</h2>
      {receipt ? (
        <div className="mt-4">
          {isImage(receipt) ? (
            <img src={receipt} alt="Comprovante de pagamento" className="max-h-80 w-full object-contain" />
          ) : (
            <a href={receipt} target="_blank" rel="noreferrer" className="text-[#f5c518]">
              Abrir comprovante
            </a>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-white/60">Nenhum comprovante enviado ainda.</p>
      )}
      {locked ? null : (
        <form action={action} className="mt-4 grid gap-3">
          <input type="hidden" name="code" value={code} />
          <label className="grid gap-2 text-sm" htmlFor="receipt">
            {receipt ? "Trocar comprovante" : "Enviar comprovante"}
            <input
              id="receipt"
              name="receipt"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
              className="text-sm"
            />
          </label>
          <p className="text-xs text-white/40">JPG, PNG, WebP ou PDF, até 5 MB.</p>
          {state.message ? (
            <p className="text-sm text-red-400" role="alert">
              {state.message}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="h-11 w-fit bg-[#f5c518] px-4 font-semibold text-black disabled:opacity-60"
          >
            {pending ? "Enviando…" : "Enviar comprovante"}
          </button>
        </form>
      )}
    </section>
  );
}
