import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatBRL } from "../lib/format";
import { CheckCircle2, Copy, QrCode, Truck } from "lucide-react";
import { toast } from "sonner";

export default function OrderConfirmation() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/orders/${id}`).then((r) => setOrder(r.data)).catch(() => setOrder(false));
  }, [id]);

  if (order === null) return <div className="max-w-3xl mx-auto p-20 text-center text-zinc-400">Carregando pedido...</div>;
  if (order === false) return <div className="max-w-3xl mx-auto p-20 text-center text-zinc-400">Pedido não encontrado.</div>;

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-center">
        <CheckCircle2 className="w-14 h-14 text-[#32D74B] mx-auto" />
        <h1 className="heading text-4xl mt-4">Pedido confirmado!</h1>
        <p className="text-zinc-400 mt-2">Obrigado pela sua compra. Você receberá atualizações no e-mail <span className="text-white">{order.user_email}</span>.</p>
        <div className="inline-block mono text-sm mt-4 px-3 py-1 border border-white/15">Pedido <span className="text-[#FF9500]">{order.order_number}</span></div>
      </div>

      {order.payment_method === "pix" && order.pix_code && (
        <div className="mt-10 p-6 border border-pix/40 bg-pix/5" data-testid="pix-section">
          <h2 className="heading text-xl flex items-center gap-2"><QrCode className="w-5 h-5 text-pix" /> Pague com PIX</h2>
          <p className="text-sm text-zinc-300 mt-2">Copie o código abaixo ou escaneie o QR Code no seu app do banco.</p>
          <div className="mt-4 p-3 bg-black border border-white/10 mono text-xs break-all">{order.pix_code}</div>
          <button data-testid="copy-pix-btn" onClick={() => { navigator.clipboard.writeText(order.pix_code); toast.success("Código PIX copiado"); }} className="mt-3 btn-outline px-4 py-2 rounded-sm inline-flex items-center gap-2 text-sm">
            <Copy className="w-4 h-4" /> Copiar código PIX
          </button>
          <div className="mt-4 text-pix mono">Valor a pagar: {formatBRL(order.total)}</div>
        </div>
      )}

      <div className="mt-10 border border-white/10 bg-[#0A0A0A] p-6">
        <h2 className="heading text-xl mb-4">Itens do pedido</h2>
        <div className="space-y-3">
          {order.items.map((it) => (
            <div key={it.product_id} className="flex items-center gap-4">
              <img src={it.image} alt="" className="w-14 h-14 object-cover bg-[#121214]" />
              <div className="flex-1">
                <div className="text-sm">{it.name}</div>
                <div className="text-xs text-zinc-500 mono">{it.quantity} × {formatBRL(it.unit_price)}</div>
              </div>
              <div className="mono text-sm">{formatBRL(it.line_total)}</div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 mt-5 pt-4 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span className="mono">{formatBRL(order.subtotal)}</span></div>
          {order.discount > 0 && <div className="flex justify-between"><span className="text-pix">Desconto PIX</span><span className="mono text-pix">-{formatBRL(order.discount)}</span></div>}
          <div className="flex justify-between text-base font-semibold pt-2 border-t border-white/10"><span>Total</span><span className="mono">{formatBRL(order.total)}</span></div>
        </div>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 gap-3">
        <div className="border border-white/10 p-5 bg-[#0A0A0A]">
          <h3 className="small-caps mb-2 flex items-center gap-2"><Truck className="w-4 h-4 text-[#FF9500]" /> Entrega</h3>
          <p className="text-sm text-zinc-300 leading-relaxed">
            {order.shipping_data.full_name}<br/>
            {order.shipping_data.street}, {order.shipping_data.number}<br/>
            {order.shipping_data.city} / {order.shipping_data.state}
          </p>
        </div>
        <div className="border border-white/10 p-5 bg-[#0A0A0A]">
          <h3 className="small-caps mb-2">Status</h3>
          <p className="text-sm text-zinc-300">{order.status === "pago" ? "Pago — preparando envio" : "Aguardando pagamento PIX"}</p>
        </div>
      </div>

      <div className="text-center mt-10 flex gap-3 justify-center">
        <Link to="/minha-conta" data-testid="cta-to-account" className="btn-outline px-5 py-3 rounded-sm">Meus pedidos</Link>
        <Link to="/" data-testid="cta-to-home" className="btn-primary px-5 py-3 rounded-sm">Voltar à loja</Link>
      </div>
    </div>
  );
}
