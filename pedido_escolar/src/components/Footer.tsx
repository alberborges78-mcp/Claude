import React from 'react';
import { MapPin, Phone, ExternalLink, Clock, ShieldCheck } from 'lucide-react';
import { db } from '../services/db';

export const Footer: React.FC = () => {
  const store = db.getStore();

  return (
    <footer className="bg-gray-950 text-gray-300 border-t border-gray-800/80 pt-12 pb-8 mt-auto no-print">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-10 mb-12">
          {/* ── 1. Informações da Marca e Selo Institucional ────────────── */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg text-white shadow-xs">
                7
              </div>
              <span className="font-black text-xl text-white tracking-tight font-display">
                SEVEN MALHARIA
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Especialistas em uniformes escolares, esportivos e promocionais de alta durabilidade e acabamento premium.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 p-3 rounded-xl">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Fornecedor Oficial Autorizado • Colégio Conceito</span>
            </div>
          </div>

          {/* ── 2. Localização Física e Retirada ───────────────────────── */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>Local de Retirada</span>
            </h4>
            <p className="text-sm font-semibold text-white leading-snug">
              {store.address}
            </p>
            <p className="text-xs text-gray-400">
              Macapá - AP | Atrás do SENAI
            </p>
            <div className="pt-1">
              <a
                href={store.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                aria-label="Abrir localização da Seven Malharia no Google Maps"
              >
                <ExternalLink className="w-4 h-4" />
                <span>ABRIR NO GOOGLE MAPS</span>
              </a>
            </div>
          </div>

          {/* ── 3. Atendimento e Suporte WhatsApp ──────────────────────── */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-blue-400" />
              <span>Atendimento e Dúvidas</span>
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Precisa de auxílio com seu pedido escolar ou tamanhos especiais? Entre em contato direto com a nossa equipe:
            </p>
            <div className="pt-0.5">
              <a
                href="https://wa.me/5596991605151?text=Ol%C3%A1%2C%20gostaria%20de%20informa%C3%A7%C3%B5es%20sobre%20os%20pedidos%20de%20uniforme%20escolar%20do%20Col%C3%A9gio%20Conceito."
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs active:scale-95"
                aria-label="Falar com o atendimento no WhatsApp"
              >
                <Phone className="w-4 h-4" />
                <span>WhatsApp: (96) 99160-5151</span>
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
              <Clock className="w-4 h-4 text-gray-500 shrink-0" />
              <span>Segunda a Sexta: 08:00 às 18:00 | Sábado: 08:00 às 12:00</span>
            </div>
          </div>
        </div>

        {/* ── Linha Inferior de Copyright ────────────────────────────────── */}
        <div className="border-t border-gray-800/80 pt-6 text-center text-xs text-gray-500 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Seven Malharia. Todos os direitos reservados.</p>
          <p className="text-xs text-gray-500">Sistema Seguro de Campanhas Escolares</p>
        </div>
      </div>
    </footer>
  );
};

