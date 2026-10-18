import React from 'react';
import { ProductionLine, Model } from '../types/matrix';
import { Factory, Box, Search, Filter } from 'lucide-react';

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
  qualifiedWorkersMeetingTarget
}) => {
  return (
    <div className="bg-white border-b border-slate-200 py-3 px-3 sm:px-6 lg:px-8 no-print">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        
        {/* Row 1: Line, Model, and Shift Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2">
            
            {/* Production Line Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Factory className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-600 shrink-0">الخط:</span>
              <select
                value={selectedLine.id}
                onChange={(e) => {
                  const line = lines.find(l => l.id === e.target.value);
                  if (line) onSelectLine(line);
                }}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer w-full"
              >
                {lines.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Box className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-600 shrink-0">الموديل:</span>
              <select
                value={selectedModel.id}
                onChange={(e) => {
                  const model = selectedLine.models.find(m => m.id === e.target.value);
                  if (model) onSelectModel(model);
                }}
                className="text-xs font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer w-full"
              >
                {selectedLine.models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Shift Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="text-xs font-medium text-slate-600 shrink-0">الوردية:</span>
              <select
                value={selectedShift}
                onChange={(e) => onSelectShift(e.target.value)}
                className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer w-full"
              >
                <option value="ALL">جميع الورديات</option>
                <option value="A">الوردية A (صباحي)</option>
                <option value="B">الوردية B (مسائي)</option>
                <option value="C">الوردية C (ليلي)</option>
              </select>
            </div>

          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className="w-full text-xs pr-8 pl-3 py-1.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all"
            />
          </div>

        </div>

        {/* Row 2: Live Quantitative Summary (Responsive & Scannable) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-slate-600 pt-1 border-t border-slate-100 sm:border-0 sm:pt-0">
          <span>عمال الخط: <strong className="font-mono text-slate-900 tabular-nums">{workerCountOnLine}</strong></span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>المراحل: <strong className="font-mono text-slate-900 tabular-nums">{totalLineStagesCount}</strong></span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>مستهدف المرحلة: <strong className="font-mono text-emerald-700 tabular-nums">{targetWorkersPerStage} عمال</strong></span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>محققو هدف الـ 3 مراحل: <strong className="font-mono text-indigo-700 tabular-nums">{qualifiedWorkersMeetingTarget}</strong></span>
        </div>

      </div>
    </div>
  );
};
