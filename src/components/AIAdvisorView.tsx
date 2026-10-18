import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Send, 
  Bot, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  RotateCw, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  HelpCircle,
  Copy,
  Check,
  Printer,
  ChevronDown,
  Layers,
  Cpu,
  AlertOctagon,
  Clock,
  ShieldAlert,
  Flame,
  Wrench,
  RotateCcw,
  Sliders,
  Filter
} from 'lucide-react';
import { Worker, Stage, ProductionLine, Model, PlantLeadership, TerminologyConfig, IndustrialProblemCategory, ProblemSolutionResult } from '../types/matrix';
import { calculateStageMetric, calculateWorkerFlexibility } from '../utils/matrixCalculations';
import { generateIndustrialAIAdvice, AIAdviceResponse, solveIndustrialProblem } from '../utils/industrialAISolver';
import { formatUnitName, formatSubUnitName } from '../utils/constants';

interface AIAdvisorViewProps {
  line: ProductionLine;
  model: Model;
  stages: Stage[];
  lineWorkers: Worker[];
  allWorkers: Worker[];
  leadership: PlantLeadership;
  terminology?: TerminologyConfig;
  onNavigateToMatrix?: () => void;
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({
  line,
  model,
  stages,
  lineWorkers,
  allWorkers,
  leadership,
  terminology,
  onNavigateToMatrix
}) => {
  // Navigation tabs inside AI Advisor: 'problem_solver' vs 'general_advice'
  const [activeTab, setActiveTab] = useState<'problem_solver' | 'general_advice'>('problem_solver');

  // PROBLEM SOLVER STATE
  const [selectedCategory, setSelectedCategory] = useState<IndustrialProblemCategory>('bottleneck');
  const [problemDescription, setProblemDescription] = useState<string>('تراكم كبير في القطع تحت التشغيل أمام مرحلة وتأخر تسليم الوردية بسبب نقص العمالة المؤهلة');
  const [problemSeverity, setProblemSeverity] = useState<'critical' | 'high' | 'medium'>('critical');
  const [problemStageId, setProblemStageId] = useState<string>(stages[0]?.id || '');
  const [problemShift, setProblemShift] = useState<string>('ALL');
  const [isProblemLoading, setIsProblemLoading] = useState<boolean>(false);
  const [problemResult, setProblemResult] = useState<ProblemSolutionResult | null>(null);
  const [copiedProblem, setCopiedProblem] = useState<boolean>(false);
  const [problemAiSource, setProblemAiSource] = useState<'gemini' | 'industrial_engine'>('industrial_engine');

  // GENERAL ADVISOR STATE
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedAdvice, setCopiedAdvice] = useState(false);
  const [advice, setAdvice] = useState<AIAdviceResponse | null>(null);
  const [adviceAiSource, setAdviceAiSource] = useState<'gemini' | 'industrial_engine'>('industrial_engine');

  // Calculate live stage metrics
  const stageMetrics = stages.map(s => calculateStageMetric(s, lineWorkers));
  const shortageStages = stageMetrics.filter(m => m.gap > 0).sort((a, b) => b.gap - a.gap);

  const term = terminology || {
    preset: 'lines_models',
    lineLabel: 'خط إنتاج',
    lineLabelPlural: 'خطوط الإنتاج',
    modelLabel: 'موديل',
    modelLabelPlural: 'الموديلات',
    stageLabel: 'مرحلة',
    stageLabelPlural: 'المراحل'
  };

  // Initialize general advice on mount or line change
  useEffect(() => {
    handleRunAnalysis();
    handleRunProblemSolver('bottleneck', stages[0]?.id || '', 'critical', 'ALL');
  }, [line.id, model.id]);

