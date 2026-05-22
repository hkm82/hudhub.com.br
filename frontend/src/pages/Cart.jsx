import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatBRL } from "../lib/format";
import { Minus, Plus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";

export default function Cart() {
  const { items, updateQty, removeItem, subtotal } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <ShoppingBag className="w-12 h-12 mx-auto text-zinc-600" />
        <h1 className="heading text-3xl mt-6">Seu carrinho está vazio</h1>
        <p className="text-zinc-400 mt-2">Explore nossas edições do HUD C3.</p>
        <Link to="/" data-testid="empty-cart-cta" className="inline-flex items-center gap-2 mt-8 btn-primary px-5 py-3 rounded-sm">
          Ver produtos <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const pix = Math.round(subtotal * 0.95);

  function goCheckout() {
    if (!user) {
      nav("/login?next=/checkout");
    } else {
      nav("/checkout");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-12">
      <h1 className="heading text-4xl mb-10">Seu carrinho</h1>
      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-3">
          {items.map((it) => (
            <div key={it.product_id} data-testid={`cart-item-${it.product_id}`} className="flex items-center gap-4 p-4 bg-[#16161A] border border-white/10">
              <img src={it.image} alt={it.name} className="w-20 h-20 object-cover bg-[#1C1C20]" />
              <div className="flex-1 min-w-0">
                <div className="text-sm small-caps text-zinc-400">{it.edition === "navigation" ? "Edição Navegação" : "Edição Multi-Alarmes"}</div>
                <div className="font-medium truncate">{it.name}</div>
                <div className="text-xs text-zinc-500 mono mt-1">{formatBRL(it.unit_price)} cada</div>
              </div>
              <div className="inline-flex items-center border border-white/15">
                <button data-testid={`cart-dec-${it.product_id}`} onClick={() => updateQty(it.product_id, it.quantity - 1)} className="w-9 h-9 hover:bg-white/5"><Minus className="w-3.5 h-3.5 mx-auto" /></button>
                <span className="w-9 text-center mono text-sm">{it.quantity}</span>
                <button data-testid={`cart-inc-${it.product_id}`} onClick={() => updateQty(it.product_id, it.quantity + 1)} className="w-9 h-9 hover:bg-white/5"><Plus className="w-3.5 h-3.5 mx-auto" /></button>
              </div>
              <div className="w-24 text-right mono">{formatBRL(it.unit_price * it.quantity)}</div>
              <button data-testid={`cart-remove-${it.product_id}`} onClick={() => removeItem(it.product_id)} className="text-zinc-500 hover:text-[#FF453A]"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>

        <aside className="bg-[#16161A] border border-white/10 p-6 h-fit sticky top-24">
          <h2 className="heading text-xl mb-6">Resumo</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span className="mono">{formatBRL(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Frete</span><span className="mono text-[#32D74B]">Grátis</span></div>
            <div className="flex justify-between border-t border-white/10 pt-3 text-base"><span>Total</span><span className="mono font-semibold">{formatBRL(subtotal)}</span></div>
            <div className="text-pix text-sm mono pt-2 border-t border-white/10">ou {formatBRL(pix)} no PIX (-5%)</div>
          </div>
          <button data-testid="go-checkout-btn" onClick={goCheckout} className="w-full mt-6 btn-primary px-5 py-3 rounded-sm inline-flex items-center justify-center gap-2">
            Finalizar compra <ArrowRight className="w-4 h-4" />
          </button>
          <Link to="/" className="block text-center mt-3 text-sm text-zinc-400 hover:text-white">Continuar comprando</Link>
        </aside>
      </div>
    </div>
  );
}
