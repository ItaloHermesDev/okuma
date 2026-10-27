import { discountPercent, formatBrl, sellingPrice } from "@/lib/format";

export function PriceTag({
  price,
  salePrice,
  size = "md",
}: {
  price: number;
  salePrice: number | null;
  size?: "md" | "lg";
}) {
  const current = sellingPrice(price, salePrice);
  const discount = discountPercent(price, salePrice);

  return (
    <p className={`flex flex-wrap items-baseline gap-2 ${size === "lg" ? "text-2xl" : "text-base"}`}>
      <span className="font-semibold">{formatBrl(current)}</span>
      {discount != null ? (
        <>
          <span className="text-sm text-white/45 line-through">{formatBrl(price)}</span>
          <span className="text-sm font-medium text-[#f5c518]">-{discount}%</span>
        </>
      ) : null}
    </p>
  );
}
