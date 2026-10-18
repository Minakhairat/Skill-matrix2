import { Worker, Stage, ShiftPerformanceMetric, ProductionLine, Model } from '../types/matrix';
import { calculateStageMetric, calculateWorkerFlexibility } from './matrixCalculations';

export function calculateShiftPerformance(
  shift: 'A' | 'B' | 'C',
  shiftWorkers: Worker[],
  stages: Stage[]
): ShiftPerformanceMetric {
  const shiftNames = {
    A: 'الوردية الأولى (صباحي)',
    B: 'الوردية الثانية (مسائي)',
    C: 'الوردية الثالثة (ليلي)'
  };

  const count = shiftWorkers.length;
  if (count === 0) {
    return {
      shift,
      shiftName: shiftNames[shift],
      workerCount: 0,
      totalSkillPoints: 0,
      avgSkillPointsPerWorker: 0,
      multiSkilledCount: 0,
      multiSkilledRate: 0,
      improvementUpliftRate: 0,
      criticalStagesCoveredCount: 0,
      bottlenecksCount: 0
    };
  }

  // Calculate total skill points across all stages
  let totalSkillPoints = 0;
  let totalStageEvaluations = 0;
  let multiSkilledCount = 0;

  shiftWorkers.forEach(w => {
    const flex = calculateWorkerFlexibility(w, stages);
    if (flex.isTargetMet) multiSkilledCount++;

    stages.forEach(s => {
      const level = w.skills[s.id] ?? 0;
      totalSkillPoints += level;
      totalStageEvaluations++;
    });
  });

  const avgSkillPointsPerWorker = stages.length > 0
    ? Number((totalSkillPoints / (count * stages.length)).toFixed(2))
    : 0; // Out of 4.0

  const multiSkilledRate = Math.round((multiSkilledCount / count) * 100);

  // Stage coverage on this shift
  let bottlenecksCount = 0;
  let criticalStagesCoveredCount = 0;

  stages.forEach(s => {
    const qualifiedOnShift = shiftWorkers.filter(w => (w.skills[s.id] ?? 0) >= s.minRequiredLevel).length;
    // Shift target is proportional to shift size (e.g. 1/3 of total stage target)
    const shiftStageTarget = Math.max(1, Math.ceil(s.targetWorkersCount / 3));
    if (qualifiedOnShift < shiftStageTarget) {
      bottlenecksCount++;
    } else {
      criticalStagesCoveredCount++;
    }
  });

  // Calculate Operational Improvement & Skill Uplift Rate %
  // Formula based on lean manufacturing ILU matrix:
  // (Avg skill / 4) * 45% + (Multi-skilled % / 100) * 35% + (Covered stages / Total stages) * 20%
  const skillFactor = (avgSkillPointsPerWorker / 4.0) * 45;
  const flexibilityFactor = (multiSkilledRate / 100) * 35;
  const coverageFactor = stages.length > 0 ? (criticalStagesCoveredCount / stages.length) * 20 : 20;

  const improvementUpliftRate = Math.min(100, Math.round(skillFactor + flexibilityFactor + coverageFactor));

  return {
    shift,
    shiftName: shiftNames[shift],
    workerCount: count,
    totalSkillPoints,
    avgSkillPointsPerWorker,
    multiSkilledCount,
    multiSkilledRate,
    improvementUpliftRate,
    criticalStagesCoveredCount,
    bottlenecksCount
  };
}

export function calculateAllShiftsPerformance(
  workers: Worker[],
  stages: Stage[]
): Record<'A' | 'B' | 'C', ShiftPerformanceMetric> {
  const workersA = workers.filter(w => w.shift === 'A');
  const workersB = workers.filter(w => w.shift === 'B');
  const workersC = workers.filter(w => w.shift === 'C');

  return {
    A: calculateShiftPerformance('A', workersA, stages),
    B: calculateShiftPerformance('B', workersB, stages),
    C: calculateShiftPerformance('C', workersC, stages)
  };
}
