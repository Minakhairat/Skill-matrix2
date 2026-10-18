import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  RotateCcw, 
  Copy, 
  Check, 
  Zap, 
  Flame, 
  Users, 
  Clock, 
  ArrowDown, 
  MessageSquare, 
  ChevronRight, 
  Download,
  Mic,
  MicOff,
  Cpu,
  Layers,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Key,
  Settings
} from 'lucide-react';
import { ProductionLine, Model, Stage, Worker, PlantLeadership, TerminologyConfig, ChatMessage, GeminiChatModel } from '../types/matrix';
import { calculateStageMetric } from '../utils/matrixCalculations';
import { formatUnitName, formatSubUnitName } from '../utils/constants';
import { solveIndustrialChatQuery } from '../utils/industrialAISolver';
import { sendChatMessageUnified, getClientGeminiApiKey, isStaticDeployment } from '../utils/geminiService';
import { GeminiApiKeyModal } from './GeminiApiKeyModal';

interface GeminiAIChatViewProps {
  line: ProductionLine;
  model: Model;
  stages: Stage[];
  lineWorkers: Worker[];
  allWorkers: Worker[];
  leadership: PlantLeadership;
  terminology?: TerminologyConfig;
  onNavigateToMatrix?: () => void;
  isFloating?: boolean;
  onCloseFloating?: () => void;
}

