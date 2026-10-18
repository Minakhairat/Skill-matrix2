import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize Google GenAI client with telemetry header as required by AI Studio guidelines
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// AI Advisor Endpoint grounded in live matrix data
app.post('/api/ai-advisor', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'No GEMINI_API_KEY configured on server. Switching to embedded industrial algorithmic engine.',
      });
    }

    const systemInstruction = `أنت "مستشار وخبير الذكاء الاصطناعي الصناعي وهندسة العمليات" (Industrial AI Problem Solver & Operations Advisor) وخبير Lean Manufacturing و Six Sigma وحل المشكلات بمنهجيات (8D, 5-Whys, Ishikawa, Heijunka, Poka-Yoke).
دورك تشخيص المشكلات الصناعية وتقديم حلول تنفيذية مباشرة مبنية على بيانات مصفوفة المهارات (Skills Matrix) الحقيقية المسجلة في المصنع.
القواعد الإلزامية:
1. اذكر دائماً أسماء العمال الحقيقيين وأرقامهم الوظيفية ومستوياتهم الواردة في بيانات المصنع المرفقة لتعويض أي عجز أو غياب فوراً.
2. عند تشخيص أي مشكلة (عجز، غياب، معيب، عطل، اختناق)، قدم هيكلاً واضحاً:
   - السبب الجذري والتحليل الفني (Root Cause Analysis).
   - الحلول الإسعافية العاجلة (خلال 1-4 ساعات) مع أسماء العمال المحددين لنقلهم دون تعطيل محطاتهم.
   - الخطة التكتيكية متوسطة المدى (1-7 أيام) تشمل التدريب على رأس العمل OJT للعمال في المستوى 2.
   - إجراءات الوقاية ومنع التكرار (Poka-Yoke و Standard Work).
3. خاطب فريق القيادة المذكور في البيانات (المهندس المسؤول، مدير الإدارة، ومشرف الخط) بمسؤوليات محددة.
4. اجعل الإجابة منظمة في نقاط ورؤوس موضوعات باللغة العربية مع خطوات تنفيذية حاسمة.`;

    const fullPrompt = `سياق بيانات المصنع وخط الإنتاج المسجلة حالياً:
${JSON.stringify(context, null, 2)}

سؤال أو مشكلة المستخدم للتشخيص والحل:
${prompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: fullPrompt,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    return res.json({
      text: response.text,
      modelUsed: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini Advisor Error:', error);
    return res.status(200).json({
      fallback: true,
      error: error.message || 'Gemini error',
    });
  }
});

// Multi-turn Gemini AI Chatbot endpoint grounded in plant matrix data
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { messages, context, model = 'gemini-3.8-flash' } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const validModel = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-4-argon'].includes(model)
      ? model
      : 'gemini-3.8-flash';

    if (!ai) {
      const lastMessage = messages[messages.length - 1]?.content || '';
      const fallbackReply = generateFallbackChatResponse(lastMessage, context);
      return res.json({
        text: fallbackReply.text,
        suggestedFollowUps: fallbackReply.suggestedFollowUps,
        modelUsed: 'industrial-ai-engine',
        fallback: true
      });
    }

    const systemInstruction = `أنت "المستشار والخبير الذكي لمصفوفة المهارات وهندسة العمليات وحل المشكلات الصناعية" (MatrixPro Industrial AI Operations Expert).
دورك التحاور مع مهندسي الإنتاج ومشرفي الخطوط ومسؤولي الجودة والتخطيط لحل أي مشكلات تشغيلية وتطوير أداء العمال وتغطية المحطات، بناءً على بيانات مصفوفة المهارات الحقيقية بالمصنع.

سياق بيانات المصنع والخط الحالي:
${JSON.stringify(context || {}, null, 2)}

قواعد الحوار وحل المشكلات الإلزامية:
1. التحدث باللغة العربية بأسلوب هندسي عملي، واضح، واثق ومباشر.
2. استخدام أسماء العمال الحقيقيين وأرقامهم الوظيفية ومستوياتهم (من 0 إلى 4) الواردة في البيانات المرفقة عند ترشيح أي بدائل أو خطط تدريب أو توزيع ورديات.
3. التفكير بمنهجيات التصنيع الرشيق (Lean Manufacturing, Six Sigma, 5-Whys, 8D, Ishikawa, OJT, Poka-Yoke, SMED, Line Balancing).
4. عند مواجهة مشكلة (عجز، غياب، اختناق، تراجع كفاءة):
   - حدد التشخيص والسبب الجذري
   - قدم الحل الفوري الإسعافي خلال الوردية (مع أسماء العمال المقترح نقلهم)
   - قدم خطة تدريبية وتكتيكية لرفع عمال المستوى 2 إلى المستوى 3
   - إجراءات وقائية لمنع تكرار المشكلة
