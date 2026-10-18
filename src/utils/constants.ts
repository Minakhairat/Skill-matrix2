import { SkillDefinition, SkillLevel } from '../types/matrix';

export const SKILL_DEFINITIONS: Record<SkillLevel, SkillDefinition> = {
  0: {
    level: 0,
    labelAr: 'غير مدرب',
    labelEn: 'Unskilled / No Training',
    descriptionAr: 'لا يمتلك المعرفة أو المهارة في هذه المرحلة',
    colorClass: 'text-slate-400',
    bgClass: 'bg-slate-50 hover:bg-slate-100',
    borderClass: 'border-slate-200',
    textClass: 'text-slate-400'
  },
  1: {
    level: 1,
    labelAr: 'متدرب / مبتدئ',
    labelEn: 'Trainee / Beginner',
    descriptionAr: 'يفهم أساسيات المرحلة ولكن يحتاج تدريباً ومتابعة مستمرة',
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-50 hover:bg-amber-100',
    borderClass: 'border-amber-300',
    textClass: 'text-amber-800'
  },
  2: {
    level: 2,
    labelAr: 'يعمل تحت إشراف',
    labelEn: 'Under Supervision',
    descriptionAr: 'ينفذ العمل بمفرده لكن يتطلب توجيه ومراجعة دورية من المشرف',
    colorClass: 'text-sky-700',
    bgClass: 'bg-sky-50 hover:bg-sky-100',
    borderClass: 'border-sky-300',
    textClass: 'text-sky-800'
  },
  3: {
    level: 3,
    labelAr: 'مستقل وكفء (الهدف)',
    labelEn: 'Autonomous / Qualified',
    descriptionAr: 'ينفذ المرحلة بالكامل بجودة وسرعة قياسية دون حاجة لإشراف',
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-50 hover:bg-emerald-100',
    borderClass: 'border-emerald-400',
    textClass: 'text-emerald-800'
  },
  4: {
    level: 4,
    labelAr: 'خبير ومدرب معتمد',
    labelEn: 'Expert / Trainer',
    descriptionAr: 'يتقن المرحلة لأقصى درجة، يحل المشكلات المعقدة ويدرب زملاءه',
    colorClass: 'text-indigo-700',
    bgClass: 'bg-indigo-50 hover:bg-indigo-100',
    borderClass: 'border-indigo-400',
    textClass: 'text-indigo-800'
  }
};

export const DEFAULT_WORKSTATION_TARGET = 5; // 5 workers per stage
export const DEFAULT_MIN_QUALIFIED_LEVEL: SkillLevel = 3; // Level 3 minimum for qualification
export const DEFAULT_WORKER_FLEXIBILITY_TARGET = 3; // Each worker skilled on 3 stages

export const STORAGE_KEY_WORKERS = 'matrixpro_workers_v1';
export const STORAGE_KEY_LINES = 'matrixpro_lines_v1';
export const STORAGE_KEY_SETTINGS = 'matrixpro_settings_v1';
export const STORAGE_KEY_HISTORY = 'matrixpro_history_v1';
export const STORAGE_KEY_TERMINOLOGY = 'matrixpro_terminology_v1';

export const DEFAULT_TERMINOLOGY: import('../types/matrix').TerminologyConfig = {
  preset: 'lines_models',
  lineLabel: 'خط إنتاج',
  lineLabelPlural: 'خطوط الإنتاج',
  modelLabel: 'موديل',
  modelLabelPlural: 'الموديلات',
  stageLabel: 'مرحلة',
  stageLabelPlural: 'المراحل'
};

export const TERMINOLOGY_PRESETS: Record<import('../types/matrix').TerminologyPreset, import('../types/matrix').TerminologyConfig> = {
  lines_models: {
    preset: 'lines_models',
    lineLabel: 'خط إنتاج',
    lineLabelPlural: 'خطوط الإنتاج',
    modelLabel: 'موديل',
    modelLabelPlural: 'الموديلات',
    stageLabel: 'مرحلة',
    stageLabelPlural: 'المراحل'
  },
  machines_molds: {
    preset: 'machines_molds',
    lineLabel: 'ماكينة',
    lineLabelPlural: 'الماكينات',
    modelLabel: 'اسطمبة',
    modelLabelPlural: 'الاسطمبات',
    stageLabel: 'عملية',
    stageLabelPlural: 'العمليات'
  },
  departments_products: {
    preset: 'departments_products',
    lineLabel: 'قسم',
    lineLabelPlural: 'الأقسام',
    modelLabel: 'منتج',
    modelLabelPlural: 'المنتجات',
    stageLabel: 'محطة',
    stageLabelPlural: 'محطات العمل'
  },
  custom: {
    preset: 'custom',
    lineLabel: 'ماكينة',
    lineLabelPlural: 'الماكينات',
    modelLabel: 'اسطمبة',
    modelLabelPlural: 'الاسطمبات',
    stageLabel: 'عملية',
    stageLabelPlural: 'العمليات'
  }
};


