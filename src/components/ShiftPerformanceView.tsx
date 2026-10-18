import React, { useState } from 'react';
import { ProductionLine, Model, Stage, Worker, ShiftPerformanceMetric, TerminologyConfig } from '../types/matrix';
import { calculateAllShiftsPerformance } from '../utils/performanceCalculator';
import { 
  TrendingUp, 
  Award, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Sparkles, 
  Gauge, 
  ArrowUpRight,
  Info
} from 'lucide-react';

interface ShiftPerformanceViewProps {
  line: ProductionLine;
  model: Model;
  stages: Stage[];
  lineWorkers: Worker[];
  onOpenWorkerModal: (worker: Worker) => void;
  terminology?: TerminologyConfig;
}

export const ShiftPerformanceView: React.FC<ShiftPerformanceViewProps> = ({
  line,
  model,
  stages,
  lineWorkers,
  onOpenWorkerModal,
  terminology
}) => {
  const [simulationUpgradedCount, setSimulationUpgradedCount] = useState<number>(2);

  // Calculate metrics for Shift A, B, C
  const shiftMetrics = calculateAllShiftsPerformance(lineWorkers, stages);
  const shifts: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];

  // Calculate overall line weighted performance
  const totalWorkers = lineWorkers.length || 1;
  const overallAvgSkill = stages.length > 0
    ? Number((
        lineWorkers.reduce((acc, w) => {
          return acc + stages.reduce((sAcc, stg) => sAcc + (w.skills[stg.id] ?? 0), 0);
        }, 0) / (totalWorkers * stages.length)
      ).toFixed(2))
    : 0;

  const overallUplift = Math.round(
    ((shiftMetrics.A.improvementUpliftRate * (shiftMetrics.A.workerCount || 1)) +
     (shiftMetrics.B.improvementUpliftRate * (shiftMetrics.B.workerCount || 1)) +
     (shiftMetrics.C.improvementUpliftRate * (shiftMetrics.C.workerCount || 1))) / totalWorkers
  );

  // Find top shift
  const topShift = shifts.reduce((prev, curr) => 
    shiftMetrics[curr].improvementUpliftRate > shiftMetrics[prev].improvementUpliftRate ? curr : prev
  , 'A');

  // Simulation calculation: What if we train X workers from level 2 to level 3?
  const simulatedUpliftGain = Math.min(100, Math.round(overallUplift + (simulationUpgradedCount * 2.2)));

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
              <TrendingUp className="w-5 h-5" />
            </span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              درجة التحسين ومستوى كفاءة خط الإنتاج والورديات ({line.name})
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            مؤشر متطور يقيس أثر رفع مهارات العمال على الأداء التشغيلي ومعدل استقرار الخط ومنع الاختناقات.
          </p>
        </div>

        {/* Global Line Score Badge */}
        <div className="flex items-center gap-6">
          <div className="text-left">
            <div className="text-xs font-semibold text-slate-500">متوسط مهارة عمال الخط</div>
            <div className="text-2xl font-black font-mono text-slate-900 tabular-nums">
              {overallAvgSkill} <span className="text-xs text-slate-400 font-normal">/ 4.0</span>
            </div>
          </div>
          <div className="text-left border-r border-slate-200 pr-6">
            <div className="text-xs font-semibold text-slate-500">معدل التحسين الإجمالي للخط</div>
            <div className="text-3xl font-black font-mono text-emerald-700 tabular-nums flex items-center gap-1">
              {overallUplift}%
              <ArrowUpRight className="w-5 h-5 text-emerald-600 stroke-[3]" />
            </div>
          </div>
        </div>
      </div>

      {/* 3 Shifts Performance Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shifts.map((sKey) => {
          const m = shiftMetrics[sKey];
          const isTop = sKey === topShift;

          return (
            <div
              key={sKey}
              className={`bg-white rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                isTop ? 'border-emerald-300 ring-2 ring-emerald-500/20' : 'border-slate-200'
              }`}
            >
              <div>
                {/* Shift Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      sKey === 'A' ? 'bg-amber-100 text-amber-900' : sKey === 'B' ? 'bg-sky-100 text-sky-900' : 'bg-indigo-100 text-indigo-900'
                    }`}>
                      {sKey}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{m.shiftName}</h3>
                      <span className="text-[11px] text-slate-500 font-mono">{m.workerCount} عامل</span>
                    </div>
                  </div>

                  {isTop && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Award className="w-3.5 h-3.5" />
                      الأعلى كفاءة
                    </span>
                  )}
                </div>

                {/* Uplift Rate Big Gauge */}
                <div className="my-4 bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 text-center">
                  <span className="text-xs font-semibold text-slate-500">درجة التحسين والكفاءة التشغيلية</span>
                  <div className="text-3xl font-black font-mono mt-1 text-slate-900 tabular-nums">
                    {m.improvementUpliftRate}%
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all ${
                        m.improvementUpliftRate >= 75 ? 'bg-emerald-500' : m.improvementUpliftRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${m.improvementUpliftRate}%` }}
                    />
                  </div>
                </div>

                {/* Shift Detailed Stats */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600">متوسط تقييم المهارة بالوردية:</span>
                    <strong className="font-mono text-slate-900 tabular-nums">{m.avgSkillPointsPerWorker} / 4.0</strong>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-600">معدل العمال متعددي المهارات (≥3):</span>
                    <strong className="font-mono text-indigo-700 tabular-nums">{m.multiSkilledRate}% ({m.multiSkilledCount} عامل)</strong>
                  </div>

                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-600">مراحل التغطية الكاملة بالوردية:</span>
                    <strong className="font-mono text-emerald-700 tabular-nums">{m.criticalStagesCoveredCount} من {stages.length}</strong>
                  </div>
                </div>
              </div>

              {/* Bottlenecks Alert in Shift */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                {m.bottlenecksCount > 0 ? (
                  <span className="text-amber-700 flex items-center gap-1 text-[11px] font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {m.bottlenecksCount} مراحل بها عجز في هذه الوردية
                  </span>
                ) : (
                  <span className="text-emerald-700 flex items-center gap-1 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    جاهزية مكتملة لكافة المراحل
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Skill Uplift Simulator (محاكي رفع المهارات) */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-2 bg-slate-800 rounded-lg text-amber-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white">
              محاكي أثر التدريب ورفع المهارات على تحسين أداء الخط (ROI & Uplift Simulator)
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              شاهد كيف ينعكس ترقية وتقييم العمال من المستوى 2 إلى 3 أو 4 على معدل الإنتاجية واستقرار الخط فورياً.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mt-5 pt-4 border-t border-slate-800">
          
          {/* Controls */}
          <div className="md:col-span-2 space-y-3">
            <label className="text-xs font-semibold text-slate-300 block">
              حدد عدد العمال المتوقع تدريبهم وترقيتهم هذا الأسبوع:
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={15}
                value={simulationUpgradedCount}
                onChange={(e) => setSimulationUpgradedCount(Number(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer"
              />
              <span className="font-mono text-lg font-bold text-amber-300 w-12 text-center">
                {simulationUpgradedCount}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              بترقية {simulationUpgradedCount} عمال من المستوى 2 (إشراف) إلى المستوى 3 (مستقل)، يتم سد نقاط الاختناق في خط {line.name}.
            </div>
          </div>

          {/* Outcome Metric Box */}
          <div className="bg-slate-800/90 rounded-xl p-4 border border-slate-700 text-center">
            <span className="text-xs text-slate-300 font-semibold">معدل التحسين المتوقع للخط</span>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="text-2xl font-mono text-slate-400 line-through tabular-nums">{overallUplift}%</span>
              <span className="text-3xl font-black font-mono text-emerald-400 tabular-nums">
                {simulatedUpliftGain}%
              </span>
            </div>
            <div className="text-[11px] text-emerald-300 font-bold mt-1">
              +{(simulatedUpliftGain - overallUplift).toFixed(1)}% زيادة في استقرار وكفاءة الإنتاج
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
