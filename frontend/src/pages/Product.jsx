import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatBRL } from "../lib/format";
import { useCart } from "../context/CartContext";
import { ShoppingCart, ShieldCheck, Truck, RotateCcw, Lock, Star, Check, Minus, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "../lib/analytics";

export default function Product() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [activeImg, setActiveImg] = useState(0);
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();
  const nav = useNavigate();

  useEffect(() => {
    setActiveImg(0);
    api.get(`/products/${id}`).then((r) => setProduct(r.data)).catch(() => setProduct(false));
    trackEvent("view_product", id);
  }, [id]);

  if (product === null) {
    return <div className="max-w-7xl mx-auto p-20 text-center text-zinc-400">Carregando...</div>;
  }
  if (product === false) {
    return (
      <div className="max-w-7xl mx-auto p-20 text-center">
        <p className="text-zinc-400">Produto não encontrado.</p>
        <Link to="/" className="text-[#FF9500] mt-4 inline-block">Voltar à loja</Link>
      </div>
    );
  }

  function handleAdd(buyNow = false) {
    addItem(product, qty);
    trackEvent("add_to_cart", product.id);
    toast.success("Adicionado ao carrinho", { description: product.name });
    if (buyNow) nav("/carrinho");
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
      <div className="text-xs text-zinc-500 mb-6">
        <Link to="/" className="hover:text-white">Início</Link>
        <span className="mx-2">/</span>
        <span className="text-zinc-300">{product.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Gallery */}
        <div>
          <div className="bg-[#16161A] border border-white/10 aspect-square overflow-hidden">
            <img
              src={product.images[activeImg]}
              alt={product.name}
              data-testid="product-main-image"
              className="w-full h-full object-cover"
            />
          </div>
          {product.image_captions && product.image_captions[activeImg] && (
            <div className="mt-3 px-4 py-3 bg-[#1A1A1E] border border-white/10 text-sm text-zinc-300 leading-relaxed">
              <span className="small-caps text-[#FF9500] block mb-1">Sobre esta imagem</span>
              {product.image_captions[activeImg]}
              <span className="block mt-1 text-xs text-zinc-500">Obs.: textos em inglês na foto são do fabricante. Tradução acima.</span>
            </div>
          )}
          <div className="grid grid-cols-4 gap-3 mt-3">
            {product.images.map((img, i) => (
              <button
                key={i}
                onClick={() => setActiveImg(i)}
                data-testid={`product-thumb-${i}`}
                className={`aspect-square border ${activeImg === i ? "border-[#FF9500]" : "border-white/10"} overflow-hidden`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Info */}
        <div>
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs small-caps ${product.edition === "navigation" ? "bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/30" : "bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30"}`}>
            {product.edition === "navigation" ? "Edição Navegação" : "Edição Multi-Alarmes"}
          </span>
          <h1 className="heading text-4xl sm:text-5xl font-medium mt-4">{product.name}</h1>
          <p className="text-zinc-400 mt-3 leading-relaxed">{product.tagline}</p>

          <div className="flex items-center gap-1 mt-4 text-sm">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < Math.round(product.rating) ? "text-[#FFD60A] fill-[#FFD60A]" : "text-zinc-700"}`} />
            ))}
            <span className="ml-2 mono text-xs text-zinc-400">{product.rating} · {product.reviews} avaliações verificadas</span>
          </div>

          <div className="mt-8 p-6 bg-[#16161A] border border-white/10">
            <span className="text-xs text-zinc-500 line-through mono">De {formatBRL(product.compare_price)}</span>
            <div className="flex items-baseline gap-3 mt-1">
              <span className="heading text-4xl font-medium">{formatBRL(product.price)}</span>
              <span className="text-sm text-zinc-400">no cartão em até 12x</span>
            </div>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-pix/10 text-pix border border-pix/30 text-sm mono">
              ou {formatBRL(Math.round(product.price * 0.95))} no PIX (-5%)
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="inline-flex items-center border border-white/15">
              <button data-testid="qty-dec" onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-10 h-12 hover:bg-white/5"><Minus className="w-4 h-4 mx-auto" /></button>
              <span data-testid="qty-value" className="w-10 text-center mono">{qty}</span>
              <button data-testid="qty-inc" onClick={() => setQty((q) => q + 1)} className="w-10 h-12 hover:bg-white/5"><Plus className="w-4 h-4 mx-auto" /></button>
            </div>
            <button data-testid="add-to-cart-btn" onClick={() => handleAdd(false)} className="flex-1 btn-outline px-5 py-3 rounded-sm inline-flex items-center justify-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Adicionar ao carrinho
            </button>
          </div>
          <button data-testid="buy-now-btn" onClick={() => handleAdd(true)} className="mt-3 w-full btn-primary px-5 py-3 rounded-sm inline-flex items-center justify-center gap-2">
            Comprar agora <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-4 mt-8 text-sm">
            <div className="flex items-center gap-2 text-zinc-300"><Truck className="w-4 h-4 text-[#FF9500]" /> Frete grátis</div>
            <div className="flex items-center gap-2 text-zinc-300"><ShieldCheck className="w-4 h-4 text-[#32D74B]" /> Compra segura</div>
            <div className="flex items-center gap-2 text-zinc-300"><RotateCcw className="w-4 h-4 text-[#FF9500]" /> 7 dias para troca</div>
            <div className="flex items-center gap-2 text-zinc-300"><Lock className="w-4 h-4 text-[#32D74B]" /> 12 meses de garantia</div>
          </div>
        </div>
      </div>

      {/* Unique Features (firmware-specific differentiators) */}
      {product.unique_features && (
        <section className="mt-20">
          <div className={`inline-flex items-center gap-2 px-3 py-1 text-xs small-caps ${product.edition === "navigation" ? "bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/30" : "bg-[#FF453A]/15 text-[#FF453A] border border-[#FF453A]/30"}`}>
            ★ Exclusivo desta edição
          </div>
          <h2 className="heading text-3xl sm:text-4xl mt-4">
            {product.edition === "navigation" ? "O que torna a Edição Navegação única." : "O que torna a Edição Multi-Alarmes única."}
          </h2>
          <p className="text-zinc-400 mt-3 max-w-2xl">
            Mesmo hardware da outra edição, mas com firmware especializado. Veja abaixo as funções que <strong className="text-white">só esta versão</strong> oferece:
          </p>
          <div className="grid md:grid-cols-3 gap-4 mt-8">
            {product.unique_features.map((f, i) => (
              <div
                key={i}
                data-testid={`unique-feature-${i}`}
                className={`relative p-6 bg-[#1C1C20] border-2 ${product.edition === "navigation" ? "border-[#0A84FF]/40" : "border-[#FF453A]/40"}`}
              >
                <div className={`absolute -top-3 left-4 px-2 py-0.5 text-xs mono ${product.edition === "navigation" ? "bg-[#0A84FF] text-white" : "bg-[#FF453A] text-white"}`}>
                  #{(i + 1).toString().padStart(2, "0")}
                </div>
                <h3 className="heading text-lg font-medium mt-2">{f.title}</h3>
                <p className="text-sm text-zinc-300 leading-relaxed mt-3">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Highlights */}
      <section className="mt-20">
        <span className="small-caps text-[#FF9500]">Destaques</span>
        <h2 className="heading text-3xl sm:text-4xl mt-3">Tecnologia que protege.</h2>
        <ul className="mt-8 grid md:grid-cols-2 gap-3">
          {product.highlights.map((h, i) => (
            <li key={i} className="flex items-start gap-3 p-4 bg-[#16161A] border border-white/10">
              <Check className="w-5 h-5 text-[#32D74B] flex-shrink-0 mt-0.5" />
              <span className="text-zinc-200">{h}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Compatibility */}
      {product.compatibility && (
        <section className="mt-20" data-testid="compatibility-section">
          <span className="small-caps text-[#FF9500]">Compatibilidade</span>
          <h2 className="heading text-3xl sm:text-4xl mt-3">Funciona no seu carro?</h2>
          <p className="text-zinc-300 mt-3 max-w-3xl leading-relaxed">{product.compatibility.summary}</p>

          <div className="mt-8 border border-white/10 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 px-6 py-3 bg-[#1A1A1E] border-b border-white/10 text-xs small-caps text-zinc-400">
              <span>Marca</span>
              <span className="sm:col-span-2">Modelos compatíveis</span>
            </div>
            {product.compatibility.brands.map((b, i) => (
              <div key={b.name} className={`grid grid-cols-1 sm:grid-cols-3 gap-2 px-6 py-4 ${i % 2 === 0 ? "bg-[#16161A]" : "bg-[#1A1A1E]"}`}>
                <span className="font-semibold text-white">{b.name}</span>
                <span className="sm:col-span-2 text-zinc-300 text-sm">{b.models}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <div className="p-4 bg-[#16161A] border border-[#32D74B]/30">
              <div className="flex items-center gap-2 small-caps text-[#32D74B]"><Check className="w-4 h-4" /> Compatível</div>
              <p className="text-sm text-zinc-300 mt-2 leading-relaxed">
                Todos os carros com porta OBD-II, fabricados a partir de 2008 — gasolina, flex, diesel, híbridos e elétricos.
              </p>
            </div>
            <div className="p-4 bg-[#16161A] border border-[#FF453A]/30">
              <div className="flex items-center gap-2 small-caps text-[#FF453A]">✗ Não compatível</div>
              <ul className="text-sm text-zinc-300 mt-2 space-y-1">
                {product.compatibility.not_compatible.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-xs text-zinc-500 mt-4">
            Em dúvida sobre seu modelo? Procure por <span className="mono text-zinc-300">"OBD-II"</span> no manual do seu carro ou abaixo do volante. Se houver o conector trapezoidal de 16 pinos, é compatível.
          </p>
        </section>
      )}

      {/* Specs */}
      <section className="mt-20">
        <span className="small-caps text-[#FF9500]">Especificações</span>
        <h2 className="heading text-3xl sm:text-4xl mt-3">Ficha técnica completa.</h2>
        <div className="mt-8 border border-white/10">
          {Object.entries(product.specs).map(([k, v], i) => (
            <div key={k} className={`grid grid-cols-1 sm:grid-cols-3 gap-2 px-6 py-4 ${i % 2 === 0 ? "bg-[#16161A]" : "bg-[#1A1A1E]"}`}>
              <span className="small-caps text-zinc-400">{k}</span>
              <span className="sm:col-span-2 text-zinc-200">{v}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-xs text-zinc-500">
        {product.short_description}
      </p>
    </div>
  );
}