export const GeminiAIChatView: React.FC<GeminiAIChatViewProps> = ({
  line,
  model,
  stages,
  lineWorkers,
  allWorkers,
  leadership,
  terminology,
  onNavigateToMatrix,
  isFloating = false,
  onCloseFloating
}) => {
  const term = terminology || {
    preset: 'lines_models',
    lineLabel: 'خط إنتاج',
    lineLabelPlural: 'خطوط الإنتاج',
    modelLabel: 'موديل',
    modelLabelPlural: 'الموديلات',
    stageLabel: 'مرحلة',
    stageLabelPlural: 'المراحل'
  };

  // Model selection
  const [selectedModel, setSelectedModel] = useState<GeminiChatModel>('gemini-3.8-flash');
  
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Initial greeting grounded in current live state
    return [
      {
        id: 'init-1',
        role: 'model',
        content: `أهلاً بك يا باشمهندس! أنا **المتحدث الذكي لمصفوفة المهارات وهندسة العمليات (MatrixPro Gemini Chat)**. 🤖🏭

أنا متصل حالياً بقاعدة بيانات المصنع الحية ومطلع على حالة **${formatUnitName(line.name, term)}** والموديل **(${formatSubUnitName(model.name, term)})**.

📊 **ملخص الوضع التشغيلي اللحظي:**
- **عدد محطات العمل:** ${stages.length} ${term.stageLabelPlural}
- **العمال المعينون بالخط:** ${lineWorkers.length} عامل (من إجمالي ${allWorkers.length} عامل بالمصنع)
- **المسؤول الفني:** ${leadership.engineerName} | **مدير العمليات:** ${leadership.managerName}

اكتب لي أي مشكلة تشغيلية تواجهك في الوردية (عجز عمالة، غياب مفاجئ، اختناق، تراجع كفاءة، خطة تدريب)، وسأقترح عليك الحلول فوراً بالأسماء والأرقام الوظيفية!`,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.8-flash',
        suggestedFollowUps: [
          `ما هو الإجراء الفوري لفك أي اختناق في ${formatUnitName(line.name, term)}؟`,
          'اقترح 3 عمال بدلاء مؤهلين لتعويض أي غياب مفاجئ في وردية اليوم',
          'كيف ندرب عمال المستوى 2 للوصول إلى المستوى 3 لتحقيق مستهدف المرونة؟'
        ]
      }
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [hasClientKey, setHasClientKey] = useState<boolean>(() => Boolean(getClientGeminiApiKey()));
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate live shortages
  const stageMetrics = stages.map(s => calculateStageMetric(s, lineWorkers));
  const shortages = stageMetrics.filter(m => m.gap > 0).sort((a, b) => b.gap - a.gap);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Voice recognition (Speech to text) if supported
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('متصفحك لا يدعم التعرف الصوتي المباشر. يرجى استخدام متصفح حديث مثل Chrome أو Edge.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  // Build live factory context object
  const buildCurrentContext = () => {
    return {
      line: { id: line.id, name: line.name },
      model: { id: model.id, name: model.name },
      leadership,
      terminology: term,
      stages: stages.map(s => {
        const metric = stageMetrics.find(m => m.stage.id === s.id);
        return {
          id: s.id,
          name: s.name,
          targetWorkers: s.targetWorkersCount,
          availableWorkers: metric?.qualifiedCount || 0,
          gap: metric?.gap || 0
        };
      }),
      shortages: shortages.map(s => ({
        stageId: s.stage.id,
        stageName: s.stage.name,
        gap: s.gap,
        targetWorkers: s.target,
        availableWorkers: s.qualifiedCount
      })),
      lineWorkers: lineWorkers.slice(0, 30).map(w => ({
        name: w.name,
        code: w.empCode,
        shift: w.shift,
        flexibilityScore: Object.values(w.skills || {}).filter(l => l >= 3).length,
        skillsCount: Object.keys(w.skills || {}).length
      })),
      allWorkers: allWorkers.slice(0, 50).map(w => ({
        name: w.name,
        code: w.empCode,
        shift: w.shift,
        skills: w.skills,
        flexibilityScore: Object.values(w.skills || {}).filter(l => l >= 3).length
      }))
    };
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputPrompt).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const result = await sendChatMessageUnified({
        messages: newHistory.map(m => ({
          role: m.role,
          content: m.content
        })),
        context: buildCurrentContext(),
        model: selectedModel
      });

      const aiMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: result.text,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: result.modelUsed || selectedModel,
        suggestedFollowUps: result.suggestedFollowUps || []
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      // Execute client-side Industrial AI Engine (when running without key or offline)
      const solved = solveIndustrialChatQuery({
        userMessage: text,
        history: newHistory.map(m => ({ role: m.role, content: m.content })),
        line,
        model,
        stages,
        lineWorkers,
        allWorkers,
        leadership,
        terminology: term
      });

      const aiMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: solved.text,
        timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
        modelUsed: solved.modelUsed,
        suggestedFollowUps: solved.suggestedFollowUps
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  // Quick prompt presets
  const quickPrompts = [
    {
      title: '🚨 فك اختناق عاجل',
      query: `لدينا اختناق وتكدس قطع في مراحل ${formatUnitName(line.name, term)}. من هم العمال المتاحون المؤهلون (مستوى 3 فأعلى) لنقلهم فوراً دون تعطيل محطاتهم؟`
    },
    {
      title: '🚑 تعويض غياب وردية',
      query: 'حدث غياب مفاجئ لـ 2 من العمال في الوردية الحالية. اقترح خطة تعويض عاجلة وتحديد البدائل متعددة المهارات.'
    },
    {
      title: '📈 ترقية عمال المستوى 2',
      query: 'من هم العمال في المستوى 2 الذين يمكن إدخالهم في برنامج تدريب OJT هذا الأسبوع لترقيتهم إلى المستوى 3 وسد فجوات الخط؟'
    },
    {
      title: '⚖️ موازنة الـ Takt Time',
      query: 'حلل توازن محطات الخط ومستهدفات العمال، واقترح طريقة للوصول إلى أعلى نسبة جاهزية وإنتاجية متزنة.'
    }
  ];

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (window.confirm('هل تريد مسح سجل المحادثة والبدء من جديد؟')) {
      setMessages([
        {
          id: `init-${Date.now()}`,
          role: 'model',
          content: `تم إعادة تهيئة جلسة المحادثة. أنا جاهز لمساعدتك في أي استفسار أو مشكلة تخص **${formatUnitName(line.name, term)}** والموديل **(${formatSubUnitName(model.name, term)})**.`,
          timestamp: new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }),
          modelUsed: selectedModel,
          suggestedFollowUps: [
            `ما هي أهم مرحلة بها عجز في ${formatUnitName(line.name, term)}؟`,
            'اقترح توزيعاً متوازناً للعمال على المحطات'
          ]
        }
      ]);
    }
  };

  const handleExportChat = () => {
    const textContent = messages.map(m => {
      const sender = m.role === 'user' ? 'المهندس / المستخدم' : `المتحدث الذكي (${m.modelUsed || 'Gemini'})`;
      return `[${m.timestamp}] ${sender}:\n${m.content}\n----------------------------------------\n`;
    }).join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `matrixpro_ai_chat_${line.id}_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to render message content with bold, headings, lists, codes
  const renderMessageText = (content: string) => {
    return (
      <div className="space-y-2 text-sm leading-relaxed select-text">
        {content.split('\n').map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            return <div key={idx} className="h-1" />;
          }

          // Headers
          if (trimmed.startsWith('### ')) {
            return (
              <h4 key={idx} className="font-bold text-slate-900 text-base mt-2 mb-1 flex items-center gap-1.5 border-b border-slate-100 pb-1">
                <Sparkles className="w-4 h-4 text-indigo-600 inline" />
                {trimmed.replace('### ', '')}
              </h4>
            );
          }
          if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
            return (
              <h3 key={idx} className="font-bold text-slate-900 text-lg mt-3 mb-1.5 flex items-center gap-2">
                <Bot className="w-5 h-5 text-indigo-600 inline" />
                {trimmed.replace(/^#+ /, '')}
              </h3>
            );
          }

          // Bullet points
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletText = trimmed.replace(/^[-*] /, '');
            return (
              <div key={idx} className="flex items-start gap-2 pr-2 my-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0" />
                <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(bulletText) }} />
              </div>
            );
          }

          // Numbered lists
          if (/^\d+\.\s/.test(trimmed)) {
            const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
            if (numMatch) {
              return (
                <div key={idx} className="flex items-start gap-2 pr-1 my-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {numMatch[1]}
                  </span>
                  <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(numMatch[2]) }} />
                </div>
              );
            }
          }

          // Standard paragraph
          return (
            <p key={idx} dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }} />
          );
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (text: string) => {
    // Bold **text**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>');
    // Inline code `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded text-xs font-mono border border-indigo-150 font-bold">$1</code>');
    return formatted;
  };

  return (
    <div className={`flex flex-col bg-slate-50 border border-slate-200 shadow-xl overflow-hidden ${isFloating ? 'h-[620px] max-h-[85vh] rounded-2xl w-full max-w-lg' : 'min-h-[750px] rounded-2xl'}`}>
      {/* Top Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/50">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <span className="absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-white text-base sm:text-lg">متحدث الذكاء الاصطناعي (Gemini AI Chat)</h2>
              <span className="bg-indigo-500/20 text-indigo-300 text-[11px] font-semibold px-2 py-0.5 rounded-full border border-indigo-400/30">
                Multi-Turn Live
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-2">
              <span>{formatUnitName(line.name, term)}</span>
              <span>•</span>
              <span className="text-indigo-300">{formatSubUnitName(model.name, term)}</span>
              <span>•</span>
              <span className="text-emerald-400">{lineWorkers.length} عامل بالخط</span>
              {shortages.length > 0 && (
                <>
                  <span>•</span>
                  <span className="text-amber-400 font-semibold">{shortages.length} فجوة عجز</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Right Controls: Model selector & Action buttons */}
        <div className="flex items-center gap-2 mr-auto">
          {/* Model Selector */}
          <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              onClick={() => setSelectedModel('gemini-3.8-flash')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                selectedModel === 'gemini-3.8-flash'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="النموذج المتوازن عالي الذكاء (موصى به)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>3.8 Flash</span>
            </button>
            <button
              onClick={() => setSelectedModel('gemini-3.1-flash-lite')}
              className={`px-2 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                selectedModel === 'gemini-3.1-flash-lite'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="نموذج فائق السرعة للاستجابة اللحظية"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Lite (سريع)</span>
            </button>
            <button
              onClick={() => setSelectedModel('gemini-4-argon')}
              className={`px-2 py-1 rounded-md transition-all font-medium flex items-center gap-1 ${
                selectedModel === 'gemini-4-argon'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="تفكير هندسي عميق للمشكلات المركبة"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-300" />
              <span>Argon 4</span>
            </button>
          </div>

          {/* Gemini API Key & Connection Status Button */}
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              hasClientKey
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-amber-500/20 border-amber-400/40 text-amber-300 hover:bg-amber-500/30'
            }`}
            title="إعدادات اتصال Google Gemini AI لنسخة GitHub Pages"
          >
            <Key className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{hasClientKey ? 'Gemini مفعل' : 'تفعيل Gemini'}</span>
          </button>

          <button
            onClick={handleExportChat}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700"
            title="تصدير وتنزيل نص المحادثة"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleClearChat}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-300 hover:bg-slate-700 transition border border-slate-700"
            title="بدء محادثة جديدة"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {isFloating && onCloseFloating && (
            <button
              onClick={onCloseFloating}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition border border-slate-700"
              title="إغلاق النافذة"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Banner for GitHub Pages without custom key */}
      {!hasClientKey && isStaticDeployment() && (
        <div className="bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>
              أنت على <strong>GitHub Pages</strong>. يعمل النظام حالياً بـ <strong>MatrixPro AI Engine المدمج</strong>.
            </span>
          </div>
          <button
            onClick={() => setIsApiKeyModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs mr-auto"
          >
            <Key className="w-3.5 h-3.5 text-amber-300" />
            <span>تشغيل Google Gemini الحقيقي</span>
          </button>
        </div>
      )}

      {/* Quick Prompts Bar */}
      <div className="bg-indigo-50/70 border-b border-indigo-100 px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-xs font-bold text-indigo-950 shrink-0 flex items-center gap-1">
          <Lightbulb className="w-3.5 h-3.5 text-indigo-600" />
          مشاكل جاهزة للحل:
        </span>
        {quickPrompts.map((q, idx) => (
          <button
            key={idx}
            disabled={isLoading}
            onClick={() => handleSendMessage(q.query)}
            className="text-xs bg-white text-indigo-900 hover:bg-indigo-600 hover:text-white border border-indigo-200 px-3 py-1 rounded-full whitespace-nowrap transition-all shadow-sm font-medium shrink-0 disabled:opacity-50"
          >
            {q.title}
          </button>
        ))}
      </div>

      {/* Main Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  isUser
                    ? 'bg-slate-800 text-white'
                    : 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white'
                }`}
              >
                {isUser ? <Users className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`group relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-sm border transition-all ${
                  isUser
                    ? 'bg-slate-900 text-white border-slate-800 rounded-tr-none'
                    : msg.isError
                    ? 'bg-rose-50 text-slate-900 border-rose-200 rounded-tl-none'
                    : 'bg-white text-slate-800 border-slate-200/80 rounded-tl-none'
                }`}
              >
                {/* Header row inside bubble */}
                <div className="flex items-center justify-between gap-4 mb-1.5 pb-1 border-b border-slate-100/20 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    {isUser ? (
                      <span className="text-slate-300">المهندس</span>
                    ) : (
                      <>
                        <span className="text-indigo-600 font-bold">مستشار العمليات الصناعية</span>
                        {msg.modelUsed && (
                          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-150 font-mono">
                            {msg.modelUsed}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {msg.timestamp}
                    </span>
                    {!isUser && (
                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="opacity-0 group-hover:opacity-100 hover:text-indigo-600 transition p-0.5 rounded"
                        title="نسخ محتوى الرد"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className={isUser ? 'text-sm text-slate-100 whitespace-pre-wrap' : ''}>
                  {isUser ? msg.content : renderMessageText(msg.content)}
                </div>

                {/* Suggested follow-ups if present */}
                {!isUser && msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-500" />
                      استكمال الحوار بخطوات عملية:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedFollowUps.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          disabled={isLoading}
                          onClick={() => handleSendMessage(suggestion)}
                          className="text-xs text-right bg-slate-50 hover:bg-indigo-50 text-indigo-900 border border-slate-200 hover:border-indigo-300 px-2.5 py-1 rounded-lg transition-all font-medium flex items-center gap-1 disabled:opacity-50"
                        >
                          <ChevronRight className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Bubble */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs font-semibold text-slate-600">
                جارٍ تحليل بيانات المصفوفة ومقارنة مهارات 400 عامل عبر {selectedModel}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Live Input Box */}
      <div className="bg-white border-t border-slate-200 p-3 sm:p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          {/* Voice Input Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-xl border transition shrink-0 ${
              isListening
                ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
            }`}
            title={isListening ? 'جارٍ الاستماع... انقر للإيقاف' : 'إملاء صوتي باللغة العربية'}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Text Area */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={`اطرح أي مشكلة صناعية أو استفسر عن عجز أو توزيع عمال ${formatUnitName(line.name, term)}... (اضغط Enter للإرسال)`}
              className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-3 pl-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white resize-none transition"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="p-2.5 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition shadow-md shadow-indigo-600/20 shrink-0 flex items-center justify-center"
            title="إرسال"
          >
            <Send className="w-5 h-5 rtl:rotate-180" />
          </button>
        </form>

        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>
            💡 المتحدث متصل مباشرة بمصفوفة مهارات العمال الحالية ويذكر الأسماء والأرقام الوظيفية.
          </span>
          {onNavigateToMatrix && (
            <button
              onClick={onNavigateToMatrix}
              className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
            >
              عرض جدول المصفوفة الكاملة ←
            </button>
          )}
        </div>
      </div>

      {/* Gemini API Key Modal for GitHub Pages */}
      <GeminiApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyUpdated={() => setHasClientKey(Boolean(getClientGeminiApiKey()))}
      />
    </div>
  );
};
