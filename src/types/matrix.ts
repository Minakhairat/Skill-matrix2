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
