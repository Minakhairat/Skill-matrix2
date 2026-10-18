import React from 'react';
import { ShieldCheck, Phone } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 lg:px-8 mt-auto no-print">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        
        {/* Brand, Copyright and Contact Phone */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-5 h-5 rounded bg-slate-900 text-white font-bold flex items-center justify-center text-[10px] shadow-2xs">
            M
          </div>
          <span className="font-bold text-slate-800">MatrixPro Industrial Engine</span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span className="font-semibold text-slate-900">
            جميع الحقوق محفوظة للمهندس مينا خيرت
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <a
            href="tel:01200224513"
            title="الاتصال بالمهندس مينا خيرت"
            className="inline-flex items-center gap-1.5 font-mono font-bold text-slate-900 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 px-2.5 py-1 rounded-md transition-colors"
            dir="ltr"
          >
            <Phone className="w-3.5 h-3.5 text-indigo-600" />
            <span>01200224513</span>
          </a>
        </div>

        {/* Quality and Manufacturing Trust Badges */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            نظام معتمد لإدارة المهارات وموازنة الخطوط ILU
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>إصدار 2026</span>
        </div>

      </div>
    </footer>
  );
};
