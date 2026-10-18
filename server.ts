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

    const systemInstruction = `أنت "مستشار الذكاء الاصطناعي الصناعي" (Industrial AI Matrix Advisor) وخبير هندسة الإنتاج وإدارة العمليات الصناعية وموازنة الخطوط وتقليل الفاقد (Lean Manufacturing & Six Sigma).
دورك مساعدة مدير المصنع، مهندس الإنتاج، والمشرفين في اتخاذ قرارات حاسمة وعملية مبنية على بيانات مصفوفة المهارات (Skills Matrix) الحقيقية المسجلة.
القواعد الإلزامية:
1. اذكر دائماً أسماء العمال الحقيقيين وأرقامهم الوظيفية ومستوياتهم الواردة في البيانات المرفقة.
2. إذا كان هناك عجز في مرحلة معينة، حدد العمال الموجودين في المستوى 2 (يعمل تحت إشراف) لأنهم الأسرع ترقية للمستوى 3 خلال 24-48 ساعة عبر التدريب على رأس العمل (OJT).
3. اقترح مناورات واضحة لإعادة موازنة الورديات وتدوير العمال (Job Rotation) دون إحداث عجز في محطات أخرى.
4. اجعل الإجابة منظمة في نقاط وتوصيات واضحة ومباشرة باللغة العربية مع خطوات تنفيذية محددة.`;

    const fullPrompt = `سياق بيانات المصنع وخط الإنتاج المسجلة حالياً:
${JSON.stringify(context, null, 2)}

سؤال أو طلب المستخدم:
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
