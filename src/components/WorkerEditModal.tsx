import React, { useState } from 'react';
import { X, UserPlus, Check } from 'lucide-react';
import { Worker, ProductionLine, Stage, SkillLevel } from '../types/matrix';
import { SKILL_DEFINITIONS } from '../utils/constants';

interface WorkerEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveWorker: (worker: Worker) => void;
  lines: ProductionLine[];
  currentLineId: string;
  stages: Stage[];
}

export const WorkerEditModal: React.FC<WorkerEditModalProps> = ({
  isOpen,
  onClose,
  onSaveWorker,
  lines,
  currentLineId,
  stages
}) => {
  const [empCode, setEmpCode] = useState(`EMP-${Math.floor(400 + Math.random() * 500)}`);
  const [name, setName] = useState('');
  const [lineId, setLineId] = useState(currentLineId);
  const [shift, setShift] = useState<'A' | 'B' | 'C'>('A');
  const [skills, setSkills] = useState<Record<string, SkillLevel>>({});
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

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

    const newWorker: Worker = {
      id: `w-${Date.now()}`,
      empCode: empCode.trim(),
      name: name.trim(),
      lineId,
      shift,
      targetStagesCount: 3,
      minProficiencyTarget: 3,
      skills,
      hireDate: new Date().toISOString().split('T')[0]
    };

    onSaveWorker(newWorker);
    onClose();
  };

  const handleSkillChange = (stageId: string, level: SkillLevel) => {
    setSkills(prev => ({ ...prev, [stageId]: level }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-3.5 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-800 rounded-lg text-emerald-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">إضافة عامل جديد إلى خط الإنتاج</h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">تسجيل بيانات العامل وتقييمه المبدئي على المراحل</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          
          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">خط الإنتاج:</label>
              <select
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-900"
              >
                {lines.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
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

          {/* Initial skills assignment */}
          <div className="pt-2">
            <label className="text-xs font-bold text-slate-800 block mb-2">
              التقييم الأولي لمراحل العمل (اختياري - افتراضياً 0):
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-1">
              {stages.map((stg) => {
                const currentLevel = (skills[stg.id] ?? 0) as SkillLevel;
                return (
                  <div key={stg.id} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded text-xs">
                    <span className="font-medium text-slate-800">{stg.name}</span>
                    <div className="flex items-center gap-1">
                      {([0, 1, 2, 3, 4] as SkillLevel[]).map((lvl) => {
                        const def = SKILL_DEFINITIONS[lvl];
                        const isSelected = currentLevel === lvl;
                        return (
                          <button
                            key={lvl}
                            type="button"
                            onClick={() => handleSkillChange(stg.id, lvl)}
                            className={`w-6 h-6 rounded font-mono text-xs font-bold transition-all ${
                              isSelected
                                ? `${def.bgClass} ${def.borderClass} ${def.textClass} ring-1 ring-slate-900 font-bold`
                                : 'bg-white border border-slate-200 text-slate-400'
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

          <div className="p-4 bg-slate-50 -mx-6 -mb-6 border-t border-slate-200 flex justify-end gap-2">
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
              حفظ العامل
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
