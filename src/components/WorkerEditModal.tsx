import React, { useState, useEffect } from 'react';
import { X, UserPlus, Check, UserCheck } from 'lucide-react';
import { Worker, ProductionLine, Stage, SkillLevel, TerminologyConfig } from '../types/matrix';
import { SKILL_DEFINITIONS, formatUnitName } from '../utils/constants';

interface WorkerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveWorker: (worker: Worker) => void;
  workerToEdit?: Worker | null;
  lines: ProductionLine[];
  currentLineId: string;
  stages: Stage[];
  terminology?: TerminologyConfig;
}

export const WorkerEditModal: React.FC<WorkerEditModalProps> = ({
  isOpen,
  onClose,
  onSaveWorker,
  workerToEdit,
  lines,
  currentLineId,
  stages,
  terminology
}) => {
  const [empCode, setEmpCode] = useState('');
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState(currentLineId);
  const [shift, setShift] = useState<'A' | 'B' | 'C'>('A');
  const [skills, setSkills] = useState<Record<string, SkillLevel>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (workerToEdit) {
      setEmpCode(workerToEdit.empCode);
      setName(workerToEdit.name);
      setLineId(workerToEdit.lineId);
      setShift(workerToEdit.shift);
      setSkills(workerToEdit.skills || {});
    } else {
      setEmpCode(`EMP-${Math.floor(400 + Math.random() * 500)}`);
      setName('');
      setLineId(currentLineId);
      setShift('A');
      setSkills({});
    }
    setError(null);
  }, [workerToEdit, currentLineId, isOpen]);

  if (!isOpen) return null;

  const isEditMode = Boolean(workerToEdit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى كتابة اسم العامل.');
      return;
    }
    if (!empCode.trim()) {
      setError('يرجى كتابة الكود الوظيفي للعامل.');
      return;
    }

    const savedWorker: Worker = {
      id: workerToEdit ? workerToEdit.id : `w-${Date.now()}`,
      empCode: empCode.trim(),
      name: name.trim(),
      lineId,
      shift,
      targetStagesCount: workerToEdit ? workerToEdit.targetStagesCount : 3,
      minProficiencyTarget: workerToEdit ? workerToEdit.minProficiencyTarget : 3,
      skills,
      hireDate: workerToEdit ? workerToEdit.hireDate : new Date().toISOString().split('T')[0]
    };

    onSaveWorker(savedWorker);
    onClose();
  };

  const handleSkillChange = (stageId: string, level: SkillLevel) => {
    setSkills(prev => ({ ...prev, [stageId]: level }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${isEditMode ? 'bg-sky-800 text-sky-200' : 'bg-slate-800 text-emerald-400'}`}>
              {isEditMode ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isEditMode ? `تعديل بيانات العامل (${workerToEdit?.name})` : 'إضافة عامل جديد إلى خط الإنتاج'}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                {isEditMode ? 'تحديث الكود والاسم والوردية وتقييمات المهارات' : 'تسجيل بيانات العامل وتقييمه المبدئي على المراحل'}
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

        {/* Form Body & Pinned Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 matrix-scroll">
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">الكود الوظيفي (ID):</label>
                <input
                  type="text"
                  required
                  value={empCode}
                  onChange={(e) => setEmpCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">اسم العامل بالكامل:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: يوسف إبراهيم سالم"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  {terminology?.lineLabel || 'خط الإنتاج'}:
                </label>
                <select
                  value={lineId}
                  onChange={(e) => setLineId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  {lines.map(l => (
                    <option key={l.id} value={l.id}>
                      {terminology ? formatUnitName(l.name, terminology) : l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">الوردية:</label>
                <select
                  value={shift}
                  onChange={(e) => setShift(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="A">الوردية A (صباحي)</option>
                  <option value="B">الوردية B (مسائي)</option>
                  <option value="C">الوردية C (ليلي)</option>
                </select>
              </div>
            </div>

            {/* Skills assignment */}
            <div className="pt-2">
              <label className="text-xs font-bold text-slate-800 block mb-2">
                تقييم مهارات العامل على {terminology?.stageLabelPlural || 'مراحل'} هذا الـ {terminology?.modelLabel || 'الموديل'} (0 إلى 4):
              </label>
              <div className="space-y-2 max-h-52 overflow-y-auto p-1 matrix-scroll">
                {stages.map((stg) => {
                  const currentLevel = (skills[stg.id] ?? 0) as SkillLevel;
                  return (
                    <div key={stg.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                      <div className="truncate max-w-[200px]">
                        <span className="font-semibold text-slate-800 block">{stg.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">كود: {stg.code}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {([0, 1, 2, 3, 4] as SkillLevel[]).map((lvl) => {
                          const def = SKILL_DEFINITIONS[lvl];
                          const isSelected = currentLevel === lvl;
                          return (
                            <button
                              key={lvl}
                              type="button"
                              onClick={() => handleSkillChange(stg.id, lvl)}
                              className={`w-7 h-7 rounded font-mono text-xs font-bold transition-all ${
                                isSelected
                                  ? `${def.bgClass} ${def.borderClass} ${def.textClass} ring-2 ring-slate-900 font-bold scale-105 shadow-xs`
                                  : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-700'
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
          </div>

          {/* Pinned Action Buttons Footer */}
          <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isEditMode ? 'حفظ التعديلات' : 'إضافة العامل'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
