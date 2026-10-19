import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  LogOut, 
  Cloud, 
  Database, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw,
  Mail,
  User,
  Copy,
  ExternalLink,
  Globe
} from 'lucide-react';
import { ProductionLine, AppUser, UserRole } from '../types/matrix';
import { loginWithGoogle, logoutUser, DEFAULT_ADMIN_EMAILS, auth, setUserRole } from '../utils/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  onUserChange: (user: AppUser | null) => void;
  lines: ProductionLine[];
  onSyncAllToCloud?: () => Promise<void>;
  isSyncing?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  lines,
  onSyncAllToCloud,
  isSyncing = false
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [initialRoleChoice, setInitialRoleChoice] = useState<UserRole>('admin');
  const [isUnauthorizedDomain, setIsUnauthorizedDomain] = useState(false);
  const [domainCopied, setDomainCopied] = useState(false);

  const currentHostname = typeof window !== 'undefined' ? (window.location.hostname || 'minakhairat.github.io') : 'minakhairat.github.io';
  const firebaseSettingsUrl = 'https://console.firebase.google.com/project/gen-lang-client-0761904551/authentication/settings';

  if (!isOpen) return null;

  const handleCopyDomain = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(currentHostname);
      setDomainCopied(true);
      setTimeout(() => setDomainCopied(false), 2000);
    }
  };

  const handleGoogleSignIn = async (roleChoice: UserRole = initialRoleChoice) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      setIsUnauthorizedDomain(false);
      const user = await loginWithGoogle();
      const normalizedEmail = (user.email || '').toLowerCase().trim();
      const isDefaultAdmin = DEFAULT_ADMIN_EMAILS.includes(normalizedEmail);

      // Find lines assigned to this supervisor
      const assigned = lines
        .filter(l => (l.supervisorEmail || '').toLowerCase().trim() === normalizedEmail)
        .map(l => l.id);

      // Determine role: if pre-approved admin email or user picked admin -> admin; else supervisor
      let finalRole: UserRole = isDefaultAdmin || roleChoice === 'admin' ? 'admin' : 'supervisor';

      const newAppUser: AppUser = {
        uid: user.uid,
        email: normalizedEmail,
        displayName: user.displayName || user.email || 'مستخدم',
        role: finalRole,
        assignedLineIds: assigned
      };

      // Persist role in Firestore
      await setUserRole(user, finalRole, assigned);

      onUserChange(newAppUser);
      setSuccessMsg(`تم تسجيل الدخول بنجاح كـ ${finalRole === 'admin' ? 'مدير النظام (Admin)' : 'مشرف خط'}!`);
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Login error:', err);
      const isUnauth = err?.code === 'auth/unauthorized-domain' || 
                       String(err?.message || '').toLowerCase().includes('unauthorized-domain');
      setIsUnauthorizedDomain(isUnauth);
      if (isUnauth) {
        setErrorMsg(`النطاق (${currentHostname}) غير مضاف في قائمة النطاقات المصرح بها في إعدادات Firebase Authentication.`);
      } else {
        setErrorMsg(err?.message || 'تعذر تسجيل الدخول بواسطة Google. يرجى المحاولة مجدداً.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (newRole: UserRole) => {
    if (!currentUser) return;
    
    // Check if lines are assigned
    const assigned = lines
      .filter(l => (l.supervisorEmail || '').toLowerCase().trim() === currentUser.email.toLowerCase().trim())
      .map(l => l.id);

    const updatedUser: AppUser = {
      ...currentUser,
      role: newRole,
      assignedLineIds: assigned
    };
    onUserChange(updatedUser);

    if (auth.currentUser) {
      try {
        await setUserRole(auth.currentUser, newRole, assigned);
      } catch (e) {
        console.warn('Could not sync role to Firestore:', e);
      }
    }

    setSuccessMsg(`تم تحديث الصلاحية إلى ${newRole === 'admin' ? 'مدير النظام (Admin)' : 'مشرف خط'} بنجاح!`);
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await logoutUser();
      onUserChange(null);
      onClose();
    } catch (e: any) {
      setErrorMsg('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setLoading(false);
    }
  };

  const assignedLinesDetails = lines.filter(l => 
    currentUser?.assignedLineIds.includes(l.id) || 
    (currentUser?.email && (l.supervisorEmail || '').toLowerCase().trim() === currentUser.email.toLowerCase().trim())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">تسجيل الدخول والمزامنة السحابية (Firebase)</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                إدارة الصلاحيات (مدير النظام أو مشرف خط) وتخزين البيانات أونلاين
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback banners */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isUnauthorizedDomain && (
          <div className="p-3.5 bg-amber-50 border-b border-amber-200 text-amber-900 text-xs space-y-2.5">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-950">كيفية تفعيل تسجيل الدخول على GitHub Pages (خطوة واحدة):</div>
                <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                  من أجل الأمان، يتطلب Firebase إضافة رابط موقعك في قائمة <strong>Authorized Domains</strong> مرة واحدة فقط:
                </p>
              </div>
            </div>

            <div className="bg-white/90 p-2.5 rounded-lg border border-amber-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-600 font-bold">الدومين المطلوب إضافته:</span>
                <button
                  type="button"
                  onClick={handleCopyDomain}
                  className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded text-[11px] font-bold transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{domainCopied ? 'تم النسخ!' : 'نسخ الدومين'}</span>
                </button>
              </div>
              <div className="font-mono text-xs font-bold text-indigo-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-center dir-ltr select-all">
                {currentHostname}
              </div>
            </div>

            <div className="space-y-1 text-[11px] text-amber-900 pr-1">
              <div>1. اضغط على الزر أدناه لفتح صفحة إعدادات Firebase Console الخاصة بمشروعك.</div>
              <div>2. في قسم <strong>Authorized domains</strong>، اضغط <strong>Add domain</strong>.</div>
              <div>3. الصق <code className="font-mono text-indigo-800 bg-white px-1 rounded">{currentHostname}</code> ثم اضغط <strong>Save</strong>.</div>
            </div>

            <a
              href={firebaseSettingsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs transition-colors shadow-xs"
            >
              <span>فتح صفحة إعدادات Firebase Console</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="p-4 sm:p-6 space-y-4 text-xs">
          
          {currentUser ? (
            /* Logged-In User Profile & Role Selector */
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{currentUser.displayName}</div>
                    <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{currentUser.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                    currentUser.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                      : 'bg-sky-100 text-sky-800 border border-sky-200'
                  }`}>
                    {currentUser.role === 'admin' ? '🛡️ مدير النظام (Admin)' : '👷 مشرف خط'}
                  </span>
                </div>
              </div>

              {/* Role Toggle Switch */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  تحديد الصلاحية في المصنع:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleRoleToggle('admin')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      currentUser.role === 'admin'
                        ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-purple-700" />
                        <span>مدير النظام (Admin)</span>
                      </span>
                      {currentUser.role === 'admin' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      صلاحيات كاملة: إنشاء وتعديل كل الخطوط، رفع البيانات للسحابة، وتعيين إيميلات المشرفين.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleToggle('supervisor')}
                    className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      currentUser.role === 'supervisor'
                        ? 'border-sky-600 bg-sky-50/60 ring-2 ring-sky-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-sky-700" />
                        <span>مشرف خط / تابع للأدمن</span>
                      </span>
                      {currentUser.role === 'supervisor' && <CheckCircle2 className="w-4 h-4 text-sky-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      رؤية وتعديل الخطوط والعمال المخصصة لإيميلك فقط بواسطة الأدمن.
                    </p>
                  </button>
                </div>
              </div>

              {/* Supervisor Line Assignments Card */}
              {currentUser.role === 'supervisor' && (
                <div className="p-3 bg-sky-50/50 border border-sky-200 rounded-xl">
                  <div className="font-bold text-sky-950 text-xs mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-sky-700" />
                    <span>الخطوط المخصصة لإيميلك ({assignedLinesDetails.length}):</span>
                  </div>

                  {assignedLinesDetails.length > 0 ? (
                    <div className="space-y-1">
                      {assignedLinesDetails.map(l => (
                        <div key={l.id} className="p-2 bg-white border border-sky-100 rounded-lg flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900">{l.name}</span>
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            مصرح لك بالتحكم الكامل
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>لم يتم تعيين خط لك حتى الآن:</span>
                      </div>
                      <p className="text-[11px] text-amber-800 leading-relaxed">
                        بريدك ({currentUser.email}) لم يُسجل بعد كمشرف لأي خط من قِبل الأدمن. يرجى إبلاغ الأدمن ليقوم بإضافة بريدك في إعدادات الخط الخاص بك.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Admin Cloud Database Sync Button */}
              {currentUser.role === 'admin' && onSyncAllToCloud && (
                <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-purple-700" />
                        <span>مزامنة ورفع قاعدة البيانات إلى Firestore</span>
                      </div>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        رفع الـ {lines.length} خطوط والعمال إلى السحابة ليتمكن المشرفون من الوصول إليها فوراً.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={onSyncAllToCloud}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'جارٍ رفع ومزامنة البيانات...' : 'رفع كامل البيانات إلى السحابة أونلاين'}</span>
                  </button>
                </div>
              )}

              {/* Actions Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 rounded-lg font-bold transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>تسجيل الخروج</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs shadow-xs cursor-pointer"
                >
                  تم، المتابعة إلى النظام
                </button>
              </div>

            </div>
          ) : (
            /* Not logged-in: Sign in options */
            <div className="space-y-4">
              
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl">
                <div className="font-bold text-indigo-950 text-xs mb-1">
                  💡 تسجيل الدخول بالبريد الإلكتروني (جيميل Gmail):
                </div>
                <p className="text-[11px] text-indigo-800 leading-relaxed">
                  سجل دخولك بجيميل وحدد صفتك كـ <strong>مدير النظام (Admin)</strong> للتحكم الكامل، أو <strong>مشرف خط (تابع للأدمن)</strong> لإدارة الخط المخصص لك.
                </p>
              </div>

              {/* Pre-login Role Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  حدد صفتك قبل تسجيل الدخول:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setInitialRoleChoice('admin')}
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                      initialRoleChoice === 'admin'
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-purple-600" />
                        <span>مدير عام (Admin)</span>
                      </span>
                      {initialRoleChoice === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      صلاحيات كاملة للتحكم في جميع الخطوط وقاعدة البيانات.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInitialRoleChoice('supervisor')}
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                      initialRoleChoice === 'supervisor'
                        ? 'border-sky-600 bg-sky-50 ring-2 ring-sky-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900 text-xs">
                      <span className="flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-sky-600" />
                        <span>مشرف (تابع للأدمن)</span>
                      </span>
                      {initialRoleChoice === 'supervisor' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      التحكم فقط في الخط الذي حدده الأدمن لإيميلك.
                    </p>
                  </button>
                </div>
              </div>

              {/* Google Sign In Button */}
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleGoogleSignIn(initialRoleChoice)}
                  className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white hover:bg-slate-50 text-slate-800 border-2 border-slate-300 hover:border-slate-400 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"/>
                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"/>
                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12 0 14.5s.7 4.8 1.9 7.2l3.7-2.9z"/>
                    <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 17C3.7 20.7 7.5 24 12 24z"/>
                  </svg>
                  <span>
                    {loading 
                      ? 'جارٍ تسجيل الدخول...' 
                      : `تسجيل الدخول بواسطة Google Gmail كـ (${initialRoleChoice === 'admin' ? 'مدير عام Admin' : 'مشرف خط'})`
                    }
                  </span>
                </button>
              </div>

              {/* Offline Mode Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-slate-600" />
                  <span className="font-bold text-slate-800 text-xs">التشغيل في وضع عدم الاتصال (أوفلاين Offline):</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  يمكنك الاستمرار بالعمل بدون تسجيل دخول إطلاقاً. كافة البيانات والـ 400 عامل ستعمل بكفاءة كاملة وتُحفظ محلياً على جهازك.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
                >
                  متابعة العمل محلياً (أوفلاين)
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
