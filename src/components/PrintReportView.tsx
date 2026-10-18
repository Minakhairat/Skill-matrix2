import React from 'react';
import { ProductionLine, Model, Stage, Worker } from '../types/matrix';
import { calculateStageMetric, calculateWorkerFlexibility } from '../utils/matrixCalculations';
import { Printer } from 'lucide-react';

interface PrintReportViewProps {
  line: ProductionLine;
  model: Model;
  stages: Stage[];
  workers: Worker[];
  leadership?: import('../types/matrix').PlantLeadership;
}

export const PrintReportView: React.FC<PrintReportViewProps> = ({
  line,
  model,
  stages,
  workers,
  leadership
}) => {
  const stageMetrics = stages.map(s => calculateStageMetric(s, workers));
  const coveredCount = stageMetrics.filter(m => m.isCovered).length;
  const shortageCount = stageMetrics.filter(m => !m.isCovered).length;
  const coveragePercent = stages.length > 0 ? Math.round((coveredCount / stages.length) * 100) : 100;

  const multiSkilledCount = workers.filter(w => calculateWorkerFlexibility(w, stages).isTargetMet).length;
  const flexibilityPercent = workers.length > 0 ? Math.round((multiSkilledCount / workers.length) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Print Trigger Action Bar (Hidden when printed) */}
      <div className="no-print bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">تقرير جاهزية خط الإنتاج الرسمي (Shift & Audit Report)</h2>
          <p className="text-xs text-slate-500 mt-0.5">تقرير مخصص وجاهز للطباعة المباشرة بصيغة A4 لتقديمه لمدير المصنع ومشرفي الورديات</p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة التقرير (Print / PDF)</span>
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="bg-white p-4 sm:p-8 rounded-xl border border-slate-200 shadow-xs max-w-5xl mx-auto print:border-none print:shadow-none print:p-0">
        
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">MatrixPro Industrial</div>
            <div className="text-xs sm:text-sm font-bold text-slate-700 mt-0.5">تقرير كفاءة وموازنة خطوط الإنتاج والعمالة</div>
            <div className="text-[11px] sm:text-xs text-slate-500 mt-1">
              تاريخ التقرير: {new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>

          <div className="text-right sm:text-left text-xs space-y-1 bg-slate-50 sm:bg-transparent p-2.5 sm:p-0 rounded-lg">
            <div><strong>خط الإنتاج:</strong> {line.name}</div>
            <div><strong>الموديل:</strong> {model.name} ({model.code})</div>
            <div><strong>المشرف المسؤول:</strong> {line.supervisor || 'غير محدد'}</div>
            {leadership && (
              <div className="text-slate-600">
                <strong>المهندس المسؤول:</strong> {leadership.engineerName}
              </div>
            )}
          </div>
        </div>

        {/* Executive Summary Metrics Box */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 my-4 sm:my-6 p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-lg text-center text-xs">
          <div>
            <div className="text-slate-500 font-medium">إجمالي عمال الخط</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-1 tabular-nums">{workers.length} عامل</div>
          </div>
          <div>
            <div className="text-slate-500 font-medium">نسبة تغطية المراحل</div>
            <div className="text-xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">{coveragePercent}%</div>
          </div>
          <div>
            <div className="text-slate-500 font-medium">مراحل بها عجز</div>
            <div className={`text-xl font-bold font-mono mt-1 tabular-nums ${shortageCount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {shortageCount} مراحل
            </div>
          </div>
          <div>
            <div className="text-slate-500 font-medium">مرونة العمال (≥3 مراحل)</div>
            <div className="text-xl font-bold font-mono text-indigo-700 mt-1 tabular-nums">{flexibilityPercent}% ({multiSkilledCount})</div>
          </div>
        </div>

        {/* Stages Readiness Table */}
        <div className="my-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">1. تحليل تغطية مراحل خط الإنتاج (Workstations Coverage):</h3>
          <table className="w-full text-right text-xs border border-slate-300 border-collapse">
            <thead className="bg-slate-100 text-slate-800 font-bold">
              <tr>
                <th className="border border-slate-300 p-2">كود المرحلة</th>
                <th className="border border-slate-300 p-2">اسم المرحلة</th>
                <th className="border border-slate-300 p-2">التصنيف</th>
                <th className="border border-slate-300 p-2 text-center">المستهدف</th>
                <th className="border border-slate-300 p-2 text-center">المتوفر (≥3)</th>
                <th className="border border-slate-300 p-2 text-center">الفجوة</th>
                <th className="border border-slate-300 p-2 text-center">نسبة الجاهزية</th>
                <th className="border border-slate-300 p-2 text-center">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {stageMetrics.map((m) => (
                <tr key={m.stage.id} className="border-b border-slate-200">
                  <td className="border border-slate-300 p-2 font-mono font-semibold">{m.stage.code}</td>
                  <td className="border border-slate-300 p-2 font-medium">{m.stage.name}</td>
                  <td className="border border-slate-300 p-2 text-slate-600">{m.stage.category}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{m.target}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono font-bold">{m.qualifiedCount}</td>
                  <td className="border border-slate-300 p-2 text-center font-mono font-bold">
                    {m.gap > 0 ? `-${m.gap} (عجز)` : '0 (مغطى)'}
                  </td>
                  <td className="border border-slate-300 p-2 text-center font-mono">{m.coveragePercentage}%</td>
                  <td className="border border-slate-300 p-2 text-center font-bold">
                    {m.gap > 0 ? (m.isCriticalShortage ? 'عجز حرج' : 'نقص تدريب') : 'مستوفى'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Multi-Skilled Flexible Workers */}
        <div className="my-6">
          <h3 className="text-sm font-bold text-slate-900 mb-3">2. عينة من العمال متعددي المهارات الأكثر مرونة على الخط:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {workers
              .filter(w => calculateWorkerFlexibility(w, stages).isTargetMet)
              .slice(0, 12)
              .map(w => {
                const flex = calculateWorkerFlexibility(w, stages);
                return (
                  <div key={w.id} className="p-2 border border-slate-200 rounded flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{w.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{w.empCode} · وردية {w.shift}</div>
                    </div>
                    <span className="font-mono text-emerald-700 font-bold text-xs">
                      {flex.qualifiedStagesCount} مراحل
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Signatures section */}
        <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-3 gap-8 text-xs text-center">
          <div>
            <div className="font-bold text-slate-900">مشرف الخط</div>
            <div className="text-slate-700 font-semibold mt-1">{line.supervisor || 'غير محدد'}</div>
            <div className="mt-6 text-slate-400">التوقيع: ............................</div>
          </div>
          <div>
            <div className="font-bold text-slate-900">مهندس الإنتاج والـ Lean</div>
            <div className="text-slate-700 font-semibold mt-1">{leadership?.engineerName || 'م. مينا خيرت'}</div>
            <div className="mt-6 text-slate-400">التوقيع: ............................</div>
          </div>
          <div>
            <div className="font-bold text-slate-900">مدير المصنع والعمليات</div>
            <div className="text-slate-700 font-semibold mt-1">{leadership?.managerName || 'أ. أحمد فؤاد'}</div>
            <div className="mt-6 text-slate-400">التوقيع: ............................</div>
          </div>
        </div>

      </div>
    </div>
  );
};
