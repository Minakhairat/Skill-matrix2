import React, { useState, useMemo } from 'react';
import { Worker, Stage, SkillLevel, TerminologyConfig } from '../types/matrix';
import { SKILL_DEFINITIONS } from '../utils/constants';
import { calculateWorkerFlexibility } from '../utils/matrixCalculations';
import { 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  User, 
  Calendar, 
  Clock, 
  GraduationCap, 
  Award,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
  Edit2,
  Trash2
} from 'lucide-react';

interface WorkerProfilesViewProps {
  workers: Worker[];
  stages: Stage[];
  onUpdateWorkerSkill: (workerId: string, stageId: string, newLevel: SkillLevel) => void;
  selectedWorkerForModal: Worker | null;
  onCloseWorkerModal: () => void;
  onOpenWorkerModal: (worker: Worker) => void;
  onEditWorker: (worker: Worker) => void;
  onDeleteWorker: (worker: Worker) => void;
  terminology?: TerminologyConfig;
}

export const WorkerProfilesView: React.FC<WorkerProfilesViewProps> = ({
  workers,
  stages,
  onUpdateWorkerSkill,
  selectedWorkerForModal,
  onCloseWorkerModal,
  onOpenWorkerModal,
  onEditWorker,
  onDeleteWorker,
  terminology
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'met' | 'needs_training'>('all');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 24;

  // Filter workers
  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const flex = calculateWorkerFlexibility(w, stages);
      if (filterStatus === 'met' && !flex.isTargetMet) return false;
      if (filterStatus === 'needs_training' && flex.isTargetMet) return false;

      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesName = w.name.toLowerCase().includes(query);
        const matchesCode = w.empCode.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      return true;
    });
  }, [workers, stages, filterStatus, search]);

  const totalPages = Math.ceil(filteredWorkers.length / pageSize) || 1;
  const paginatedWorkers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredWorkers.slice(start, start + pageSize);
  }, [filteredWorkers, page, pageSize]);

  // Overall statistics
  const targetMetWorkers = workers.filter(w => calculateWorkerFlexibility(w, stages).isTargetMet);
  const percentMet = workers.length > 0 ? Math.round((targetMetWorkers.length / workers.length) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Top Header Summary Strip */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
            متابعة مرونة العمال والمهارات المتعددة (Multi-Skilling Tracker)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            الهدف المطلوب: إتقان كل عامل لـ <strong>3 مراحل</strong> على الأقل بدرجة كفاءة <strong>3 أو 4</strong> (مستقل أو خبير).
          </p>
        </div>

        {/* Aggregate Unboxed Flexibility Rate */}
        <div className="grid grid-cols-2 sm:flex items-center gap-4 sm:gap-6 pt-2 md:pt-0 border-t md:border-0 border-slate-100">
          <div className="text-right sm:text-left">
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500">معدل تحقيق الهدف</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-indigo-700 tabular-nums">
              {percentMet}%
            </div>
          </div>
          <div className="text-right sm:text-left border-r border-slate-200 pr-4 sm:pr-6">
            <div className="text-[11px] sm:text-xs font-semibold text-slate-500">العمال المحققون</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-700 tabular-nums">
              {targetMetWorkers.length} <span className="text-xs text-slate-400 font-normal">/ {workers.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar with Touch Friendly Horizontal Scroll */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        
        {/* Status segmented tabs with mobile scroll */}
        <div className="flex items-center gap-1 overflow-x-auto matrix-scroll p-1 bg-slate-100 rounded-lg -mx-1 px-1">
          <button
            onClick={() => { setFilterStatus('all'); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 ${
              filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            جميع العمال ({workers.length})
          </button>
          <button
            onClick={() => { setFilterStatus('met'); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 ${
              filterStatus === 'met' ? 'bg-white text-emerald-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            محققون للـ 3 مراحل ({targetMetWorkers.length})
          </button>
          <button
            onClick={() => { setFilterStatus('needs_training'); setPage(1); }}
            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all shrink-0 ${
              filterStatus === 'needs_training' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            يحتاجون تدريب ({workers.length - targetMetWorkers.length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="بحث بالاسم أو الكود..."
            className="w-full text-xs pr-8 pl-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

      </div>

      {/* Workers Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {paginatedWorkers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
            لا يوجد عمال مطابقين لهذا الفلتر أو البحث.
          </div>
        ) : (
          paginatedWorkers.map((worker) => {
            const flex = calculateWorkerFlexibility(worker, stages);
            const isMet = flex.isTargetMet;

            return (
              <div
                key={worker.id}
                onClick={() => onOpenWorkerModal(worker)}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-400 hover:shadow-sm transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Worker Code, Shift & Quick Actions */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {worker.empCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium ml-1">
                        الوردية {worker.shift}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditWorker(worker);
                        }}
                        className="p-1 text-slate-400 hover:text-sky-700 hover:bg-slate-100 rounded"
                        title="تعديل بيانات العامل"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteWorker(worker);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                        title="حذف العامل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Worker Name */}
                  <h3 className="font-bold text-slate-900 text-sm truncate" title={worker.name}>
                    {worker.name}
                  </h3>

                  {/* Flexibility Progress Meter */}
                  <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-600 font-medium">المراحل المتقنة (≥3):</span>
                      <span className={`font-mono font-bold ${
                        isMet ? 'text-emerald-700' : 'text-amber-700'
                      }`}>
                        {flex.qualifiedStagesCount} / {worker.targetStagesCount}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${isMet ? 'bg-emerald-600' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(100, (flex.qualifiedStagesCount / worker.targetStagesCount) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Mini pills of qualified stages */}
                  <div className="mt-3 space-y-1">
                    <div className="text-[10px] text-slate-400 font-semibold">أبرز المراحل المتقنة:</div>
                    <div className="flex flex-wrap gap-1">
                      {stages
                        .filter(s => (worker.skills[s.id] ?? 0) >= 3)
                        .slice(0, 3)
                        .map(s => (
                          <span
                            key={s.id}
                            className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium truncate max-w-[120px]"
                            title={s.name}
                          >
                            {s.name} ({worker.skills[s.id]})
                          </span>
                        ))}
                      {flex.qualifiedStagesCount === 0 && (
                        <span className="text-[10px] text-slate-400 italic">لا توجد مراحل متقنة بعد</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Indicator Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  {isMet ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      محقق للهدف ({flex.surplusStages > 0 ? `+${flex.surplusStages} فائض` : 'مكتمل'})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-700 font-semibold text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5" />
                      يحتاج مرحلة {worker.targetStagesCount - flex.qualifiedStagesCount} إضافية
                    </span>
                  )}

                  <span className="text-[11px] text-slate-400 hover:text-slate-600">
                    تعديل المهارات ←
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600 shadow-xs">
          <div>
            صفحة <strong className="font-mono text-slate-900">{page}</strong> من <strong className="font-mono text-slate-900">{totalPages}</strong> ({filteredWorkers.length} عامل)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="font-mono font-bold text-slate-800">{page} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Worker Detail & Skill Adjustment Drawer / Modal */}
      {selectedWorkerForModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-3.5 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-xs font-bold">
                    {selectedWorkerForModal.empCode}
                  </span>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {selectedWorkerForModal.name}
                  </h3>
                </div>
                <div className="text-xs text-slate-300 mt-1 flex items-center gap-3">
                  <span>الوردية: {selectedWorkerForModal.shift}</span>
                  <span>·</span>
                  <span>تاريخ التعيين: {selectedWorkerForModal.hireDate}</span>
                </div>
              </div>

              <button
                onClick={onCloseWorkerModal}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Stages Skill Matrix for this Worker */}
            <div className="p-5 overflow-y-auto space-y-4">
              
              {/* Target Status Banner */}
              {(() => {
                const flex = calculateWorkerFlexibility(selectedWorkerForModal, stages);
                return (
                  <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                    flex.isTargetMet 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}>
                    <div>
                      <div className="font-bold">
                        {flex.isTargetMet ? 'العامل مستوفٍ لهدف المرونة بنجاح!' : 'العامل يحتاج إلى تدريب إضافي'}
                      </div>
                      <div className="text-[11px] mt-0.5 opacity-90">
                        متقن لـ {flex.qualifiedStagesCount} مراحل من أصل {selectedWorkerForModal.targetStagesCount} مراحل مطلوبة بدرجة ≥ 3.
                      </div>
                    </div>
                    <div className="text-lg font-black font-mono">
                      {flex.qualifiedStagesCount} / {selectedWorkerForModal.targetStagesCount}
                    </div>
                  </div>
                );
              })()}

              <div className="text-xs font-bold text-slate-700">
                تقييم مهارات العامل في مراحل هذا الموديل (انقر على الدرجة لتعديلها):
              </div>

              {/* Stages List with Direct Rating Buttons */}
              <div className="space-y-2">
                {stages.map((stage) => {
                  const currentLevel = (selectedWorkerForModal.skills[stage.id] ?? 0) as SkillLevel;

                  return (
                    <div
                      key={stage.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-xs text-slate-900">{stage.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          كود: {stage.code} · التصنيف: {stage.category}
                        </div>
                      </div>

                      {/* 0 to 4 Rating Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {([0, 1, 2, 3, 4] as SkillLevel[]).map((lvl) => {
                          const def = SKILL_DEFINITIONS[lvl];
                          const isSelected = currentLevel === lvl;

                          return (
                            <button
                              key={lvl}
                              onClick={() => onUpdateWorkerSkill(selectedWorkerForModal.id, stage.id, lvl)}
                              title={def.labelAr}
                              className={`w-8 h-8 rounded-lg font-mono text-xs font-bold transition-all ${
                                isSelected
                                  ? `${def.bgClass} ${def.borderClass} ${def.textClass} ring-2 ring-slate-900 shadow-xs scale-105`
                                  : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              {lvl}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={onCloseWorkerModal}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
              >
                إغلاق وحفظ
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
