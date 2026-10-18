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
    console.error('Gemini API Error:', error);
    return res.status(200).json({
      fallback: true,
      error: error.message || 'Gemini error',
    });
  }
});

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
