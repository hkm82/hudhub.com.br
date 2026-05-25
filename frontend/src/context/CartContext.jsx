import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartCtx = createContext(null);
const KEY = "autovisor_cart_v1";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch (err) {
      console.warn("Failed to read cart from storage", err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  function addItem(product, qty = 1) {
    setItems((prev) => {
      const ex = prev.find((it) => it.product_id === product.id);
      if (ex) {
        return prev.map((it) =>
          it.product_id === product.id ? { ...it, quantity: it.quantity + qty } : it
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          edition: product.edition,
          unit_price: product.price,
          image: product.images[0],
          quantity: qty,
        },
      ];
    });
  }

  function updateQty(productId, qty) {
    setItems((prev) =>
      prev
        .map((it) => (it.product_id === productId ? { ...it, quantity: Math.max(1, qty) } : it))
        .filter((it) => it.quantity > 0)
    );
  }

  function removeItem(productId) {
    setItems((prev) => prev.filter((it) => it.product_id !== productId));
  }

  function clear() {
    setItems([]);
  }

  const subtotal = items.reduce((acc, it) => acc + it.unit_price * it.quantity, 0);
  const count = items.reduce((acc, it) => acc + it.quantity, 0);

  const value = useMemo(
    () => ({ items, addItem, updateQty, removeItem, clear, subtotal, count }),
    [items, subtotal, count]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
