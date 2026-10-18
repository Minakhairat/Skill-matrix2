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
  ChevronRight
} from 'lucide-react';
import { TerminologyConfig } from '../types/matrix';

export type TabType = 'matrix' | 'balancing' | 'ai-advisor' | 'performance' | 'workers' | 'factory' | 'print';

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
  terminology
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: { id: TabType; label: string; shortLabel: string; icon: React.ElementType; color: string; activeColor: string }[] = [
    { id: 'matrix', label: 'المصفوفة الكاملة', shortLabel: 'المصفوفة', icon: Table2, color: 'text-emerald-600', activeColor: 'bg-emerald-600 text-white' },
    { id: 'balancing', label: 'تحليل الفجوات والموازنة', shortLabel: 'الموازنة والفجوات', icon: BarChart3, color: 'text-sky-600', activeColor: 'bg-sky-600 text-white' },
    { id: 'ai-advisor', label: 'مستشار الذكاء الاصطناعي', shortLabel: 'المستشار الذكي (AI)', icon: Sparkles, color: 'text-indigo-600', activeColor: 'bg-indigo-600 text-white' },
    { id: 'performance', label: 'معدل التحسين والورديات', shortLabel: 'التحسين والورديات', icon: TrendingUp, color: 'text-emerald-600', activeColor: 'bg-emerald-600 text-white' },
    { id: 'workers', label: `مرونة العمال (3 ${terminology.stageLabelPlural})`, shortLabel: 'مرونة العمال', icon: Users, color: 'text-purple-600', activeColor: 'bg-purple-600 text-white' },
    { id: 'factory', label: `إعدادات ${terminology.lineLabelPlural} والقيادة`, shortLabel: 'الإعدادات والقيادة', icon: Settings2, color: 'text-violet-600', activeColor: 'bg-violet-600 text-white' },
    { id: 'print', label: 'تقرير الورديات', shortLabel: 'طباعة التقرير', icon: Printer, color: 'text-amber-600', activeColor: 'bg-amber-600 text-white' },
  ];

  const currentTabObj = navItems.find(n => n.id === activeTab) || navItems[0];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print">
      
      {/* Top Main Bar: Brand & Primary Controls */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-13 sm:h-15 gap-2">
          
          {/* Brand & Factory Context */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-base sm:text-lg shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                  MatrixPro
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                  {totalWorkersCount} عامل
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 hidden xs:block truncate">
                مصفوفة المهارات وموازنة {terminology.lineLabelPlural}
              </div>
            </div>
          </div>

          {/* Quick Active Page Badge (Helpful on compact laptops) */}
          <div className="hidden md:flex lg:hidden items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-700">
            <span>الصفحة النشطة:</span>
            <span className="text-indigo-600">{currentTabObj.shortLabel}</span>
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            
            {/* Import / Export Excel */}
            <button
              onClick={onOpenImportExport}
              title="استيراد وتصدير بيانات إكسيل Excel"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">إكسيل</span>
            </button>

            {/* Target Settings */}
            <button
              onClick={onOpenSettings}
              title="تعديل الأهداف والحد الأدنى للتأهيل"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">الأهداف</span>
            </button>

            {/* Audit History Log */}
            <button
              onClick={onOpenHistory}
              title="سجل النشاط والتعديلات (History)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">السجل</span>
            </button>

            {/* Clear All Data */}
            <button
              onClick={onOpenClearAllModal}
              title="حذف جميع البيانات للبدء من الصفر"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span className="hidden lg:inline">تصفير</span>
            </button>

            {/* Primary Action: Add Worker */}
            <button
              onClick={onOpenAddWorker}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة عامل</span>
            </button>

            {/* Mobile Hamburger Toggle (for phones) */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 sm:hidden"
              aria-label="القائمة الرئيسية"
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
