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
  Cpu
} from 'lucide-react';
import { Worker, Stage, ProductionLine, Model, PlantLeadership } from '../types/matrix';
import { calculateStageMetric, calculateWorkerFlexibility } from '../utils/matrixCalculations';
import { generateIndustrialAIAdvice, AIAdviceResponse } from '../utils/industrialAISolver';

interface AIAdvisorViewProps {
  line: ProductionLine;
  model: Model;
  stages: Stage[];
  lineWorkers: Worker[];
  allWorkers: Worker[];
  leadership: PlantLeadership;
  onNavigateToMatrix?: () => void;
}

export const AIAdvisorView: React.FC<AIAdvisorViewProps> = ({
  line,
  model,
  stages,
  lineWorkers,
  allWorkers,
  leadership,
  onNavigateToMatrix
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [advice, setAdvice] = useState<AIAdviceResponse | null>(null);
  const [aiSource, setAiSource] = useState<'gemini' | 'industrial_engine'>('industrial_engine');

  // Calculate live stage metrics
  const stageMetrics = stages.map(s => calculateStageMetric(s, lineWorkers));
  const shortageStages = stageMetrics.filter(m => m.gap > 0).sort((a, b) => b.gap - a.gap);

  // Initialize advice on mount or line change
  useEffect(() => {
    handleRunAnalysis();
  }, [line.id, model.id]);

  const handleRunAnalysis = async (customPrompt?: string, targetStageId?: string) => {
    setIsLoading(true);
    const activeStageId = targetStageId !== undefined ? targetStageId : selectedStageId;
    const promptText = customPrompt || userQuery || 'تحليل شامل لعجز المهارات وموازنة الخط واقتراح خطة تدريب فورية';

    // 1. Prepare rich factory context
    const contextData = {
      lineName: line.name,
      lineCode: line.code,
      supervisor: line.supervisor,
      leadEngineer: leadership.engineerName,
      manager: leadership.managerName,
      modelName: model.name,
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
      })),
      workersSample: lineWorkers.slice(0, 30).map(w => ({
        name: w.name,
        code: w.empCode,
        shift: w.shift,
        qualifiedCount: calculateWorkerFlexibility(w, stages).qualifiedStagesCount
      }))
    };

    // 2. Attempt server-side Gemini call first
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
          // Parse or adapt text into structured presentation
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
          setAiSource('gemini');
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      // In offline / static gh-pages mode, gracefully fall through
    }

    // 3. Fallback: Highly deterministic, grounded industrial engineering algorithm
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
    setAiSource('industrial_engine');
    setIsLoading(false);
  };

  const handleCopyAdvice = () => {
    if (!advice) return;
    const text = `
تقرير مستشار الذكاء الاصطناعي - ${advice.title}
الملخص:
${advice.summary}

أهم النتائج:
${advice.keyFindings.join('\n')}

خطة التدخل الفورية:
${advice.immediateActions.map(a => `${a.step}. ${a.title}\n   ${a.details}`).join('\n\n')}

توصية الإدارة الهندسية:
${advice.engineerRecommendation}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const quickPrompts = [
    {
      title: 'سد عجز المرحلة الأكثر اختناقاً فوراً',
      desc: 'تحديد العمال المقتربين من التأهيل OJT لترقيتهم',
      action: () => {
        const topShortage = shortageStages[0]?.stage.id || '';
        setSelectedStageId(topShortage);
        handleRunAnalysis('خطة فورية لسد عجز المرحلة الأكثر اختناقاً عبر تدريب العمال بمستوى 2', topShortage);
      }
    },
    {
      title: 'خطة موازنة الوردية الأقل كفاءة',
      desc: 'إعادة توزيع ونقل خبرات لتسوية الورديات',
      action: () => {
        handleRunAnalysis('تحليل تباين أداء الورديات (A, B, C) واقتراح جدول لتبادل الخبرات والمدربين');
      }
    },
    {
      title: 'اقتراح تدوير العمال (Job Rotation) لليوم',
      desc: 'توزيع العمال متعددي المهارات لتفادي الاختناقات',
      action: () => {
        handleRunAnalysis('اقتراح جدول تدوير العمال اليومي لتغطية جميع محطات العمل بدون توقف');
      }
    },
    {
      title: 'تحديد خطة رفع مرونة الخط إلى 80%',
      desc: 'تدريب العمال على 3 مراحل وفق المعيار الصناعي',
      action: () => {
        handleRunAnalysis('خطة تدريب ربع سنوية للوصول بنسبة مرونة العمال (3 مراحل لكل عامل) إلى 80%');
      }
    }
  ];

  return (
    <div className="space-y-5 pb-8">
      
      {/* Top Banner: Industrial AI Advisor Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0 shadow-inner">
            <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white">
                مستشار الذكاء الاصطناعي الصناعي (Industrial Matrix AI)
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                مربوط بالبيانات الحية
              </span>
              <span className="text-[10px] font-mono text-slate-300 bg-white/10 px-2 py-0.5 rounded">
                {line.name} · {lineWorkers.length} عامل
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              يقوم بتحليل مباشر لمستويات مهارات العمال المسجلين، واكتشاف فجوات المراحل، واقتراح خطط تدريب ومناورات تدوير فورية موجهة للمشرف والمهندس.
            </p>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
          <div className="text-right text-xs">
            <div className="text-slate-400 text-[10px]">المسؤولون المسجلون:</div>
            <div className="font-bold text-slate-200">
              {line.supervisor ? `المشرف: ${line.supervisor}` : ''} {leadership.engineerName ? `| ${leadership.engineerName}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Selector & Custom Prompt Form */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          
          {/* Specific Stage Shortage Filter */}
          <div className="relative min-w-[220px]">
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              اختر مرحلة للتركيز على عجزها:
            </label>
            <div className="relative">
              <select
                value={selectedStageId}
                onChange={(e) => {
                  setSelectedStageId(e.target.value);
                  if (e.target.value) {
                    const sm = stageMetrics.find(m => m.stage.id === e.target.value);
                    const prompt = `حل عجز مرحلة (${sm?.stage.name || ''}) وتحديد العمال الأنسب لنقلهم أو تدريبهم فوراً`;
                    setUserQuery(prompt);
                    handleRunAnalysis(prompt, e.target.value);
                  }
                }}
                className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all appearance-none"
              >
                <option value="">جميع مراحل الخط (تحليل شامل)</option>
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
              اسأل المستشار الصناعي أو اكتب مشكلة محددة:
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
                placeholder="مثال: عندي غياب عامل خبير في التجميع النهائي، مين العمال الأنسب لتعويضه فوراً من المسجلين؟"
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

        {/* Quick Action Prompt Chips */}
        <div>
          <span className="text-[11px] font-bold text-slate-500 ml-2">استشارات سريعة جاهزة:</span>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {quickPrompts.map((qp, idx) => (
              <button
                key={idx}
                onClick={qp.action}
                disabled={isLoading}
                className="text-[11px] font-medium bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300 border border-slate-200 text-slate-700 px-2.5 py-1 rounded-lg transition-all text-right flex items-center gap-1.5"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>{qp.title}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Analysis Display Output */}
      {advice && (
        <div className="space-y-4">
          
          {/* Executive Header Card */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {advice.title}
                  </h2>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>تحليل مبني على {lineWorkers.length} عامل و {stages.length} مرحلة</span>
                    <span>·</span>
                    <span className="font-mono text-indigo-600 font-bold">
                      {aiSource === 'gemini' ? 'Google Gemini 3.8 Flash' : 'Industrial Matrix Solver Engine'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Copy / Print */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyAdvice}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ التوصيات'}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة</span>
                </button>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="mt-4 p-3.5 sm:p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed">
              <div className="font-bold text-slate-900 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>التشخيص التنفيذي السريع:</span>
              </div>
              <p className="whitespace-pre-line text-slate-700">
                {advice.summary}
              </p>
            </div>

            {/* Key Findings List */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5">
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

          {/* Actionable Steps: Immediate Actions */}
          <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span>خطة التدخل الفورية المقترحة (Immediate Action Plan)</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">خطوات تنفيذية مرتبة حسب الأولوية</span>
            </div>

            <div className="space-y-3">
              {advice.immediateActions.map((action) => (
                <div 
                  key={action.step}
                  className="p-4 rounded-xl border border-slate-200 hover:border-indigo-300 bg-slate-50/50 transition-all space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        {action.step}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                        {action.title}
                      </h4>
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      action.actionType === 'training' 
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : action.actionType === 'rebalance'
                        ? 'bg-sky-100 text-sky-800 border border-sky-300'
                        : 'bg-purple-100 text-purple-800 border border-purple-300'
                    }`}>
                      {action.actionType === 'training' ? 'تدريب OJT' : action.actionType === 'rebalance' ? 'موازنة ونقل' : 'تنسيق ورديات'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed pr-8">
                    {action.details}
                  </p>

                  {/* Targeted Workers Chips */}
                  {action.targetWorkers && action.targetWorkers.length > 0 && (
                    <div className="pr-8 flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] font-bold text-slate-500">العمال المرشحون فوراً:</span>
                      {action.targetWorkers.map((tw, i) => (
                        <span key={i} className="text-[11px] font-mono bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded font-bold shadow-2xs">
                          {tw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Fast-Track Training Schedule */}
          {advice.trainingPlan.length > 0 && (
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    <span>جدول تسريع ترقية العمال (Fast-Track Qualification Matrix)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    العمال المرشحون للترقية من المستوى 2 (يعمل تحت إشراف) إلى المستوى 3 (مستقل) لسد العجز نهائياً
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {advice.trainingPlan.map((tp, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 p-3 flex items-center justify-between border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">{tp.stageName}</span>
                        <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          عجز: {tp.gapCount} عمال
                        </span>
                      </div>
                      <span className="text-xs text-slate-600 font-medium hidden sm:inline">
                        المرشحون الأقرب للتأهيل
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {tp.recommendedTrainees.map((tr, i) => (
                        <div key={i} className="p-3 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center">
                              {i + 1}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{tr.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{tr.code} · {tr.shift}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 pr-9 sm:pr-0">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-bold text-[10px]">
                                المستوى الحالي: {tr.currentLevel}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 rotate-180" />
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                المستهدف: المستوى 3
                              </span>
                            </div>

                            <div className="text-slate-600 font-medium text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                              المدة المتوقعة: <strong className="text-slate-900 font-mono">{tr.estimatedDays} أيام OJT</strong>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plant Leadership & Governance Sign-off */}
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50/40 p-4 sm:p-5 rounded-xl border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>فريق القيادة والمسؤولية:</span>
              </div>
              <div className="text-slate-600 mt-1 space-y-0.5 text-[11px]">
                <div>• مهندس الإنتاج: <strong className="text-slate-900">{leadership.engineerName || 'غير محدد'}</strong></div>
                <div>• مدير العمليات والمصنع: <strong className="text-slate-900">{leadership.managerName || 'غير محدد'}</strong></div>
                <div>• مشرف الخط: <strong className="text-slate-900">{line.supervisor || 'غير محدد'}</strong></div>
              </div>
            </div>

            {onNavigateToMatrix && (
              <button
                onClick={onNavigateToMatrix}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-xs transition-colors shrink-0"
              >
                <span>الانتقال للمصفوفة لتنفيذ الترقية</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
};
