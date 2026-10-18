import React, { useState, useMemo } from 'react';
import { Worker, Stage, SkillLevel } from '../types/matrix';
import { SKILL_DEFINITIONS } from '../utils/constants';
import { calculateStageMetric, calculateWorkerFlexibility } from '../utils/matrixCalculations';
import { 
  Check, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  LayoutGrid, 
  TableProperties,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles
} from 'lucide-react';

interface SkillsMatrixGridProps {
  workers: Worker[];
  stages: Stage[];
  onUpdateWorkerSkill: (workerId: string, stageId: string, newLevel: SkillLevel) => void;
  onSelectWorkerDetails: (worker: Worker) => void;
  onEditWorker: (worker: Worker) => void;
  onDeleteWorker: (worker: Worker) => void;
}

export const SkillsMatrixGrid: React.FC<SkillsMatrixGridProps> = ({
  workers,
  stages,
  onUpdateWorkerSkill,
  onSelectWorkerDetails,
  onEditWorker,
  onDeleteWorker
}) => {
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [hoveredCell, setHoveredCell] = useState<{ workerId: string; stageId: string } | null>(null);
  
  // Mobile View Mode Toggle: 'cards' (touch optimized) or 'table' (full spreadsheet)
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');
  const [expandedWorkerCards, setExpandedWorkerCards] = useState<Record<string, boolean>>({});

  // Pagination calculation
  const totalPages = Math.ceil(workers.length / (pageSize === -1 ? 1 : pageSize)) || 1;
  const paginatedWorkers = useMemo(() => {
    if (pageSize === -1) return workers; // Show all
    const start = (currentPage - 1) * pageSize;
    return workers.slice(start, start + pageSize);
  }, [workers, currentPage, pageSize]);

  // Compute summary for bottom row
  const stageSummaries = useMemo(() => {
    return stages.map(stage => calculateStageMetric(stage, workers));
  }, [stages, workers]);

  // Cycle to next skill level: 0 -> 1 -> 2 -> 3 -> 4 -> 0
  const handleCellClick = (workerId: string, stageId: string, currentLevel: SkillLevel) => {
    const nextLevel = ((currentLevel + 1) % 5) as SkillLevel;
    onUpdateWorkerSkill(workerId, stageId, nextLevel);
  };

  const toggleWorkerCardExpand = (workerId: string) => {
    setExpandedWorkerCards(prev => ({
      ...prev,
      [workerId]: !prev[workerId]
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Matrix Controls & Guide Bar */}
      <div className="p-2.5 sm:p-3 sm:px-6 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5 text-xs">
        
        {/* Rating Scale Legend */}
        <div className="flex items-center flex-wrap gap-1 sm:gap-2 text-slate-600">
          <span className="font-bold text-slate-700 hidden sm:inline text-xs">المستويات:</span>
          {([0, 1, 2, 3, 4] as SkillLevel[]).map(lvl => {
            const def = SKILL_DEFINITIONS[lvl];
            return (
              <span 
                key={lvl}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] sm:text-[11px] font-semibold ${def.bgClass} ${def.borderClass} ${def.textClass}`}
                title={def.descriptionAr}
              >
                <span className="font-mono font-bold">{lvl}</span>
                <span className="hidden xs:inline">{def.labelAr.split('/')[0]}</span>
              </span>
            );
          })}
        </div>

        {/* View Mode Toggle on Mobile & Page Selector */}
        <div className="flex items-center gap-2 sm:gap-4 text-slate-600 w-full sm:w-auto justify-between sm:justify-end pt-1 sm:pt-0 border-t sm:border-0 border-slate-200">
          
          {/* Mobile Display Mode Toggle (Cards vs Table) */}
          <div className="flex lg:hidden items-center bg-slate-200/90 p-0.5 rounded-lg">
            <button
              onClick={() => setMobileViewMode('cards')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                mobileViewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>بطاقات</span>
            </button>
            <button
              onClick={() => setMobileViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                mobileViewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5" />
              <span>جدول كامل</span>
            </button>
          </div>

          {/* Page size dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] sm:text-xs text-slate-500">عرض:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-800 font-bold focus:outline-none text-[11px] sm:text-xs"
            >
              <option value={25}>25 عامل</option>
              <option value={50}>50 عامل</option>
              <option value={100}>100 عامل</option>
              <option value={-1}>الكل ({workers.length})</option>
            </select>
          </div>

        </div>

      </div>

      {/* MOBILE COMPACT CARDS VIEW (Visible on mobile/tablet when mobileViewMode === 'cards') */}
      <div className={`lg:hidden flex-1 overflow-y-auto p-2.5 sm:p-4 space-y-3 matrix-scroll ${mobileViewMode === 'cards' ? 'block' : 'hidden'}`}>
        {paginatedWorkers.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">لا يوجد عمال مطابقين.</div>
        ) : (
          paginatedWorkers.map((worker) => {
            const flex = calculateWorkerFlexibility(worker, stages);
            const isExpanded = Boolean(expandedWorkerCards[worker.id]);

            return (
              <div 
                key={worker.id}
                className="bg-slate-50/80 rounded-xl border border-slate-200 p-3 sm:p-4 shadow-xs hover:border-slate-300 transition-all"
              >
                {/* Worker Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 gap-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shrink-0">
                      {worker.empCode}
                    </span>
                    <button
                      onClick={() => onSelectWorkerDetails(worker)}
                      className="text-xs sm:text-sm font-bold text-slate-900 hover:text-emerald-700 text-right truncate"
                    >
                      {worker.name}
                    </button>
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded shrink-0">
                      وردية {worker.shift}
                    </span>
                  </div>

                  {/* Actions & Flexibility Badge */}
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      flex.isTargetMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {flex.qualifiedStagesCount}/{worker.targetStagesCount}
                    </span>

                    <button
                      onClick={() => onEditWorker(worker)}
                      className="p-1 text-slate-500 hover:text-sky-700 bg-white rounded border border-slate-200"
                      title="تعديل بيانات العامل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onDeleteWorker(worker)}
                      className="p-1 text-slate-400 hover:text-rose-600 bg-white rounded border border-slate-200"
                      title="حذف العامل"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Compact Interactive Stages Grid (2 cols on mobile, 3 on tablet) */}
                <div className="pt-2.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                    <span>انقر على أي مرحلة لتغيير المستوى (0-4):</span>
                    <button
                      type="button"
                      onClick={() => toggleWorkerCardExpand(worker.id)}
                      className="text-indigo-600 font-semibold hover:underline flex items-center gap-0.5 text-[10px]"
                    >
                      <span>{isExpanded ? 'طي الأزرار' : 'أزرار مفصلة'}</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {stages.map((stage) => {
                      const level = (worker.skills[stage.id] ?? 0) as SkillLevel;
                      const def = SKILL_DEFINITIONS[level];

                      return (
                        <div 
                          key={stage.id}
                          className="bg-white rounded-lg border border-slate-200 p-1.5 flex flex-col justify-between"
                        >
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-semibold text-slate-800 text-[11px] truncate" title={stage.name}>
                              {stage.name}
                            </span>
                          </div>

                          {/* Level selector */}
                          {isExpanded ? (
                            <div className="flex items-center justify-between gap-0.5 pt-1 border-t border-slate-100">
                              {([0, 1, 2, 3, 4] as SkillLevel[]).map((lvl) => {
                                const isSelected = level === lvl;
                                const lvlDef = SKILL_DEFINITIONS[lvl];
                                return (
                                  <button
                                    key={lvl}
                                    type="button"
                                    onClick={() => onUpdateWorkerSkill(worker.id, stage.id, lvl)}
                                    className={`w-5 h-5 rounded font-mono text-[10px] font-bold transition-all ${
                                      isSelected
                                        ? `${lvlDef.bgClass} ${lvlDef.borderClass} ${lvlDef.textClass} ring-1 ring-slate-900 font-black`
                                        : 'bg-slate-50 text-slate-400 hover:text-slate-700'
                                    }`}
                                  >
                                    {lvl}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleCellClick(worker.id, stage.id, level)}
                              className={`w-full py-1 px-1.5 rounded flex items-center justify-between text-[11px] font-bold border transition-transform active:scale-95 ${def.bgClass} ${def.borderClass} ${def.textClass}`}
                            >
                              <span className="font-mono text-xs">{level}</span>
                              <span className="text-[10px] truncate">{def.labelAr.split('/')[0]}</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* FULL MATRIX SPREADSHEET TABLE (Shown on desktop always, toggleable on mobile) */}
      <div className={`flex-1 overflow-auto matrix-scroll relative overscroll-x-contain ${
        mobileViewMode === 'table' ? 'block' : 'hidden lg:block'
      }`}>
        <table className="w-full border-collapse text-right text-xs">
          
          {/* Table Header */}
          <thead className="sticky top-0 z-30 bg-slate-900 text-white shadow-xs">
            <tr>
              {/* Sticky Col 1: Worker ID - Fixed Width 56px */}
              <th className="sticky right-0 z-40 bg-slate-900 px-2 py-3 font-semibold text-slate-300 w-14 min-w-[56px] max-w-[56px] border-b border-l border-slate-800 text-center">
                الكود
              </th>

              {/* Sticky Col 2: Worker Name & Actions - Fixed Width 160px sm:192px */}
              <th className="sticky right-[56px] z-40 bg-slate-900 px-3 py-3 font-semibold text-white w-40 sm:w-48 min-w-[160px] sm:min-w-[192px] max-w-[160px] sm:max-w-[192px] border-b border-l border-slate-800">
                اسم العامل والإجراءات
              </th>

              {/* Col 3: Shift */}
              <th className="px-2 py-3 font-semibold text-slate-300 w-14 min-w-[56px] text-center border-b border-l border-slate-800">
                الوردية
              </th>

              {/* Dynamic Stage Columns */}
              {stages.map((stage) => {
                const targetCount = stage.targetWorkersCount || 5;
                return (
                  <th
                    key={stage.id}
                    className="px-2 py-2.5 font-semibold text-white border-b border-l border-slate-800 min-w-[105px] sm:min-w-[125px] max-w-[150px] text-center"
                  >
                    <div className="font-bold truncate text-slate-100" title={stage.name}>
                      {stage.name}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5 text-[10px] text-slate-400 font-normal">
                      <span className="font-mono text-emerald-400 font-semibold">هدف: {targetCount}</span>
                      <span>·</span>
                      <span className="font-mono text-slate-400">{stage.code}</span>
                    </div>
                  </th>
                );
              })}

              {/* Col: Worker Flexibility Goal */}
              <th className="px-2 sm:px-3 py-3 font-bold text-amber-300 border-b border-slate-800 min-w-[90px] sm:min-w-[105px] text-center bg-slate-950">
                المرونة (3)
              </th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {paginatedWorkers.length === 0 ? (
              <tr>
                <td colSpan={stages.length + 4} className="py-12 text-center text-slate-400 text-sm">
                  لا توجد نتائج مطابقة لبحثك أو الفلاتر المختارة.
                </td>
              </tr>
            ) : (
              paginatedWorkers.map((worker, rowIdx) => {
                const flex = calculateWorkerFlexibility(worker, stages);
                const isEven = rowIdx % 2 === 0;

                return (
                  <tr 
                    key={worker.id}
                    className={`transition-colors hover:bg-slate-50/80 group ${isEven ? 'bg-white' : 'bg-slate-50/40'}`}
                  >
                    {/* Sticky Col 1: Worker ID */}
                    <td className="sticky right-0 z-20 px-2 py-2 text-center font-mono text-[11px] font-semibold text-slate-600 border-l border-slate-200 bg-white group-hover:bg-slate-50 whitespace-nowrap w-14 min-w-[56px] max-w-[56px]">
                      {worker.empCode}
                    </td>

                    {/* Sticky Col 2: Worker Name & Actions */}
                    <td className="sticky right-[56px] z-20 px-2 sm:px-3 py-2 font-medium text-slate-900 border-l border-slate-200 bg-white group-hover:bg-slate-50 whitespace-nowrap w-40 sm:w-48 min-w-[160px] sm:min-w-[192px] max-w-[160px] sm:max-w-[192px]">
                      <div className="flex items-center justify-between gap-1">
                        <button
                          onClick={() => onSelectWorkerDetails(worker)}
                          className="text-right hover:text-emerald-700 hover:underline transition-colors block font-semibold truncate max-w-[110px] sm:max-w-[140px]"
                          title="انقر لعرض تفاصيل العامل"
                        >
                          {worker.name}
                        </button>

                        <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEditWorker(worker)}
                            className="p-1 text-slate-400 hover:text-sky-700 hover:bg-slate-100 rounded"
                            title="تعديل بيانات العامل"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDeleteWorker(worker)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                            title="حذف العامل"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* Col 3: Shift */}
                    <td className="px-2 py-2 text-center font-mono text-xs text-slate-500 border-l border-slate-200 whitespace-nowrap">
                      {worker.shift}
                    </td>

                    {/* Interactive Stage Cells */}
                    {stages.map((stage) => {
                      const level = (worker.skills[stage.id] ?? 0) as SkillLevel;
                      const def = SKILL_DEFINITIONS[level];
                      const isHovered = hoveredCell?.workerId === worker.id && hoveredCell?.stageId === stage.id;

                      return (
                        <td
                          key={stage.id}
                          className="px-1 py-1 border-l border-slate-200 text-center select-none"
                          onMouseEnter={() => setHoveredCell({ workerId: worker.id, stageId: stage.id })}
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          <button
                            type="button"
                            onClick={() => handleCellClick(worker.id, stage.id, level)}
                            title={`${stage.name} - المستوى ${level}: ${def.labelAr} (انقر للترقية)`}
                            className={`w-full py-1 sm:py-1.5 px-1 sm:px-2 rounded-md border text-center transition-all cursor-pointer font-bold text-xs flex items-center justify-center gap-1 ${def.bgClass} ${def.borderClass} ${def.textClass} ${
                              isHovered ? 'ring-2 ring-slate-900/40 shadow-xs' : ''
                            }`}
                          >
                            <span className="font-mono text-xs">{level}</span>
                            <span className="hidden xl:inline text-[10px] font-medium truncate max-w-[65px]">
                              {level === 0 ? '-' : def.labelAr.split('/')[0]}
                            </span>
                          </button>
                        </td>
                      );
                    })}

                    {/* Worker Flexibility Progress (Target: 3 stages) */}
                    <td className="px-2 py-2 border-l border-slate-200 text-center font-mono font-bold whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          flex.isTargetMet 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {flex.qualifiedStagesCount}/{worker.targetStagesCount}
                        </span>
                        {flex.isTargetMet && (
                          <Check className="w-3.5 h-3.5 text-emerald-600 hidden sm:inline" />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Summary Footer Row */}
          {stages.length > 0 && paginatedWorkers.length > 0 && (
            <tfoot className="sticky bottom-0 z-30 bg-slate-900 text-white font-bold border-t-2 border-slate-800 shadow-lg">
              <tr>
                {/* Sticky Corner 1 */}
                <td className="sticky right-0 z-40 bg-slate-900 px-2 py-2.5 text-center font-mono text-[11px] text-slate-300 border-l border-slate-800 w-14 min-w-[56px] max-w-[56px]">
                  Σ
                </td>

                {/* Sticky Corner 2 */}
                <td className="sticky right-[56px] z-40 bg-slate-900 px-3 py-2.5 text-slate-100 border-l border-slate-800 w-40 sm:w-48 min-w-[160px] sm:min-w-[192px] max-w-[160px] sm:max-w-[192px]">
                  جاهزية الخط (المتوفر / المستهدف)
                </td>

                <td className="px-2 py-2.5 text-center font-mono text-slate-300 border-l border-slate-800">
                  -
                </td>

                {/* Dynamic Stage Column Summaries */}
                {stageSummaries.map((summary) => {
                  const isMet = summary.isCovered;
                  return (
                    <td
                      key={summary.stage.id}
                      className={`px-1 sm:px-2 py-2 text-center border-l border-slate-800 whitespace-nowrap ${
                        isMet ? 'bg-emerald-950/70 text-emerald-300' : 'bg-rose-950/80 text-rose-300'
                      }`}
                    >
                      <div className="font-mono text-xs font-bold">
                        {summary.qualifiedCount} / {summary.target}
                      </div>
                      <div className="text-[10px] opacity-80">
                        {isMet ? 'مستوفى' : `عجز -${summary.gap}`}
                      </div>
                    </td>
                  );
                })}

                {/* Total Line Multi-skilling Met */}
                <td className="px-2 py-2 text-center font-mono text-amber-300 bg-slate-950 whitespace-nowrap">
                  {workers.filter(w => calculateWorkerFlexibility(w, stages).isTargetMet).length}/{workers.length}
                </td>
              </tr>
            </tfoot>
          )}

        </table>
      </div>

      {/* Pagination & Summary Bar */}
      {totalPages > 1 && (
        <div className="p-2 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="text-slate-500 text-[11px] sm:text-xs">
            عرض صفحة <strong className="font-mono text-slate-900">{currentPage}</strong> من <strong className="font-mono text-slate-900">{totalPages}</strong> ({workers.length} عامل إجمالي)
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="p-1 sm:px-2.5 sm:py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden sm:inline">السابق</span>
            </button>

            {/* Quick page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded text-xs font-mono font-bold transition-all ${
                    currentPage === pageNum 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="p-1 sm:px-2.5 sm:py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <span className="hidden sm:inline">التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
