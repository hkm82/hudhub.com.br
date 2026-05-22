import { ShieldCheck, Lock, Truck, RotateCcw } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0F0F12] mt-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
        <div className="grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#FF9500] flex items-center justify-center text-black font-bold">A</div>
              <span className="heading text-lg font-semibold">AutoVisor<span className="text-[#FF9500]">.</span></span>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Tecnologia automotiva premium para uma direção mais segura e inteligente.
            </p>
          </div>
          <div>
            <h4 className="small-caps mb-4">Produtos</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li><a href="/produto/hud-c3-navigation" className="hover:text-white">HUD C3 Navegação</a></li>
              <li><a href="/produto/hud-c3-alarms" className="hover:text-white">HUD C3 Multi-Alarmes</a></li>
            </ul>
          </div>
          <div>
            <h4 className="small-caps mb-4">Atendimento</h4>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li>contato@autovisor.com.br</li>
              <li>(11) 4002-8922</li>
              <li>Seg a Sex, 9h às 18h</li>
            </ul>
          </div>
          <div>
            <h4 className="small-caps mb-4">Garantias</h4>
            <ul className="space-y-3 text-sm text-zinc-300">
              <li className="flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#32D74B]" /> Compra 100% segura</li>
              <li className="flex items-center gap-2"><Lock className="w-4 h-4 text-[#32D74B]" /> Dados criptografados</li>
              <li className="flex items-center gap-2"><Truck className="w-4 h-4 text-[#FF9500]" /> Frete grátis Brasil</li>
              <li className="flex items-center gap-2"><RotateCcw className="w-4 h-4 text-[#FF9500]" /> 7 dias para troca</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-3 text-xs text-zinc-500">
          <span>© 2026 AutoVisor Tecnologia LTDA. CNPJ 00.000.000/0001-00</span>
          <span>Todos os direitos reservados.</span>
        </div>
      </div>
    </footer>
  );
}
