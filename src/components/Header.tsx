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
  TrendingUp
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'matrix' | 'balancing' | 'performance' | 'workers' | 'print';
  setActiveTab: (tab: 'matrix' | 'balancing' | 'performance' | 'workers' | 'print') => void;
  onOpenSettings: () => void;
  onOpenImportExport: () => void;
  onOpenAddWorker: () => void;
  onResetSampleData: () => void;
  onOpenHistory: () => void;
  onOpenClearAllModal: () => void;
  totalWorkersCount: number;
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
  totalWorkersCount
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'matrix' as const, label: 'المصفوفة الكاملة', icon: Table2, color: 'text-emerald-600' },
    { id: 'balancing' as const, label: 'تحليل الفجوات والموازنة', icon: BarChart3, color: 'text-sky-600' },
    { id: 'performance' as const, label: 'معدل التحسين والورديات', icon: TrendingUp, color: 'text-emerald-600' },
    { id: 'workers' as const, label: 'مرونة العمال (3 مراحل)', icon: Users, color: 'text-indigo-600' },
    { id: 'print' as const, label: 'تقرير الورديات', icon: Printer, color: 'text-amber-600' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Top Bar Row */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-xs">
              M
            </div>
            <div>
              <div className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-none">
                MatrixPro
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate max-w-[170px] sm:max-w-none">
                سكيل ماتريكس وموازنة الخطوط ({totalWorkersCount} عامل)
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            
            {/* History Button */}
            <button
              onClick={onOpenHistory}
              title="سجل النشاط والتعديلات (History)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span>السجل</span>
            </button>

            {/* Target Settings */}
            <button
              onClick={onOpenSettings}
              title="تحديد الأهداف"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span>الأهداف</span>
            </button>

            {/* Excel Import/Export */}
            <button
              onClick={onOpenImportExport}
              title="استيراد وتصدير إكسيل"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>إكسيل</span>
            </button>

            {/* Add Worker */}
            <button
              onClick={onOpenAddWorker}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>إضافة عامل</span>
            </button>

            {/* Clear All Data Button */}
            <button
              onClick={onOpenClearAllModal}
              title="حذف كافة البيانات بالكامل"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Reset / Regenerate 400 Workers */}
            <button
              onClick={onResetSampleData}
              title="استعادة الـ 400 عامل التجريبيين"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Actions: Add Worker + Mobile Menu Hamburger */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              onClick={onOpenHistory}
              className="p-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
              title="سجل التعديلات"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenAddWorker}
              className="p-2 text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              title="إضافة عامل"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200"
              aria-label="قائمة الخيارات"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Horizontal Navigation Tabs Strip (For tablet and mobile) */}
        <div className="xl:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 matrix-scroll -mx-3 px-3">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Dropdown Menu for secondary tools */}
        {isMobileMenuOpen && (
          <div className="sm:hidden py-3 border-t border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                onOpenSettings();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-600" />
              <span>تحديد الأهداف (5 عمال للمرحلة / 3 مراحل للعامل)</span>
            </button>

            <button
              onClick={() => {
                onOpenImportExport();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>مركز استيراد وتصدير إكسيل (Excel & CSV)</span>
            </button>

            <button
              onClick={() => {
                onOpenHistory();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200"
            >
              <History className="w-4 h-4 text-indigo-600" />
              <span>سجل النشاط والتعديلات (History)</span>
            </button>

            <button
              onClick={() => {
                onOpenClearAllModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>حذف كافة البيانات بالكامل</span>
            </button>

            <button
              onClick={() => {
                onResetSampleData();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>استعادة الـ 400 عامل التجريبيين</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
