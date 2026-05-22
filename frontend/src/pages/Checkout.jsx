import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { api, formatApiError } from "../lib/api";
import { maskCPF, maskCEP, maskPhone, maskCard, maskExpiry, validateCPF, onlyDigits, formatBRL } from "../lib/format";
import { ShieldCheck, Lock, ArrowRight, ArrowLeft, CheckCircle2, CreditCard, QrCode, Tag, X } from "lucide-react";
import { trackEvent } from "../lib/analytics";

export default function Checkout() {
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [shipping, setShipping] = useState({
    full_name: user?.full_name || "",
    cpf: user?.cpf || "",
    birth_date: user?.birth_date || "",
    phone: user?.phone || "",
    cep: user?.cep || "",
    street: user?.address_street || "",
    number: user?.address_number || "",
    complement: user?.address_complement || "",
    neighborhood: user?.address_neighborhood || "",
    city: user?.address_city || "",
    state: user?.address_state || "",
  });
  const [payment, setPayment] = useState("pix");
  const [card, setCard] = useState({ holder_name: "", number: "", expiry: "", cvv: "", installments: 1 });
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null); // { code, amount_cents, description }
  const [couponErr, setCouponErr] = useState("");

  async function applyCoupon() {
    setCouponErr("");
    if (!couponInput.trim()) return;
    try {
      const { data } = await api.post("/coupons/validate", { code: couponInput.trim() });
      setCoupon(data);
      setCouponInput("");
    } catch (e) {
      setCouponErr(formatApiError(e));
    }
  }

  function removeCoupon() {
    setCoupon(null);
    setCouponErr("");
  }

  useEffect(() => {
    if (!user) nav("/login?next=/checkout");
    else if (items.length === 0) nav("/carrinho");
    else trackEvent("begin_checkout");
  }, [user, items, nav]);

  const set = (k) => (e) => setShipping((p) => ({ ...p, [k]: e.target.value }));
  const setC = (k) => (e) => setCard((p) => ({ ...p, [k]: e.target.value }));

  async function handleCEP(v) {
    const masked = maskCEP(v);
    setShipping((p) => ({ ...p, cep: masked }));
    const digits = onlyDigits(masked);
    if (digits.length === 8) {
      try {
        const { data } = await api.get(`/cep/${digits}`);
        setShipping((p) => ({
          ...p,
          street: data.street || p.street,
          neighborhood: data.neighborhood || p.neighborhood,
          city: data.city || p.city,
          state: data.state || p.state,
        }));
      } catch (_) {}
    }
  }

  function validateShipping() {
    if (!shipping.full_name) return "Informe o nome completo";
    if (!validateCPF(shipping.cpf)) return "CPF inválido";
    if (!shipping.birth_date) return "Informe a data de nascimento";
    if (onlyDigits(shipping.phone).length < 10) return "Telefone inválido";
    if (onlyDigits(shipping.cep).length !== 8) return "CEP inválido";
    if (!shipping.street || !shipping.number || !shipping.neighborhood || !shipping.city || !shipping.state) return "Preencha o endereço completo";
    return "";
  }

  function nextStep() {
    setErr("");
    if (step === 1) {
      const e = validateShipping();
      if (e) { setErr(e); return; }
    }
    if (step === 2 && payment === "card") {
      if (!card.holder_name || onlyDigits(card.number).length < 13 || !card.expiry || onlyDigits(card.cvv).length < 3) {
        setErr("Preencha os dados do cartão corretamente");
        return;
      }
    }
    setStep(step + 1);
  }

  async function confirmOrder() {
    setErr(""); setLoading(true);
    try {
      const payload = {
        items: items.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
        payment_method: payment,
        shipping,
        card: payment === "card" ? card : null,
        coupon_code: coupon ? coupon.code : null,
      };
      const { data } = await api.post("/orders", payload);
      clear();
      nav(`/pedido-confirmado/${data.id}`);
    } catch (e) {
      setErr(formatApiError(e));
    } finally { setLoading(false); }
  }

  const couponDiscount = coupon ? Math.min(coupon.amount_cents, subtotal) : 0;
  const afterCoupon = subtotal - couponDiscount;
  const pixDiscount = payment === "pix" ? Math.round(afterCoupon * 0.05) : 0;
  const total = subtotal - couponDiscount - pixDiscount;
  const pixTotal = subtotal - couponDiscount - Math.round((subtotal - couponDiscount) * 0.05);

  return (
    <div className="max-w-5xl mx-auto px-6 py-12">
      <div className="flex items-center gap-2 text-xs small-caps text-[#FF9500] mb-3">
        <Lock className="w-3.5 h-3.5" /> Checkout 256-bit SSL
      </div>
      <h1 className="heading text-4xl mb-2">Finalizar compra</h1>

      <div className="flex items-center gap-2 mt-6 text-xs">
        {["Entrega", "Pagamento", "Revisão"].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span className={`w-7 h-7 inline-flex items-center justify-center mono ${step > i + 1 ? "bg-[#32D74B] text-black" : step === i + 1 ? "bg-[#FF9500] text-black" : "bg-white/10 text-zinc-400"}`}>
              {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </span>
            <span className={step >= i + 1 ? "text-white" : "text-zinc-500"}>{s}</span>
            {i < 2 && <span className="w-8 h-px bg-white/10 mx-2" />}
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-10 mt-10">
        <div className="lg:col-span-2 space-y-8">
          {step === 1 && (
            <section className="space-y-6" data-testid="checkout-step-shipping">
              <h2 className="heading text-2xl">Dados de entrega</h2>
              <div>
                <label className="small-caps">Nome completo (como no CPF)</label>
                <input data-testid="ck-full-name" required value={shipping.full_name} onChange={set("full_name")} className="field" />
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="small-caps">CPF</label>
                  <input data-testid="ck-cpf" required value={shipping.cpf} onChange={(e) => setShipping((p) => ({ ...p, cpf: maskCPF(e.target.value) }))} className="field" placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="small-caps">Data de nascimento</label>
                  <input data-testid="ck-birth" type="date" required value={shipping.birth_date} onChange={set("birth_date")} className="field" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="small-caps">Celular</label>
                  <input data-testid="ck-phone" required value={shipping.phone} onChange={(e) => setShipping((p) => ({ ...p, phone: maskPhone(e.target.value) }))} className="field" />
                </div>
                <div>
                  <label className="small-caps">CEP</label>
                  <input data-testid="ck-cep" required value={shipping.cep} onChange={(e) => handleCEP(e.target.value)} className="field" />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2">
                  <label className="small-caps">Rua</label>
                  <input data-testid="ck-street" required value={shipping.street} onChange={set("street")} className="field" />
                </div>
                <div>
                  <label className="small-caps">Número</label>
                  <input data-testid="ck-number" required value={shipping.number} onChange={set("number")} className="field" />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <label className="small-caps">Complemento</label>
                  <input data-testid="ck-complement" value={shipping.complement} onChange={set("complement")} className="field" placeholder="opcional" />
                </div>
                <div>
                  <label className="small-caps">Bairro</label>
                  <input data-testid="ck-neighborhood" required value={shipping.neighborhood} onChange={set("neighborhood")} className="field" />
                </div>
              </div>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="sm:col-span-2">
                  <label className="small-caps">Cidade</label>
                  <input data-testid="ck-city" required value={shipping.city} onChange={set("city")} className="field" />
                </div>
                <div>
                  <label className="small-caps">UF</label>
                  <input data-testid="ck-state" required maxLength={2} value={shipping.state} onChange={(e) => setShipping((p) => ({ ...p, state: e.target.value.toUpperCase() }))} className="field" />
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-6" data-testid="checkout-step-payment">
              <h2 className="heading text-2xl">Forma de pagamento</h2>

              {/* Coupon */}
              <div className="p-5 bg-[#16161A] border border-white/10">
                <div className="flex items-center gap-2 small-caps text-[#FF9500]"><Tag className="w-3.5 h-3.5" /> Cupom de desconto</div>
                {coupon ? (
                  <div className="mt-3 flex items-center justify-between gap-3 p-3 bg-[#32D74B]/10 border border-[#32D74B]/40">
                    <div className="text-sm">
                      <span className="mono font-semibold text-[#32D74B]">{coupon.code}</span>
                      <span className="text-zinc-300"> · {coupon.description}</span>
                    </div>
                    <button data-testid="remove-coupon" onClick={removeCoupon} className="text-zinc-400 hover:text-[#FF453A]">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex gap-2">
                      <input
                        data-testid="coupon-input"
                        type="text"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Digite o código (ex: BEMVINDO25)"
                        className="field flex-1"
                      />
                      <button data-testid="apply-coupon" type="button" onClick={applyCoupon} className="btn-outline px-4 py-2 rounded-sm text-sm whitespace-nowrap">
                        Aplicar
                      </button>
                    </div>
                    {couponErr && <div data-testid="coupon-error" className="mt-2 text-sm text-[#FF453A]">{couponErr}</div>}
                    <p className="mt-2 text-xs text-zinc-500">Dica: use <span className="mono text-[#FF9500]">BEMVINDO25</span> para R$ 25 de desconto na sua 1ª compra.</p>
                  </>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <button data-testid="payment-pix" type="button" onClick={() => setPayment("pix")} className={`p-5 text-left border ${payment === "pix" ? "border-pix bg-pix/5" : "border-white/15 bg-[#16161A]"}`}>
                  <div className="flex items-center justify-between">
                    <QrCode className="w-6 h-6 text-pix" />
                    <span className="small-caps text-pix">-5%</span>
                  </div>
                  <div className="font-semibold mt-3">PIX</div>
                  <div className="text-xs text-zinc-400">Aprovação imediata · {formatBRL(pixTotal)}</div>
                </button>
                <button data-testid="payment-card" type="button" onClick={() => setPayment("card")} className={`p-5 text-left border ${payment === "card" ? "border-[#FF9500] bg-[#FF9500]/5" : "border-white/15 bg-[#16161A]"}`}>
                  <CreditCard className="w-6 h-6 text-[#FF9500]" />
                  <div className="font-semibold mt-3">Cartão de Crédito</div>
                  <div className="text-xs text-zinc-400">Em até 12x · {formatBRL(subtotal - couponDiscount)}</div>
                </button>
              </div>

              {payment === "card" && (
                <div className="space-y-5 pt-4">
                  <div>
                    <label className="small-caps">Nome impresso no cartão</label>
                    <input data-testid="card-holder" required value={card.holder_name} onChange={setC("holder_name")} className="field" />
                  </div>
                  <div>
                    <label className="small-caps">Número do cartão</label>
                    <input data-testid="card-number" required value={card.number} onChange={(e) => setCard((p) => ({ ...p, number: maskCard(e.target.value) }))} className="field" placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="grid sm:grid-cols-3 gap-6">
                    <div>
                      <label className="small-caps">Validade</label>
                      <input data-testid="card-expiry" required value={card.expiry} onChange={(e) => setCard((p) => ({ ...p, expiry: maskExpiry(e.target.value) }))} className="field" placeholder="MM/AA" />
                    </div>
                    <div>
                      <label className="small-caps">CVV</label>
                      <input data-testid="card-cvv" required value={card.cvv} onChange={(e) => setCard((p) => ({ ...p, cvv: onlyDigits(e.target.value).slice(0, 4) }))} className="field" placeholder="123" />
                    </div>
                    <div>
                      <label className="small-caps">Parcelas</label>
                      <select data-testid="card-installments" value={card.installments} onChange={(e) => setCard((p) => ({ ...p, installments: parseInt(e.target.value) }))} className="field">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                          <option key={n} value={n} className="bg-black">{n}x de {formatBRL(Math.round((subtotal - couponDiscount) / n))} sem juros</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {payment === "pix" && (
                <div className="p-5 border border-pix/30 bg-pix/5 text-sm text-zinc-300">
                  Você receberá o QR Code PIX na próxima tela. O pedido será liberado em até <span className="text-pix font-semibold">2 minutos</span> após o pagamento.
                </div>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6" data-testid="checkout-step-review">
              <h2 className="heading text-2xl">Revise seu pedido</h2>
              <div className="border border-white/10 p-5 bg-[#16161A]">
                <h3 className="small-caps mb-3">Entrega</h3>
                <div className="text-sm text-zinc-300 leading-relaxed">
                  {shipping.full_name}<br/>
                  {shipping.street}, {shipping.number} {shipping.complement && `- ${shipping.complement}`}<br/>
                  {shipping.neighborhood}, {shipping.city} / {shipping.state}<br/>
                  CEP {shipping.cep} · {shipping.phone}
                </div>
              </div>
              <div className="border border-white/10 p-5 bg-[#16161A]">
                <h3 className="small-caps mb-3">Pagamento</h3>
                <div className="text-sm text-zinc-300">
                  {payment === "pix" ? (
                    <>PIX (-5%) · <span className="text-pix">{formatBRL(total)}</span></>
                  ) : (
                    <>Cartão final {card.number.slice(-4)} · {card.installments}x · {formatBRL(total)}</>
                  )}
                  {coupon && <div className="mt-2 text-xs text-[#32D74B]">Cupom <span className="mono">{coupon.code}</span> aplicado: -{formatBRL(couponDiscount)}</div>}
                </div>
              </div>
            </section>
          )}

          <div className="flex justify-between pt-6">
            <button data-testid="checkout-back" disabled={step === 1} onClick={() => setStep(step - 1)} className="btn-outline px-5 py-3 rounded-sm inline-flex items-center gap-2 disabled:opacity-30">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            {step < 3 ? (
              <button data-testid="checkout-next" onClick={nextStep} className="btn-primary px-6 py-3 rounded-sm inline-flex items-center gap-2">
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button data-testid="checkout-confirm" onClick={confirmOrder} disabled={loading} className="btn-primary px-6 py-3 rounded-sm inline-flex items-center gap-2 disabled:opacity-50">
                {loading ? "Processando..." : <>Confirmar pedido <CheckCircle2 className="w-4 h-4" /></>}
              </button>
            )}
          </div>

          {err && <div data-testid="checkout-error" className="text-sm text-[#FF453A] border border-[#FF453A]/30 bg-[#FF453A]/10 px-3 py-2 mt-4">{err}</div>}
        </div>

        <aside className="bg-[#16161A] border border-white/10 p-6 h-fit lg:sticky lg:top-24">
          <h2 className="heading text-lg mb-4">Resumo</h2>
          <div className="space-y-3 max-h-64 overflow-auto pr-1 no-scrollbar">
            {items.map((it) => (
              <div key={it.product_id} className="flex items-center gap-3 text-sm">
                <img src={it.image} alt="" className="w-12 h-12 object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{it.name}</div>
                  <div className="text-xs text-zinc-500 mono">{it.quantity} × {formatBRL(it.unit_price)}</div>
                </div>
                <div className="mono text-xs">{formatBRL(it.unit_price * it.quantity)}</div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 mt-5 pt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-zinc-400">Subtotal</span><span className="mono">{formatBRL(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Frete</span><span className="mono text-[#32D74B]">Grátis</span></div>
            {coupon && <div className="flex justify-between" data-testid="summary-coupon"><span className="text-[#32D74B]">Cupom {coupon.code}</span><span className="mono text-[#32D74B]">-{formatBRL(couponDiscount)}</span></div>}
            {payment === "pix" && pixDiscount > 0 && <div className="flex justify-between"><span className="text-pix">Desconto PIX (-5%)</span><span className="mono text-pix">-{formatBRL(pixDiscount)}</span></div>}
            <div className="flex justify-between border-t border-white/10 pt-2 text-base"><span>Total</span><span data-testid="summary-total" className="mono font-semibold">{formatBRL(total)}</span></div>
            {payment === "card" && coupon && <div className="text-xs text-pix mono pt-1">ou {formatBRL(pixTotal)} no PIX</div>}
          </div>
          <div className="mt-5 flex items-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-[#32D74B]" /> Compra protegida
          </div>
        </aside>
      </div>
    </div>
  );
}
