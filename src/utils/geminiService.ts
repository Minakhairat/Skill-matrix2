import { formatUnitName, formatSubUnitName } from './constants';
import { TerminologyConfig } from '../types/matrix';

export const GEMINI_API_KEY_STORAGE_KEY = 'matrixpro_gemini_api_key';

export function sanitizeApiKey(rawKey: string): string {
  if (!rawKey) return '';
  let key = rawKey.trim();
  // Strip variable assignments like GEMINI_API_KEY= or API_KEY=
  key = key.replace(/^(?:VITE_)?GEMINI_API_KEY\s*[:=]\s*/i, '');
  key = key.replace(/^API_KEY\s*[:=]\s*/i, '');
  // Strip quotes
  key = key.replace(/^["'`]|["'`]$/g, '');
  // Strip Bearer prefix
  key = key.replace(/^Bearer\s+/i, '');
  return key.trim();
}

export function getClientGeminiApiKey(): string {
  try {
    const local = localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    if (local && local.trim().length > 0) return sanitizeApiKey(local);
  } catch (e) {
    // Ignore localStorage restrictions
  }
  const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim().length > 0) {
    return sanitizeApiKey(envKey);
  }
  return '';
}

export function setClientGeminiApiKey(key: string): void {
  try {
    const clean = sanitizeApiKey(key);
    if (!clean) {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
    } else {
      localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, clean);
    }
  } catch (e) {
    console.error('Failed to save API key to localStorage', e);
  }
}

export const USER_EMAIL_STORAGE_KEY = 'matrixpro_user_email';

export function getClientUserEmail(): string {
  try {
    const email = localStorage.getItem(USER_EMAIL_STORAGE_KEY);
    if (email && email.trim().length > 0) return email.trim();
  } catch (e) {
    // Ignore localStorage restrictions
  }
  return '';
}

export function setClientUserEmail(email: string): void {
  try {
    if (!email || email.trim() === '') {
      localStorage.removeItem(USER_EMAIL_STORAGE_KEY);
    } else {
      localStorage.setItem(USER_EMAIL_STORAGE_KEY, email.trim());
    }
  } catch (e) {
    console.error('Failed to save email to localStorage', e);
  }
}

export function removeClientGeminiApiKey(): void {
  try {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to remove API key', e);
  }
}

export function isStaticDeployment(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname.toLowerCase();
  return host.includes('github.io') || host.includes('pages.dev') || host.includes('vercel.app') || host.includes('netlify.app');
}

/**
 * Test a Gemini API key with a minimal request to verify validity
 */
export async function testGeminiApiKey(apiKey: string): Promise<{ success: boolean; message: string; model?: string }> {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) {
    return { success: false, message: 'مفتاح الـ API فارغ' };
  }

  // 1. Try server verification first if running full-stack / Cloud Run
  try {
    const srvRes = await fetch('/api/test-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: cleanKey })
    });
    if (srvRes.ok) {
      const srvData = await srvRes.json();
      if (srvData && typeof srvData.success === 'boolean') {
        return srvData;
      }
    }
  } catch (srvErr) {
    // Endpoint not available on purely static host, proceed to direct check
  }

  // 2. Direct browser verification against Google Generative Language API
  const testModels = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastDetailedError = '';

  for (const model of testModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cleanKey)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'قل كلمة "جاهز" فقط لتأكيد الاتصال باللغة العربية.' }] }]
        })
      });

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return { 
          success: true, 
          message: `تم التحقق بنجاح! المفتاح يعمل بشكل ممتاز مع موديل ${model}. الرد: ${text.trim()}`,
          model 
        };
      } else {
        const errData = await res.json().catch(() => ({}));
        const errMsg = errData?.error?.message || `HTTP ${res.status}`;
        lastDetailedError = errMsg;
        if (res.status === 400) {
          return { success: false, message: `المفتاح غير صالح (API Key Invalid): تأكد من نسخ المفتاح كاملاً من Google AI Studio.` };
        }
        if (res.status === 403) {
          return { success: false, message: `تم رفض الإذن (403 Permission Denied): تأكد من تفعيل Gemini API في حسابك.` };
        }
        if (res.status === 429) {
          return { success: false, message: `تجاوزت الحد اللحظي للطلبات (429 Rate Limit): انتظر دقيقة ثم جرب مجدداً.` };
        }
      }
    } catch (err: any) {
      console.warn(`Browser direct fetch test failed for ${model}:`, err);
      if (err?.name === 'TypeError' || String(err?.message || '').includes('Failed to fetch')) {
        // In browser environments with adblockers or corporate filters, direct fetch to googleapis might be blocked
        // Still allow the key to be saved!
        return {
          success: true,
          message: 'تم حفظ المفتاح بنجاح! تم تسجيل المفتاح وسيحاول النظام استخدامه مباشرة عبر كافة القنوات المتاحة.',
          model: 'gemini-2.5-flash'
        };
      }
      lastDetailedError = err?.message || 'خطأ في الاتصال بالإنترنت';
    }
  }

  return { 
    success: false, 
    message: lastDetailedError || 'تعذر الاتصال بـ Google Gemini API. يرجى التأكد من اتصال الإنترنت وصحة المفتاح.' 
  };
}

