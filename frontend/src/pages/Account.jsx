import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { formatBRL } from "../lib/format";
import { Package } from "lucide-react";

export default function Account() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    if (user === false) nav("/login?next=/minha-conta");
    if (user) api.get("/orders").then((r) => setOrders(r.data)).catch(() => {});
  }, [user, nav]);

  if (!user) return <div className="max-w-3xl mx-auto p-20 text-center text-zinc-400">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <h1 className="heading text-4xl">Minha conta</h1>
      <p className="text-zinc-400 mt-2">Olá, {user.full_name}</p>

      <section className="mt-10">
        <h2 className="heading text-2xl mb-6">Meus pedidos</h2>
        {orders.length === 0 ? (
          <div className="border border-white/10 p-10 text-center text-zinc-400 bg-[#0A0A0A]">
            <Package className="w-10 h-10 mx-auto opacity-50" />
            <p className="mt-4">Você ainda não fez pedidos.</p>
            <Link to="/" className="text-[#FF9500] mt-3 inline-block">Conhecer produtos</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <Link to={`/pedido-confirmado/${o.id}`} key={o.id} data-testid={`order-${o.id}`} className="block bg-[#0A0A0A] border border-white/10 hover:border-[#FF9500]/40 p-5 transition-colors">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-xs small-caps text-zinc-400">{new Date(o.created_at).toLocaleString("pt-BR")}</div>
                    <div className="mono text-sm mt-1">{o.order_number}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs small-caps ${o.status === "pago" ? "text-[#32D74B]" : "text-pix"}`}>{o.status.replace("_", " ")}</span>
                    <span className="mono font-medium">{formatBRL(o.total)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="heading text-2xl mb-6">Meus dados</h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm bg-[#0A0A0A] border border-white/10 p-6">
          <div><span className="small-caps text-zinc-400">E-mail</span><div>{user.email}</div></div>
          <div><span className="small-caps text-zinc-400">CPF</span><div className="mono">{user.cpf}</div></div>
          <div><span className="small-caps text-zinc-400">Celular</span><div className="mono">{user.phone}</div></div>
          <div><span className="small-caps text-zinc-400">CEP</span><div className="mono">{user.cep}</div></div>
          <div className="sm:col-span-2"><span className="small-caps text-zinc-400">Endereço</span><div>{user.address_street}, {user.address_number} - {user.address_neighborhood}, {user.address_city}/{user.address_state}</div></div>
        </div>
      </section>
    </div>
  );
}