  // Pre-configured problem templates
  const problemTemplates: {
    id: IndustrialProblemCategory;
    title: string;
    desc: string;
    defaultText: string;
    icon: React.ElementType;
    color: string;
    badgeColor: string;
  }[] = [
    {
      id: 'bottleneck',
      title: `عجز واختناق حاد في ${term.stageLabel}`,
      desc: `تكدس القطع تحت التشغيل (WIP) وتوقف تدفق ${term.lineLabel}`,
      defaultText: `عندي اختناق شديد وتكدس للقطع في هذه الـ ${term.stageLabel}، ونقص حاد في العمال المؤهلين مقارنة بالمستهدف. مطلوب خطة فورية لفك الاختناق وتصريف التكدس بالعمال المتاحين.`,
      icon: Flame,
      color: 'text-rose-600',
      badgeColor: 'bg-rose-50 border-rose-200 text-rose-800'
    },
    {
      id: 'absenteeism',
      title: 'غياب مفاجئ أو نقص عمال بوردية',
      desc: 'توقف محطة أو ماكينة بسبب غياب غير متوقع لعمالة ماهرة',
      defaultText: `غياب مفاجئ لعمال مهرة في الوردية وتهديد بتوقف ${term.lineLabel}. محتاج تحديد أفضل العمال البدلاء فوراً من المسجلين بالاسم والكود لنقلهم دون تعطيل باقي المحطات.`,
      icon: Users,
      color: 'text-amber-600',
      badgeColor: 'bg-amber-50 border-amber-200 text-amber-800'
    },
    {
      id: 'quality_defect',
      title: 'ارتفاع نسبة المعيب والفاقد (Defects)',
      desc: 'زيادة العيوب في محطة الفحص وحاجة لتأهيل المشغلين',
      defaultText: `ارتفاع نسبة القطع المعيبة وإعادة التشغيل (Rework) في هذه الـ ${term.stageLabel}. محتاج تشخيص للسبب الجذري وتكليف خبير معتمد بمرافقة العمال ومراجعة نقاط الجودة الحرجة.`,
      icon: AlertOctagon,
      color: 'text-red-600',
      badgeColor: 'bg-red-50 border-red-200 text-red-800'
    },
    {
      id: 'worker_rigidity',
      title: `ضعف مرونة العمال وخطر توقف ${term.lineLabel}`,
      desc: `تركز المهارات وعمال لا يتقنون سوى ${term.stageLabel} واحدة`,
      defaultText: `معظم العمال مسجلون على ${term.stageLabel} واحدة فقط وغير مؤهلين للتدوير. مطلوب خطة تدريب مكثف OJT لرفع مرونة العمال إلى 3 ${term.stageLabelPlural} لكل عامل وفق المعيار الصناعي.`,
      icon: RotateCcw,
      color: 'text-purple-600',
      badgeColor: 'bg-purple-50 border-purple-200 text-purple-800'
    },
    {
      id: 'model_changeover',
      title: `تأخير تغيير الـ ${term.modelLabel} وضغط طلبيات`,
      desc: `ضغط وقت التسليم وبطء في ضبط وتجهيز ${term.lineLabel}`,
      defaultText: `لدينا أمر تشغيل مستعجل وتغيير ${term.modelLabel} يتطلب وقتاً طويلاً. مطلوب توزيع دقيق للعمال المهرة لتسريع الإعداد وبدء الإنتاج القياسي بأقل زمن تجهيز.`,
      icon: Clock,
      color: 'text-sky-600',
      badgeColor: 'bg-sky-50 border-sky-200 text-sky-800'
    },
    {
      id: 'machine_breakdown',
      title: `عطل فني في ${term.lineLabel} / توقف طارئ`,
      desc: `توقف غير مخطط له وحاجة لمناورة سريعة لتحويل العمال`,
      defaultText: `عطل فني طارئ في إحدى المحطات، ونحتاج لمناورة ذكية لإعادة توجيه العمال إلى محطات أو ماكينات بديلة لتفادي وقت الضياع (Downtime).`,
      icon: Wrench,
      color: 'text-indigo-600',
      badgeColor: 'bg-indigo-50 border-indigo-200 text-indigo-800'
    }
  ];

