import React, { useState } from 'react';
import { Sliders, X, Check, RotateCcw, Target } from 'lucide-react';
import { DEFAULT_WORKSTATION_TARGET, DEFAULT_WORKER_FLEXIBILITY_TARGET, DEFAULT_MIN_QUALIFIED_LEVEL } from '../utils/constants';

interface TargetSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetWorkersPerStage: number;
  onUpdateTargetWorkersPerStage: (val: number) => void;
  targetStagesPerWorker: number;
  onUpdateTargetStagesPerWorker: (val: number) => void;
  minQualifiedLevel: number;
  onUpdateMinQualifiedLevel: (val: number) => void;
  onApplyToAllStages: () => void;
}

export const TargetSettingsModal: React.FC<TargetSettingsModalProps> = ({
  isOpen,
  onClose,
  targetWorkersPerStage,
  onUpdateTargetWorkersPerStage,
  targetStagesPerWorker,
  onUpdateTargetStagesPerWorker,
  minQualifiedLevel,
  onUpdateMinQualifiedLevel,
  onApplyToAllStages
}) => {
  const [localStageTarget, setLocalStageTarget] = useState(targetWorkersPerStage);
  const [localWorkerTarget, setLocalWorkerTarget] = useState(targetStagesPerWorker);
  const [localMinLevel, setLocalMinLevel] = useState(minQualifiedLevel);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateTargetWorkersPerStage(localStageTarget);
    onUpdateTargetStagesPerWorker(localWorkerTarget);
    onUpdateMinQualifiedLevel(localMinLevel);
    onApplyToAllStages();
    onClose();
  };

  const handleResetDefaults = () => {
    setLocalStageTarget(DEFAULT_WORKSTATION_TARGET);
    setLocalWorkerTarget(DEFAULT_WORKER_FLEXIBILITY_TARGET);
    setLocalMinLevel(DEFAULT_MIN_QUALIFIED_LEVEL);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-800 rounded-lg text-amber-300">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                تحديد ومواءمة أهداف خط الإنتاج
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                تخصيص معايير الكفاءة والتغطية لكافة خطوط ومراحل المصنع
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Target 1: Workers per stage */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">
              1. هدف تغطية المرحلة (Workstation Target):
            </label>
            <p className="text-xs text-slate-500">
              العدد المطلوب من العمال المؤهلين لكل مرحلة على خط الإنتاج (مثال: 5 عمال).
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={50}
                value={localStageTarget}
                onChange={(e) => setLocalStageTarget(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-xs font-semibold text-slate-700">عمال مؤهلين لكل مرحلة</span>
            </div>
          </div>

          {/* Target 2: Min Qualified Level */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">
              2. الحد الأدنى للدرجة المطلوبة للاعتماد (من 4 درجات):
            </label>
            <p className="text-xs text-slate-500">
              الدرجة التي عندها يُعتبر العامل "مؤهلاً بالكامل" ويُحتسب ضمن تغطية المرحلة.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLocalMinLevel(lvl)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                    localMinLevel === lvl
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  المستوى {lvl} {lvl === 3 ? '(الافتراضي - كفء)' : lvl === 4 ? '(خبير)' : '(إشراف)'}
                </button>
              ))}
            </div>
          </div>

          {/* Target 3: Stages per worker flexibility */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">
              3. هدف مرونة وتعدد مهارات العامل (Multi-Skilling Target):
            </label>
            <p className="text-xs text-slate-500">
              عدد المراحل المطلوب من كل عامل إتقانها لضمان المرونة وتفادي التوقفات (مثال: 3 مراحل).
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={20}
                value={localWorkerTarget}
                onChange={(e) => setLocalWorkerTarget(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-slate-900 text-center text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-xs font-semibold text-slate-700">مراحل مؤهل بها لكل عامل</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            استعادة الأهداف الافتراضية
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              تطبيق الأهداف وتحديث الحسابات
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