5. حافظ على سياق الحوار المستمر، وتفاعل بدقة مع استفسارات المستخدم المتتابعة.
6. اختم دائماً باقتراح 2-3 خطوات تالية محددة أو أسئلة متابعة ذكية لتسهيل استمرار الحوار.`;

    // Map messages to GenAI contents structure
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }]
    }));

    const response = await ai.models.generateContent({
      model: validModel,
      contents,
      config: {
        systemInstruction,
        temperature: 0.35,
      },
    });

    const replyText = response.text || 'تم فحص البيانات بنجاح.';
    const suggestedFollowUps = extractSuggestedFollowUps(replyText, context);

    return res.json({
      text: replyText,
      modelUsed: validModel,
      suggestedFollowUps,
      fallback: false
    });
  } catch (error: any) {
    console.error('Gemini Chat API Error:', error);
    const lastMessage = req.body?.messages?.[req.body?.messages?.length - 1]?.content || '';
    const fallbackReply = generateFallbackChatResponse(lastMessage, req.body?.context);
    return res.json({
      text: fallbackReply.text,
      suggestedFollowUps: fallbackReply.suggestedFollowUps,
      modelUsed: 'industrial-ai-engine',
      fallback: true,
      error: error.message
    });
  }
});

// Helper for fallback chat responses when API key is not present or offline
function generateFallbackChatResponse(userMsg: string, context: any): { text: string; suggestedFollowUps: string[] } {
  const line = context?.line || {};
  const model = context?.model || {};
  const leadership = context?.leadership || { engineerName: 'م. مينا خيرت', managerName: 'مدير العمليات' };
  const shortages = context?.shortages || [];
  const lineWorkers = context?.lineWorkers || [];
  const allWorkers = context?.allWorkers || [];
  const term = context?.terminology || { lineLabel: 'خط إنتاج', stageLabel: 'مرحلة' };

  const msgLower = (userMsg || '').toLowerCase();

  // 1. Bottleneck or Shortage Query
  if (msgLower.includes('اختناق') || msgLower.includes('تكدس') || msgLower.includes('عجز') || msgLower.includes('نقص')) {
    const topShortage = shortages[0];
    const eligibleWorkers = allWorkers.filter((w: any) => {
      const skill = w.skills?.[topShortage?.stageId];
      return skill && skill.level >= 3;
    }).slice(0, 3);

    const workerListStr = eligibleWorkers.length > 0
      ? eligibleWorkers.map((w: any, idx: number) => `   ${idx + 1}. **${w.name}** (كود: \`${w.code}\` | وردية: ${w.shift} | كفاءة: ${w.performanceRate || 95}%)`).join('\n')
      : '   - ترشيح العمال المساعدين (Floaters) من الوردية الصباحية لإسناد المحطة فوراً.';

    return {
      text: `### 🏭 تحليل المشكلة وخطة فك الاختناق والعجز
بناءً على فحص بيانات **${term.lineLabel} (${line.name || 'الحالي'})** والموديل **(${model.name || 'الحالي'})**:

1. **المحطة الأكثر حرجاً حالياً:**
   - **${topShortage?.stageName || 'المحطة الحرجة الأولى'}**: العجز الحالي **${topShortage?.gap || 1} عمال** (المتوفر ${topShortage?.availableWorkers || 0} من أصل مستهدف ${topShortage?.targetWorkers || 2}).

2. **الحل الفوري الإسعافي (خلال الوردية الحالية):**
   - نقل فوري مؤقت لعمال مؤهلين بدرجة مهارة (مستوى 3 فأعلى) لتغطية المحطة دون إيقاف باقي الخطوات:
${workerListStr}

3. **الإجراء التكتيكي الميداني:**
   - تكليف مشرف الوردية بمتابعة زمن الدورة (Cycle Time) كل 45 دقيقة.
   - مراجعة استهلاك المواد والقطع تحت التشغيل (WIP) أمام المحطة لضمان سلاسة التدفق (Takt Time).

4. **توجيه القيادة:**
   - إشعار **${leadership.engineerName}** لمطابقة مواصفة العمل القياسي (Standard Work).`,
      suggestedFollowUps: [
        `كيف ندرب عمال المستوى 2 لتغطية محطة ${topShortage?.stageName || 'الحرجة'} مستقبلاً؟`,
        'ما هي أنسب خطة لموازنة خط الإنتاج بين الورديات الثلاث؟',
        'ما هو التأثير المتوقع على كفاءة الوردية في حال نقل هؤلاء العمال؟'
      ]
    };
  }

  // 2. Absenteeism Query
  if (msgLower.includes('غياب') || msgLower.includes('بديل') || msgLower.includes('تعويض')) {
    const availableSubs = allWorkers.filter((w: any) => (w.flexibilityScore || 0) >= 3).slice(0, 3);
    const subsStr = availableSubs.map((w: any, idx: number) => `   ${idx + 1}. **${w.name}** (\`${w.code}\` | يغطي ${w.flexibilityScore} مراحل مختلفة)`).join('\n');

    return {
      text: `### 📋 خطة الطوارئ لتعويض الغياب المفاجئ
استناداً إلى قاعدة بيانات العاملين وقوائم المرونة في **${term.lineLabel}**:

1. **العمال متعددو المهارات (Multi-Skilled) الجاهزون للتحريك الفوري:**
${subsStr}

2. **قواعد النقل الميداني الذكي:**
   - النقل يتم من المحطات التي حققت فائضاً أو مراحل التجهيز المسبق لتجنب توقف عنق الزجاجة (Bottleneck).
   - تفعيل نظام "المشرف المساعد" خلال الساعة الأولى لمتابعة الجودة وعدم تسريب أي معيب.

3. **التوثيق:**
   - تسجيل أمر النقل في سجل حركة العمالة اليومي لاعتماده من **${leadership.engineerName}**.`,
      suggestedFollowUps: [
        'اقترح توزيعاً للورديات البديلة إذا استمر الغياب يومين',
        'كيف نرفع نسبة مرونة باقي العمال لتفادي أزمات الغياب؟',
        'هل يوجد عمال بمستوى تدريب 2 يمكن إشراكهم تحت إشراف؟'
      ]
    };
  }

  // 3. Training & Flexibility Query
  if (msgLower.includes('تدريب') || msgLower.includes('مرونة') || msgLower.includes('مستوى') || msgLower.includes('ترقية')) {
    return {
      text: `### 📈 خطة رفع مرونة العمال والتدريب على رأس العمل (OJT)
لتحقيق المستهدف الاستراتيجي للمصنع (**3 مراحل مؤهلة لكل عامل**):

1. **الترقية من المستوى 2 (تحت التدريب) إلى المستوى 3 (مستقل):**
   - حصر العمال في المستوى 2 ومرافقتهم مع عمال المستوى 4 (الخبراء/المدربين) لمدة **4 إلى 6 أيام عمل**.
   - قياس زمن التشغيل وجودة أول 50 قطعة يومياً.

2. **مصفوفة المهارات المستهدفة:**
   - جدول التدريب الأسبوعي يركز على المحطات ذات العجز في **${line.name || 'الخط'}**.
   - ترقية العامل رسمياً في النظام فور اجتياز اختبار الجودة الذاتي (Quality at Source).

3. **إشراف ومتابعة:**
   - متابعة الخطة تحت إشراف **${leadership.engineerName}** واعتماد **${leadership.managerName}**.`,
      suggestedFollowUps: [
        'أظهر قائمة العمال الأكثر احتياجاً للتدريب على هذا الخط',
        'كيف نربط تقييم الأداء والحوافز بمستوى المرونة المكتسب؟',
        'ما هي مراحل الاختناق التي تتطلب تدريب عاجل هذا الأسبوع؟'
      ]
    };
  }

  // 4. General Greeting or Overview
  const totalStages = context?.stages?.length || 0;
  const totalShortages = shortages.length;

  return {
    text: `أهلاً بك! أنا **المستشار الذكي لمصفوفة المهارات والعمليات الصناعية (MatrixPro AI)**. 🤖⚡

أنا متصل حالياً ببيانات المصنع لـ **${term.lineLabel} (${line.name || 'الحالي'})** وموديل **(${model.name || 'الحالي'})**:
- عدد محطات ومراحل العمل: **${totalStages} ${term.stageLabelPlural || 'مراحل'}**
- المحطات التي تعاني من فجوة أو عجز عمالة: **${totalShortages} محطات**
- إجمالي العمال المرصودين: **${lineWorkers.length} عامل** على هذا الخط (من أصل ${allWorkers.length} بالمصنع)
- المسؤول الهندسي: **${leadership.engineerName}** | الإدارة: **${leadership.managerName}**

💡 **كيف يمكنني مساعدتك الآن؟**
يمكنك أن تسألني عن:
1. فك اختناق محدد وترشيح عمال بالاسم والرقم الوظيفي لسد العجز.
2. خطة إسعافية لتعويض غياب مفاجئ في وردية معينة.
3. خطة تدريب وتدوير لرفع مرونة العمال (Flexibility Target = 3).
4. تحسين زمن تغيير الموديل أو حل مشاكل الجودة والمعيب.`,
    suggestedFollowUps: [
      'ما هي أكبر نقطة اختناق في الخط الحالي وكيف نحلها فوراً؟',
      'من هم أفضل 3 عمال بدلاء متاحين لنقلهم في حال حدوث غياب؟',
      'كيف نقسم العمال بين الوردية الصباحية والمسائية لتحقيق أعلى توازن؟'
    ]
  };
}

// Extract follow-ups helper
function extractSuggestedFollowUps(text: string, context: any): string[] {
  const lineName = context?.line?.name || 'الخط';
  return [
    `ما هو التدريب الأنسب للعمال لسد عجز ${lineName} نهائياً؟`,
    'اقترح خطة توزيع بديلة في حال غياب 2 من العمال الأساسيين',
    'كيف نحافظ على استقرار الجودة مع تدوير العمال؟'
  ];
}


// Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
