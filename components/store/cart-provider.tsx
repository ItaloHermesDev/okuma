"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/lib/store-types";

const STORAGE_KEY = "okuma-cart";

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  updateQuantity: (sizeId: number, quantity: number) => void;
  removeItem: (sizeId: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(readCart());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  function addItem(item: CartItem) {
    setItems((current) => {
      const index = current.findIndex((entry) => entry.sizeId === item.sizeId);

      if (index === -1) {
        return [...current, item];
      }

      const next = [...current];
      next[index] = {
        ...item,
        quantity: Math.min(next[index].quantity + item.quantity, item.maxQty),
      };
      return next;
    });
  }

  function updateQuantity(sizeId: number, quantity: number) {
    setItems((current) =>
      current.map((item) =>
        item.sizeId === sizeId
          ? { ...item, quantity: Math.min(Math.max(quantity, 1), item.maxQty) }
          : item,
      ),
    );
  }

  function removeItem(sizeId: number) {
    setItems((current) => current.filter((item) => item.sizeId !== sizeId));
  }

  function clearCart() {
    setItems([]);
  }

  return (
    <CartContext.Provider value={{ items, addItem, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const cart = useContext(CartContext);

  if (!cart) {
    throw new Error("useCart deve ficar dentro do carrinho da loja.");
  }

  return cart;
}