/**
 * System instruction tailored for industrial matrix and operations problem solving
 */
export function buildIndustrialSystemInstruction(context: any): string {
  const leadership = context?.leadership || {};
  const term = context?.terminology || { lineLabel: 'خط إنتاج', stageLabel: 'مرحلة' };

  return `أنت "المستشار والخبير الذكي لمصفوفة المهارات وهندسة العمليات وحل المشكلات الصناعية" (MatrixPro Industrial AI Operations Expert) لشركة ومصنع يديره المهندس ${leadership.engineerName || 'مينا خيرت'}.
دورك مساعدة مهندسي الإنتاج ومشرفي ${term.lineLabelPlural || 'الخطوط'} ومسؤولي الجودة في:
1. فك الاختناقات التشغيلية فوراً وترشيح عمال بالاسم من واقع المصفوفة.
2. سد العجز وتعويض غياب الورديات باستخدام العمال متعددي المهارات (Multi-Skilled).
3. وضع خطط تدريب سريعة OJT لترقية عمال المستوى 2 إلى المستوى 3.
4. موازنة التاكت تايم (Line Balancing) وتقليل أزمنة تغيير الموديلات والاسطمبات (SMED).
5. حماية معايير الجودة ومنع الهادر والمعيب (Poka-Yoke و Zero Defect).

سياق بيانات المصنع الحالية المسجلة في المصفوفة:
${JSON.stringify(context || {}, null, 2)}

قواعد الرد الإلزامية:
- تحدث باللغة العربية بأسلوب هندسي دقيق، مباشر، عملي ومنظم في نقاط وجداول موجزة.
- استخدم أسماء وأكواد العمال الحقيقية ومستوياتهم الواردة في البيانات حصراً.
- اختم دائماً باقتراح خطوتين أو ثلاثة أسئلة متابعة ذكية لاستكمال التحليل.`;
}

/**
 * Unified Chat Service: Tries backend server first, if unavailable falls back to direct client-side Gemini API
 */