  // 1. SOLVE INDUSTRIAL PROBLEM HANDLER
  const handleRunProblemSolver = async (
    customCategory?: IndustrialProblemCategory,
    customStageId?: string,
    customSeverity?: 'critical' | 'high' | 'medium',
    customShift?: string,
    customText?: string
  ) => {
    setIsProblemLoading(true);
    const cat = customCategory || selectedCategory;
    const stageId = customStageId !== undefined ? customStageId : (problemStageId || stages[0]?.id || '');
    const sev = customSeverity || problemSeverity;
    const shift = customShift || problemShift;
    const text = customText || problemDescription || 'مشكلة تشغيلية عامة في خط الإنتاج';

    const targetStageObj = stages.find(s => s.id === stageId) || stages[0];

    // Rich context for problem diagnosis
    const contextData = {
      problemCategory: cat,
      problemSeverity: sev,
      affectedShift: shift,
      lineName: formatUnitName(line.name, term),
      lineCode: line.code,
      supervisor: line.supervisor,
      leadEngineer: leadership.engineerName,
      manager: leadership.managerName,
      modelName: formatSubUnitName(model.name, term),
      targetStage: targetStageObj ? {
        id: targetStageObj.id,
        name: targetStageObj.name,
        code: targetStageObj.code,
        target: targetStageObj.targetWorkersCount,
        minLevel: targetStageObj.minRequiredLevel
      } : null,
      totalWorkersOnLine: lineWorkers.length,
      qualifiedWorkersOnStage: lineWorkers
        .filter(w => (w.skills[stageId] || 0) >= 3)
        .map(w => ({ name: w.name, code: w.empCode, shift: w.shift, level: w.skills[stageId] })),
      level2WorkersOnStage: lineWorkers
        .filter(w => (w.skills[stageId] || 0) === 2)
        .map(w => ({ name: w.name, code: w.empCode, shift: w.shift, level: 2 })),
      crossSkilledCandidates: lineWorkers
        .filter(w => (w.skills[stageId] || 0) >= 3 && (!shift || shift === 'ALL' || w.shift === shift))
        .map(w => ({ name: w.name, code: w.empCode, shift: w.shift, level: w.skills[stageId] }))
    };

    // Try server-side Gemini first
    try {
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `تشخيص وحل مشكلة صناعية:\nنوع المشكلة: ${cat}\nالمستوى: ${sev}\nالوردية: ${shift}\nالمرحلة/المحطة: ${targetStageObj?.name}\nتفاصيل المشكلة:\n${text}`,
          context: contextData
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && !data.fallback) {
          // Adapt deterministic base result and enrich with Gemini's detailed text
          const baseResult = solveIndustrialProblem({
            problemDescription: text,
            category: cat,
            severity: sev,
            line,
            model,
            stages,
            workers: lineWorkers,
            leadership,
            affectedStageId: stageId,
            affectedShift: shift
          });

          baseResult.summary = data.text.slice(0, 450) + '...';
          baseResult.aiExecutiveNote = data.text;
          setProblemResult(baseResult);
          setProblemAiSource('gemini');
          setIsProblemLoading(false);
          return;
        }
      }
    } catch (e) {
      // Graceful fallback
    }

    // Fallback deterministic solver
    const computed = solveIndustrialProblem({
      problemDescription: text,
      category: cat,
      severity: sev,
      line,
      model,
      stages,
      workers: lineWorkers,
      leadership,
      affectedStageId: stageId,
      affectedShift: shift
    });

    setProblemResult(computed);
    setProblemAiSource('industrial_engine');
    setIsProblemLoading(false);
  };

  // 2. GENERAL ANALYSIS HANDLER
  const handleRunAnalysis = async (customPrompt?: string, targetStageId?: string) => {
    setIsLoading(true);
    const activeStageId = targetStageId !== undefined ? targetStageId : selectedStageId;
    const promptText = customPrompt || userQuery || `تحليل شامل لعجز المهارات وموازنة ${term.lineLabel} واقتراح خطة تدريب فورية`;

    const contextData = {
      lineName: formatUnitName(line.name, term),
      lineCode: line.code,
      supervisor: line.supervisor,
      leadEngineer: leadership.engineerName,
      manager: leadership.managerName,
      modelName: formatSubUnitName(model.name, term),
      totalLineWorkers: lineWorkers.length,
      stages: stageMetrics.map(sm => ({
        id: sm.stage.id,
        name: sm.stage.name,
        target: sm.stage.targetWorkersCount,
        qualifiedCount: sm.qualifiedCount,
        gap: sm.gap,
        isCovered: sm.isCovered,
        level2PotentialWorkersCount: sm.potentialWorkers.length
      })),
      shortageStages: shortageStages.map(sm => ({
        stageName: sm.stage.name,
        gap: sm.gap,
        potentialTrainees: sm.potentialWorkers.map(w => ({
          name: w.name,
          code: w.empCode,
          shift: w.shift,
          currentLevel: w.skills[sm.stage.id] || 0
        }))
      }))
    };

    try {
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptText,
          context: contextData
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text && !data.fallback) {
          const baseAdvice = generateIndustrialAIAdvice({
            query: promptText,
            line,
            model,
            stages,
            workers: lineWorkers,
            leadership,
            selectedStageId: activeStageId || undefined
          });
          baseAdvice.summary = data.text.slice(0, 500) + '...';
          baseAdvice.engineerRecommendation = data.text;
          setAdvice(baseAdvice);
          setAdviceAiSource('gemini');
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {}

    const computed = generateIndustrialAIAdvice({
      query: promptText,
      line,
      model,
      stages,
      workers: lineWorkers,
      leadership,
      selectedStageId: activeStageId || undefined
    });

    setAdvice(computed);
    setAdviceAiSource('industrial_engine');
    setIsLoading(false);
  };

  const handleCopyProblemReport = () => {
    if (!problemResult) return;
    const text = `
تقرير حل المشكلة بالذكاء الاصطناعي - MatrixPro
المشكلة: ${problemResult.problemTitle}
التصنيف: ${problemResult.category} | الخطورة: ${problemResult.severity}
الملخص:
${problemResult.summary}

التحليل والسبب الجذري:
${problemResult.rootCauseAnalysis.map((r, i) => `${i + 1}. ${r}`).join('\n')}

الحلول الفورية الإسعافية:
${problemResult.immediateSolutions.map(s => `[${s.timeframe}] ${s.action}\nالمسؤول: ${s.responsible}\nالعمال المكلفون: ${s.assignedWorkers?.map(w => `${w.name} (${w.code})`).join(', ') || 'العمال المسجلون'}`).join('\n\n')}

الخطة متوسطة المدى (1-7 أيام):
${problemResult.mediumTermPlan.map(p => `• ${p.day}: ${p.target} - ${p.method}`).join('\n')}

إجراءات الوقاية ومنع التكرار:
${problemResult.preventiveMeasures.join('\n')}

ملاحظة الإدارة الهندسية:
${problemResult.aiExecutiveNote}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedProblem(true);
    setTimeout(() => setCopiedProblem(false), 2000);
  };

  return (
    <div className="space-y-5 pb-8">
      
      {/* Top Banner: Industrial AI Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                مستشار وحلال المشكلات الصناعية بالذكاء الاصطناعي (Industrial Matrix AI)
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                مربوط بالبيانات الحية
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                {formatUnitName(line.name, term)} · {lineWorkers.length} عامل
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              تشخيص فوري للمشكلات التشغيلية (اختناق، غياب، معيب، أعطال) واقتراح حلول هندسية ومناورات عمالية مباشرة بالاسم والكود.
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-white/10 rounded-xl shrink-0 self-start md:self-center">
          <button
            onClick={() => setActiveTab('problem_solver')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'problem_solver'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            <span>تشخيص وحل مشكلة</span>
          </button>

          <button
            onClick={() => setActiveTab('general_advice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'general_advice'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-indigo-300" />
            <span>المستشار العام والموازنة</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DEDICATED INDUSTRIAL PROBLEM SOLVER (حل وتشخيص المشكلات الصناعية) */}
      {/* ========================================================================= */}
      {activeTab === 'problem_solver' && (
        <div className="space-y-4">
          
          {/* Problem Selector & Inputs Form */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-1.5 flex items-center justify-between">
                <span>1. اختر نوع المشكلة أو انقر على نموذج سريع:</span>
                <span className="text-[11px] text-slate-500 font-normal">اختر النمط المناسب لما يحدث في المصنع الآن</span>
              </label>

              {/* Problem Archetypes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {problemTemplates.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isSelected = selectedCategory === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(tmpl.id);
                        setProblemDescription(tmpl.defaultText);
                      }}
                      className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <Icon className={`w-4 h-4 ${tmpl.color}`} />
                          <span className="text-xs font-bold text-slate-900">{tmpl.title}</span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <p className="text-[11px] text-slate-500 leading-normal">{tmpl.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stage, Shift and Severity Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
              
              {/* Affected Stage / Machine */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الـ {term.stageLabel} المتأثرة بالمشكلة:
                </label>
                <select
                  value={problemStageId}
                  onChange={(e) => setProblemStageId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  {stages.map((stg) => (
                    <option key={stg.id} value={stg.id}>
                      {stg.name} ({stg.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Affected Shift */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  الوردية المتأثرة:
                </label>
                <select
                  value={problemShift}
                  onChange={(e) => setProblemShift(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="ALL">جميع الورديات (A, B, C)</option>
                  <option value="A">الوردية A (صباحي)</option>
                  <option value="B">الوردية B (مسائي)</option>
                  <option value="C">الوردية C (ليلي)</option>
                </select>
              </div>

              {/* Severity Level */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  مستوى الإلحاح والخطورة:
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {(['critical', 'high', 'medium'] as const).map((sev) => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => setProblemSeverity(sev)}
                      className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                        problemSeverity === sev
                          ? sev === 'critical'
                            ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                            : sev === 'high'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {sev === 'critical' ? 'طارئ جداً' : sev === 'high' ? 'مرتفع' : 'متوسط'}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Custom Description Textarea */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                تفاصيل ووصف المشكلة (يمكنك التعديل أو كتابة أي تفاصيل إضافية):
              </label>
              <div className="relative">
                <textarea
                  rows={3}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="اكتب المشكلة بالتفصيل، مثلاً: غياب عامل اللحام في الوردية الصباحية وتعطل خط التجميع..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
                />
              </div>
            </div>

            {/* Trigger Button */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-500">
                * يقوم الذكاء الاصطناعي بربط المشكلة مباشرة بالـ {lineWorkers.length} عامل المسجلين واقتراح بدلاء مؤهلين.
              </span>
              <button
                type="button"
                onClick={() => handleRunProblemSolver()}
                disabled={isProblemLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all shrink-0"
              >
                {isProblemLoading ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-300" />
                )}
                <span>تشخيص المشكلة واقتراح الحلول الذكية 🚀</span>
              </button>
            </div>

          </div>

          {/* PROBLEM DIAGNOSIS & SOLUTIONS OUTPUT */}
          {problemResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Card 1: Problem Diagnosis & Root Causes */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                
                {/* Header & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">
                        {problemResult.problemTitle}
                      </h2>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>الخطورة: <strong className="text-rose-600">{problemResult.severity === 'critical' ? 'طارئة وحرجة' : 'مرتفعة'}</strong></span>
                        <span>·</span>
                        <span className="font-mono text-indigo-600 font-bold">
                          {problemAiSource === 'gemini' ? 'Google Gemini 3.8 Flash' : 'MatrixPro Industrial Solver'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Copy & Print */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyProblemReport}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {copiedProblem ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedProblem ? 'تم النسخ' : 'نسخ تقرير الحل'}</span>
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>طباعة التقرير</span>
                    </button>
                  </div>
                </div>

                {/* Executive Summary */}
                <div className="p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>التشخيص الهندسي والملخص التنفيذي:</span>
                  </div>
                  <p className="whitespace-pre-line text-slate-700">{problemResult.summary}</p>
                </div>

                {/* Root Causes (5-Whys Analysis) */}
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span>تحليل الأسباب الجذرية (Root Cause Analysis - 5 Whys):</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    {problemResult.rootCauseAnalysis.map((cause, idx) => (
                      <div key={idx} className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl text-xs space-y-1">
                        <div className="font-bold text-amber-900 flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-[10px] font-mono flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span>السبب الجذري {idx + 1}</span>
                        </div>
                        <p className="text-slate-700 text-[11px] leading-relaxed pr-5">{cause}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Card 2: Immediate Containment Actions (1-4 hours) */}
              <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span>الحلول الإسعافية العاجلة (خلال 1 إلى 4 ساعات):</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      مناورات فورية بالعمال الحقيقيين المسجلين لتجنب توقف خط الإنتاج
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                    أولوية قصوى
                  </span>
                </div>

                <div className="space-y-3">
                  {problemResult.immediateSolutions.map((sol, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 border border-slate-200 hover:border-indigo-300 rounded-xl space-y-2 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold font-mono">
                            {sol.timeframe}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">{sol.action}</h4>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          المسؤول التنفيذي: <strong className="text-slate-800">{sol.responsible}</strong>
                        </span>
                      </div>

                      {/* Assigned Workers Chips */}
                      {sol.assignedWorkers && sol.assignedWorkers.length > 0 && (
                        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-600">العمال المرشحون فوراً:</span>
                          {sol.assignedWorkers.map((w, wIdx) => (
                            <div key={wIdx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs">
                              <span className="font-mono text-indigo-600">{w.code}</span>
                              <span>{w.name}</span>
                              <span className="text-[10px] text-slate-500">({w.shift})</span>
                              <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">مستوى {w.level}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Card 3: 7-Day Resolution & Prevention Plan */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                
                {/* Tactical 7-day Plan */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>خطة الحلول التكتيكية (1 إلى 7 أيام):</span>
                  </h3>
                  <div className="space-y-2">
                    {problemResult.mediumTermPlan.map((plan, idx) => (
                      <div key={idx} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-indigo-900">{plan.day}</span>
                          <span className="font-semibold text-slate-700">{plan.target}</span>
                        </div>
                        <p className="text-[11px] text-slate-600">{plan.method}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prevention Measures (Poka-Yoke & Standard Work) */}
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>إجراءات الوقاية ومنع التكرار (Poka-Yoke):</span>
                  </h3>
                  <div className="space-y-2">
                    {problemResult.preventiveMeasures.map((prev, idx) => (
                      <div key={idx} className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-200 text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="text-slate-800 leading-normal">{prev}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Card 4: Sign-off & Matrix Navigation */}
              <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 p-4 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    <span>فريق الإشراف والمسؤولية الميدانية:</span>
                  </div>
                  <div className="text-slate-600 mt-1 space-y-0.5 text-[11px]">
                    <div>• مهندس الإنتاج والعمليات: <strong className="text-slate-900">{leadership.engineerName}</strong></div>
                    <div>• مدير المصنع: <strong className="text-slate-900">{leadership.managerName}</strong></div>
                    <div>• مشرف الـ {term.lineLabel}: <strong className="text-slate-900">{line.supervisor}</strong></div>
                  </div>
                </div>

                {onNavigateToMatrix && (
                  <button
                    onClick={onNavigateToMatrix}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-colors shrink-0"
                  >
                    <span>الانتقال للمصفوفة لتنفيذ نقل العمال</span>
                    <ArrowRight className="w-4 h-4 rotate-180" />
                  </button>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GENERAL MATRIX ADVISOR & BALANCING (المستشار العام وموازنة الخط) */}
      {/* ========================================================================= */}
      {activeTab === 'general_advice' && (
        <div className="space-y-4">
          {/* Stage Selector & Custom Prompt Form */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
              
              {/* Specific Stage Shortage Filter */}
              <div className="relative min-w-[220px]">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  اختر {term.stageLabel} للتركيز على عجزها:
                </label>
                <div className="relative">
                  <select
                    value={selectedStageId}
                    onChange={(e) => {
                      setSelectedStageId(e.target.value);
                      if (e.target.value) {
                        const sm = stageMetrics.find(m => m.stage.id === e.target.value);
                        const prompt = `حل عجز ${term.stageLabel} (${sm?.stage.name || ''}) وتحديد العمال الأنسب لنقلهم أو تدريبهم فوراً`;
                        setUserQuery(prompt);
                        handleRunAnalysis(prompt, e.target.value);
                      }
                    }}
                    className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none"
                  >
                    <option value="">جميع {term.stageLabelPlural} (تحليل شامل)</option>
                    {stageMetrics.map((sm) => (
                      <option key={sm.stage.id} value={sm.stage.id}>
                        {sm.stage.name} {sm.gap > 0 ? `(عجز: ${sm.gap} عمال)` : '(مستوفاة ✓)'}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Natural Language Prompt Input */}
              <div className="flex-1">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  اسأل المستشار الصناعي أو اكتب طلباً مخصصاً:
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRunAnalysis();
                      }
                    }}
                    placeholder={`مثال: عندي نقص في الوردية B في ${term.stageLabel}، مين العمال الأنسب لنقلهم من المسجلين؟`}
                    className="w-full pl-24 pr-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <button
                    onClick={() => handleRunAnalysis()}
                    disabled={isLoading}
                    className="absolute left-1.5 top-1.5 bottom-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    {isLoading ? (
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>استشارة</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Advice Output */}
          {advice && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-slate-900">{advice.title}</h2>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        تحليل مبني على {lineWorkers.length} عامل و {stages.length} {term.stageLabel}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(advice.summary + '\n' + advice.keyFindings.join('\n'));
                        setCopiedAdvice(true);
                        setTimeout(() => setCopiedAdvice(false), 2000);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      {copiedAdvice ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAdvice ? 'تم النسخ' : 'نسخ التوصيات'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
                  <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>التشخيص التنفيذي:</span>
                  </div>
                  <p className="whitespace-pre-line text-slate-700">{advice.summary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {advice.keyFindings.map((finding, idx) => (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-lg flex items-start gap-2 text-xs">
                      <div className="w-4 h-4 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </div>
                      <span className="text-slate-700 leading-normal">{finding}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Immediate Actions */}
              <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>خطة التدخل الفورية المقترحة</span>
                </h3>
                <div className="space-y-2.5">
                  {advice.immediateActions.map((action) => (
                    <div key={action.step} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{action.step}. {action.title}</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">{action.details}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
