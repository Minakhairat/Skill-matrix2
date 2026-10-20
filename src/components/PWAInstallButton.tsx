import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, Check, X, Share2, PlusSquare, Sparkles, HelpCircle } from 'lucide-react';
import { AndroidAppModal } from './AndroidAppModal';

interface PWAInstallButtonProps {
  variant?: 'header' | 'compact' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed as an app and running standalone, do not show install prompt
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
        <Check className="w-3.5 h-3.5 text-emerald-600" />
        <span className="hidden sm:inline">تطبيق مثبت</span>
        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      // If browser doesn't expose beforeinstallprompt yet (or iOS / in-app browser), open clear guide
      setShowGuideModal(true);
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className="flex items-center justify-between gap-3 p-3 bg-gradient-to-l from-indigo-900 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-700/40 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold">تطبيق MatrixPro للأندرويد والهاتف</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded-full font-bold border border-emerald-500/30">PWA</span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                ثبت التطبيق مباشرة على هاتفك ليعمل كبرنامج أندرويد سريع بدون متجر وبدون الحاجة لفتح المتصفح في كل مرة.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تثبيت الآن</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          title="تثبيت MatrixPro كبرنامج أندرويد على هاتفك أو حاسوبك"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap animate-in fade-in"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-100" />
          <span className="hidden sm:inline">تطبيق أندرويد</span>
          <span className="sm:hidden">أندرويد 📱</span>
        </button>
      )}

      <AndroidAppModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
};
