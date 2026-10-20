import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Copy, 
  Check, 
  ChevronRight,
  Zap,
  Layers,
  ArrowRight
} from 'lucide-react';
import { ProductionLine, Model, Stage, Worker, PlantLeadership, TerminologyConfig } from '../types/matrix';
import { sendChatMessageUnified } from '../utils/geminiService';
import { calculateStageMetric, calculateWorkerFlexibility } from '../utils/matrixCalculations';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  line: ProductionLine;
  model: Model;
  stages: Stage[];
  lineWorkers: Worker[];
  allWorkers: Worker[];
  leadership: PlantLeadership;
  terminology: TerminologyConfig;
  onNavigateToMatrix?: () => void;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  line,
  model,
  stages,
  lineWorkers,
  allWorkers,
  leadership,
  terminology,
  onNavigateToMatrix
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate live line metrics for AI context
  const stageMetrics = stages.map(s => calculateStageMetric(s, lineWorkers));
  const shortageStages = stageMetrics.filter(m => m.gap > 0).sort((a, b) => b.gap - a.gap);
  const multiSkilledCount = lineWorkers.filter(w => calculateWorkerFlexibility(w, stages).isTargetMet).length;

  // Initial welcome message once drawer opens
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `مرحباً بك! أنا **المستشار الذكي لمصفوفة المهارات (MatrixPro AI Copilot)**، مدعوم بموديل **Gemini 3.8 Flash**.

أنا مربوط مباشرة ببيانات **${line.name}** (${lineWorkers.length} عامل و ${stages.length} ${terminology.stageLabelPlural}). 
حالة الخط الحالية:
${shortageStages.length > 0 
  ? `⚠️ يوجد **عجز في ${shortageStages.length} ${terminology.stageLabelPlural}** (${shortageStages.map(s => s.stage.name).join('، ')}).` 
  : `✅ الخط **مكتمل التغطية** بنسبة 100%.`}
• العمال متعددو المهارات: **${multiSkilledCount} عمال**.

يمكنك النقر على أحد أزرار التشخيص السريع بالأسفل، أو كتابة أي سؤال لمساعدتك فورياً!`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'Google Gemini 3.8 Flash'
        }
      ]);
    }
  }, [isOpen, line, stages, lineWorkers, shortageStages, multiSkilledCount, terminology, messages.length]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Copy message text
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt || isLoading) return;

    setInputPrompt('');
    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build real factory context
      const context = {
        line: { id: line.id, name: line.name, code: line.code, supervisor: line.supervisor },
        model: { id: model.id, name: model.name, code: model.code },
        stages: stages.map(s => ({ id: s.id, name: s.name, target: s.targetWorkersCount })),
        shortages: shortageStages.map(s => ({
          stageId: s.stage.id,
          stageName: s.stage.name,
          gap: s.gap,
          qualified: s.qualifiedCount,
          target: s.target
        })),
        lineWorkersCount: lineWorkers.length,
        multiSkilledCount,
        leadership,
        terminology,
        topShortage: shortageStages[0] ? shortageStages[0].stage.name : 'لا يوجد عجز',
        lineWorkers: lineWorkers.map(w => ({
          name: w.name,
          empCode: w.empCode,
          shift: w.shift,
          skills: w.skills
        })),
        allWorkers: allWorkers.slice(0, 80).map(w => ({
          name: w.name,
          empCode: w.empCode,
          lineId: w.lineId,
          shift: w.shift,
          skills: w.skills
        }))
      };

      const historyForApi = [...messages, userMsg].map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const result = await sendChatMessageUnified({
        messages: historyForApi,
        context,
        model: 'gemini-3.8-flash'
      });

      const assistantMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.text,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: result.modelUsed
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Drawer AI chat error:', err);
      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ تم تشغيل المحرك الصناعي البديل: بناءً على مصفوفة ${line.name}، يرجى تعويض العجز في (${shortageStages.map(s => s.stage.name).join('، ') || 'المراحل'}) بنقل العمال المؤهلين من الورديات ذات الفائض.`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'المحرك الصناعي الذكي'
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    { label: '⚡ حل عجز الخط فوراً', query: `ما هو الحل الفوري الإسعافي لسد العجز في ${shortageStages.map(s => s.stage.name).join(' و ') || 'المراحل الحرجة'}؟ اذكر أسماء عمال محددين لنقلهم.` },
    { label: '👥 بدلاء لتعويض الغياب', query: 'اقترح خطة طوارئ في حال غياب مفاجئ لـ 3 عمال في الوردية A مع ترشيح البدلاء متعددي المهارات بالاسم.' },
    { label: '📈 خطة تدريب OJT', query: 'كيف نرفع كفاءة عمال المستوى 2 ليصبحوا مستوى 3 في محطات الاختناق خلال 7 أيام؟' },
    { label: '⚖️ موازنة التاكت تايم', query: 'حلل توزيع العمال الحالي وموازنة خط الإنتاج لمنع أي تكدس أو اختناق تشغيلي.' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden no-print" dir="rtl">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Slide-Over Panel Container */}
      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <aside className="w-screen max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col border-r border-slate-200 animate-in slide-in-from-left duration-250 ease-out">
          
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-white">
                    مستشار الذكاء الاصطناعي (AI Copilot)
                  </h3>
                  <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">
                    Gemini 3.8 Flash
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5 truncate">
                  {line.name} · {model.name}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="إغلاق اللوحة الجانبية"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Line Stats Summary Strip */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0 overflow-x-auto">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>عمال الخط:</span>
              <strong className="font-mono text-slate-900">{lineWorkers.length}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>المراحل:</span>
              <strong className="font-mono text-slate-900">{stages.length}</strong>
            </span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className={`font-semibold flex items-center gap-1 ${shortageStages.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {shortageStages.length > 0 ? `عجز: ${shortageStages.length} محطات` : 'مكتمل بالكامل ✓'}
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in duration-150`}
                >
                  {/* Avatar */}
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-white'
                  }`}>
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs relative group ${
                    isUser 
                      ? 'bg-indigo-600 text-white rounded-tr-xs' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-xs'
                  }`}>
                    {/* Header for AI response */}
                    {!isUser && msg.modelUsed && (
                      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-100 text-[10px] text-slate-400">
                        <span className="font-mono">{msg.modelUsed}</span>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="hover:text-slate-700 p-0.5 rounded cursor-pointer"
                          title="نسخ الرد"
                        >
                          {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    )}

                    {/* Content */}
                    <div className="whitespace-pre-wrap font-sans text-xs select-text">
                      {msg.content}
                    </div>

                    {/* Timestamp */}
                    <div className={`text-[9px] mt-1 text-right ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 w-fit animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                <span>المستشار الذكي يحلل بيانات المصفوفة ويبتكر الحلول...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Diagnostic Shortcuts */}
          <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
            <div className="text-[10px] font-bold text-slate-400 mb-1.5 flex items-center justify-between">
              <span>تشخيصات سريعة بنقرة واحدة:</span>
              {onNavigateToMatrix && (
                <button
                  type="button"
                  onClick={() => {
                    onNavigateToMatrix();
                    onClose();
                  }}
                  className="text-indigo-600 hover:underline flex items-center gap-0.5 text-[10px]"
                >
                  <span>عرض المصفوفة</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleSendMessage(qp.query)}
                  className="p-1.5 text-right bg-slate-50 hover:bg-indigo-50 hover:text-indigo-900 border border-slate-200 hover:border-indigo-200 rounded-lg text-[11px] font-medium text-slate-700 transition-colors cursor-pointer disabled:opacity-50 truncate"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="اكتب سؤالك أو اطلب حلاً صناعياً..."
                disabled={isLoading}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600 transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isLoading}
                className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0 shadow-xs"
                title="إرسال"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

        </aside>
      </div>
    </div>
  );
};
