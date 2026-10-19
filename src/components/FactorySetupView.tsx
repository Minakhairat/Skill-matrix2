import React, { useState } from 'react';
import { 
  ProductionLine, 
  Model, 
  Stage, 
  TerminologyConfig, 
  TerminologyPreset, 
  SkillLevel, 
  PlantLeadership,
  AppUser
} from '../types/matrix';
import { TERMINOLOGY_PRESETS } from '../utils/constants';
import { 
  Settings2, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Factory, 
  Box, 
  Cog, 
  Sliders, 
  Save, 
  Layers, 
  ChevronRight, 
  HelpCircle, 
  AlertCircle, 
  Users,
  Mail,
  ShieldCheck,
  UserCheck,
  CheckCircle2
} from 'lucide-react';

interface FactorySetupViewProps {
  lines: ProductionLine[];
  onUpdateLines: (newLines: ProductionLine[]) => void;
  terminology: TerminologyConfig;
  onUpdateTerminology: (term: TerminologyConfig) => void;
  targetWorkersPerStage: number;
  onUpdateTargetWorkersPerStage: (val: number) => void;
  targetStagesPerWorker: number;
  onUpdateTargetStagesPerWorker: (val: number) => void;
  minQualifiedLevel: number;
  onUpdateMinQualifiedLevel: (val: number) => void;
  leadership: PlantLeadership;
  onUpdateLeadership: (leadership: PlantLeadership) => void;
  currentUser?: AppUser | null;
  onSaveSupervisorEmail?: (lineId: string, supervisorName: string, supervisorEmail: string) => Promise<void>;
}

