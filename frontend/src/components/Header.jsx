import { Link, NavLink, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, ShieldCheck, Menu, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export default function Header() {
  const { count } = useCart();
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="glass sticky top-0 z-50 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
        <Link to="/" data-testid="brand-link" className="flex items-center gap-2 group">
          <div className="w-8 h-8 bg-[#FF9500] flex items-center justify-center text-black font-bold">A</div>
          <span className="heading text-lg font-semibold tracking-tight">AutoVisor<span className="text-[#FF9500]">.</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm">
          <NavLink to="/" end data-testid="nav-home" className={({isActive}) => isActive ? "text-white" : "text-zinc-400 hover:text-white transition-colors"}>Início</NavLink>
          <NavLink to="/produto/hud-c3-navigation" data-testid="nav-navigation" className={({isActive}) => isActive ? "text-white" : "text-zinc-400 hover:text-white transition-colors"}>Navegação</NavLink>
          <NavLink to="/produto/hud-c3-alarms" data-testid="nav-alarms" className={({isActive}) => isActive ? "text-white" : "text-zinc-400 hover:text-white transition-colors"}>Multi-Alarmes</NavLink>
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-[#32D74B]" />
            <span>Compra segura</span>
          </div>

          {user && user.role === "admin" && (
            <Link to="/admin" data-testid="nav-admin" className="text-xs small-caps text-[#FF9500] hover:text-[#FFB340]">Admin</Link>
          )}

          {user ? (
            <div className="flex items-center gap-2">
              <Link to="/minha-conta" data-testid="nav-account" className="hidden sm:flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
                <User className="w-4 h-4" />
                <span className="max-w-[120px] truncate">{user.full_name?.split(" ")[0] || "Conta"}</span>
              </Link>
              <button data-testid="logout-btn" onClick={() => { logout(); nav("/"); }} className="text-zinc-400 hover:text-white">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link to="/login" data-testid="nav-login" className="text-sm text-zinc-300 hover:text-white">Entrar</Link>
          )}

          <Link to="/carrinho" data-testid="nav-cart" className="relative inline-flex items-center gap-2 px-4 py-2 btn-primary rounded-sm">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm">Carrinho</span>
            {count > 0 && (
              <span data-testid="cart-count" className="absolute -top-2 -right-2 bg-black text-[#FF9500] border border-[#FF9500] text-xs px-1.5 py-0.5 rounded-full mono">
                {count}
              </span>
            )}
          </Link>

          <button className="md:hidden text-white" onClick={() => setOpen(!open)} data-testid="mobile-menu-toggle">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-white/10 px-6 py-4 flex flex-col gap-3 bg-black">
          <NavLink to="/" end onClick={() => setOpen(false)} className="text-zinc-300">Início</NavLink>
          <NavLink to="/produto/hud-c3-navigation" onClick={() => setOpen(false)} className="text-zinc-300">HUD Navegação</NavLink>
          <NavLink to="/produto/hud-c3-alarms" onClick={() => setOpen(false)} className="text-zinc-300">HUD Multi-Alarmes</NavLink>
          {user && <Link to="/minha-conta" onClick={() => setOpen(false)} className="text-zinc-300">Minha conta</Link>}
        </div>
      )}
    </header>
  );
}
