import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { maskCPF, maskCEP, maskPhone, validateCPF, onlyDigits } from "../lib/format";
import { Lock, ArrowRight, ShieldCheck } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get("next") || "/";

  const [f, setF] = useState({
    email: "", password: "", full_name: "", cpf: "", phone: "", cep: "",
    address_street: "", address_number: "", address_complement: "",
    address_neighborhood: "", address_city: "", address_state: "",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  async function handleCEP(v) {
    const masked = maskCEP(v);
    setF((p) => ({ ...p, cep: masked }));
    const digits = onlyDigits(masked);
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const { data } = await api.get(`/cep/${digits}`);
        setF((p) => ({
          ...p,
          address_street: data.street || p.address_street,
          address_neighborhood: data.neighborhood || p.address_neighborhood,
          address_city: data.city || p.address_city,
          address_state: data.state || p.address_state,
        }));
      } catch (err) { console.warn("CEP lookup failed", err); } finally { setCepLoading(false); }
    }
  }

  async function submit(e) {
    e.preventDefault();
    setErr("");
    if (!validateCPF(f.cpf)) { setErr("CPF inválido"); return; }
    if (f.password.length < 6) { setErr("Senha deve ter ao menos 6 caracteres"); return; }
    setLoading(true);
    try {
      await register({
        ...f,
        cpf: f.cpf,
        cep: f.cep,
        phone: f.phone,
      });
      nav(next);
    } catch (e) {
      setErr(e.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="inline-flex items-center gap-2 text-xs small-caps text-[#FF9500] mb-4">
        <ShieldCheck className="w-3.5 h-3.5" /> Cadastro seguro
      </div>
      <h1 className="heading text-4xl">Crie sua conta</h1>
      <p className="text-zinc-400 mt-2">Os dados abaixo serão usados apenas para entregar o produto e emitir a nota fiscal.</p>

      <form onSubmit={submit} className="mt-10 space-y-6" data-testid="register-form">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="small-caps">E-mail</label>
            <input data-testid="reg-email" type="email" required value={f.email} onChange={set("email")} className="field" placeholder="seu@email.com" />
          </div>
          <div>
            <label className="small-caps">Senha</label>
            <input data-testid="reg-password" type="password" required value={f.password} onChange={set("password")} className="field" placeholder="mínimo 6 caracteres" />
          </div>
        </div>

        <div>
          <label className="small-caps">Nome completo (como no CPF)</label>
          <input data-testid="reg-full-name" required value={f.full_name} onChange={set("full_name")} className="field" placeholder="Maria da Silva Santos" />
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="small-caps">CPF</label>
            <input data-testid="reg-cpf" required value={f.cpf} onChange={(e) => setF((p) => ({ ...p, cpf: maskCPF(e.target.value) }))} className="field" placeholder="000.000.000-00" />
          </div>
          <div>
            <label className="small-caps">Celular</label>
            <input data-testid="reg-phone" required value={f.phone} onChange={(e) => setF((p) => ({ ...p, phone: maskPhone(e.target.value) }))} className="field" placeholder="(11) 99999-9999" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <div>
            <label className="small-caps">CEP {cepLoading && <span className="text-[#FF9500]">· buscando…</span>}</label>
            <input data-testid="reg-cep" required value={f.cep} onChange={(e) => handleCEP(e.target.value)} className="field" placeholder="00000-000" />
          </div>
          <div className="sm:col-span-2">
            <label className="small-caps">Rua / Logradouro</label>
            <input data-testid="reg-street" required value={f.address_street} onChange={set("address_street")} className="field" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <div>
            <label className="small-caps">Número</label>
            <input data-testid="reg-number" required value={f.address_number} onChange={set("address_number")} className="field" />
          </div>
          <div>
            <label className="small-caps">Complemento</label>
            <input data-testid="reg-complement" value={f.address_complement} onChange={set("address_complement")} className="field" placeholder="opcional" />
          </div>
          <div>
            <label className="small-caps">Bairro</label>
            <input data-testid="reg-neighborhood" required value={f.address_neighborhood} onChange={set("address_neighborhood")} className="field" />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          <div className="sm:col-span-2">
            <label className="small-caps">Cidade</label>
            <input data-testid="reg-city" required value={f.address_city} onChange={set("address_city")} className="field" />
          </div>
          <div>
            <label className="small-caps">Estado (UF)</label>
            <input data-testid="reg-state" required maxLength={2} value={f.address_state} onChange={(e) => setF((p) => ({ ...p, address_state: e.target.value.toUpperCase() }))} className="field" placeholder="SP" />
          </div>
        </div>

        {err && <div data-testid="register-error" className="text-sm text-[#FF453A] border border-[#FF453A]/30 bg-[#FF453A]/10 px-3 py-2">{err}</div>}

        <p className="text-xs text-zinc-500 flex items-center gap-2"><Lock className="w-3 h-3" /> Seus dados são criptografados e nunca compartilhados.</p>

        <button data-testid="register-submit" disabled={loading} className="w-full btn-primary px-5 py-3 rounded-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? "Criando conta..." : <>Criar conta <ArrowRight className="w-4 h-4" /></>}
        </button>

        <p className="text-sm text-zinc-400 text-center">
          Já tem conta? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} data-testid="link-to-login" className="text-[#FF9500] hover:underline">Entrar</Link>
        </p>
      </form>
    </div>
  );
}
