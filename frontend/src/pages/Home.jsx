import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, Lock, Truck, Cpu, Gauge, Zap, MapPin, Bell, Star, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatBRL } from "../lib/format";

export default function Home() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data)).catch(() => {});
  }, []);

  return (
    <div className="grain">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url(https://static.prod-images.emergentagent.com/jobs/b3ea7832-b086-4d63-9cd1-1b92fdcc5067/images/15e092e20e85ba76efef25ec680a09f4979731840cf83b215fdec55d51d4cd24.png)",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black" />
        <div className="relative max-w-7xl mx-auto px-6 lg:px-10 pt-24 pb-32">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 border border-white/15 rounded-sm text-xs small-caps mb-8">
            <span className="w-2 h-2 bg-[#32D74B] rounded-full animate-pulse" /> Lançamento 2026
          </div>
          <h1 className="heading text-5xl sm:text-6xl lg:text-7xl font-medium leading-[1.05] max-w-4xl">
            Dirija com <span className="text-[#FF9500]">precisão</span><br/> de cockpit profissional.
          </h1>
          <p className="text-lg text-zinc-300 mt-6 max-w-2xl leading-relaxed">
            Head-Up Display C3 — projeta dados do veículo e navegação direto no para-brisa.
            Duas edições, uma mesma promessa: foco total na estrada.
          </p>
          <div className="flex flex-wrap gap-4 mt-10">
            <Link to="/produto/hud-c3-navigation" data-testid="hero-cta-navigation" className="inline-flex items-center gap-2 btn-primary px-6 py-3 rounded-sm">
              Conhecer Edição Navegação <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/produto/hud-c3-alarms" data-testid="hero-cta-alarms" className="inline-flex items-center gap-2 btn-outline px-6 py-3 rounded-sm">
              Conhecer Edição Multi-Alarmes <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-8 mt-12 text-sm text-zinc-300">
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#32D74B]" /> Compra 100% segura</span>
            <span className="flex items-center gap-2"><Truck className="w-4 h-4 text-[#FF9500]" /> Frete grátis para todo o Brasil</span>
            <span className="flex items-center gap-2"><Lock className="w-4 h-4 text-[#32D74B]" /> Dados criptografados</span>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-24">
        <div className="flex items-end justify-between mb-12 gap-6 flex-wrap">
          <div>
            <span className="small-caps text-[#FF9500]">Duas edições — Um mesmo hardware</span>
            <h2 className="heading text-4xl sm:text-5xl mt-3 max-w-2xl">Escolha o firmware ideal para o seu estilo de direção.</h2>
          </div>
          <p className="text-zinc-400 max-w-md">Mesmo dispositivo, dois cérebros diferentes. Selecione abaixo a edição que melhor se encaixa nas suas necessidades.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {products.map((p, idx) => (
            <Link
              key={p.id}
              to={`/produto/${p.id}`}
              data-testid={`product-card-${p.id}`}
              className="group relative bg-[#0A0A0A] border border-white/10 hover:border-[#FF9500]/40 transition-colors overflow-hidden"
            >
              <div className="aspect-[4/3] bg-[#121214] relative overflow-hidden">
                <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute top-4 left-4">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs small-caps ${p.edition === "navigation" ? "bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/30" : "bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30"}`}>
                    {p.edition === "navigation" ? <MapPin className="w-3 h-3" /> : <Bell className="w-3 h-3" />}
                    {p.edition === "navigation" ? "Navegação" : "Multi-Alarmes"}
                  </span>
                </div>
              </div>
              <div className="p-6 lg:p-8">
                <h3 className="heading text-2xl font-medium">{p.name}</h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{p.tagline}</p>
                <div className="flex items-center gap-1 mt-4 text-sm text-zinc-300">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.round(p.rating) ? "text-[#FFD60A] fill-[#FFD60A]" : "text-zinc-700"}`} />
                  ))}
                  <span className="ml-2 mono text-xs text-zinc-400">{p.rating} · {p.reviews} avaliações</span>
                </div>
                <div className="flex items-end justify-between mt-6">
                  <div>
                    <span className="text-xs text-zinc-500 line-through mono">{formatBRL(p.compare_price)}</span>
                    <div className="heading text-3xl font-medium">{formatBRL(p.price)}</div>
                    <div className="text-xs text-pix mono mt-1">{formatBRL(Math.round(p.price * 0.95))} no PIX (-5%)</div>
                  </div>
                  <span className="text-sm text-[#FF9500] flex items-center gap-1 group-hover:gap-3 transition-all">
                    Ver detalhes <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Feature comparison */}
      <section className="max-w-7xl mx-auto px-6 lg:px-10 pb-24">
        <span className="small-caps text-[#FF9500]">Especificações Técnicas</span>
        <h2 className="heading text-4xl sm:text-5xl mt-3 mb-12">Mesma engenharia. Diferente propósito.</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Cpu, title: "Hardware unificado", body: "Tela TFT colorida 2.2'' anti-reflexo, conexão direta via OBD-II 12V. Plug and play." },
            { icon: Gauge, title: "Dados em tempo real", body: "Velocidade, RPM, temperatura, voltagem, distância e tempo a 0,2s de latência." },
            { icon: Zap, title: "Compatibilidade total", body: "Funciona em 99% dos veículos fabricados após 2008 com porta OBD-II padrão." },
          ].map((f, i) => (
            <div key={i} className="bg-[#0A0A0A] border border-white/10 p-8">
              <f.icon className="w-6 h-6 text-[#FF9500] mb-4" />
              <h3 className="heading text-xl mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trust band */}
      <section className="border-y border-white/10 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: ShieldCheck, t: "Compra segura", s: "SSL 256-bit" },
            { icon: Truck, t: "Frete grátis", s: "Todo o Brasil" },
            { icon: CheckCircle2, t: "12 meses", s: "Garantia oficial" },
            { icon: Lock, t: "PIX e Cartão", s: "5% off no PIX" },
          ].map((b, i) => (
            <div key={i} className="flex items-center gap-3">
              <b.icon className="w-6 h-6 text-[#FF9500]" />
              <div>
                <div className="text-sm font-semibold">{b.t}</div>
                <div className="text-xs text-zinc-400">{b.s}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
