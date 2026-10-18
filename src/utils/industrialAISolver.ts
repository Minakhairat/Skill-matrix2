import { Worker, Stage, ProductionLine, Model, PlantLeadership } from '../types/matrix';
import { calculateStageMetric, calculateWorkerFlexibility } from './matrixCalculations';

export interface AIAdviceRequest {
  query: string;
  line: ProductionLine;
  model: Model;
  stages: Stage[];
  workers: Worker[];
  leadership: PlantLeadership;
  selectedStageId?: string;
}

export interface AIAdviceResponse {
  title: string;
  summary: string;
  keyFindings: string[];
  immediateActions: {
    step: number;
    title: string;
    details: string;
    targetWorkers?: string[];
    stageName?: string;
    actionType: 'training' | 'rebalance' | 'shift_swap' | 'process_control';
  }[];
  trainingPlan: {
    stageName: string;
    gapCount: number;
    recommendedTrainees: {
      name: string;
      code: string;
      shift: string;
      currentLevel: number;
      targetLevel: number;
      estimatedDays: number;
    }[];
  }[];
  shiftBalanceInsight: string;
  engineerRecommendation: string;
}

export function generateIndustrialAIAdvice(req: AIAdviceRequest): AIAdviceResponse {
  const { line, stages, workers, leadership, selectedStageId } = req;
  const stageMetrics = stages.map(s => calculateStageMetric(s, workers));
  
  // Identify bottlenecks & shortages
  const shortageStages = stageMetrics.filter(m => m.gap > 0).sort((a, b) => b.gap - a.gap);
  const targetStage = selectedStageId 
    ? stageMetrics.find(m => m.stage.id === selectedStageId) 
    : shortageStages[0] || stageMetrics[0];

  const totalWorkers = workers.length;
  const multiSkilledWorkers = workers.filter(w => calculateWorkerFlexibility(w, stages).isTargetMet);
  const multiSkillRate = totalWorkers > 0 ? Math.round((multiSkilledWorkers.length / totalWorkers) * 100) : 0;

  // Shift performance
  const shifts: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C'];
  const shiftStats = shifts.map(sh => {
    const shWorkers = workers.filter(w => w.shift === sh);
    const shMulti = shWorkers.filter(w => calculateWorkerFlexibility(w, stages).isTargetMet).length;
    return {
      shift: sh,
      count: shWorkers.length,
      multiRate: shWorkers.length > 0 ? Math.round((shMulti / shWorkers.length) * 100) : 0
    };
  });

  const lowestShift = [...shiftStats].sort((a, b) => a.multiRate - b.multiRate)[0];

  // Specific training recommendations for shortage stages
  const trainingPlan = shortageStages.slice(0, 3).map(sm => {
    // Workers with level 2 (fastest to promote)
    const level2Workers = workers.filter(w => (w.skills[sm.stage.id] || 0) === 2);
    // Workers with level 1
    const level1Workers = workers.filter(w => (w.skills[sm.stage.id] || 0) === 1);
    
    // Workers in other stages who have surplus flexibility
    const crossTrainCandidates = workers.filter(w => {
      const currentLvl = w.skills[sm.stage.id] || 0;
      return currentLvl < 3;
    }).slice(0, 3);

    const recommendedTrainees = [
      ...level2Workers.map(w => ({
        name: w.name,
        code: w.empCode,
        shift: `وردية ${w.shift}`,
        currentLevel: 2,
        targetLevel: 3,
        estimatedDays: 2 // Level 2 to 3 takes 2 days OJT
      })),
      ...level1Workers.map(w => ({
        name: w.name,
        code: w.empCode,
        shift: `وردية ${w.shift}`,
        currentLevel: 1,
        targetLevel: 3,
        estimatedDays: 5
      })),
      ...crossTrainCandidates.map(w => ({
        name: w.name,
        code: w.empCode,
        shift: `وردية ${w.shift}`,
        currentLevel: w.skills[sm.stage.id] || 0,
        targetLevel: 3,
        estimatedDays: 7
      }))
    ].slice(0, Math.max(sm.gap + 1, 3));

    return {
      stageName: sm.stage.name,
      gapCount: sm.gap,
      recommendedTrainees
    };
  });

  const immediateActions: AIAdviceResponse['immediateActions'] = [];

  if (targetStage && targetStage.gap > 0) {
    // Quick win 1: Promote Level 2 workers
    const l2 = workers.filter(w => (w.skills[targetStage.stage.id] || 0) === 2);
    if (l2.length > 0) {
      immediateActions.push({
        step: 1,
        title: `ترقية فورية للعمال المقتربين من التأهيل لمرحلة (${targetStage.stage.name})`,
        details: `يوجد ${l2.length} عمال في المستوى 2 (يعمل تحت إشراف). بتكليف مدرب معتمد (مستوى 4) بمرافقتهم لمدة 48 ساعة OJT، يتم سد العجز بنسبة ${Math.min(100, Math.round((l2.length / targetStage.gap) * 100))}% دون الحاجة لتعيينات جديدة.`,
        targetWorkers: l2.map(w => `${w.name} (${w.empCode} - وردية ${w.shift})`),
        stageName: targetStage.stage.name,
        actionType: 'training'
      });
    }

    // Quick win 2: Rebalance from surplus stations
    const surplusStages = stageMetrics.filter(m => m.qualifiedCount > m.stage.targetWorkersCount);
    if (surplusStages.length > 0) {
      const donor = surplusStages[0];
      const donorWorkers = donor.qualifiedWorkers.slice(0, 2);
      immediateActions.push({
        step: 2,
        title: `إعادة موازنة (Rebalancing) سريعة من محطة (${donor.stage.name})`,
        details: `محطة (${donor.stage.name}) بها فائض عمال مؤهلين (${donor.qualifiedCount} عمال مقارنة بالمستهدف ${donor.stage.targetWorkersCount}). نوصي بنقل عمال لتغطية عجز (${targetStage.stage.name}).`,
        targetWorkers: donorWorkers.map(w => `${w.name} (${w.empCode})`),
        stageName: donor.stage.name,
        actionType: 'rebalance'
      });
    }

    // Quick win 3: Shift coordination
    immediateActions.push({
      step: 3,
      title: `موازنة الورديات وإشراك مشرف الخط (${line.supervisor})`,
      details: `تنسيق توزيع العمال ذوي الخبرة بين وردية A و B لضمان عدم وجود وردية بدون عمال مؤهلين (مستوى 3) للمراحل الحرجة، ومراجعة خطة التدريب الأسبوعية مع ${leadership.engineerName}.`,
      actionType: 'shift_swap'
    });
  } else {
    immediateActions.push({
      step: 1,
      title: 'الحفاظ على الكفاءة ومواصلة التدريب التبادلي (Cross-Training)',
      details: `جميع مراحل الخط تحقق المستهدف الحالي. نوصي بتطبيق برنامج الـ 3 مراحل لكل عامل لرفع مرونة القوى العاملة الحالية (${multiSkillRate}%) إلى 85%.`,
      actionType: 'training'
    });
    immediateActions.push({
      step: 2,
      title: 'تأهيل مدربين معتمدين (مستوى 4) للمراحل الاستراتيجية',
      details: `اختيار العمال المتميزين بالمستوى 3 في الوردية ${lowestShift.shift} وترقيتهم لمستوى مدرب لنقل الخبرة للعمال الجدد.`,
      actionType: 'process_control'
    });
  }

  const keyFindings = [
    shortageStages.length > 0 
      ? `يوجد عجز في ${shortageStages.length} مراحل إنتاجية بإجمالي نقص ${shortageStages.reduce((acc, s) => acc + s.gap, 0)} عاملاً مؤهلاً.`
      : `جميع مراحل الخط مستوفاة للمستهدف العددي المحدد (${targetStage?.stage.targetWorkersCount || 5} عمال لكل مرحلة).`,
    `نسبة مرونة العمال الحالية هي ${multiSkillRate}% من إجمالي ${totalWorkers} عاملاً مسجلاً على الخط.`,
    `أدنى وردية في نسبة التأهيل المتعدد هي الوردية (${lowestShift.shift}) بنسبة ${lowestShift.multiRate}% وتتطلب تدخلاً تدريبياً عاجلاً.`,
    `مشرف الخط المسؤول: ${line.supervisor || 'غير محدد'} | المهندس المشرف: ${leadership.engineerName || 'غير محدد'}.`
  ];

  return {
    title: `تقرير الاستشارة الصناعية الذكية - ${line.name}`,
    summary: shortageStages.length > 0
      ? `رصد الذكاء الاصطناعي اختناقات حرجة في خط الإنتاج (${line.name}). المرحلة الأكثر تأثيراً هي (${shortageStages[0].stage.name}) بعجز قدره ${shortageStages[0].gap} عمال. تم إعداد خطة مناورة فورية لسد النقص خلال 48 ساعة.`
      : `الخط (${line.name}) يتمتع باستقرار تشغيلي متوازن. الأولوية الآن هي رفع مرونة العمال لمواجهة الغيابات الطارئة وموازنة الوردية (${lowestShift.shift}).`,
    keyFindings,
    immediateActions,
    trainingPlan,
    shiftBalanceInsight: `تحليل الورديات: وردية A (${shiftStats[0].multiRate}%) | وردية B (${shiftStats[1].multiRate}%) | وردية C (${shiftStats[2].multiRate}%). نوصي بنقل عامل خبير من الوردية الأعلى كفاءة لتدريب وردية ${lowestShift.shift}.`,
    engineerRecommendation: `توجيه للإدارة الهندسية (${leadership.engineerName}) ومدير الإدارة (${leadership.managerName}): اعتماد خطة التدريب المقترحة وتحديث تقييمات مصفوفة المهارات أسبوعياً لمراقبة الـ Uplift التشغيلي.`
  };
}
