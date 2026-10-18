import React, { useState } from 'react';
import { 
  X, 
  Github, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  FileCode, 
  Terminal, 
  HelpCircle,
  FolderGit2
} from 'lucide-react';

interface GitHubDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubDeployModal: React.FC<GitHubDeployModalProps> = ({ isOpen, onClose }) => {
  const [copiedStep, setCopiedStep] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, stepId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepId);
    setTimeout(() => setCopiedStep(null), 2500);
  };

  const workflowCode = `name: Deploy to GitHub Pages

on:
  push:
    branches: ['main', 'master']
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Dependencies
        run: npm install --legacy-peer-deps

      - name: Build Project
        run: npm run build

      - name: Setup GitHub Pages
        uses: actions/configure-pages@v4

      - name: Upload Build Artifacts
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 text-white rounded-xl">
              <Github className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>دليل حل مشكلة النشر على GitHub Pages</span>
                <span className="text-[10px] bg-emerald-600/90 text-white px-2 py-0.5 rounded font-mono font-normal">
                  جاهز للنشر
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                حل خطأ (Dependencies lock file not found) والشاشة البيضاء عند فتح الرابط
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs sm:text-sm">
          
          {/* Explanation Banner */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 space-y-1">
              <div className="font-bold text-amber-950">سبب المشكلتين اللتين واجهتك:</div>
              <div>
                <strong>1. خطأ Lock file:</strong> يحدث لأن سيرفرات GitHub Actions تبحث عن ملف <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">package-lock.json</code> ولم يكن مرفوعاً ضمن مستودعك.
              </div>
              <div>
                <strong>2. عدم فتح الموقع (أو الشاشة البيضاء):</strong> موقع React المبني بـ Vite يحتاج إلى خطوة بناء (Build) لتوليد مجلد <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">dist</code> وضبط المسار النسبي <code className="font-mono bg-amber-100 px-1 py-0.5 rounded">base: './'</code> لكي تعمل الملفات على رابط مثل <code className="font-mono bg-amber-100 px-1 py-0.5 dir-ltr inline-block">username.github.io/repo/</code>.
              </div>
            </div>
          </div>

          {/* Step 1: Solution */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center shrink-0">1</span>
              <span>الملفات المجهزة لك تلقائياً في هذا المشروع:</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تم ضبط ملف <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">vite.config.ts</code> بالمسار النسبي <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">base: './'</code> لمنع أي خطأ 404.</span>
              </div>
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تم إنشاء ملف البناء التلقائي <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">.github/workflows/deploy.yml</code> مع أمر التثبيت المرن <code className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">npm install --legacy-peer-deps</code>.</span>
              </div>
            </div>
          </div>

          {/* Step 2: GitHub Settings Action */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
              <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center shrink-0">2</span>
              <span>خطوة واحدة فقط في إعدادات مستودعك على GitHub:</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-xs leading-relaxed text-slate-700">
              <ol className="list-decimal list-inside space-y-1.5">
                <li>افتح صفحة المستودع الخاص بك على GitHub (مثال: <code className="font-mono bg-white px-1 py-0.5 rounded">Skill-matrix2</code>).</li>
                <li>اضغط على علامة التبويب <strong>Settings</strong> (الإعدادات) في الأعلى.</li>
                <li>من القائمة الجانبية اليسرى، اضغط على <strong>Pages</strong>.</li>
                <li>
                  تحت قسم <strong>Build and deployment</strong>، ستجد خيار <strong>Source</strong>:
                  <div className="my-1.5 p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950 font-bold">
                    👉 قم بتغييره من (Deploy from a branch) إلى: <strong>GitHub Actions</strong>
                  </div>
                </li>
                <li>بمجرد اختيار GitHub Actions، سيعمل ملف النشر التلقائي فوراً وينشر الموقع بالكامل بنجاح!</li>
              </ol>
            </div>
          </div>

          {/* Step 3: Commands to push all files */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-xs sm:text-sm">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs flex items-center justify-center shrink-0">3</span>
                <span>الأوامر لرفع كل الملفات من جهازك:</span>
              </div>
              <button
                onClick={() => handleCopy(`git add .\ngit commit -m "Deploy Skill Matrix to GitHub Pages"\ngit push origin main`, 'git-cmd')}
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
              >
                {copiedStep === 'git-cmd' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStep === 'git-cmd' ? 'تم النسخ' : 'نسخ الأوامر'}</span>
              </button>
            </div>

            <div className="bg-slate-950 text-slate-200 rounded-xl p-3 font-mono text-xs dir-ltr overflow-x-auto">
              <div className="text-slate-400"># تأكد من رفع مجلد .github وملف package-lock.json</div>
              <div>git add .</div>
              <div>git commit -m "Deploy Skill Matrix to GitHub Pages"</div>
              <div>git push origin main</div>
            </div>
          </div>

          {/* Workflow Code Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 text-xs flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-slate-500" />
                محتوى ملف النشر التلقائي (.github/workflows/deploy.yml)
              </span>
              <button
                onClick={() => handleCopy(workflowCode, 'workflow-code')}
                className="flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200"
              >
                {copiedStep === 'workflow-code' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedStep === 'workflow-code' ? 'تم النسخ' : 'نسخ الكود'}</span>
              </button>
            </div>
            <pre className="bg-slate-900 text-slate-300 rounded-xl p-3 text-[11px] font-mono dir-ltr overflow-x-auto max-h-36 matrix-scroll">
              {workflowCode}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500">
            تم ضبط كافة المسارات والأكواد لتعمل بدون أي خطوات إضافية معقدة.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            فهمت، إغلاق الدليل
          </button>
        </div>

      </div>
    </div>
  );
};
