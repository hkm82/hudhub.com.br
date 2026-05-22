import { useEffect, useState, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatBRL } from "../lib/format";
import { ShoppingBag, DollarSign, Users, TrendingUp, Tag, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview"); // overview | orders | funnel | coupons
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [funnelDays, setFunnelDays] = useState(30);
  const [funnel, setFunnel] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [newCoupon, setNewCoupon] = useState({
    code: "", type: "fixed", amount_cents: 0, amount_percent: 0,
    description: "", max_uses: 0, expires_at: "", one_per_customer: true,
  });
  const [couponErr, setCouponErr] = useState("");

  useEffect(() => {
    if (user === false) nav("/login");
    else if (user && user.role !== "admin") nav("/");
    else if (user) {
      api.get("/admin/orders").then((r) => setOrders(r.data)).catch(() => {});
      api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
      api.get("/admin/coupons").then((r) => setCoupons(r.data)).catch(() => {});
    }
  }, [user, nav]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    if (tab === "funnel") {
      api.get(`/admin/funnel?days=${funnelDays}`).then((r) => setFunnel(r.data)).catch(() => {});
    }
  }, [tab, funnelDays, user]);

  async function createCoupon(e) {
    e.preventDefault();
    setCouponErr("");
    try {
      const payload = {
        code: newCoupon.code.trim().toUpperCase(),
        type: newCoupon.type,
        amount_cents: newCoupon.type === "fixed" ? parseInt(newCoupon.amount_cents || 0) * 100 : 0,
        amount_percent: newCoupon.type === "percent" ? parseInt(newCoupon.amount_percent || 0) : 0,
        description: newCoupon.description,
        max_uses: parseInt(newCoupon.max_uses || 0),
        expires_at: newCoupon.expires_at ? new Date(newCoupon.expires_at + "T23:59:59").toISOString() : null,
        active: true,
        one_per_customer: newCoupon.one_per_customer,
      };
      const { data } = await api.post("/admin/coupons", payload);
      setCoupons((c) => [data, ...c]);
      setNewCoupon({ code: "", type: "fixed", amount_cents: 0, amount_percent: 0, description: "", max_uses: 0, expires_at: "", one_per_customer: true });
      toast.success("Cupom criado");
    } catch (e) {
      setCouponErr(formatApiError(e));
    }
  }

  async function toggleCoupon(c) {
    try {
      const { data } = await api.patch(`/admin/coupons/${c.code}`, { active: !c.active });
      setCoupons((list) => list.map((x) => (x.code === c.code ? data : x)));
    } catch (e) {
      toast.error(formatApiError(e));
    }
  }

  async function deleteCoupon(code) {
    if (!window.confirm(`Excluir cupom ${code}?`)) return;
    try {
      await api.delete(`/admin/coupons/${code}`);
      setCoupons((list) => list.filter((x) => x.code !== code));
      toast.success("Cupom excluído");
    } catch (e) {
      toast.error(formatApiError(e));
    }
  }

  if (!user || user.role !== "admin") return <div className="max-w-3xl mx-auto p-20 text-center text-zinc-400">Carregando...</div>;

  const tabs = [
    { k: "overview", l: "Visão geral", icon: TrendingUp },
    { k: "orders", l: "Pedidos", icon: ShoppingBag },
    { k: "funnel", l: "Funil", icon: TrendingUp },
    { k: "coupons", l: "Cupons", icon: Tag },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-center gap-2 small-caps text-[#FF9500]">Painel administrativo</div>
      <h1 className="heading text-4xl mt-2">AutoVisor</h1>

      <div className="mt-8 border-b border-white/10 flex gap-1 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.k}
            data-testid={`tab-${t.k}`}
            onClick={() => setTab(t.k)}
            className={`px-5 py-3 text-sm border-b-2 transition-colors whitespace-nowrap inline-flex items-center gap-2 ${tab === t.k ? "border-[#FF9500] text-white" : "border-transparent text-zinc-400 hover:text-white"}`}
          >
            <t.icon className="w-4 h-4" /> {t.l}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === "overview" && stats && (
        <div className="grid sm:grid-cols-3 gap-3 mt-8">
          <div className="bg-[#16161A] border border-white/10 p-5">
            <ShoppingBag className="w-5 h-5 text-[#FF9500]" />
            <div className="text-xs small-caps text-zinc-400 mt-3">Pedidos totais</div>
            <div className="heading text-3xl mt-1">{stats.orders_count}</div>
          </div>
          <div className="bg-[#16161A] border border-white/10 p-5">
            <DollarSign className="w-5 h-5 text-[#32D74B]" />
            <div className="text-xs small-caps text-zinc-400 mt-3">Faturamento</div>
            <div className="heading text-3xl mt-1">{formatBRL(stats.revenue_cents)}</div>
          </div>
          <div className="bg-[#16161A] border border-white/10 p-5">
            <Users className="w-5 h-5 text-[#0A84FF]" />
            <div className="text-xs small-caps text-zinc-400 mt-3">Clientes</div>
            <div className="heading text-3xl mt-1">{stats.users_count}</div>
          </div>
        </div>
      )}

      {/* ORDERS */}
      {tab === "orders" && (
        <div className="mt-8 border border-white/10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[#1A1A1E] text-zinc-400 text-xs small-caps">
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
                    <tr className="bg-[#121215]">
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
                            {o.coupon_code && <div className="mt-2 text-[#32D74B] text-xs">Cupom <span className="mono">{o.coupon_code}</span> · -{formatBRL(o.coupon_discount || 0)}</div>}
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
      )}

      {/* FUNNEL */}
      {tab === "funnel" && (
        <div className="mt-8 space-y-6">
          <div className="flex items-center gap-3">
            <span className="small-caps text-zinc-400">Período</span>
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                data-testid={`funnel-days-${d}`}
                onClick={() => setFunnelDays(d)}
                className={`px-4 py-2 text-sm border ${funnelDays === d ? "bg-[#FF9500] text-black border-[#FF9500] font-semibold" : "border-white/15 text-zinc-300 hover:bg-white/5"}`}
              >
                {d} dias
              </button>
            ))}
          </div>

          {!funnel ? (
            <div className="text-zinc-500 p-8 text-center">Carregando funil...</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid sm:grid-cols-4 gap-3">
                <div className="bg-[#16161A] border border-white/10 p-5">
                  <div className="small-caps text-zinc-400">Conv. geral</div>
                  <div className="heading text-3xl mt-2 text-[#FF9500]">{funnel.overall_conversion_pct}%</div>
                  <div className="text-xs text-zinc-500 mt-1">home → pago</div>
                </div>
                <div className="bg-[#16161A] border border-white/10 p-5">
                  <div className="small-caps text-zinc-400">Faturamento</div>
                  <div className="heading text-3xl mt-2">{formatBRL(funnel.revenue_cents)}</div>
                </div>
                <div className="bg-[#16161A] border border-white/10 p-5">
                  <div className="small-caps text-zinc-400">Ticket médio</div>
                  <div className="heading text-3xl mt-2">{formatBRL(funnel.avg_ticket_cents)}</div>
                </div>
                <div className="bg-[#16161A] border border-white/10 p-5">
                  <div className="small-caps text-zinc-400">Uso de cupom</div>
                  <div className="heading text-3xl mt-2 text-[#32D74B]">{funnel.coupon_usage_rate_pct}%</div>
                  <div className="text-xs text-zinc-500 mt-1">{funnel.coupons_used} pedidos com cupom</div>
                </div>
              </div>

              {/* Funnel bars */}
              <div className="bg-[#16161A] border border-white/10 p-6">
                <h3 className="heading text-xl mb-6">Funil de conversão</h3>
                {(() => {
                  const max = Math.max(...funnel.funnel.map((s) => s.count), 1);
                  return (
                    <div className="space-y-3">
                      {funnel.funnel.map((s) => (
                        <div key={s.key} data-testid={`funnel-step-${s.key}`} className="flex items-center gap-4">
                          <div className="w-44 text-sm text-zinc-300">{s.label}</div>
                          <div className="flex-1 bg-[#1A1A1E] h-9 relative overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#FF9500] to-[#FFB340] flex items-center justify-end pr-3 text-xs font-semibold text-black"
                              style={{ width: `${Math.max((s.count / max) * 100, 6)}%` }}
                            >
                              {s.count}
                            </div>
                          </div>
                          <div className="w-20 text-right text-xs">
                            {s.conv_from_prev !== null ? (
                              <span className={s.conv_from_prev >= 50 ? "text-[#32D74B]" : s.conv_from_prev >= 20 ? "text-[#FFD60A]" : "text-[#FF453A]"}>
                                {s.conv_from_prev}%
                              </span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <p className="mt-6 text-xs text-zinc-500">% à direita = taxa de conversão da etapa anterior. Conta sessões únicas (por browser).</p>
              </div>

              {/* By edition */}
              <div className="grid sm:grid-cols-2 gap-3">
                {["navigation", "alarms"].map((ed) => {
                  const e = funnel.by_edition[ed];
                  const isNav = ed === "navigation";
                  return (
                    <div key={ed} className={`p-5 bg-[#16161A] border ${isNav ? "border-[#0A84FF]/30" : "border-[#FF453A]/30"}`}>
                      <div className={`small-caps ${isNav ? "text-[#0A84FF]" : "text-[#FF453A]"}`}>
                        Edição {isNav ? "Navegação" : "Multi-Alarmes"}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div>
                          <div className="text-xs text-zinc-400">Visitas</div>
                          <div className="heading text-2xl mt-1">{e.views}</div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-400">Carrinhos</div>
                          <div className="heading text-2xl mt-1">{e.carts}</div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-400">Vendidos</div>
                          <div className={`heading text-2xl mt-1 ${isNav ? "text-[#0A84FF]" : "text-[#FF453A]"}`}>{e.units_sold}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* COUPONS */}
      {tab === "coupons" && (
        <div className="mt-8 space-y-8">
          {/* Create form */}
          <form onSubmit={createCoupon} className="bg-[#16161A] border border-white/10 p-6 space-y-5" data-testid="coupon-form">
            <h3 className="heading text-xl flex items-center gap-2"><Plus className="w-5 h-5 text-[#FF9500]" /> Novo cupom</h3>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="small-caps">Código</label>
                <input data-testid="new-coupon-code" required value={newCoupon.code} onChange={(e) => setNewCoupon((p) => ({ ...p, code: e.target.value.toUpperCase() }))} className="field" placeholder="BLACK10" />
              </div>
              <div>
                <label className="small-caps">Tipo</label>
                <select value={newCoupon.type} onChange={(e) => setNewCoupon((p) => ({ ...p, type: e.target.value }))} className="field">
                  <option value="fixed" className="bg-[#0F0F12]">Valor fixo (R$)</option>
                  <option value="percent" className="bg-[#0F0F12]">Porcentagem (%)</option>
                </select>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-5">
              {newCoupon.type === "fixed" ? (
                <div>
                  <label className="small-caps">Valor (R$)</label>
                  <input data-testid="new-coupon-amount" type="number" min="1" value={newCoupon.amount_cents} onChange={(e) => setNewCoupon((p) => ({ ...p, amount_cents: e.target.value }))} className="field" placeholder="25" />
                </div>
              ) : (
                <div>
                  <label className="small-caps">Porcentagem (%)</label>
                  <input data-testid="new-coupon-percent" type="number" min="1" max="100" value={newCoupon.amount_percent} onChange={(e) => setNewCoupon((p) => ({ ...p, amount_percent: e.target.value }))} className="field" placeholder="10" />
                </div>
              )}
              <div>
                <label className="small-caps">Limite de usos (0 = ilimitado)</label>
                <input type="number" min="0" value={newCoupon.max_uses} onChange={(e) => setNewCoupon((p) => ({ ...p, max_uses: e.target.value }))} className="field" placeholder="0" />
              </div>
              <div>
                <label className="small-caps">Válido até</label>
                <input type="date" value={newCoupon.expires_at} onChange={(e) => setNewCoupon((p) => ({ ...p, expires_at: e.target.value }))} className="field" />
              </div>
            </div>
            <div>
              <label className="small-caps">Descrição</label>
              <input value={newCoupon.description} onChange={(e) => setNewCoupon((p) => ({ ...p, description: e.target.value }))} className="field" placeholder="Black Friday 10% OFF" />
            </div>
            <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
              <input type="checkbox" checked={newCoupon.one_per_customer} onChange={(e) => setNewCoupon((p) => ({ ...p, one_per_customer: e.target.checked }))} />
              Apenas 1 uso por cliente
            </label>
            {couponErr && <div className="text-sm text-[#FF453A]">{couponErr}</div>}
            <button data-testid="create-coupon-btn" className="btn-primary px-5 py-3 rounded-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Criar cupom
            </button>
          </form>

          {/* List */}
          <div className="border border-white/10 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1A1A1E] text-zinc-400 text-xs small-caps">
                <tr>
                  <th className="text-left p-4">Código</th>
                  <th className="text-left p-4">Tipo</th>
                  <th className="text-left p-4">Desconto</th>
                  <th className="text-left p-4">Usos</th>
                  <th className="text-left p-4">Validade</th>
                  <th className="text-left p-4">Status</th>
                  <th className="text-right p-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.code} data-testid={`coupon-row-${c.code}`} className="border-t border-white/5">
                    <td className="p-4 mono text-[#FF9500] font-semibold">{c.code}</td>
                    <td className="p-4">{c.type === "fixed" ? "R$ fixo" : "% "}</td>
                    <td className="p-4 mono">{c.type === "fixed" ? formatBRL(c.amount_cents) : `${c.amount_percent}%`}</td>
                    <td className="p-4 mono">{c.uses}{c.max_uses ? ` / ${c.max_uses}` : ""}</td>
                    <td className="p-4 text-zinc-400">{c.expires_at ? new Date(c.expires_at).toLocaleDateString("pt-BR") : "Sem expirar"}</td>
                    <td className="p-4"><span className={`text-xs small-caps ${c.active ? "text-[#32D74B]" : "text-zinc-500"}`}>{c.active ? "ativo" : "desativado"}</span></td>
                    <td className="p-4 text-right">
                      <button data-testid={`toggle-coupon-${c.code}`} onClick={() => toggleCoupon(c)} className="text-zinc-400 hover:text-[#FF9500] mr-3" title="Ativar/desativar"><Power className="w-4 h-4" /></button>
                      <button data-testid={`delete-coupon-${c.code}`} onClick={() => deleteCoupon(c.code)} className="text-zinc-400 hover:text-[#FF453A]" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={7} className="p-12 text-center text-zinc-500">Nenhum cupom cadastrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
