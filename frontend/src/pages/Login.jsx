import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, KeyRound, ArrowRight } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const next = sp.get("next") || "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      await login(email, password);
      nav(next);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-20">
      <div className="inline-flex items-center gap-2 text-xs small-caps text-[#FF9500] mb-4">
        <Lock className="w-3.5 h-3.5" /> Área segura
      </div>
      <h1 className="heading text-4xl">Bem-vindo de volta</h1>
      <p className="text-zinc-400 mt-2">Entre para continuar sua compra.</p>

      <form onSubmit={submit} className="mt-10 space-y-8" data-testid="login-form">
        <div>
          <label className="small-caps">E-mail</label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input data-testid="login-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field pl-6" placeholder="seu@email.com" />
          </div>
        </div>
        <div>
          <label className="small-caps">Senha</label>
          <div className="relative">
            <KeyRound className="w-4 h-4 absolute left-0 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input data-testid="login-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field pl-6" placeholder="••••••••" />
          </div>
        </div>

        {err && <div data-testid="login-error" className="text-sm text-[#FF453A] border border-[#FF453A]/30 bg-[#FF453A]/10 px-3 py-2">{err}</div>}

        <button data-testid="login-submit" disabled={loading} className="w-full btn-primary px-5 py-3 rounded-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">
          {loading ? "Entrando..." : <>Entrar <ArrowRight className="w-4 h-4" /></>}
        </button>

        <p className="text-sm text-zinc-400 text-center">
          Não tem conta? <Link to={`/cadastro${next ? `?next=${encodeURIComponent(next)}` : ""}`} data-testid="link-to-register" className="text-[#FF9500] hover:underline">Cadastre-se</Link>
        </p>
      </form>
    </div>
  );
}
