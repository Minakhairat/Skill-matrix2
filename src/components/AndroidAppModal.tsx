import React, { useState } from 'react';
import { 
  X, 
  Smartphone, 
  Download, 
  CheckCircle2, 
  Layers, 
  WifiOff, 
  Zap, 
  ExternalLink, 
  Sparkles,
  ShieldCheck,
  Share2
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface AndroidAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAppModal: React.FC<AndroidAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'instant' | 'apk'>('instant');
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://minakhairat.github.io/Skill-matrix2/';

  const handleInstallNow = async () => {
    setIsInstalling(true);
    try {
      const success = await install();
      if (success) {
        setInstalledSuccess(true);
        setTimeout(() => {
          setInstalledSuccess(false);
          onClose();
        }, 2000);
      }
    } catch (e) {
      console.warn('Install prompt error:', e);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in" dir="rtl">
      <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">تطبيق MatrixPro لنظام أندرويد (Android)</h2>
                <span className="text-[10px] bg-emerald-400 text-slate-950 font-black px-2 py-0.5 rounded-full">
                  PWA / WebAPK
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                شغّل النظام كبرنامج أندرويد حقيقي على هاتفك أو تابلت المصنع
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('instant')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'instant'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-600" />
            <span>التثبيت الفوري بنقرة واحدة (موصى به)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'apk'
                ? 'bg-white text-indigo-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>تحميل كملف APK لمتجر Play</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          
          {installedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span className="font-bold">تم تثبيت التطبيق بنجاح! ستجده الآن في قائمة تطبيقات هاتفك 📱</span>
            </div>
          )}

          {activeTab === 'instant' ? (
            <div className="space-y-4">
              
              {/* Features summary badge grid */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <Zap className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <div className="font-bold text-slate-900 text-[11px]">بدون متجر</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">تثبيت فوري في 3 ثوانٍ</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <WifiOff className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <div className="font-bold text-slate-900 text-[11px]">يعمل بدون إنترنت</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">تخزين محلي فوري</div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <Layers className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                  <div className="font-bold text-slate-900 text-[11px]">شاشة كاملة</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">مثل أي تطبيق أندرويد أصلي</div>
                </div>
              </div>

              {/* Install trigger button */}
              {isInstalled ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-950 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <div className="font-bold">التطبيق مثبت حالياً على جهازك!</div>
                      <div className="text-[11px] text-emerald-700">أنت تستخدم التطبيق في الوضع المستقل (Standalone App).</div>
                    </div>
                  </div>
                </div>
              ) : isInstallable ? (
                <div className="p-4 bg-gradient-to-l from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl space-y-3">
                  <div className="font-bold text-emerald-950 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-700" />
                    <span>جاهز للتثبيت الفوري على هاتفك:</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">
                    المتصفح يدعم تثبيت التطبيق بنقرة زر واحدة دون الحاجة لأي خطوات يدوية.
                  </p>
                  <button
                    type="button"
                    onClick={handleInstallNow}
                    disabled={isInstalling}
                    className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstalling ? 'جارٍ التثبيت...' : 'تثبيت MatrixPro على هاتفك الآن'}</span>
                  </button>
                </div>
              ) : null}

              {/* Step-by-step instructions for Android Chrome */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>طريقة التثبيت على هواتف وأجهزة أندرويد (Google Chrome):</span>
                </div>
                <div className="space-y-2 pr-2 text-slate-700 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-700">أ.</span>
                    <span>افتح هذا الموقع في متصفح <strong>Google Chrome</strong> على هاتفك الأندرويد.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-700">ب.</span>
                    <span>اضغط على قائمة المتصفح (رمز الثلاث نقاط <strong>⋮</strong> في أعلى الشاشة).</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-700">ج.</span>
                    <span>اختر <strong>"تثبيت التطبيق" (Install app)</strong> أو <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home screen)</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-700">د.</span>
                    <span>اضغط على <strong>تثبيت (Install)</strong>، وسيتم إنشاء أيقونة التطبيق في شاشة هاتفك وقائمة برامجك تلقائياً كبرنامج WebAPK متكامل.</span>
                  </div>
                </div>
              </div>

              {/* iOS instructions */}
              {isIOS && (
                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl space-y-2 text-sky-950">
                  <div className="font-bold flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-sky-700" />
                    <span>لهواتف iPhone / iPad (Safari):</span>
                  </div>
                  <p className="text-[11px] text-sky-800 leading-relaxed">
                    اضغط على زر المشاركة <strong>Share</strong> في سفاري، ثم انزل للأسفل واختر <strong>"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</strong>.
                  </p>
                </div>
              )}

            </div>
          ) : (
            /* APK Download Tab */
            <div className="space-y-4">
              
              <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2 text-indigo-950">
                <div className="font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-700" />
                  <span>توليد ملف APK رسمي معتمد لمتجر Google Play:</span>
                </div>
                <p className="text-[11px] text-indigo-900 leading-relaxed">
                  نظراً لأن MatrixPro مبني بمعايير PWA القياسية العالمية (Web App Manifest + Service Worker + Icons)، يمكنك تحويله إلى ملف تثبيت <strong>APK / AAB</strong> أصلي عبر أداة مايكروسوفت وجوجل الرسمية <strong>PWABuilder</strong> مجاناً.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="font-bold text-slate-900">خطوات الحصول على ملف APK:</div>
                <ol className="list-decimal list-inside space-y-2 text-slate-700 pr-1 leading-relaxed">
                  <li>
                    انسخ رابط موقع MatrixPro الخاص بك:
                    <div className="font-mono text-[11px] bg-white p-2 rounded-lg border border-slate-300 text-indigo-700 select-all my-1 text-center dir-ltr">
                      {currentUrl}
                    </div>
                  </li>
                  <li>
                    افتح موقع <a href="https://www.pwabuilder.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold underline">PWABuilder.com</a> في متصفحك.
                  </li>
                  <li>
                    الصق الرابط واضغط على <strong>Start</strong> للتحقق من التوافق.
                  </li>
                  <li>
                    اضغط على زر <strong>Package for Android</strong> لتحميل حزمة <strong>APK / AAB</strong> جاهزة للتثبيت المباشر على أي هاتف أندرويد أو رفعها إلى متجر Google Play Console.
                  </li>
                </ol>

                <a
                  href="https://www.pwabuilder.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer mt-2"
                >
                  <span>فتح أداة PWABuilder الآن</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            نسخة PWA v2.0 • متوافق مع كافة إصدارات أندرويد 8.0+
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
