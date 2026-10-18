import React, { useState } from 'react';
import { ProductionLine, Model, TerminologyConfig } from '../types/matrix';
import { Factory, Box, Search, Filter, ChevronDown, ChevronUp, Layers, Users } from 'lucide-react';

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
  terminology
}) => {
  const [isFiltersExpandedOnMobile, setIsFiltersExpandedOnMobile] = useState(false);

  return (
    <div className="bg-white border-b border-slate-200 py-2 sm:py-2.5 px-2.5 sm:px-6 lg:px-8 no-print">
      <div className="max-w-7xl mx-auto flex flex-col gap-2">
        
        {/* Row 1: Line / Machine & Model / Mold Selectors + Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2">
          
          {/* Selectors Group */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:flex-wrap items-center gap-1.5 sm:gap-2">
            
            {/* Line / Machine Selector */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1.5">
              <Factory className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 shrink-0 hidden xs:inline">
                {terminology.lineLabel}:
              </span>
              <select
                value={selectedLine?.id}
                onChange={(e) => {
                  const line = lines.find(l => l.id === e.target.value);
                  if (line) onSelectLine(line);
                }}
                className="text-xs sm:text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer w-full truncate"
              >
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Model / Mold Selector */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1.5">
              <Box className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-[11px] sm:text-xs font-semibold text-slate-600 shrink-0 hidden xs:inline">
                {terminology.modelLabel}:
              </span>
              <select
                value={selectedModel?.id}
                onChange={(e) => {
                  const model = selectedLine?.models.find(m => m.id === e.target.value);
                  if (model) onSelectModel(model);
                }}
                className="text-xs sm:text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer w-full truncate"
              >
                {selectedLine?.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
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
        </div>

      </div>
    </div>
  );
};
