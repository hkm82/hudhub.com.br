import { createContext, useContext, useEffect, useMemo, useState } from "react";

const CartCtx = createContext(null);
const KEY = "autovisor_cart_v1";
const COUPON_KEY = "autovisor_pending_coupon";

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [pendingCoupon, setPendingCouponState] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
      const c = localStorage.getItem(COUPON_KEY);
      if (c) setPendingCouponState(c);
    } catch (err) {
      console.warn("Failed to read cart from storage", err);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  function setPendingCoupon(code) {
    const value = (code || "").trim().toUpperCase();
    setPendingCouponState(value);
    if (value) localStorage.setItem(COUPON_KEY, value);
    else localStorage.removeItem(COUPON_KEY);
  }

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
          display_price: product.display_price ?? product.price,
          import_tax_cents: product.import_tax_cents ?? 0,
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
    setPendingCoupon("");
  }

  const productsTotal = items.reduce((acc, it) => acc + (it.display_price ?? it.unit_price) * it.quantity, 0);
  const importTaxTotal = items.reduce((acc, it) => acc + (it.import_tax_cents ?? 0) * it.quantity, 0);
  const subtotal = productsTotal + importTaxTotal;
  const count = items.reduce((acc, it) => acc + it.quantity, 0);

  const value = useMemo(
    () => ({
      items, addItem, updateQty, removeItem, clear,
      productsTotal, importTaxTotal, subtotal, count,
      pendingCoupon, setPendingCoupon,
    }),
    [items, productsTotal, importTaxTotal, subtotal, count, pendingCoupon]
  );

  return <CartCtx.Provider value={value}>{children}</CartCtx.Provider>;
}

export const useCart = () => useContext(CartCtx);