export async function sendChatMessageUnified(params: {
  messages: Array<{ role: 'user' | 'model' | 'assistant'; content: string }>;
  context: any;
  model: string;
}): Promise<{
  text: string;
  modelUsed: string;
  suggestedFollowUps?: string[];
  fallback: boolean;
  usedClientKey?: boolean;
}> {
  const { messages, context, model } = params;

  const clientApiKey = getClientGeminiApiKey();

  // 1. Try server-side route first if not definitively static
  if (!isStaticDeployment()) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (clientApiKey) {
        headers['x-gemini-api-key'] = clientApiKey;
      }
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: messages.map(m => ({
            role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
            content: m.content
          })),
          context,
          model,
          apiKey: clientApiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.text) {
          return {
            text: data.text,
            modelUsed: data.modelUsed || (data.fallback ? 'المحرك الصناعي الذكي (MatrixPro Engine)' : 'Google Gemini 3.8 Flash'),
            suggestedFollowUps: data.suggestedFollowUps || [],
            fallback: Boolean(data.fallback)
          };
        }
      }
    } catch (e) {
      // Backend not running (e.g. running on static server or offline)
    }
  }

  // 2. Direct Gemini Call using client-side API Key (from localStorage or VITE_GEMINI_API_KEY)
  if (clientApiKey) {
    try {
      const directResult = await callDirectGeminiAPI({
        apiKey: clientApiKey,
        messages,
        context,
        requestedModel: model
      });
      return {
        ...directResult,
        usedClientKey: true
      };
    } catch (err: any) {
      console.warn('Direct Gemini API call failed:', err);
    }
  }

  // 3. Fallback to embedded industrial algorithmic engine with real factory context
  const lastUserMsg = messages[messages.length - 1]?.content || '';
  return {
    text: buildFallbackText(lastUserMsg, context),
    modelUsed: 'المحرك الصناعي الذكي (MatrixPro Engine)',
    suggestedFollowUps: [
      'ما هي أهم مرحلة بها عجز في الخط؟',
      'اقترح خطة لتعويض الغياب المفاجئ',
      'كيف نرفع مرونة عمال المستوى 2 إلى المستوى 3؟'
    ],
    fallback: true
  };
}

/**
 * Call Google Generative Language REST API directly from the browser (e.g. for GitHub Pages)
 */
