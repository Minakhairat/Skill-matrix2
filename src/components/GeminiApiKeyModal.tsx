import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Key, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Globe, 
  ShieldCheck,
  Mail,
  Copy,
  CheckCheck,
  Lock,
  ChevronLeft,
  Info
} from 'lucide-react';
import { 
  getClientGeminiApiKey, 
  setClientGeminiApiKey, 
  removeClientGeminiApiKey, 
  testGeminiApiKey,
  sanitizeApiKey,
  getClientUserEmail,
  setClientUserEmail,
  isStaticDeployment 
} from '../utils/geminiService';

interface GeminiApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated?: () => void;
}

export const GeminiApiKeyModal: React.FC<GeminiApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeyUpdated
}) => {
  const [userEmail, setUserEmail] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; model?: string } | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [savedEmail, setSavedEmail] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const isStatic = isStaticDeployment();

  useEffect(() => {
    if (isOpen) {
      const currentKey = getClientGeminiApiKey();
      const currentEmail = getClientUserEmail();
      setApiKeyInput(currentKey);
      setUserEmail(currentEmail);
      setSavedEmail(currentEmail);
      setHasSavedKey(Boolean(currentKey && currentKey.length > 0));
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Generate dynamic link directly targeting the user's specific Google account
  const trimmedEmail = userEmail.trim();
  const targetStudioUrl = trimmedEmail
    ? `https://accounts.google.com/AccountChooser?Email=${encodeURIComponent(trimmedEmail)}&continue=${encodeURIComponent('https://aistudio.google.com/app/apikey')}`
    : 'https://aistudio.google.com/app/apikey';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetStudioUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      // fallback
    }
  };

  const handleSave = () => {
    const cleanKey = sanitizeApiKey(apiKeyInput);
    const cleanEmail = userEmail.trim();

    setClientGeminiApiKey(cleanKey);
    setClientUserEmail(cleanEmail);

    setApiKeyInput(cleanKey);
    setUserEmail(cleanEmail);
    setSavedEmail(cleanEmail);
    setHasSavedKey(Boolean(cleanKey.length > 0));

    if (cleanKey) {
      setTestResult({
        success: true,
        message: cleanEmail 
          ? `تم حفظ المفتاح وربطه بحسابك (${cleanEmail}) بنجاح! 🚀 محرك Google Gemini AI نشط وخاص بجهازك الآن.`
          : 'تم حفظ المفتاح وتفعيل محرك Google Gemini AI بنجاح! 🚀 سيبدأ استخدامه فوراً في الشات والتشخيص.'
      });
    } else {
      setTestResult({
        success: true,
        message: 'تم مسح المفتاح والعودة للمحرك المدمج الاحتياطي MatrixPro AI Engine.'
      });
    }

    if (onKeyUpdated) onKeyUpdated();
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleTestKey = async () => {
    const cleanKey = sanitizeApiKey(apiKeyInput);
    if (!cleanKey) {
      setTestResult({ success: false, message: 'يرجى إدخال مفتاح الـ API أولاً قبل الفحص.' });
      return;
    }
    const cleanEmail = userEmail.trim();
    setApiKeyInput(cleanKey);
    if (cleanEmail) {
      setClientUserEmail(cleanEmail);
      setSavedEmail(cleanEmail);
    }
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testGeminiApiKey(cleanKey);
      setTestResult(res);
      if (res.success) {
        setClientGeminiApiKey(cleanKey);
        setHasSavedKey(true);
        if (onKeyUpdated) onKeyUpdated();
      }
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'حدث خطأ غير متوقع أثناء الفحص' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleRemoveKey = () => {
    removeClientGeminiApiKey();
    setApiKeyInput('');
    setHasSavedKey(false);
    setTestResult({ 
      success: true, 
      message: 'تمت إزالة المفتاح بنجاح. سيعمل النظام الآن بالمحرك المدمج الاحتياطي MatrixPro Engine.' 
    });
    if (onKeyUpdated) onKeyUpdated();
  };

  const handlePasteKey = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setApiKeyInput(sanitizeApiKey(text));
      }
    } catch (e) {
      // browser permissions
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-auto flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>تخصيص وربط Google Gemini AI بحسابك</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-400/20 border border-emerald-300/30 text-emerald-300 font-bold">
                  مفتاح خاص بكل مستخدم 🔒
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                أدخل بريدك الإلكتروني لإنشاء مفتاح الذكاء الاصطناعي الخاص بك والمجاني من Google
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh] text-slate-800 text-xs">
          
          {/* Active Status Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-3 h-3 rounded-full shrink-0 ${hasSavedKey ? 'bg-emerald-500 ring-4 ring-emerald-100 animate-pulse' : 'bg-amber-500'}`} />
              <div>
                <span className="font-bold text-slate-800 text-xs block">
                  {hasSavedKey ? 'حالة الذكاء الاصطناعي: متصل بـ Google Gemini ✅' : 'حالة الذكاء الاصطناعي: المحرك المدمج الاحتياطي'}
                </span>
                <span className="text-[11px] text-slate-500">
                  {hasSavedKey && savedEmail
                    ? `مربوط بالحساب الشخصي: ${savedEmail}`
                    : hasSavedKey
                    ? 'المفتاح نشط ومخزن محلياً في متصفحك'
                    : 'يمكنك إدخال إيميلك أدناه لإنشاء مفتاح خاص بك وتفعيل Gemini الحقيقي'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                hasSavedKey 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {hasSavedKey ? 'Google Gemini 2.5' : 'MatrixPro Offline'}
              </span>
            </div>
          </div>

          {/* Privacy & Dedicated Account Guarantee Banner */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl text-indigo-950 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="block font-bold text-indigo-950 mb-0.5">خصوصية تامة واستقلالية لكل مستخدم:</strong>
              يتم حفظ بريدك ومفتاحك محلياً في متصفحك الخاص (Client-side Local Storage) على جهازك فقط. لا يشاركك أي مستخدم آخر في حصتك المجانية من Google، ولا يستطيع أي طرف الاطلاع على مفتاحك.
            </div>
          </div>

          {/* 3-Step Interactive Wizard */}
          <div className="space-y-4">
            
            {/* Step 1: User Email */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">
                    1
                  </span>
                  <span>الخطوة الأولى: أدخل بريدك الإلكتروني (Gmail / Google)</span>
                </div>
                {trimmedEmail && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                    حسابك الشخصي
                  </span>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="أدخل بريدك الإلكتروني هنا (مثال: yourname@gmail.com)"
                  dir="ltr"
                  className="w-full pr-10 pl-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                💡 هذا البريد يُستخدم لفتح صفحة Google AI Studio الخاصة بك مباشرة لإنشاء المفتاح الخاص بك مجاناً.
              </p>
            </div>

            {/* Step 2: Open Google AI Studio to Create Key */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-indigo-950 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">
                    2
                  </span>
                  <span>الخطوة الثانية: اضغط لإنشاء المفتاح بحسابك على Google</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  مجاني 100% مدى الحياة
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-indigo-100 space-y-2 text-[11px] text-slate-700">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Info className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>طريقة إنشاء المفتاح في ثوانٍ داخل صفحة Google:</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 pr-1">
                  <li>اضغط على الزر الأزرق أدناه لفتح صفحة المفاتيح بحسابك.</li>
                  <li>في صفحة Google AI Studio، اضغط على زر <strong className="text-indigo-900">"Create API Key"</strong> أو <strong className="text-indigo-900">"Get API key"</strong>.</li>
                  <li>اختر أي مشروع أو اضغط "Create key in new project" (بدون بطاقة ائتمان نهائياً).</li>
                  <li>اضغط زر <strong className="text-indigo-900">Copy</strong> لنسخ رمز المفتاح.</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <a
                  href={targetStudioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {trimmedEmail 
                      ? `فتح صفحة Google AI Studio وإنشاء المفتاح لحساب (${trimmedEmail})`
                      : 'فتح صفحة Google AI Studio لإنشاء المفتاح المجاني'}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="نسخ رابط صفحة المفاتيح"
                  className="px-3 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                >
                  {copiedLink ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ الرابط'}</span>
                </button>
              </div>
            </div>

            {/* Step 3: Paste and Save Key */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                  <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-black">
                    3
                  </span>
                  <span>الخطوة الثالثة: ألصق المفتاح هنا واضغط تفعيل</span>
                </div>
                <button
                  type="button"
                  onClick={handlePasteKey}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>لصق من الحافظة</span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                  <Key className="w-4 h-4" />
                </div>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="ألصق مفتاح Gemini هنا (يبدأ بـ AIzaSy...)"
                  dir="ltr"
                  className="w-full pl-10 pr-9 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-slate-900"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title={showKey ? 'إخفاء' : 'إظهار'}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Test Status Message */}
              {testResult && (
                <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-[11px] leading-relaxed animate-in fade-in duration-150 ${
                  testResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {testResult.success ? (
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 font-medium">
                    {testResult.message}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* GitHub Pages Note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600" />
              <span>معلومة لمستخدمي الموقع على GitHub Pages:</span>
            </span>
            <p className="leading-relaxed">
              بما أن الموقع مستضاف كصفحة ويب ثابتة (Client-Side)، فإن كل مستخدم أو مهندس يفتح الرابط يمكنه كتابة إيميله ومفتاحه الخاص ليعمل معه النظام بحسابه المستقل تماماً، بدون أن يتداخل مع أي مستخدم آخر.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>
            {(hasSavedKey || userEmail) && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح المفتاح والعودة للمحرك المدمج</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !apiKeyInput.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isTesting ? 'جاري الفحص...' : 'فحص الاتصال الفعلي'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>حفظ وتفعيل المفتاح لحسابي</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
