import React from 'react';
import { useApp } from '../context/AppContext';
import { CheckCheck, X, ShieldCheck } from 'lucide-react';

export const WhatsAppLivePopup: React.FC = () => {
  const { lastWhatsAppMessage, setLastWhatsAppMessage } = useApp();

  if (!lastWhatsAppMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm sm:max-w-md w-full animate-in fade-in slide-in-from-bottom-6 duration-300">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden font-sans text-slate-800">
        {/* WhatsApp Light Header */}
        <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
              🏫
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs">SMA Harapan Nusantara</span>
                <span className="w-3.5 h-3.5 rounded-full bg-white text-emerald-700 flex items-center justify-center text-[9px] font-bold">
                  ✓
                </span>
              </div>
              <div className="text-[10px] text-emerald-100 font-mono">
                Notifikasi WA Terkirim ke: {lastWhatsAppMessage.parentPhone}
              </div>
            </div>
          </div>

          <button
            onClick={() => setLastWhatsAppMessage(null)}
            className="text-emerald-100 hover:text-white p-1 rounded-lg hover:bg-emerald-700/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* WhatsApp Light Chat Body */}
        <div className="p-3.5 bg-[#efeae2] space-y-2">
          {/* WhatsApp Chat Bubble */}
          <div className="bg-[#d9fdd3] text-slate-900 rounded-xl rounded-tr-none p-3.5 shadow-xs text-xs relative max-w-[94%] ml-auto space-y-1.5 border border-emerald-200/50">
            <div className="whitespace-pre-line leading-relaxed text-[11.5px] font-sans">
              {lastWhatsAppMessage.content}
            </div>

            {/* Bubble Footer */}
            <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 pt-1">
              <span>{lastWhatsAppMessage.timestamp}</span>
              <CheckCheck className="w-3.5 h-3.5 text-sky-600 font-bold" />
            </div>
          </div>

          <div className="text-center pt-1">
            <span className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Notifikasi resmi otomatis BioPass Edge Gateway (UU PDP Compliant)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
