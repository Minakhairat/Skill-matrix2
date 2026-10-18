import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  Download, 
  Upload, 
  FileCheck, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  FileDown
} from 'lucide-react';
import { Stage, Worker } from '../types/matrix';
import { exportMatrixToExcel, exportGapReportToExcel, downloadBlankTemplate, parseImportFile } from '../utils/excelEngine';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stages: Stage[];
  workers: Worker[];
  lineName: string;
  modelName: string;
  currentLineId: string;
  onImportSuccess: (newWorkers: Worker[]) => void;
  onReset400Workers: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  stages,
  workers,
  lineName,
  modelName,
  currentLineId,
  onImportSuccess,
  onReset400Workers
}) => {
  const [importStatus, setImportStatus] = useState<{
    loading: boolean;
    success?: boolean;
    message?: string;
    errors?: string[];
  }>({ loading: false });

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ loading: true });

    try {
      const result = await parseImportFile(file, stages, currentLineId);
      if (result.success && result.parsedWorkers.length > 0) {
        onImportSuccess(result.parsedWorkers);
        setImportStatus({
          loading: false,
          success: true,
          message: `تم استيراد ${result.workersAdded} عامل بنجاح وتحديث المصفوفة!`
        });
      } else {
        setImportStatus({
          loading: false,
          success: false,
          message: 'لم يتم العثور على بيانات صالحة للاستيراد.',
          errors: result.errors
        });
      }
    } catch (err: any) {
      setImportStatus({
        loading: false,
        success: false,
        message: 'حدث خطأ أثناء معالجة الملف.',
        errors: [err.message]
      });
    }

    // Reset input
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-emerald-800 text-emerald-300 rounded-lg">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                مركز استيراد وتصدير البيانات (Excel & CSV)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                تصدير المصفوفة الحالية أو استيراد ملفات خارجية وقوالب جاهزة
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

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Section 1: Export Current Data */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-900">
              1. تصدير البيانات الحالية إلى ملفات Excel:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => exportMatrixToExcel(workers, stages, lineName, modelName)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/70 text-emerald-800 text-xs font-bold transition-colors text-right"
              >
                <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>تصدير المصفوفة الكاملة (.xlsx)</span>
              </button>

              <button
                onClick={() => exportGapReportToExcel(stages, workers, lineName)}
                className="flex items-center justify-center gap-2 p-3 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100/70 text-sky-800 text-xs font-bold transition-colors text-right"
              >
                <FileDown className="w-4 h-4 text-sky-600 shrink-0" />
                <span>تقرير الفجوات والموازنة (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Section 2: Download Template & Import */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-900">
              2. استيراد عمال جدد أو تحديث من ملف خارجي:
            </div>
            
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="font-semibold text-slate-800">تحميل نموذج Excel فارغ معتمد</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  نموذج مهيأ مسبقاً بأعمدة مراحل {lineName}
                </div>
              </div>
              <button
                onClick={() => downloadBlankTemplate(stages, lineName)}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                تحميل النموذج
              </button>
            </div>

            {/* File Upload Box */}
            <div className="relative border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-xl p-5 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                disabled={importStatus.loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <div className="text-xs font-bold text-slate-800">
                انقر لاختيار ملف Excel أو CSV أو اسحبه هنا
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                يدعم صيغ .xlsx و .xls و .csv
              </div>
            </div>

            {/* Import Status Alert */}
            {importStatus.message && (
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                importStatus.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {importStatus.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{importStatus.message}</div>
                  {importStatus.errors && importStatus.errors.length > 0 && (
                    <ul className="list-disc list-inside mt-1 text-[11px] space-y-0.5 text-rose-700">
                      {importStatus.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Reset / Regenerate 400 Sample Workers */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-slate-800">إعادة تعيين البيانات النموذجية</div>
              <div className="text-[11px] text-slate-500">
                توليد 400 عامل تجريبي واقعي عبر كافة خطوط الإنتاج
              </div>
            </div>
            <button
              onClick={() => {
                onReset400Workers();
                onClose();
              }}
              className="px-3.5 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              توليد 400 عامل
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
