import { Stage, Worker, StageMetric, WorkerFlexibilityMetric, RebalanceSuggestion } from '../types/matrix';

export function calculateStageMetric(stage: Stage, workers: Worker[]): StageMetric {
  const minLevel = stage.minRequiredLevel || 3;
  const target = stage.targetWorkersCount || 5;

  let totalAssigned = 0;
  let qualifiedCount = 0;
  let traineeCount = 0;
  let expertCount = 0;
  const qualifiedWorkers: Worker[] = [];
  const potentialWorkers: Worker[] = [];

  for (const worker of workers) {
    const level = worker.skills[stage.id] ?? 0;
    if (level >= 1) totalAssigned++;
    if (level === 1 || level === 2) traineeCount++;
    if (level === 2) potentialWorkers.push(worker); // candidates for quick upskilling!
    if (level === 4) expertCount++;

    if (level >= minLevel) {
      qualifiedCount++;
      qualifiedWorkers.push(worker);
    }
  }

  const gap = target - qualifiedCount;
  const isCovered = gap <= 0;
  const isCriticalShortage = gap >= 2;
  const coveragePercentage = target > 0 ? Math.round((qualifiedCount / target) * 100) : 100;

  return {
    stage,
    totalAssigned,
    qualifiedCount,
    traineeCount,
    expertCount,
    target,
    gap,
    coveragePercentage,
    isCovered,
    isCriticalShortage,
    qualifiedWorkers,
    potentialWorkers
  };
}

export function calculateWorkerFlexibility(
  worker: Worker,
  stages: Stage[],
  targetMinLevel: number = 3,
  targetStagesCount: number = 3
): WorkerFlexibilityMetric {
  let qualifiedStagesCount = 0;

  for (const stage of stages) {
    const level = worker.skills[stage.id] ?? 0;
    if (level >= targetMinLevel) {
      qualifiedStagesCount++;
    }
  }

  const flexibilityPercentage = targetStagesCount > 0
    ? Math.min(100, Math.round((qualifiedStagesCount / targetStagesCount) * 100))
    : 100;
  const isTargetMet = qualifiedStagesCount >= targetStagesCount;
  const surplusStages = Math.max(0, qualifiedStagesCount - targetStagesCount);

  return {
    worker,
    qualifiedStagesCount,
    targetStagesCount,
    flexibilityPercentage,
    isTargetMet,
    surplusStages
  };
}

export function generateRebalancingSuggestions(
  stages: Stage[],
  lineWorkers: Worker[],
  allWorkers: Worker[]
): RebalanceSuggestion[] {
  const suggestions: RebalanceSuggestion[] = [];

  for (const stage of stages) {
    const metric = calculateStageMetric(stage, lineWorkers);
    if (metric.gap > 0) {
      const neededCount = metric.gap;
      const candidates: RebalanceSuggestion['candidateWorkers'] = [];

      // Priority 1: Workers on the same line who are at level 2 (Under Supervision) -> Upgrading them requires only minor coaching
      const level2Workers = lineWorkers.filter(w => (w.skills[stage.id] ?? 0) === 2);
      for (const w of level2Workers.slice(0, neededCount * 2)) {
        candidates.push({
          worker: w,
          reason: `العامل حاصل على المستوى 2 (تحت إشراف) في هذه المرحلة، يحتاج فقط تقييم عملي أو مرافقة خبير لترقيته إلى المستوى 3 وسد العجز.`,
          currentLevelAtTarget: 2,
          recommendedAction: 'accelerate_training'
        });
      }

      // Priority 2: Workers on other lines who already possess Level 3 or 4 in this stage
      if (candidates.length < neededCount) {
        const otherWorkers = allWorkers.filter(
          w => w.lineId !== lineWorkers[0]?.lineId && (w.skills[stage.id] ?? 0) >= stage.minRequiredLevel
        );

        for (const w of otherWorkers.slice(0, neededCount - candidates.length)) {
          candidates.push({
            worker: w,
            reason: `العامل حاصل بالفعل على المستوى ${w.skills[stage.id]} في هذه المرحلة وهو مسجل حالياً في خط آخر، يمكن الاستعانة به فورياً.`,
            currentLevelAtTarget: w.skills[stage.id] ?? 3,
            recommendedAction: 'transfer_line'
          });
        }
      }

      // Priority 3: Highly multi-skilled workers on the same line with surplus skills
      if (candidates.length < neededCount) {
        const surplusWorkers = lineWorkers.filter(w => {
          const flex = calculateWorkerFlexibility(w, stages);
          return flex.surplusStages > 0 && (w.skills[stage.id] ?? 0) >= 1;
        });

        for (const w of surplusWorkers.slice(0, neededCount - candidates.length)) {
          candidates.push({
            worker: w,
            reason: `عامل متعدد المهارات يمتلك فائضاً في مهارات أخرى ولديه خلفية تمهيدية (المستوى ${w.skills[stage.id]}) في هذه المرحلة.`,
            currentLevelAtTarget: w.skills[stage.id] ?? 1,
            recommendedAction: 'shift_workstation'
          });
        }
      }

      if (candidates.length > 0) {
        suggestions.push({
          targetStageId: stage.id,
          targetStageName: stage.name,
          neededCount,
          candidateWorkers: candidates
        });
      }
    }
  }

  return suggestions;
}
