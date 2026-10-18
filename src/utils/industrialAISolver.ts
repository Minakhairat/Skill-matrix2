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

/**
 * Specialized Industrial Problem Solver & Root Cause Analysis Engine
 * Generates tailored operational solutions, worker transfers, and preventive actions based on real registered data.
 */
export function solveIndustrialProblem(req: {
  problemDescription: string;
  category: import('../types/matrix').IndustrialProblemCategory;
  severity: 'critical' | 'high' | 'medium';
  line: ProductionLine;
  model: Model;
  stages: Stage[];
  workers: Worker[];
  leadership: PlantLeadership;
  affectedStageId?: string;
  affectedShift?: string;
}): import('../types/matrix').ProblemSolutionResult {
  const { problemDescription, category, severity, line, model, stages, workers, leadership, affectedStageId, affectedShift } = req;
  const targetStage = stages.find(s => s.id === affectedStageId) || stages[0];
  
  // Find qualified workers (level 3 or 4) on this stage
  const qualifiedOnStage = workers.filter(w => (w.skills[targetStage.id] || 0) >= 3);
  
  // Find level 2 workers (ready for promotion in 24-48h)
  const level2Workers = workers.filter(w => (w.skills[targetStage.id] || 0) === 2);
  
  // Find multi-skilled workers from other stages who can be redeployed immediately
  const crossSkilledAllies = workers.filter(w => {
    const isSkilled = (w.skills[targetStage.id] || 0) >= 3;
    const isSameShift = !affectedShift || affectedShift === 'ALL' || w.shift === affectedShift;
    return isSkilled && isSameShift;
  });

  // Level 4 expert mentors on line
  const expertMentors = workers.filter(w => Object.values(w.skills).some(lvl => lvl === 4)).slice(0, 3);

  // Root cause analysis tailored to the problem category
  let rootCauses: string[] = [];
  let immediateSolutions: import('../types/matrix').ProblemSolutionResult['immediateSolutions'] = [];
  let mediumTermPlan: import('../types/matrix').ProblemSolutionResult['mediumTermPlan'] = [];
  let preventiveMeasures: string[] = [];

  switch (category) {
    case 'bottleneck':
      rootCauses = [
        `عدم توازن وقت الدورة (Cycle Time) في مرحلة (${targetStage.name}) مقارنة بزمن التاكت (Takt Time).`,
        `تركز العمال المؤهلين (${qualifiedOnStage.length} عمال فقط) دون وجود بدلاء مجهزين في الوردية ${affectedShift || 'الحالية'}.`,
        `تراكم المخزون تحت التشغيل (WIP) قبل هذه المحطة بسبب بطء المناولة أو صعوبة العملية الفنية.`
      ];
      immediateSolutions = [
        {
          timeframe: 'خلال ساعة واحدة',
          action: `إعادة توجيه عمال مؤهلين من محطات بها فائض لدعم محطة (${targetStage.name}) فوراً وتصريف التكدس.`,
          responsible: `مشرف الخط (${line.supervisor})`,
          assignedWorkers: crossSkilledAllies.slice(0, 3).map(w => ({
            name: w.name,
            code: w.empCode,
            shift: `وردية ${w.shift}`,
            level: w.skills[targetStage.id] || 3,
            role: 'دعم فوري وتصريف اختناق'
          }))
        },
        {
          timeframe: 'خلال 4 ساعات',
          action: `تكليف عامل خبير بمرافقة عمال المستوى 2 لتسريع وتيرة العمل وتذليل العقبات الفنية.`,
          responsible: `المهندس (${leadership.engineerName}) والمشرف (${line.supervisor})`,
          assignedWorkers: level2Workers.slice(0, 2).map(w => ({
            name: w.name,
            code: w.empCode,
            shift: `وردية ${w.shift}`,
            level: 2,
            role: 'تشغيل تحت مرافقة خبير'
          }))
        }
      ];
      mediumTermPlan = [
        { day: 'اليوم الأول - الثاني', target: 'موازنة الخط (Line Balancing)', method: 'دراسة حركة وزمن المحطة وتقسيم العمليات المعقدة على محطتين متتاليتين.' },
        { day: 'اليوم الثالث - الرابع', target: 'تدريب مكثف OJT', method: `ترقية عمال المستوى 2 (${level2Workers.map(w => w.name).slice(0, 2).join(', ')}) إلى المستوى 3 لسد العجز نهائياً.` },
        { day: 'اليوم الخامس - السابع', target: 'تثبيت الإيقاع التشغيلي', method: 'إعادة قياس مخرجات الوردية والتأكد من انسيابية القطع دون توقف.' }
      ];
      preventiveMeasures = [
        `تطبيق نظام مراقبة البصري (Andon Board) لإعطاء إنذار مبكر عند تراكم أكثر من 3 قطع أمام محطة (${targetStage.name}).`,
        `إلزام كل وردية بوجود عامل مرن إضافي (Floater Operator) مدرب مسبقاً على هذه المحطة.`
      ];
      break;

    case 'absenteeism':
      rootCauses = [
        `اعتماد المحطة على عامل واحد أو اثنين ذوي كفاءة متخصصة دون وجود بديل مدرب مسبقاً (Single Point of Failure).`,
        `نقص التنسيق بين الورديات وغياب مصفوفة إحلال طوارئ للوردية (${affectedShift || 'الحالية'}).`,
        `عدم تفعيل سياسة المرونة الثلاثية (3 مراحل لكل عامل) على مستوى عمال الخط.`
      ];
      immediateSolutions = [
        {
          timeframe: 'خلال 30 دقيقة',
          action: `استدعاء أو تدوير عمال متعددي المهارات مسجلين بالوردية البديلة أو من محطات العمل غير الحرجة.`,
          responsible: `مشرف الخط (${line.supervisor})`,
          assignedWorkers: crossSkilledAllies.slice(0, 2).map(w => ({
            name: w.name,
            code: w.empCode,
            shift: `وردية ${w.shift}`,
            level: w.skills[targetStage.id] || 3,
            role: 'سد غياب طارئ'
          }))
        },
        {
          timeframe: 'خلال ساعتين',
          action: `تشغيل عمال المستوى 2 بتكليف مباشر من المدرب المعتمد للحفاظ على سرعة الخط وتجنب الإيقاف.`,
          responsible: `مشرف الوردية`,
          assignedWorkers: level2Workers.slice(0, 2).map(w => ({
            name: w.name,
            code: w.empCode,
            shift: `وردية ${w.shift}`,
            level: 2,
            role: 'تغطية وردية تحت إشراف'
          }))
        }
      ];
      mediumTermPlan = [
        { day: 'اليوم 1', target: 'خريطة بدلاء الغياب', method: 'تحديد بديلين معتمدين لكل محطة حرجة وتثبيت أسمائهم في لوحة الخط.' },
        { day: 'اليوم 2-5', target: 'التدريب المتبادل (Cross-Training)', method: 'تدريب 3 عمال من الوردية على محطة الغياب للوصول لمستوى 3.' },
        { day: 'نهاية الأسبوع', target: 'مراجعة نسبة الحضور', method: 'تحديث سجل المرونة واعتماد خطة التدوير الأسبوعي.' }
      ];
      preventiveMeasures = [
        `تطبيق قاعدة 3x3 الصناعية: 3 عمال مؤهلين لكل محطة، وكل عامل يتقن 3 محطات.`,
        `ربط حوافز الحضور والتأهيل بإتقان محطات الطوارئ والبدائل.`
      ];
      break;

    case 'quality_defect':
      rootCauses = [
        `تشغيل عمال جدد أو في المستوى 1-2 بدون إشراف مباشر في مرحلة دقيقة (${targetStage.name}).`,
        `عدم وضوح تعليمات التشغيل القياسية (SOP) أو غياب أدوات منع الخطأ (Poka-Yoke).`,
        `تغير خامات التشغيل أو تآكل أجزاء الاسطمبة / الماكينة دون ضبط المعايرة.`
      ];
      immediateSolutions = [
        {
          timeframe: 'فوراً (خلال 15 دقيقة)',
          action: `إيقاف مؤقت للدفعة المعيبة وعزل القطع وفحص أول 10 عينات بواسطة فني الجودة والخبير.`,
          responsible: `مهندس الجودة والإنتاج (${leadership.engineerName})`
        },
        {
          timeframe: 'خلال ساعة واحدة',
          action: `تكليف عامل خبير معتمد (مستوى 4) بإدارة المحطة فوراً لضبط المعايير وإعادة معايرة التجهيزات.`,
          responsible: `المشرف (${line.supervisor})`,
          assignedWorkers: expertMentors.slice(0, 1).map(w => ({
            name: w.name,
            code: w.empCode,
            shift: `وردية ${w.shift}`,
            level: 4,
            role: 'خبير ضبط جودة وتدريب'
          }))
        }
      ];
      mediumTermPlan = [
        { day: 'اليوم 1', target: 'تحليل السبب الجذري 5-Whys', method: 'فحص نمط العيوب ومقارنة نتائج عمال الوردية A و B و C.' },
        { day: 'اليوم 2-3', target: 'إعادة تأهيل وإجازة العمال', method: 'إعادة تدريب العمال ذوي المستوى 1 و 2 على نقاط الجودة الحرجة (CTQ).' },
        { day: 'اليوم 4-7', target: 'تصفير نسبة المعيب', method: 'تطبيق بطاقة فحص العينة الأولى (First Piece Inspection) لكل أمر تشغيل.' }
      ];
      preventiveMeasures = [
        `تركيب مثبتات وأدلة توجيه لمنع التركيب العكسي للقطع نهائياً (Poka-Yoke).`,
        `منع تكليف أي عامل بمستوى أقل من 3 بالعمل بمفرده في المحطات المصنفة كـ Critical.`
      ];
      break;

    case 'worker_rigidity':
    case 'model_changeover':
    case 'machine_breakdown':
    default:
      rootCauses = [
        `انخفاض مرونة القوى العاملة وتركز المهارات في عدد محدود من الأفراد مما يقلل القدرة على المناورة.`,
        `طول زمن الإعداد والتجهيز (SMED) بين أوامر التشغيل المختلفة.`,
        `عدم كفاية الصيانة الوقائية والتشغيلية الذاتية (TPM) من قبل مشغلي الماكينة.`
      ];
      immediateSolutions = [
        {
          timeframe: 'خلال ساعتين',
          action: `تنفيذ خطة مناورة فورية بنقل المشغلين متعددي المهارات لتشغيل الماكينات أو الخطوط البديلة.`,
          responsible: `مشرف الإنتاج (${line.supervisor})`,
          assignedWorkers: crossSkilledAllies.slice(0, 3).map(w => ({
            name: w.name,
            code: w.empCode,
            shift: `وردية ${w.shift}`,
            level: 3,
            role: 'مناورة تشغيل بديلة'
          }))
        },
        {
          timeframe: 'خلال 4 ساعات',
          action: `تقسيم عمال المحطة المتوقفة إلى مجموعات تدريب وتجهيز اسطمبات استباقية.`,
          responsible: `المهندس (${leadership.engineerName})`
        }
      ];
      mediumTermPlan = [
        { day: 'اليوم 1-2', target: 'برنامج تقليل زمن الضبط (SMED)', method: 'تحويل العمليات الداخلية إلى خارجية وتجهيز الأدوات مسبقاً.' },
        { day: 'اليوم 3-5', target: 'مصفوفة التدوير اليومي', method: 'إلزام كل عامل بالتدوير بين محطتين مختلفتين يومياً.' },
        { day: 'نهاية الأسبوع', target: 'مراجعة الكفاءة الكلية (OEE)', method: 'قياس تحسن التوافرية ومعدل الأداء مع الإدارة.' }
      ];
      preventiveMeasures = [
        `تطبيق الصيانة الذاتية (Autonomous Maintenance) بتنظيف وتزييت المشغل للماكينة يومياً.`,
        `اعتماد خطة تدريب ربع سنوية ملزمة لرفع مرونة العامل إلى 3 مراحل.`
      ];
      break;
  }

  return {
    problemTitle: `معالجة مشكلة: ${problemDescription.slice(0, 60)}...`,
    category,
    severity,
    summary: `قام الذكاء الاصطناعي الصناعي بدراسة المشكلة في (${line.name} - ${targetStage.name}). تم رصد ${rootCauses.length} أسباب جذرية وإعداد خطة تدخل فورية تضم ${immediateSolutions.length} حلول إسعافية و ${mediumTermPlan.length} خطوات متوسطة المدى وإجراءات لمنع تكرار الأزمة.`,
    rootCauseAnalysis: rootCauses,
    immediateSolutions,
    mediumTermPlan,
    preventiveMeasures,
    aiExecutiveNote: `توجيه خاص بالمسؤولية: المشرف المسؤول (${line.supervisor}) مكلف بمتابعة التنفيذ الميداني الفوري، والمهندس (${leadership.engineerName}) ومدير الإدارة (${leadership.managerName}) مكلفان باعتماد تعديلات المصفوفة وتدريب العمال.`
  };
}

