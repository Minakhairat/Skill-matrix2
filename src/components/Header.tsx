import React, { useState } from 'react';
import { 
  Table2, 
  BarChart3, 
  Users, 
  Printer, 
  FileSpreadsheet, 
  SlidersHorizontal, 
  UserPlus, 
  RotateCcw,
  Menu,
  X,
  History,
  Trash2,
  TrendingUp,
  Settings2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Cloud,
  ShieldCheck,
  UserCheck,
  LogIn,
  RefreshCw
} from 'lucide-react';
import { TerminologyConfig, AppUser } from '../types/matrix';
import { getClientGeminiApiKey, getClientUserEmail } from '../utils/geminiService';
import { PWAInstallButton } from './PWAInstallButton';

export type TabType = 'matrix' | 'balancing' | 'ai-chat' | 'ai-advisor' | 'performance' | 'workers' | 'factory' | 'print';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenSettings: () => void;
  onOpenImportExport: () => void;
  onOpenAddWorker: () => void;
  onResetSampleData: () => void;
  onOpenHistory: () => void;
  onOpenClearAllModal: () => void;
  totalWorkersCount: number;
  terminology: TerminologyConfig;
  onOpenAICopilot?: () => void;
  onOpenApiKeyModal?: () => void;
  currentUser?: AppUser | null;
  onOpenAuthModal?: () => void;
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenImportExport,
  onOpenAddWorker,
  onResetSampleData,
  onOpenHistory,
  onOpenClearAllModal,
  totalWorkersCount,
  terminology,
  onOpenAICopilot,
  onOpenApiKeyModal,
  currentUser,
  onOpenAuthModal,
  onSyncNow,
  isSyncing = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const hasSavedKey = !!getClientGeminiApiKey();
  const clientEmail = getClientUserEmail();

  const navItems: { id: TabType; label: string; shortLabel: string; icon: React.ElementType; color: string; activeColor: string }[] = [
    { id: 'matrix', label: 'المصفوفة الكاملة', shortLabel: 'المصفوفة', icon: Table2, color: 'text-slate-700', activeColor: 'bg-slate-900 text-white' },
    { id: 'balancing', label: 'تحليل الفجوات والموازنة', shortLabel: 'الموازنة والفجوات', icon: BarChart3, color: 'text-slate-700', activeColor: 'bg-slate-900 text-white' },
    { id: 'performance', label: 'معدل التحسين والورديات', shortLabel: 'التحسين والورديات', icon: TrendingUp, color: 'text-slate-700', activeColor: 'bg-slate-900 text-white' },
    { id: 'workers', label: `مرونة العمال (3 ${terminology.stageLabelPlural})`, shortLabel: 'مرونة العمال', icon: Users, color: 'text-slate-700', activeColor: 'bg-slate-900 text-white' },
    { id: 'factory', label: `إعدادات ${terminology.lineLabelPlural} والقيادة`, shortLabel: 'الإعدادات والقيادة', icon: Settings2, color: 'text-slate-700', activeColor: 'bg-slate-900 text-white' },
    { id: 'print', label: 'تقرير الورديات', shortLabel: 'طباعة التقرير', icon: Printer, color: 'text-slate-700', activeColor: 'bg-slate-900 text-white' },
  ];

  const currentTabObj = navItems.find(n => n.id === activeTab) || navItems[0];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-2xs no-print">
      
      {/* Top Main Bar: Brand, Quick Actions, and Status */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-3">
          
          {/* Brand & Factory Context */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-lg shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-slate-900 tracking-tight leading-none">
                  MatrixPro
                </span>
                <span className="text-[11px] font-mono font-bold text-slate-500">
                  ({totalWorkersCount} عامل)
                </span>
              </div>
              <div className="text-[11px] text-slate-500 font-medium mt-0.5 hidden sm:block truncate">
                مصفوفة المهارات وموازنة {terminology.lineLabelPlural}
              </div>
            </div>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* PWA / Android Install Trigger */}
            <PWAInstallButton variant="header" />

            {/* AI Copilot Side Drawer Trigger */}
            {onOpenAICopilot && (
              <button
                type="button"
                onClick={onOpenAICopilot}
                title="فتح مستشار الذكاء الاصطناعي كلوحة جانبية"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-lg transition-all shadow-xs cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">المستشار الذكي (AI)</span>
                <span className="sm:hidden">AI</span>
              </button>
            )}

            {/* Manual Cloud Sync Trigger */}
            {onSyncNow && (
              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                title="مزامنة فورية وتحديث البيانات من السحابة أونلاين"
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden md:inline">{isSyncing ? 'جارٍ المزامنة...' : 'مزامنة السحابة'}</span>
              </button>
            )}

            {/* Import / Export Excel */}
            <button
              onClick={onOpenImportExport}
              title="استيراد وتصدير بيانات إكسيل Excel"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">إكسيل</span>
            </button>

            {/* Target Settings */}
            <button
              onClick={onOpenSettings}
              title="تعديل الأهداف والحد الأدنى للتأهيل"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">الأهداف</span>
            </button>

            {/* Audit History Log */}
            <button
              onClick={onOpenHistory}
              title="سجل النشاط والتعديلات (History)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden lg:inline">السجل</span>
            </button>

            {/* Clear All Data */}
            <button
              onClick={onOpenClearAllModal}
              title="تصفير البيانات للبدء من الصفر"
              className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden xl:inline">تصفير</span>
            </button>

            {/* Firebase Auth & Account Button */}
            {onOpenAuthModal && (
              <button
                onClick={onOpenAuthModal}
                title={currentUser ? `حساب: ${currentUser.email} (${currentUser.role === 'admin' ? 'مدير النظام' : 'مشرف خط'})` : 'تسجيل الدخول للمزامنة'}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap border cursor-pointer ${
                  currentUser
                    ? currentUser.role === 'admin'
                      ? 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
                      : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                    : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                }`}
              >
                {currentUser ? (
                  currentUser.role === 'admin' ? (
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                  ) : (
                    <UserCheck className="w-3.5 h-3.5 text-sky-700" />
                  )
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span className="hidden sm:inline">
                  {currentUser ? (currentUser.role === 'admin' ? 'أدمن' : 'مشرف') : 'دخول'}
                </span>
              </button>
            )}

            {/* Primary Action: Add Worker */}
            <button
              onClick={onOpenAddWorker}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة عامل</span>
            </button>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 sm:hidden"
              aria-label="القائمة"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Dedicated Secondary Navigation Ribbon (Guarantees ALL tabs visible on Laptops, Tablets, Desktops) */}
      <div className="bg-slate-100/80 border-t border-slate-200/80 backdrop-blur-xs">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <nav className="flex items-center gap-1 py-1.5 overflow-x-auto no-scrollbar scroll-smooth w-full">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? `${item.activeColor} shadow-xs font-black`
                        : 'text-slate-700 hover:text-slate-950 hover:bg-white/80'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : item.color}`} />
                    <span className="hidden md:inline">{item.label}</span>
                    <span className="md:hidden">{item.shortLabel}</span>
                    {item.id === 'ai-advisor' && (
                      <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 shadow-2xs">
                        AI
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu (Visible when mobile menu is toggled) */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-200 bg-white p-3 space-y-2 shadow-lg animate-in fade-in">
          
          {/* Navigation Items List */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 px-2 py-0.5">الصفحات وأقسام النظام:</div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-right transition-colors ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded">الحالي</span>}
                  {item.id === 'ai-advisor' && !isActive && (
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                      ذكي ✨
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Utilities in Mobile Menu */}
          <div className="pt-2 border-t border-slate-200 space-y-1.5">
            {onOpenAuthModal && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenAuthModal();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                  currentUser
                    ? currentUser.role === 'admin'
                      ? 'bg-purple-50 text-purple-900 border-purple-300'
                      : 'bg-sky-50 text-sky-900 border-sky-300'
                    : 'bg-slate-50 text-slate-800 border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-indigo-600" />
                  <span>
                    {currentUser 
                      ? (currentUser.role === 'admin' ? `🛡️ مدير النظام: ${currentUser.email}` : `👷 مشرف خط: ${currentUser.email}`) 
                      : 'تسجيل الدخول بالجيميل للمزامنة السحابية'}
                  </span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  currentUser ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                }`}>
                  {currentUser ? 'أونلاين 🌐' : 'أوفلاين 💾'}
                </span>
              </button>
            )}

            {onOpenApiKeyModal && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenApiKeyModal();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-colors ${
                  hasSavedKey
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                    : 'bg-indigo-50 text-indigo-900 border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${hasSavedKey ? 'text-emerald-600' : 'text-indigo-600'}`} />
                  <span>
                    {hasSavedKey
                      ? (clientEmail ? `حساب Gemini: ${clientEmail}` : 'Google Gemini AI مفعل')
                      : 'ربط بريدك بـ Google Gemini AI'}
                  </span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  hasSavedKey ? 'bg-emerald-200 text-emerald-900' : 'bg-indigo-200 text-indigo-900'
                }`}>
                  {hasSavedKey ? 'متصل ✅' : 'إعداد'}
                </span>
              </button>
            )}

            {/* Android PWA Install Card on Mobile */}
            <div className="pt-1">
              <PWAInstallButton variant="banner" />
            </div>

            <div className="text-[10px] font-bold text-slate-400 px-2">إجراءات سريعة:</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenHistory();
                }}
                className="flex items-center justify-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-xs font-bold text-slate-700 border border-slate-200"
              >
                <History className="w-3.5 h-3.5 text-slate-600" />
                <span>سجل النشاط</span>
              </button>

              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onOpenClearAllModal();
                }}
                className="flex items-center justify-center gap-1.5 p-2 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-bold text-rose-700 border border-rose-200"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>حذف البيانات</span>
              </button>
            </div>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                onResetSampleData();
              }}
              className="w-full flex items-center justify-center gap-1.5 p-2 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>استعادة نموذج 400 عامل الافتراضي</span>
            </button>
          </div>

        </div>
      )}

    </header>
  );
};
