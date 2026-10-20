import React, { useState } from 'react';
import { ProductionLine, Model, TerminologyConfig, AppUser } from '../types/matrix';
import { Factory, Box, Search, Filter, ChevronDown, ChevronUp, Layers, Users, Cog, Building2, ShieldCheck, UserCheck, Lock } from 'lucide-react';
import { formatUnitName, formatSubUnitName } from '../utils/constants';

interface LineModelBarProps {
  lines: ProductionLine[];
  selectedLine: ProductionLine;
  onSelectLine: (line: ProductionLine) => void;
  selectedModel: Model;
  onSelectModel: (model: Model) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedShift: string;
  onSelectShift: (shift: string) => void;
  workerCountOnLine: number;
  totalLineStagesCount: number;
  targetWorkersPerStage: number;
  qualifiedWorkersMeetingTarget: number;
  terminology: TerminologyConfig;
  currentUser?: AppUser | null;
  onSaveSupervisorEmail?: (lineId: string, supervisorName: string, supervisorEmail: string) => Promise<void>;
}

export const LineModelBar: React.FC<LineModelBarProps> = ({
  lines,
  selectedLine,
  onSelectLine,
  selectedModel,
  onSelectModel,
  searchQuery,
  onSearchChange,
  selectedShift,
  onSelectShift,
  workerCountOnLine,
  totalLineStagesCount,
  targetWorkersPerStage,
  qualifiedWorkersMeetingTarget,
  terminology,
  currentUser,
  onSaveSupervisorEmail
}) => {
  const [isFiltersExpandedOnMobile, setIsFiltersExpandedOnMobile] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [supervisorNameInput, setSupervisorNameInput] = useState(selectedLine?.supervisor || '');
  const [supervisorEmailInput, setSupervisorEmailInput] = useState(selectedLine?.supervisorEmail || '');
  const [isSavingSupervisor, setIsSavingSupervisor] = useState(false);
  const [supervisorSaveFeedback, setSupervisorSaveFeedback] = useState<string | null>(null);

  const UnitIcon = terminology.preset === 'machines_molds' ? Cog : terminology.preset === 'departments_products' ? Building2 : Factory;

  // Check if current user is authorized to edit the selected line
  const isSupervisor = currentUser?.role === 'supervisor';
  const isLineAssignedToSupervisor = !currentUser || currentUser.role === 'admin' || (
    currentUser.assignedLineIds.includes(selectedLine?.id) ||
    (selectedLine?.supervisorEmail && selectedLine.supervisorEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
  );

  const handleOpenSupervisorModal = () => {
    setSupervisorNameInput(selectedLine?.supervisor || '');
    setSupervisorEmailInput(selectedLine?.supervisorEmail || '');
    setSupervisorSaveFeedback(null);
    setIsSupervisorModalOpen(true);
  };

  const handleConfirmSupervisorEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLine) return;
    try {
      setIsSavingSupervisor(true);
      setSupervisorSaveFeedback(null);
      if (onSaveSupervisorEmail) {
        await onSaveSupervisorEmail(
          selectedLine.id, 
          supervisorNameInput.trim() || selectedLine.supervisor, 
          supervisorEmailInput.trim().toLowerCase()
        );
      }
      setSupervisorSaveFeedback('تم اعتماد وتأكيد إيميل المشرف في السحابة بنجاح ✓');
      setTimeout(() => {
        setIsSupervisorModalOpen(false);
        setSupervisorSaveFeedback(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error saving supervisor email:', err);
      setSupervisorSaveFeedback('حدث خطأ أثناء الحفظ: ' + (err?.message || ''));
    } finally {
      setIsSavingSupervisor(false);
    }
  };

  return (
    <div className="bg-white border-b border-slate-200 py-2 sm:py-2.5 px-2.5 sm:px-6 lg:px-8 no-print">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        
        {/* Row 1: Line / Machine & Model / Mold Selectors + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          
          {/* Selectors Group */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* Line / Machine Selector */}
            <div className={`flex items-center gap-1.5 sm:gap-2 border rounded-lg px-2 sm:px-2.5 py-1.5 transition-colors ${
              isSupervisor && !isLineAssignedToSupervisor
                ? 'bg-amber-50/60 border-amber-300'
                : 'bg-slate-50 border-slate-200'
            }`}>
              <UnitIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 shrink-0 hidden xs:inline">
                {terminology.lineLabel}:
              </span>
              <select
                value={selectedLine?.id || ''}
                disabled={lines.length === 0}
                onChange={(e) => {
                  const line = lines.find(l => l.id === e.target.value);
                  if (line) onSelectLine(line);
                }}
                className="text-xs sm:text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer w-full truncate disabled:opacity-50"
              >
                {lines.length === 0 ? (
                  <option value="">(لا توجد خطوط)</option>
                ) : (
                  lines.map((l) => {
                    const isAssigned = currentUser?.assignedLineIds.includes(l.id) ||
                      (l.supervisorEmail && l.supervisorEmail.toLowerCase().trim() === (currentUser?.email || '').toLowerCase().trim());
                    const prefix = isSupervisor ? (isAssigned ? '⭐ ' : '🔒 ') : '';
                    return (
                      <option key={l.id} value={l.id}>
                        {prefix}{formatUnitName(l.name, terminology)}
                      </option>
                    );
                  })
                )}
              </select>
            </div>

            {/* Model / Mold Selector */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1.5">
              <Box className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 shrink-0 hidden xs:inline">
                {terminology.modelLabel}:
              </span>
              <select
                value={selectedModel?.id || ''}
                disabled={!selectedLine || !selectedLine.models || selectedLine.models.length === 0}
                onChange={(e) => {
                  const model = selectedLine?.models.find(m => m.id === e.target.value);
                  if (model) onSelectModel(model);
                }}
                className="text-xs sm:text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer w-full truncate disabled:opacity-50"
              >
                {!selectedLine || !selectedLine.models || selectedLine.models.length === 0 ? (
                  <option value="">(لا توجد موديلات)</option>
                ) : (
                  selectedLine.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {formatSubUnitName(m.name, terminology)} ({m.code})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Shift Selector */}
            <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1.5">
              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium text-slate-600 shrink-0">الوردية:</span>
              <select
                value={selectedShift}
                onChange={(e) => onSelectShift(e.target.value)}
                className="text-xs sm:text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer w-full"
              >
                <option value="ALL">جميع الورديات (A, B, C)</option>
                <option value="A">الوردية A (صباحي)</option>
                <option value="B">الوردية B (مسائي)</option>
                <option value="C">الوردية C (ليلي)</option>
              </select>
            </div>

          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="w-full text-xs pr-8 pl-3 py-1.5 bg-slate-50 hover:bg-slate-100/60 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all placeholder:text-slate-400"
            />
          </div>

        </div>

        {/* Row 2: Responsive Quantitative Micro-KPI Strip */}
        <div className="flex items-center justify-between overflow-x-auto matrix-scroll pt-1 border-t border-slate-100 -mx-2.5 px-2.5 gap-2 text-[11px] sm:text-xs text-slate-600 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3 text-slate-400" />
              <span>عمال {terminology.lineLabel}:</span>
              <strong className="font-mono text-slate-900 font-bold tabular-nums">{workerCountOnLine}</strong>
            </span>

            <span aria-hidden="true" className="text-slate-300">·</span>

            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>{terminology.stageLabelPlural}:</span>
              <strong className="font-mono text-slate-900 font-bold tabular-nums">{totalLineStagesCount}</strong>
            </span>

            <span aria-hidden="true" className="text-slate-300">·</span>

            <span>
              مستهدف {terminology.stageLabel}:
              <strong className="font-mono text-emerald-700 font-bold tabular-nums mr-1">{targetWorkersPerStage} عمال</strong>
            </span>

            <span aria-hidden="true" className="text-slate-300">·</span>

            <span>
              محققو هدف الـ 3 {terminology.stageLabelPlural}:
              <strong className="font-mono text-indigo-700 font-bold tabular-nums mr-1">{qualifiedWorkersMeetingTarget}</strong>
            </span>
          </div>

          {/* Supervisor Email & Permission Badge */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser?.role === 'supervisor' ? (
              isLineAssignedToSupervisor ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  <span>خطك المصرح لك بالتحكم فيه</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-300">
                  <Lock className="w-3 h-3 text-amber-600" />
                  <span>للعرض فقط (غير مصرح لك بالتعديل)</span>
                </span>
              )
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span>المشرف:</span>
                  <strong className="text-slate-800">{selectedLine?.supervisor || 'غير محدد'}</strong>
                  {selectedLine?.supervisorEmail && (
                    <span className="font-mono text-[10px] text-slate-400">({selectedLine.supervisorEmail})</span>
                  )}
                </span>

                {/* Dedicated button to confirm / edit supervisor email for Admin */}
                {currentUser?.role === 'admin' && (
                  <button
                    type="button"
                    onClick={handleOpenSupervisorModal}
                    className="flex items-center gap-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-3 py-1.5 rounded-lg shadow-xs transition-all cursor-pointer"
                    title="تأكيد وتسجيل إيميل المشرف الخاص بهذا الخط في السحابة أونلاين"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>تأكيد تسجيل إيميل المشرف</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Admin Quick Supervisor Email Confirmation Modal */}
      {isSupervisorModalOpen && selectedLine && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-right">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    تأكيد وتسجيل إيميل المشرف: {selectedLine.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    منح المشرف الصلاحية السحابية لإدارة وتعديل عمال هذا الخط
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSupervisorModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            {supervisorSaveFeedback && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-1.5">
                <span>{supervisorSaveFeedback}</span>
              </div>
            )}

            <form onSubmit={handleConfirmSupervisorEmail} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم المشرف المسؤول:
                </label>
                <input
                  type="text"
                  value={supervisorNameInput}
                  onChange={(e) => setSupervisorNameInput(e.target.value)}
                  placeholder="مثال: أ. محمد إبراهيم"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البريد الإلكتروني للمشرف (Google Gmail):
                </label>
                <input
                  type="email"
                  value={supervisorEmailInput}
                  onChange={(e) => setSupervisorEmailInput(e.target.value)}
                  placeholder="supervisor@gmail.com"
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 dir-ltr text-right"
                  required
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  * عندما يقوم المشرف بتسجيل الدخول بهذا البريد سيتم منحه التحكم الكامل في هذا الخط تلقائياً.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupervisorModalOpen(false)}
                  disabled={isSavingSupervisor}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingSupervisor}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSavingSupervisor ? 'جارٍ التأكيد والحفظ...' : 'تأكيد وتسجيل إيميل المشرف في السحابة'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
