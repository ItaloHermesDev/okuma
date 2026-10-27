export const SHOE_SIZES = [
  "34",
  "35",
  "36",
  "37",
  "38",
  "39",
  "40",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
] as const;

export const ORDER_STATUSES = [
  "solicitado",
  "confirmado",
  "em_separacao",
  "enviado",
  "entregue",
  "cancelado",
  "rejeitado",
] as const;

export const PAYMENT_STATUSES = [
  "aguardando",
  "pago",
  "recusado",
  "expirado",
  "cancelado",
  "estornado",
  "contestado",
] as const;

export type ShoeSize = (typeof SHOE_SIZES)[number];
export type SupplyType = "estoque" | "sob_demanda";
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export type SizeOption = {
  id: number;
  label: string;
  stockQty: number;
};

export type ProductColor = {
  id: number;
  name: string;
  hex: string;
  sizes: SizeOption[];
};

export type ProductImage = {
  id: number;
  path: string;
  sortOrder: number;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  salePrice: number | null;
  supplyType: SupplyType;
  active: boolean;
  colors: ProductColor[];
  images: ProductImage[];
};

export type Banner = {
  id: number;
  title: string;
  subtitle: string;
  linkUrl: string;
  imageDesktop: string;
  imageMobile: string;
  active: boolean;
  sortOrder: number;
};

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  description: string;
  image: string | null;
  colorId: number;
  colorName: string;
  sizeId: number;
  sizeLabel: string;
  unitPrice: number;
  quantity: number;
  supplyType: SupplyType;
  maxQty: number;
};

export type ProductColorInput = {
  name: string;
  hex: string;
  sizes: { label: string; stockQty: number }[];
};

export type ProductPayload = {
  name: string;
  description: string;
  price: number;
  salePrice: number | null;
  supplyType: SupplyType;
  active: boolean;
  colors: ProductColorInput[];
  removedImageIds: number[];
};

export type OrderItemView = {
  productName: string;
  description: string;
  colorName: string;
  sizeLabel: string;
  supplyType: SupplyType;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderView = {
  id: number;
  code: string;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentEvent: string | null;
  total: number;
  createdAt: string;
  trackingCode: string;
  paymentReceipt: string | null;
  paymentUrl: string | null;
  items: OrderItemView[];
};
