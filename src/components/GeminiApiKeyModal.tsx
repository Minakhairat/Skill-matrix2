import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  X, 
  Key, 
  Check, 
  AlertCircle, 
  ExternalLink, 
  Trash2, 
  Cpu, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Globe,
  Server,
  ShieldCheck
} from 'lucide-react';
import { 
  getClientGeminiApiKey, 
  setClientGeminiApiKey, 
  removeClientGeminiApiKey, 
  testGeminiApiKey,
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
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const isStatic = isStaticDeployment();

  useEffect(() => {
    if (isOpen) {
      const current = getClientGeminiApiKey();
      setApiKeyInput(current);
      setHasSavedKey(Boolean(current && current.length > 0));
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKeyInput.trim();
    setClientGeminiApiKey(trimmed);
    setHasSavedKey(Boolean(trimmed.length > 0));
    setTestResult({
      success: true,
      message: trimmed ? 'تم حفظ المفتاح وتفعيل محرك Google Gemini AI بنجاح! 🚀' : 'تم مسح المفتاح والعودة للمحرك المدمج.'
    });
    if (onKeyUpdated) onKeyUpdated();
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleTestKey = async () => {
    if (!apiKeyInput.trim()) {
      setTestResult({ success: false, message: 'يرجى إدخال مفتاح الـ API أولاً قبل الفحص.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiApiKey(apiKeyInput.trim());
      setTestResult(res);
      if (res.success) {
        setClientGeminiApiKey(apiKeyInput.trim());
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
    setTestResult({ success: true, message: 'تم إزالة المفتاح بنجاح. سيعمل النظام الآن بالمحرك المدمج الاحتياطي.' });
    if (onKeyUpdated) onKeyUpdated();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>إعدادات Google Gemini AI</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/30 text-amber-300 font-normal">
                  لنسخة GitHub Pages
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                تفعيل الذكاء الاصطناعي الحقيقي من Google على الموقع المنشور
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-800 text-xs">
          
          {/* Explanation Alert */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
              <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>لماذا يظهر المحرك المدمج (MatrixPro AI) على GitHub Pages؟</span>
            </div>
            <p className="text-slate-700 text-[11px] leading-relaxed">
              استضافة <strong>GitHub Pages</strong> هي استضافة ثابتة (Static Web Host) لا تحتوي على سيرفر Node.js خلفي. لذلك يتحول النظام تلقائياً للمحرك المدمج لحين تزويده بمفتاح Gemini للاتصال المباشر.
            </p>
            <div className="flex items-center gap-2 pt-1 text-[11px] text-indigo-800 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>بوضع مفتاحك هنا، سيعمل شات Gemini والتشخيص الذكي بكامل طاقته مباشرة من متصفحك!</span>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${hasSavedKey ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              <span className="font-semibold text-slate-700">حالة الاتصال الحالية:</span>
            </div>
            <span className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
              hasSavedKey 
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {hasSavedKey ? 'متصل بـ Google Gemini AI ✅' : 'المحرك المدمج MatrixPro AI Engine'}
            </span>
          </div>

          {/* Input Field */}
          <div className="space-y-1.5">
            <label className="block font-bold text-slate-900 text-xs">
              مفتاح Google Gemini API Key:
            </label>
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
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title={showKey ? 'إخفاء' : 'إظهار'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              🔒 يُحفظ المفتاح محلياً في متصفحك (LocalStorage) ولا يتم تخزينه في أي خوادم خارجية.
            </p>
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

          {/* Get Free Key Link */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-800 block text-xs">
                ليس لديك مفتاح Gemini API بعد؟
              </span>
              <span className="text-[11px] text-slate-500">
                يمكنك إنشاء مفتاح مجاني رسمي بنقرة واحدة من منصة Google AI Studio
              </span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 transition-colors shadow-xs"
            >
              <span>إنشاء مفتاح مجاني</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* GitHub Repository Secrets Note */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
            <span className="font-bold block">💡 خيار للمطورين (تفعيل المفتاح لجميع المستخدمين على GitHub):</span>
            <p className="leading-relaxed text-amber-800">
              يمكنك إضافة سر باسم <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">GEMINI_API_KEY</code> في إعدادات مستودعك على GitHub تحت (Settings &gt; Secrets and variables &gt; Actions)، وسيتم تضمينه تلقائياً في البناء القادم.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>
            {hasSavedKey && (
              <button
                type="button"
                onClick={handleRemoveKey}
                className="flex items-center gap-1.5 px-3 py-2 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>مسح المفتاح</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !apiKeyInput.trim()}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-indigo-600' : ''}`} />
              <span>{isTesting ? 'جاري الفحص...' : 'فحص الاتصال'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5" />
              <span>حفظ وتفعيل فوراً</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