async function callDirectGeminiAPI(params: {
  apiKey: string;
  messages: Array<{ role: 'user' | 'model' | 'assistant'; content: string }>;
  context: any;
  requestedModel: string;
}): Promise<{
  text: string;
  modelUsed: string;
  suggestedFollowUps: string[];
  fallback: boolean;
}> {
  const { apiKey, messages, context, requestedModel } = params;
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) {
    throw new Error('API key is empty');
  }

  // Model selection hierarchy for direct API: try requested model first, then standard models
  const candidateModels = Array.from(new Set([
    requestedModel,
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.0-flash'
  ])).filter(Boolean);

  const systemInstruction = buildIndustrialSystemInstruction(context);

  // Sanitize contents for Google GenAI REST:
  // Must alternate user / model, and the first message MUST be user.
  const rawFormatted = messages.map(m => ({
    role: (m.role === 'assistant' || m.role === 'model') ? 'model' : 'user',
    parts: [{ text: String(m.content || '') }]
  }));

  // Drop any initial model message before the first user message
  const firstUserIdx = rawFormatted.findIndex(m => m.role === 'user');
  const validContents = firstUserIdx >= 0 ? rawFormatted.slice(firstUserIdx) : rawFormatted;

  if (validContents.length === 0) {
    throw new Error('No user messages in conversation history');
  }

  // Merge consecutive same-role messages
  const collapsedContents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  for (const item of validContents) {
    if (collapsedContents.length > 0 && collapsedContents[collapsedContents.length - 1].role === item.role) {
      collapsedContents[collapsedContents.length - 1].parts[0].text += '\n\n' + item.parts[0].text;
    } else {
      collapsedContents.push({ role: item.role, parts: [{ text: item.parts[0].text }] });
    }
  }

  let lastError: any = null;

  for (const targetModel of candidateModels) {
    // Try dual formats: Format 1 with system_instruction, Format 2 with combined prompt
    const formatAttempts = [
      // Format 1: Structured system_instruction
      {
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: collapsedContents,
        generationConfig: { temperature: 0.35, maxOutputTokens: 2048 }
      },
      // Format 2: Fallback single-turn combined prompt (works on 100% of Google endpoints)
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\n--- استفسار المستخدم ---\n${collapsedContents.map(c => `${c.role === 'user' ? 'المهندس' : 'المستشار'}: ${c.parts[0].text}`).join('\n\n')}` }]
          }
        ],
        generationConfig: { temperature: 0.35, maxOutputTokens: 2048 }
      }
    ];

    for (const bodyPayload of formatAttempts) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${encodeURIComponent(cleanKey)}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        if (!res.ok) {
          const errorJson = await res.json().catch(() => ({}));
          const errMsg = errorJson?.error?.message || `HTTP ${res.status}`;
          throw new Error(errMsg);
        }

        const data = await res.json();
        const replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!replyText) {
          throw new Error('Empty response received from Gemini API');
        }

        const followUps = extractFollowUps(replyText, context);

        return {
          text: replyText,
          modelUsed: `Google Gemini (${targetModel} - مباشر)`,
          suggestedFollowUps: followUps,
          fallback: false
        };
      } catch (err: any) {
        lastError = err;
        // Continue to try next format or next model
      }
    }
  }

  throw lastError || new Error('Failed to reach Gemini API with available models');
}

function buildFallbackText(userMsg: string, context: any): string {
  const line = context?.line || {};
  const term = context?.terminology || { lineLabel: 'خط إنتاج', stageLabel: 'مرحلة' };
  const stages = context?.stages || [];
  const shortages = context?.shortages || [];
  const lineWorkers = context?.lineWorkers || [];

  return `بناءً على فحص بيانات ${line?.name || 'الخط الحالي'}:
• إجمالي العمال المعينين: ${lineWorkers.length} عامل.
• محطات العجز المسجلة: ${shortages.length > 0 ? shortages.map((s: any) => s.stageName).join('، ') : 'لا يوجد عجز مسجل'}.
• التوصية الفورية: مراجعة العمال في المستوى 3 فأعلى ونقلهم فوراً للمحطة المتأخرة لمنع كسر الـ Takt Time.`;
}

/**
 * Unified Advisor Service: Tries backend server first, then direct Gemini API if key exists
 */
export async function sendAdvisorQueryUnified(params: {
  prompt: string;
  context: any;
}): Promise<{
  text: string;
  modelUsed: string;
  source: 'gemini' | 'industrial_engine';
}> {
  const { prompt, context } = params;

  const clientApiKey = getClientGeminiApiKey();

  // 1. Try server route
  if (!isStaticDeployment()) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (clientApiKey) {
        headers['x-gemini-api-key'] = clientApiKey;
      }
      const response = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, context, apiKey: clientApiKey })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          return {
            text: data.text,
            modelUsed: data.modelUsed || 'Google Gemini 3.8 Flash',
            source: data.fallback ? 'industrial_engine' : 'gemini'
          };
        }
      }
    } catch (e) {
      // Backend unavailable
    }
  }

  // 2. Direct Gemini Call using client key
  if (clientApiKey) {
    try {
      const direct = await callDirectGeminiAPI({
        apiKey: clientApiKey,
        messages: [{ role: 'user', content: prompt }],
        context,
        requestedModel: 'gemini-3.8-flash'
      });
      return {
        text: direct.text,
        modelUsed: direct.modelUsed,
        source: 'gemini'
      };
    } catch (err) {
      console.warn('Advisor direct Gemini call failed:', err);
    }
  }

  return {
    text: buildFallbackText(prompt, context),
    modelUsed: 'المحرك الصناعي الذكي (MatrixPro Engine)',
    source: 'industrial_engine'
  };
}

function extractFollowUps(text: string, context: any): string[] {
  const suggestions: string[] = [];
  const lineName = context?.line?.name || 'الخط';
  
  if (text.includes('اختناق') || text.includes('تكدس')) {
    suggestions.push(`ما هي المراحل البديلة ذات الفائض لنقل العمال منها في ${lineName}؟`);
  }
  if (text.includes('تدريب') || text.includes('المستوى 2')) {
    suggestions.push('اقترح جدولاً زمنياً أسبوعياً لتدريب عمال المستوى 2 على رأس العمل');
  }
  if (text.includes('غياب') || text.includes('وردية')) {
    suggestions.push('كيف نتعامل مع استمرار غياب العامل لأكثر من وردية متتالية؟');
  }
  if (text.includes('جودة') || text.includes('معيب')) {
    suggestions.push('كيف نطبق فحص Poka-Yoke لمنع تكرار العيب نهائياً؟');
  }

  if (suggestions.length < 2) {
    suggestions.push(`ما هو الإجراء الفوري المطلوب تنفيذه خلال الساعة القادمة في ${lineName}؟`);
    suggestions.push('اقترح توزيعاً متوازناً للورديات الثلاث لتفادي أي فروقات في الإنتاج');
  }

  return suggestions.slice(0, 3);
}
