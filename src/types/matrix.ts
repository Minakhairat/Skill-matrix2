export type SkillLevel = 0 | 1 | 2 | 3 | 4;

export interface SkillDefinition {
  level: SkillLevel;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
}

export interface Stage {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  targetWorkersCount: number; // e.g. 5 workers needed
  minRequiredLevel: SkillLevel; // e.g. Level 3 required
  criticality: 'critical' | 'medium' | 'normal';
  category: string;
}

export interface Model {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  lineId: string;
  stages: Stage[];
}

export interface ProductionLine {
  id: string;
  name: string;
  nameEn: string;
  code: string;
  supervisor: string;
  models: Model[];
}

export interface Worker {
  id: string;
  empCode: string;
  name: string;
  lineId: string;
  shift: 'A' | 'B' | 'C'; // A = صباحي, B = مسائي, C = ليلي
  targetStagesCount: number; // Default 3 stages
  minProficiencyTarget: SkillLevel; // Default level 3
  skills: Record<string, SkillLevel>; // stageId -> level (0 to 4)
  hireDate: string;
  notes?: string;
}

export interface StageMetric {
  stage: Stage;
  totalAssigned: number;
  qualifiedCount: number; // workers with level >= minRequiredLevel
  traineeCount: number; // workers with level 1 or 2
  expertCount: number; // workers with level 4
  target: number;
  gap: number; // target - qualifiedCount (positive = shortage)
  coveragePercentage: number;
  isCovered: boolean;
  isCriticalShortage: boolean;
  qualifiedWorkers: Worker[];
  potentialWorkers: Worker[]; // workers with level 2 who can be promoted quickly
}

export interface WorkerFlexibilityMetric {
  worker: Worker;
  qualifiedStagesCount: number;
  targetStagesCount: number;
  flexibilityPercentage: number;
  isTargetMet: boolean;
  surplusStages: number;
}

export interface RebalanceSuggestion {
  targetStageId: string;
  targetStageName: string;
  neededCount: number;
  candidateWorkers: {
    worker: Worker;
    reason: string;
    currentLevelAtTarget: SkillLevel;
    recommendedAction: 'transfer_line' | 'shift_workstation' | 'accelerate_training';
  }[];
}

export type ActionType = 
  | 'skill_update'
  | 'worker_added'
  | 'worker_edited'
  | 'worker_deleted'
  | 'all_cleared'
  | 'target_changed'
  | 'data_imported'
  | 'rebalance';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actionType: ActionType;
  title: string;
  details: string;
  badgeLabel: string;
  badgeClass: string;
}

export interface ShiftPerformanceMetric {
  shift: 'A' | 'B' | 'C';
  shiftName: string;
  workerCount: number;
  totalSkillPoints: number;
  avgSkillPointsPerWorker: number; // Max 4.0
  multiSkilledCount: number; // Meeting 3-stages target
  multiSkilledRate: number; // %
  improvementUpliftRate: number; // % estimated operational uplift
  criticalStagesCoveredCount: number;
  bottlenecksCount: number;
}

export type TerminologyPreset = 'lines_models' | 'machines_molds' | 'departments_products' | 'custom';

export interface TerminologyConfig {
  preset: TerminologyPreset;
  lineLabel: string; // e.g. "خط إنتاج" أو "ماكينة"
  lineLabelPlural: string; // e.g. "خطوط الإنتاج" أو "الماكينات"
  modelLabel: string; // e.g. "موديل" أو "اسطمبة"
  modelLabelPlural: string; // e.g. "الموديلات" أو "الاسطمبات"
  stageLabel: string; // e.g. "مرحلة" أو "عملية"
  stageLabelPlural: string; // e.g. "المراحل" أو "العمليات"
}

export interface PlantLeadership {
  engineerName: string; // اسم المهندس المسؤول (مثل: م. مينا خيرت)
  managerName: string; // اسم مدير الإدارة / العمليات
}