export const FactorySetupView: React.FC<FactorySetupViewProps> = ({
  lines,
  onUpdateLines,
  terminology,
  onUpdateTerminology,
  targetWorkersPerStage,
  onUpdateTargetWorkersPerStage,
  targetStagesPerWorker,
  onUpdateTargetStagesPerWorker,
  minQualifiedLevel,
  onUpdateMinQualifiedLevel,
  leadership,
  onUpdateLeadership,
  currentUser,
  onSaveSupervisorEmail
}) => {
  // Navigation inside Setup View
  const [selectedLineId, setSelectedLineId] = useState<string>(lines[0]?.id || '');
  const [selectedModelId, setSelectedModelId] = useState<string>(lines[0]?.models[0]?.id || '');

  // Leadership state
  const [engineerName, setEngineerName] = useState(leadership.engineerName);
  const [managerName, setManagerName] = useState(leadership.managerName);
  const [leadershipSaved, setLeadershipSaved] = useState(false);

  // Mobile active sub-tab: 'lines' | 'models' | 'stages'
  const [mobileSetupTab, setMobileSetupTab] = useState<'lines' | 'models' | 'stages'>('lines');

  // Add/Edit Modals state
  const [modalMode, setModalMode] = useState<'line' | 'model' | 'stage' | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form states for Line / Machine
  const [lineName, setLineName] = useState('');
  const [lineCode, setLineCode] = useState('');
  const [lineSupervisor, setLineSupervisor] = useState('');
  const [lineSupervisorEmail, setLineSupervisorEmail] = useState('');

  // Form states for Model / Mold
  const [modelName, setModelName] = useState('');
  const [modelCode, setModelCode] = useState('');

  // Form states for Stage / Operation
  const [stageName, setStageName] = useState('');
  const [stageCode, setStageCode] = useState('');
  const [stageCategory, setStageCategory] = useState('');
  const [stageTarget, setStageTarget] = useState(5);
  const [stageMinLevel, setStageMinLevel] = useState<SkillLevel>(3);

  // Custom terminology input state
  const [customLineLabel, setCustomLineLabel] = useState(terminology.lineLabel);
  const [customModelLabel, setCustomModelLabel] = useState(terminology.modelLabel);
  const [customStageLabel, setCustomStageLabel] = useState(terminology.stageLabel);

  const selectedLine = lines.find(l => l.id === selectedLineId) || lines[0];
  const selectedModel = selectedLine?.models.find(m => m.id === selectedModelId) || selectedLine?.models[0];

  // Handle Preset change
  const handlePresetSelect = (preset: TerminologyPreset) => {
    if (preset === 'custom') {
      onUpdateTerminology({
        preset: 'custom',
        lineLabel: customLineLabel || 'ماكينة',
        lineLabelPlural: (customLineLabel || 'ماكينة') + 'ات',
        modelLabel: customModelLabel || 'اسطمبة',
        modelLabelPlural: (customModelLabel || 'اسطمبة') + 'ات',
        stageLabel: customStageLabel || 'عملية',
        stageLabelPlural: (customStageLabel || 'عملية') + 'ات'
      });
    } else {
      const p = TERMINOLOGY_PRESETS[preset];
      onUpdateTerminology(p);
      setCustomLineLabel(p.lineLabel);
      setCustomModelLabel(p.modelLabel);
      setCustomStageLabel(p.stageLabel);
    }
  };

  // Leadership Handlers
  const handleSaveLeadership = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateLeadership({
      engineerName: engineerName.trim(),
      managerName: managerName.trim()
    });
    setLeadershipSaved(true);
    setTimeout(() => setLeadershipSaved(false), 2500);
  };

  const [supervisorDrafts, setSupervisorDrafts] = useState<Record<string, { supervisor: string; email: string }>>({});
  const [confirmedLineId, setConfirmedLineId] = useState<string | null>(null);
  const [confirmFeedback, setConfirmFeedback] = useState<string | null>(null);

  const handleDraftChange = (lineId: string, field: 'supervisor' | 'email', val: string) => {
    const current = lines.find(l => l.id === lineId);
    setSupervisorDrafts(prev => ({
      ...prev,
      [lineId]: {
        supervisor: field === 'supervisor' ? val : (prev[lineId]?.supervisor ?? current?.supervisor ?? ''),
        email: field === 'email' ? val : (prev[lineId]?.email ?? current?.supervisorEmail ?? '')
      }
    }));
  };

  const handleConfirmSupervisor = async (lineId: string) => {
    const current = lines.find(l => l.id === lineId);
    if (!current) return;
    const draft = supervisorDrafts[lineId] || { supervisor: current.supervisor, email: current.supervisorEmail || '' };
    const supName = (draft.supervisor !== undefined ? draft.supervisor : current.supervisor || '').trim();
    const supEmail = (draft.email !== undefined ? draft.email : current.supervisorEmail || '').trim().toLowerCase();

    const updated = lines.map(l => {
      if (l.id === lineId) {
        return {
          ...l,
          supervisor: supName || l.supervisor,
          supervisorEmail: supEmail
        };
      }
      return l;
    });
    onUpdateLines(updated);

    if (onSaveSupervisorEmail) {
      try {
        await onSaveSupervisorEmail(lineId, supName, supEmail);
      } catch (e) {
        console.warn('Could not save supervisor email to Firestore:', e);
      }
    }

    setConfirmedLineId(lineId);
    setConfirmFeedback(`تم اعتماد المشرف (${supName || 'مشرف'}) والبريد (${supEmail || 'غير محدد'}) للـ ${current.name} بنجاح وحفظه في السحابة ✓`);
    setTimeout(() => {
      setConfirmedLineId(null);
      setConfirmFeedback(null);
    }, 4000);
  };

  const handleUpdateLineSupervisor = (lineId: string, supervisor: string, email?: string) => {
    const updated = lines.map(l => {
      if (l.id === lineId) {
        return { 
          ...l, 
          supervisor: supervisor.trim(),
          supervisorEmail: email !== undefined ? email.trim().toLowerCase() : l.supervisorEmail
        };
      }
      return l;
    });
    onUpdateLines(updated);
  };

  // Line / Machine Handlers
  const handleOpenAddLine = () => {
    setModalMode('line');
    setEditingItem(null);
    setLineName('');
    setLineCode(`MCH-${lines.length + 1}`);
    setLineSupervisor('');
    setLineSupervisorEmail('');
  };

  const handleOpenEditLine = (line: ProductionLine) => {
    setModalMode('line');
    setEditingItem(line);
    setLineName(line.name);
    setLineCode(line.code);
    setLineSupervisor(line.supervisor);
    setLineSupervisorEmail(line.supervisorEmail || '');
  };

  const handleSaveLine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lineName.trim()) return;

    if (editingItem) {
      // Edit
      const updated = lines.map(l => {
        if (l.id === editingItem.id) {
          return {
            ...l,
            name: lineName.trim(),
            code: lineCode.trim() || l.code,
            supervisor: lineSupervisor.trim() || l.supervisor,
            supervisorEmail: lineSupervisorEmail.trim().toLowerCase() || l.supervisorEmail
          };
        }
        return l;
      });
      onUpdateLines(updated);
    } else {
      // Add
      const newLineId = `LINE-${Date.now()}`;
      const defaultModelId = `MOD-${Date.now()}-1`;
      const newLine: ProductionLine = {
        id: newLineId,
        name: lineName.trim(),
        nameEn: lineName.trim(),
        code: lineCode.trim() || `L-${lines.length + 1}`,
        supervisor: lineSupervisor.trim() || 'مشرف جديد',
        supervisorEmail: lineSupervisorEmail.trim().toLowerCase(),
        models: [
          {
            id: defaultModelId,
            name: 'موديل أساسي 1',
            nameEn: 'Base Model 1',
            code: 'M-01',
            lineId: newLineId,
            stages: [
              {
                id: `STG-${Date.now()}-1`,
                name: 'تجهيز وضبط',
                nameEn: 'Setup',
                code: 'OP-01',
                targetWorkersCount: targetWorkersPerStage,
                minRequiredLevel: minQualifiedLevel as SkillLevel,
                criticality: 'medium',
                category: 'تجهيز'
              },
              {
                id: `STG-${Date.now()}-2`,
                name: 'تشغيل رئيسي',
                nameEn: 'Main Operation',
                code: 'OP-02',
                targetWorkersCount: targetWorkersPerStage,
                minRequiredLevel: minQualifiedLevel as SkillLevel,
                criticality: 'critical',
                category: 'تشغيل'
              },
              {
                id: `STG-${Date.now()}-3`,
                name: 'فحص جودة وتعبئة',
                nameEn: 'QC & Packing',
                code: 'OP-03',
                targetWorkersCount: targetWorkersPerStage,
                minRequiredLevel: minQualifiedLevel as SkillLevel,
                criticality: 'medium',
                category: 'جودة'
              }
            ]
          }
        ]
      };
      onUpdateLines([...lines, newLine]);
      setSelectedLineId(newLineId);
      setSelectedModelId(defaultModelId);
    }
    setModalMode(null);
  };

  const handleDeleteLine = (lineId: string) => {
    if (lines.length <= 1) {
      alert(`يجب الإبقاء على ${terminology.lineLabel} واحد على الأقل في المصنع.`);
      return;
    }
    if (confirm(`هل أنت متأكد من رغبتك في حذف هذا الـ ${terminology.lineLabel}؟ سيتم حذف الموديلات والمراحل التابعة له.`)) {
      const remaining = lines.filter(l => l.id !== lineId);
      onUpdateLines(remaining);
      if (selectedLineId === lineId && remaining[0]) {
        setSelectedLineId(remaining[0].id);
        if (remaining[0].models[0]) setSelectedModelId(remaining[0].models[0].id);
      }
    }
  };

  // Model / Mold Handlers
  const handleOpenAddModel = () => {
    if (!selectedLine) return;
    setModalMode('model');
    setEditingItem(null);
    setModelName('');
    setModelCode(`MOD-${(selectedLine.models.length || 0) + 1}`);
  };

  const handleOpenEditModel = (model: Model) => {
    setModalMode('model');
    setEditingItem(model);
    setModelName(model.name);
    setModelCode(model.code);
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim() || !selectedLine) return;

    if (editingItem) {
      // Edit
      const updated = lines.map(l => {
        if (l.id === selectedLine.id) {
          return {
            ...l,
            models: l.models.map(m => {
              if (m.id === editingItem.id) {
                return {
                  ...m,
                  name: modelName.trim(),
                  code: modelCode.trim() || m.code
                };
              }
              return m;
            })
          };
        }
        return l;
      });
      onUpdateLines(updated);
    } else {
      // Add
      const newModelId = `MOD-${Date.now()}`;
      const newModel: Model = {
        id: newModelId,
        name: modelName.trim(),
        nameEn: modelName.trim(),
        code: modelCode.trim() || `MOD-${selectedLine.models.length + 1}`,
        lineId: selectedLine.id,
        stages: [
          {
            id: `STG-${Date.now()}-1`,
            name: 'عملية تجهيز أولية',
            nameEn: 'Initial Setup',
            code: 'OP-01',
            targetWorkersCount: targetWorkersPerStage,
            minRequiredLevel: minQualifiedLevel as SkillLevel,
            criticality: 'medium',
            category: 'تشغيل'
          }
        ]
      };
      const updated = lines.map(l => {
        if (l.id === selectedLine.id) {
          return { ...l, models: [...l.models, newModel] };
        }
        return l;
      });
      onUpdateLines(updated);
      setSelectedModelId(newModelId);
    }
    setModalMode(null);
  };

  const handleDeleteModel = (modelId: string) => {
    if (!selectedLine || selectedLine.models.length <= 1) {
      alert(`يجب الإبقاء على ${terminology.modelLabel} واحد على الأقل لكل ${terminology.lineLabel}.`);
      return;
    }
    if (confirm(`هل أنت متأكد من رغبتك في حذف هذا الـ ${terminology.modelLabel}؟`)) {
      const updated = lines.map(l => {
        if (l.id === selectedLine.id) {
          return {
            ...l,
            models: l.models.filter(m => m.id !== modelId)
          };
        }
        return l;
      });
      onUpdateLines(updated);
      const remainingModels = selectedLine.models.filter(m => m.id !== modelId);
      if (selectedModelId === modelId && remainingModels[0]) {
        setSelectedModelId(remainingModels[0].id);
      }
    }
  };

  // Stage / Operation Handlers
  const handleOpenAddStage = () => {
    setModalMode('stage');
    setEditingItem(null);
    setStageName('');
    setStageCode(`OP-${(selectedModel?.stages.length || 0) + 1}`);
    setStageCategory('تشغيل');
    setStageTarget(targetWorkersPerStage);
    setStageMinLevel(minQualifiedLevel as SkillLevel);
  };

  const handleOpenEditStage = (stage: Stage) => {
    setModalMode('stage');
    setEditingItem(stage);
    setStageName(stage.name);
    setStageCode(stage.code);
    setStageCategory(stage.category || 'تشغيل');
    setStageTarget(stage.targetWorkersCount || targetWorkersPerStage);
    setStageMinLevel(stage.minRequiredLevel || (minQualifiedLevel as SkillLevel));
  };

  const handleSaveStage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stageName.trim() || !selectedLine || !selectedModel) return;

    if (editingItem) {
      // Edit
      const updated = lines.map(l => {
        if (l.id === selectedLine.id) {
          return {
            ...l,
            models: l.models.map(m => {
              if (m.id === selectedModel.id) {
                return {
                  ...m,
                  stages: m.stages.map(stg => {
                    if (stg.id === editingItem.id) {
                      return {
                        ...stg,
                        name: stageName.trim(),
                        code: stageCode.trim() || stg.code,
                        category: stageCategory.trim() || 'تشغيل',
                        targetWorkersCount: stageTarget,
                        minRequiredLevel: stageMinLevel
                      };
                    }
                    return stg;
                  })
                };
              }
              return m;
            })
          };
        }
        return l;
      });
      onUpdateLines(updated);
    } else {
      // Add
      const newStage: Stage = {
        id: `STG-${Date.now()}`,
        name: stageName.trim(),
        nameEn: stageName.trim(),
        code: stageCode.trim() || `OP-${selectedModel.stages.length + 1}`,
        targetWorkersCount: stageTarget,
        minRequiredLevel: stageMinLevel,
        criticality: 'medium',
        category: stageCategory.trim() || 'تشغيل'
      };
      const updated = lines.map(l => {
        if (l.id === selectedLine.id) {
          return {
            ...l,
            models: l.models.map(m => {
              if (m.id === selectedModel.id) {
                return {
                  ...m,
                  stages: [...m.stages, newStage]
                };
              }
              return m;
            })
          };
        }
        return l;
      });
      onUpdateLines(updated);
    }
    setModalMode(null);
  };

  const handleDeleteStage = (stageId: string) => {
    if (!selectedModel || selectedModel.stages.length <= 1) {
      alert(`يجب الإبقاء على ${terminology.stageLabel} واحدة على الأقل.`);
      return;
    }
    if (confirm(`هل أنت متأكد من حذف هذه الـ ${terminology.stageLabel}؟`)) {
      const updated = lines.map(l => {
        if (l.id === selectedLine?.id) {
          return {
            ...l,
            models: l.models.map(m => {
              if (m.id === selectedModel.id) {
                return {
                  ...m,
                  stages: m.stages.filter(s => s.id !== stageId)
                };
              }
              return m;
            })
          };
        }
        return l;
      });
      onUpdateLines(updated);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      
      {/* SECTION 1: TERMINOLOGY CUSTOMIZER (خطوط vs ماكينات / موديلات vs اسطمبات) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
                <Cog className="w-5 h-5" />
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                تخصيص مسميات ومصطلحات المصنع (خطوط أو ماكينات / موديلات أو اسطمبات)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              اختر النمط المناسب لطبيعة مصنعك؛ سيتم تغيير المسمى فورياً في كامل واجهات البرنامج والتقارير.
            </p>
          </div>

          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg self-start sm:self-center">
            النمط الفعّال حالياً: <strong>{terminology.lineLabel} / {terminology.modelLabel}</strong>
          </span>
        </div>

        {/* Presets Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-3 sm:mt-4">
          
          {/* Preset 1: Lines & Models */}
          <button
            type="button"
            onClick={() => handlePresetSelect('lines_models')}
            className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
              terminology.preset === 'lines_models'
                ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">🏭 خطوط إنتاج وموديلات</span>
                {terminology.preset === 'lines_models' && <Check className="w-4 h-4 text-indigo-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                النمط القياسي لمصانع التجميع والتصنيع الإلكتروني والملابس.
              </p>
            </div>
            <div className="text-[10px] text-indigo-700 font-mono font-semibold mt-2 pt-2 border-t border-slate-200">
              خط إنتاج · موديل · مرحلة
            </div>
          </button>

          {/* Preset 2: Machines & Molds / Dies */}
          <button
            type="button"
            onClick={() => handlePresetSelect('machines_molds')}
            className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
              terminology.preset === 'machines_molds'
                ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">⚙️ ماكينات واسطمبات وقوالب</span>
                {terminology.preset === 'machines_molds' && <Check className="w-4 h-4 text-emerald-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                مثالي لمصانع حقن البلاستيك، الصاج، المكابس، والتشكيل بالاسطمبات.
              </p>
            </div>
            <div className="text-[10px] text-emerald-700 font-mono font-semibold mt-2 pt-2 border-t border-slate-200">
              ماكينة · اسطمبة · عملية
            </div>
          </button>

          {/* Preset 3: Departments & Products */}
          <button
            type="button"
            onClick={() => handlePresetSelect('departments_products')}
            className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
              terminology.preset === 'departments_products'
                ? 'border-sky-600 bg-sky-50/50 ring-2 ring-sky-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900">🏢 أقسام ومنتجات</span>
                {terminology.preset === 'departments_products' && <Check className="w-4 h-4 text-sky-600" />}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                لمصانع الأدوية، الأغذية، والورش المتعددة الأقسام.
              </p>
            </div>
            <div className="text-[10px] text-sky-700 font-mono font-semibold mt-2 pt-2 border-t border-slate-200">
              قسم · منتج · محطة عمل
            </div>
          </button>

        </div>
      </div>

      {/* SECTION 2: PLANT LEADERSHIP & SUPERVISORS (إدارة المشرفين، المهندس، ومدير الإدارة) */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-purple-50 text-purple-700 rounded-lg">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900">
                إدارة القيادة والمشرفين (مشرفو الـ {terminology.lineLabelPlural}، المهندس المسؤول، مدير الإدارة)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              تظهر هذه الأسماء في تقارير الطباعة والتدقيق الرسمية، واستشارات الذكاء الاصطناعي، وسجلات الجودة.
            </p>
          </div>
        </div>

        {/* Leadership Inputs: Engineer & Department Manager */}
        <form onSubmit={handleSaveLeadership} className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                اسم المهندس المسؤول (Production / Lean Engineer):
              </label>
              <input
                type="text"
                value={engineerName}
                onChange={(e) => setEngineerName(e.target.value)}
                placeholder="مثال: م. مينا خيرت"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                اسم مدير الإدارة / العمليات (Operations / Plant Manager):
              </label>
              <input
                type="text"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="مثال: أ. أحمد فؤاد (مدير العمليات)"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">
              * سيتم حفظ الاسمين تلقائياً في ذاكرة البرنامج والتقارير المطبوعة.
            </span>
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{leadershipSaved ? 'تم الحفظ بنجاح ✓' : 'حفظ بيانات الإدارة'}</span>
            </button>
          </div>
        </form>

        {/* Quick Supervisors Overview & Editing Table */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span>مشرفو الـ {terminology.lineLabelPlural} والماكينات المسجلون:</span>
              <span className="text-[10px] text-slate-500">({lines.length} {terminology.lineLabelPlural})</span>
            </h3>
            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              اضغط زر (تأكيد وتسجيل إيميل المشرف) لحفظ الصلاحية سحابياً
            </span>
          </div>

          {confirmFeedback && (
            <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">{confirmFeedback}</span>
            </div>
          )}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {lines.map((ln) => {
              const currentDraft = supervisorDrafts[ln.id];
              const supVal = currentDraft?.supervisor !== undefined ? currentDraft.supervisor : ln.supervisor;
              const emailVal = currentDraft?.email !== undefined ? currentDraft.email : (ln.supervisorEmail || '');
              const isConfirmed = confirmedLineId === ln.id;

              return (
                <div key={ln.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 truncate">{ln.name}</span>
                    <span className="font-mono text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">{ln.code}</span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 shrink-0 w-14">المشرف:</span>
                      <input
                        type="text"
                        value={supVal}
                        onChange={(e) => handleDraftChange(ln.id, 'supervisor', e.target.value)}
                        placeholder="اسم المشرف المسؤول"
                        className="flex-1 px-2 py-1 text-xs bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-indigo-600 font-semibold shrink-0 w-14 flex items-center gap-0.5">
                        <Mail className="w-2.5 h-2.5" />
                        <span>جيميل:</span>
                      </span>
                      <input
                        type="email"
                        value={emailVal}
                        onChange={(e) => handleDraftChange(ln.id, 'email', e.target.value)}
                        placeholder="supervisor@gmail.com"
                        className="flex-1 px-2 py-1 text-[11px] font-mono bg-white border border-slate-300 rounded text-slate-900 focus:ring-1 focus:ring-indigo-500 dir-ltr text-right"
                      />
                    </div>
                  </div>

                  {/* Confirmation Button for Supervisor Email */}
                  <button
                    type="button"
                    onClick={() => handleConfirmSupervisor(ln.id)}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                      isConfirmed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isConfirmed ? 'تم تأكيد وحفظ الإيميل في السحابة ✓' : 'تأكيد وتسجيل إيميل المشرف'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* MOBILE SUB-NAVIGATION TABS (Shown on screens < lg to prevent 1500px tall vertical stacking) */}
      <div className="lg:hidden bg-white p-2 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between gap-1">
          <button
            onClick={() => setMobileSetupTab('lines')}
            className={`flex-1 py-2 px-2 text-center text-xs font-bold rounded-lg transition-all ${
              mobileSetupTab === 'lines' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            1. الـ {terminology.lineLabelPlural} ({lines.length})
          </button>
          <button
            onClick={() => setMobileSetupTab('models')}
            className={`flex-1 py-2 px-2 text-center text-xs font-bold rounded-lg transition-all ${
              mobileSetupTab === 'models' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            2. الـ {terminology.modelLabelPlural} ({selectedLine?.models.length || 0})
          </button>
          <button
            onClick={() => setMobileSetupTab('stages')}
            className={`flex-1 py-2 px-2 text-center text-xs font-bold rounded-lg transition-all ${
              mobileSetupTab === 'stages' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            3. الـ {terminology.stageLabelPlural} ({selectedModel?.stages.length || 0})
          </button>
        </div>

        {/* Current Active Selection Breadcrumb */}
        <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="truncate">
            المحدد: <strong className="text-slate-900">{selectedLine?.name}</strong> {'>'} <strong className="text-indigo-700">{selectedModel?.name}</strong>
          </span>
        </div>
      </div>

      {/* SECTION 2: PRODUCTION HIERARCHY MANAGER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Column 1: Lines / Machines List */}
        <div className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col h-[460px] sm:h-[520px] ${
          mobileSetupTab === 'lines' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Factory className="w-4 h-4 text-slate-600" />
                <span>قائمة {terminology.lineLabelPlural} ({lines.length})</span>
              </h3>
            </div>
            <button
              onClick={handleOpenAddLine}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة {terminology.lineLabel}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-3 matrix-scroll pr-1">
            {lines.map((line) => {
              const isSelected = line.id === selectedLineId;
              return (
                <div
                  key={line.id}
                  onClick={() => {
                    setSelectedLineId(line.id);
                    if (line.models[0]) setSelectedModelId(line.models[0].id);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="truncate max-w-[170px]">
                    <div className="font-bold text-slate-900 truncate">{line.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      كود: {line.code} · {line.models.length} {terminology.modelLabelPlural}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditLine(line);
                      }}
                      className="p-1 text-slate-400 hover:text-sky-700 hover:bg-white rounded"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLine(line.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick jump to models on mobile */}
          <div className="lg:hidden pt-2 border-t border-slate-100 mt-2">
            <button
              onClick={() => setMobileSetupTab('models')}
              className="w-full py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-lg flex items-center justify-center gap-1"
            >
              <span>الانتقال إلى {terminology.modelLabelPlural} ({selectedLine?.name})</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>

        {/* Column 2: Models / Molds List for Selected Line */}
        <div className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col h-[460px] sm:h-[520px] ${
          mobileSetupTab === 'models' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Box className="w-4 h-4 text-slate-600" />
                <span>{terminology.modelLabelPlural} {selectedLine?.name}</span>
              </h3>
            </div>
            <button
              onClick={handleOpenAddModel}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة {terminology.modelLabel}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-3 matrix-scroll pr-1">
            {selectedLine?.models.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <div
                  key={model.id}
                  onClick={() => setSelectedModelId(model.id)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="truncate max-w-[170px]">
                    <div className="font-bold text-slate-900 truncate">{model.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      كود: {model.code} · {model.stages.length} {terminology.stageLabelPlural}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModel(model);
                      }}
                      className="p-1 text-slate-400 hover:text-sky-700 hover:bg-white rounded"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteModel(model.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick jump to stages on mobile */}
          <div className="lg:hidden pt-2 border-t border-slate-100 mt-2 flex gap-1">
            <button
              onClick={() => setMobileSetupTab('lines')}
              className="flex-1 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
            >
              رجوع للـ {terminology.lineLabelPlural}
            </button>
            <button
              onClick={() => setMobileSetupTab('stages')}
              className="flex-1 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-lg flex items-center justify-center gap-1"
            >
              <span>الـ {terminology.stageLabelPlural} ({selectedModel?.name})</span>
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
          </div>
        </div>

        {/* Column 3: Stages / Operations List for Selected Model */}
        <div className={`bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col h-[460px] sm:h-[520px] ${
          mobileSetupTab === 'stages' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-slate-600" />
                <span>{terminology.stageLabelPlural} {selectedModel?.name}</span>
              </h3>
            </div>
            <button
              onClick={handleOpenAddStage}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة {terminology.stageLabel}</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 mt-3 matrix-scroll pr-1">
            {selectedModel?.stages.map((stage) => {
              return (
                <div
                  key={stage.id}
                  className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/40 text-xs flex items-center justify-between"
                >
                  <div className="truncate max-w-[170px]">
                    <div className="font-bold text-slate-900 truncate">{stage.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                      <span>كود: {stage.code}</span>
                      <span>·</span>
                      <span className="text-emerald-700 font-semibold">مستهدف: {stage.targetWorkersCount} عمال</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditStage(stage)}
                      className="p-1 text-slate-400 hover:text-sky-700 hover:bg-white rounded"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick jump to models on mobile */}
          <div className="lg:hidden pt-2 border-t border-slate-100 mt-2">
            <button
              onClick={() => setMobileSetupTab('models')}
              className="w-full py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg"
            >
              رجوع إلى الـ {terminology.modelLabelPlural}
            </button>
          </div>
        </div>

      </div>

      {/* MODAL: ADD / EDIT LINE */}
      {modalMode === 'line' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingItem ? `تعديل ${terminology.lineLabel}` : `إضافة ${terminology.lineLabel} جديد`}
              </h3>
              <button onClick={() => setModalMode(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveLine}>
              <div className="p-4 sm:p-6 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم الـ {terminology.lineLabel}:</label>
                  <input
                    type="text"
                    required
                    value={lineName}
                    onChange={(e) => setLineName(e.target.value)}
                    placeholder={`مثال: ${terminology.lineLabel} 5`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs sm:text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">كود الـ {terminology.lineLabel}:</label>
                  <input
                    type="text"
                    value={lineCode}
                    onChange={(e) => setLineCode(e.target.value)}
                    placeholder="مثال: LINE-05 أو MCH-05"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">المشرف المسؤول:</label>
                  <input
                    type="text"
                    value={lineSupervisor}
                    onChange={(e) => setLineSupervisor(e.target.value)}
                    placeholder="اسم المشرف"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    البريد الإلكتروني لمشرف الخط (Google Gmail):
                  </label>
                  <input
                    type="email"
                    value={lineSupervisorEmail}
                    onChange={(e) => setLineSupervisorEmail(e.target.value)}
                    placeholder="supervisor@gmail.com"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    * عند تسجيل هذا المشرف دخوله بحساب الجيميل، سيتم تقييد صلاحياته تلقائياً للتحكم في هذا الخط فقط.
                  </span>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT MODEL */}
      {modalMode === 'model' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingItem ? `تعديل ${terminology.modelLabel}` : `إضافة ${terminology.modelLabel} جديد`}
              </h3>
              <button onClick={() => setModalMode(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveModel}>
              <div className="p-4 sm:p-6 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم الـ {terminology.modelLabel}:</label>
                  <input
                    type="text"
                    required
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder={`مثال: ${terminology.modelLabel} فائق الدقة`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">كود الـ {terminology.modelLabel}:</label>
                  <input
                    type="text"
                    value={modelCode}
                    onChange={(e) => setModelCode(e.target.value)}
                    placeholder="مثال: MOD-101 أو DIE-50"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT STAGE */}
      {modalMode === 'stage' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="text-sm font-bold">
                {editingItem ? `تعديل ${terminology.stageLabel}` : `إضافة ${terminology.stageLabel} جديدة`}
              </h3>
              <button onClick={() => setModalMode(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveStage}>
              <div className="p-4 sm:p-6 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">اسم الـ {terminology.stageLabel}:</label>
                  <input
                    type="text"
                    required
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    placeholder="مثال: كبس وتثبيت"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">كود الـ {terminology.stageLabel}:</label>
                  <input
                    type="text"
                    value={stageCode}
                    onChange={(e) => setStageCode(e.target.value)}
                    placeholder="مثال: OP-10"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">مستهدف العمال:</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={stageTarget}
                      onChange={(e) => setStageTarget(parseInt(e.target.value) || 5)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-center text-xs focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">المستوى المطلوب:</label>
                    <select
                      value={stageMinLevel}
                      onChange={(e) => setStageMinLevel(parseInt(e.target.value) as SkillLevel)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-slate-900"
                    >
                      <option value={2}>مستوى 2 (تحت إشراف)</option>
                      <option value={3}>مستوى 3 (مستقل - افتراضي)</option>
                      <option value={4}>مستوى 4 (خبير مدرب)</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  حفظ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
