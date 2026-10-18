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
  Github,
  ChevronDown
} from 'lucide-react';
import { TerminologyConfig } from '../types/matrix';

interface HeaderProps {
  activeTab: 'matrix' | 'balancing' | 'performance' | 'workers' | 'factory' | 'print';
  setActiveTab: (tab: 'matrix' | 'balancing' | 'performance' | 'workers' | 'factory' | 'print') => void;
  onOpenSettings: () => void;
  onOpenImportExport: () => void;
  onOpenAddWorker: () => void;
  onResetSampleData: () => void;
  onOpenHistory: () => void;
  onOpenClearAllModal: () => void;
  onOpenGitHubDeployGuide: () => void;
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
  onOpenGitHubDeployGuide,
  totalWorkersCount,
  terminology
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'matrix' as const, label: 'المصفوفة الكاملة', icon: Table2, color: 'text-emerald-600', activeBg: 'bg-emerald-600' },
    { id: 'balancing' as const, label: 'تحليل الفجوات والموازنة', icon: BarChart3, color: 'text-sky-600', activeBg: 'bg-sky-600' },
    { id: 'performance' as const, label: 'معدل التحسين والورديات', icon: TrendingUp, color: 'text-emerald-600', activeBg: 'bg-emerald-600' },
    { id: 'workers' as const, label: `مرونة العمال (3 ${terminology.stageLabelPlural})`, icon: Users, color: 'text-indigo-600', activeBg: 'bg-indigo-600' },
    { id: 'factory' as const, label: `إدارة ${terminology.lineLabelPlural} والاسطمبات`, icon: Settings2, color: 'text-purple-600', activeBg: 'bg-purple-600' },
    { id: 'print' as const, label: 'تقرير الورديات', icon: Printer, color: 'text-amber-600', activeBg: 'bg-amber-600' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8">
        
        {/* Main Top Bar */}
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          
          {/* Brand Identity */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-base sm:text-lg shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-slate-900 tracking-tight leading-none">
                  MatrixPro
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold hidden xs:inline">
                  {totalWorkersCount} عامل
                </span>
              </div>
              <div className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate max-w-[150px] sm:max-w-none">
                مصفوفة المهارات وموازنة {terminology.lineLabelPlural}
              </div>
            </div>
          </div>

          {/* Desktop Navigation Tabs (Visible on screens >= 1100px) */}
          <nav className="hidden xl:flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Desktop & Tablet Action Buttons */}
          <div className="hidden md:flex items-center gap-1.5 shrink-0">
            
            {/* Factory Setup Page Button */}
            <button
              onClick={() => setActiveTab('factory')}
              title={`إدارة ${terminology.lineLabelPlural} والاسطمبات وتغيير المسميات`}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'factory'
                  ? 'bg-purple-100 text-purple-900 font-bold border border-purple-300'
                  : 'text-slate-700 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <Settings2 className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden lg:inline">إعدادات المصنع</span>
            </button>

            {/* GitHub Deploy Guide Button */}
            <button
              onClick={onOpenGitHubDeployGuide}
              title="دليل حل مشكلة النشر على GitHub Pages"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <Github className="w-3.5 h-3.5 text-slate-800" />
              <span className="hidden lg:inline">نشر GitHub</span>
            </button>

            {/* History Button */}
            <button
              onClick={onOpenHistory}
              title="سجل النشاط والتعديلات (History)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <History className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden lg:inline">السجل</span>
            </button>

            {/* Target Settings */}
            <button
              onClick={onOpenSettings}
              title="تحديد الأهداف (5 عمال للمرحلة / 3 مراحل للعامل)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden lg:inline">الأهداف</span>
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

          {/* Mobile Actions: Add Worker + Tools Menu Toggle */}
          <div className="flex md:hidden items-center gap-1.5">
            <button
              onClick={onOpenAddWorker}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
              title="إضافة عامل جديد"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>عامل</span>
            </button>
            
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1 text-xs font-semibold"
              aria-label="قائمة الخيارات والأدوات"
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              <span className="text-[11px] font-bold">أدوات</span>
            </button>
          </div>

        </div>

        {/* Responsive Horizontal Navigation Bar (Visible on mobile and tablet < xl) */}
        <div className="xl:hidden flex items-center gap-1.5 overflow-x-auto py-2 border-t border-slate-100 matrix-scroll -mx-2.5 px-2.5 scroll-smooth overscroll-x-contain">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shrink-0 transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100/90 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : item.color}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Tools Drawer Sheet */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 bg-white">
            
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              أدوات وإعدادات المصنع
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setActiveTab('factory');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 text-right"
              >
                <Settings2 className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="truncate">إعدادات {terminology.lineLabelPlural}</span>
              </button>

              <button
                onClick={() => {
                  onOpenGitHubDeployGuide();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 text-right"
              >
                <Github className="w-4 h-4 text-slate-900 shrink-0" />
                <span className="truncate">دليل نشر GitHub</span>
              </button>

              <button
                onClick={() => {
                  onOpenSettings();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-right"
              >
                <SlidersHorizontal className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="truncate">تحديد الأهداف</span>
              </button>

              <button
                onClick={() => {
                  onOpenImportExport();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 text-right"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="truncate">إكسيل (Excel)</span>
              </button>

              <button
                onClick={() => {
                  onOpenHistory();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 text-right"
              >
                <History className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="truncate">سجل النشاط (History)</span>
              </button>

              <button
                onClick={() => {
                  onResetSampleData();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-2.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 text-right"
              >
                <RotateCcw className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="truncate">استعادة 400 عامل</span>
              </button>
            </div>

            <button
              onClick={() => {
                onOpenClearAllModal();
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 mt-1"
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>حذف كافة البيانات بالكامل</span>
            </button>
          </div>
        )}

      </div>
    </header>
  );
};
