import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatBRL } from "../lib/format";
import { ShoppingBag, DollarSign, Users } from "lucide-react";

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (user === false) nav("/login");
    else if (user && user.role !== "admin") nav("/");
    else if (user) {
      api.get("/admin/orders").then((r) => setOrders(r.data)).catch(() => {});
      api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    }
  }, [user, nav]);

  if (!user || user.role !== "admin") return <div className="max-w-3xl mx-auto p-20 text-center text-zinc-400">Carregando...</div>;

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center gap-2 small-caps text-[#FF9500]">Painel administrativo</div>
      <h1 className="heading text-4xl mt-2">AutoVisor — Pedidos</h1>

      {stats && (
        <div className="grid sm:grid-cols-3 gap-3 mt-8">
          <div className="bg-[#0A0A0A] border border-white/10 p-5">
            <ShoppingBag className="w-5 h-5 text-[#FF9500]" />
            <div className="text-xs small-caps text-zinc-400 mt-3">Pedidos</div>
            <div className="heading text-3xl mt-1">{stats.orders_count}</div>
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 p-5">
            <DollarSign className="w-5 h-5 text-[#32D74B]" />
            <div className="text-xs small-caps text-zinc-400 mt-3">Faturamento</div>
            <div className="heading text-3xl mt-1">{formatBRL(stats.revenue_cents)}</div>
          </div>
          <div className="bg-[#0A0A0A] border border-white/10 p-5">
            <Users className="w-5 h-5 text-[#0A84FF]" />
            <div className="text-xs small-caps text-zinc-400 mt-3">Clientes</div>
            <div className="heading text-3xl mt-1">{stats.users_count}</div>
          </div>
        </div>
      )}

      <div className="mt-10 border border-white/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0F0F11] text-zinc-400 text-xs small-caps">
            <tr>
              <th className="text-left p-4">Pedido</th>
              <th className="text-left p-4">Data</th>
              <th className="text-left p-4">Cliente</th>
              <th className="text-left p-4">Pagamento</th>
              <th className="text-left p-4">Status</th>
              <th className="text-right p-4">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <Fragment key={o.id}>
                <tr data-testid={`admin-order-${o.id}`} onClick={() => setExpanded(expanded === o.id ? null : o.id)} className="border-t border-white/5 hover:bg-white/5 cursor-pointer">
                  <td className="p-4 mono">{o.order_number}</td>
                  <td className="p-4 text-zinc-400">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                  <td className="p-4">{o.shipping_data.full_name}<div className="text-xs text-zinc-500">{o.user_email}</div></td>
                  <td className="p-4">{o.payment_method === "pix" ? "PIX" : `Cartão •••• ${o.card_last4}`}</td>
                  <td className="p-4"><span className={`text-xs small-caps ${o.status === "pago" ? "text-[#32D74B]" : "text-pix"}`}>{o.status.replace("_", " ")}</span></td>
                  <td className="p-4 text-right mono">{formatBRL(o.total)}</td>
                </tr>
                {expanded === o.id && (
                  <tr className="bg-[#070707]">
                    <td colSpan={6} className="p-6">
                      <div className="grid md:grid-cols-2 gap-6 text-sm">
                        <div>
                          <h4 className="small-caps mb-2">Entrega</h4>
                          <div className="text-zinc-300 leading-relaxed">
                            {o.shipping_data.full_name}<br/>
                            CPF: <span className="mono">{o.shipping_data.cpf}</span><br/>
                            Nasc: {o.shipping_data.birth_date}<br/>
                            Tel: <span className="mono">{o.shipping_data.phone}</span><br/>
                            {o.shipping_data.street}, {o.shipping_data.number} {o.shipping_data.complement && `- ${o.shipping_data.complement}`}<br/>
                            {o.shipping_data.neighborhood}<br/>
                            {o.shipping_data.city} / {o.shipping_data.state} — CEP <span className="mono">{o.shipping_data.cep}</span>
                          </div>
                        </div>
                        <div>
                          <h4 className="small-caps mb-2">Itens</h4>
                          {o.items.map((it) => (
                            <div key={it.product_id} className="flex justify-between py-1">
                              <span>{it.quantity}× {it.name}</span>
                              <span className="mono text-zinc-400">{formatBRL(it.line_total)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="p-12 text-center text-zinc-500">Nenhum pedido ainda.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
