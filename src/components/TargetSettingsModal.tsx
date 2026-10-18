import React, { useState } from 'react';
import { Sliders, X, Check, RotateCcw, Target, Factory, Cog, Building2 } from 'lucide-react';
import { DEFAULT_WORKSTATION_TARGET, DEFAULT_WORKER_FLEXIBILITY_TARGET, DEFAULT_MIN_QUALIFIED_LEVEL, TERMINOLOGY_PRESETS } from '../utils/constants';
import { TerminologyConfig, TerminologyPreset } from '../types/matrix';

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
  terminology: TerminologyConfig;
  onUpdateTerminology: (term: TerminologyConfig) => void;
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
  onApplyToAllStages,
  terminology,
  onUpdateTerminology
}) => {
  const [localStageTarget, setLocalStageTarget] = useState(targetWorkersPerStage);
  const [localWorkerTarget, setLocalWorkerTarget] = useState(targetStagesPerWorker);
  const [localMinLevel, setLocalMinLevel] = useState(minQualifiedLevel);
  const [localPreset, setLocalPreset] = useState<TerminologyPreset>(terminology.preset);

  if (!isOpen) return null;

  const currentTerm = TERMINOLOGY_PRESETS[localPreset] || terminology;

  const handlePresetChange = (preset: TerminologyPreset) => {
    setLocalPreset(preset);
    const updatedTerm = TERMINOLOGY_PRESETS[preset];
    if (updatedTerm) {
      onUpdateTerminology(updatedTerm);
    }
  };

  const handleSave = () => {
    onUpdateTargetWorkersPerStage(localStageTarget);
    onUpdateTargetStagesPerWorker(localWorkerTarget);
    onUpdateMinQualifiedLevel(localMinLevel);
    if (TERMINOLOGY_PRESETS[localPreset]) {
      onUpdateTerminology(TERMINOLOGY_PRESETS[localPreset]);
    }
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
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-800 rounded-lg text-amber-300">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                تحديد أهداف وتشغيل {currentTerm.lineLabelPlural}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                تحديد نظام العمل (خطوط إنتاج / ماكينات / أقسام) ومعايير الكفاءة والتغطية
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
          
          {/* SECTION 0: Operating Mode / System Terminology (خطوط إنتاج ولا ماكينات ولا أقسام) */}
          <div className="space-y-2 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>نظام وطبيعة تشغيل المصنع (اختر نمطك):</span>
              </label>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                محدد حالياً: {currentTerm.lineLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              عند اختيارك نمطاً، ستتغير كافة القوائم والاختيارات والتقارير فوراً لتطابق نمطك المختار:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {/* Option 1: Lines */}
              <button
                type="button"
                onClick={() => handlePresetChange('lines_models')}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  localPreset === 'lines_models'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Factory className="w-3.5 h-3.5 text-indigo-600" />
                    <span>خطوط إنتاج</span>
                  </div>
                  {localPreset === 'lines_models' && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <div className="text-[10px] text-indigo-700 font-mono mt-2 pt-1.5 border-t border-slate-200/80">
                  خط إنتاج · موديل · مرحلة
                </div>
              </button>

              {/* Option 2: Machines */}
              <button
                type="button"
                onClick={() => handlePresetChange('machines_molds')}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  localPreset === 'machines_molds'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Cog className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ماكينات</span>
                  </div>
                  {localPreset === 'machines_molds' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-[10px] text-emerald-700 font-mono mt-2 pt-1.5 border-t border-slate-200/80">
                  ماكينة · اسطمبة · عملية
                </div>
              </button>

              {/* Option 3: Departments */}
              <button
                type="button"
                onClick={() => handlePresetChange('departments_products')}
                className={`p-2.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
                  localPreset === 'departments_products'
                    ? 'border-sky-600 bg-sky-50/70 ring-2 ring-sky-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Building2 className="w-3.5 h-3.5 text-sky-600" />
                    <span>أقسام</span>
                  </div>
                  {localPreset === 'departments_products' && <Check className="w-3.5 h-3.5 text-sky-600" />}
                </div>
                <div className="text-[10px] text-sky-700 font-mono mt-2 pt-1.5 border-t border-slate-200/80">
                  قسم · منتج · محطة عمل
                </div>
              </button>
            </div>
          </div>
          
          {/* Target 1: Workers per stage */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">
              1. هدف تغطية {currentTerm.stageLabel} (Workstation Target):
            </label>
            <p className="text-xs text-slate-500">
              العدد المطلوب من العمال المؤهلين لكل {currentTerm.stageLabel} على {currentTerm.lineLabel} (مثال: 5 عمال).
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
              <span className="text-xs font-semibold text-slate-700">عمال مؤهلين لكل {currentTerm.stageLabel}</span>
            </div>
          </div>

          {/* Target 2: Min Qualified Level */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 block">
              2. الحد الأدنى للدرجة المطلوبة للاعتماد (من 4 درجات):
            </label>
            <p className="text-xs text-slate-500">
              الدرجة التي عندها يُعتبر العامل "مؤهلاً بالكامل" ويُحتسب ضمن تغطية {currentTerm.stageLabel}.
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
              عدد {currentTerm.stageLabelPlural} المطلوب من كل عامل إتقانها لضمان المرونة وتفادي توقف {currentTerm.lineLabel} (مثال: 3 {currentTerm.stageLabelPlural}).
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
              <span className="text-xs font-semibold text-slate-700">{currentTerm.stageLabelPlural} مؤهل بها لكل عامل</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1 sm:py-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الأهداف الافتراضية</span>
          </button>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 sm:px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>تطبيق الأهداف</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

