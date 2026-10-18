import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, AlertOctagon } from 'lucide-react';
import { Worker } from '../types/matrix';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerToDelete?: Worker | null;
  onConfirmDeleteWorker?: (workerId: string) => void;
  isClearAllMode?: boolean;
  onConfirmClearAll?: () => void;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  workerToDelete,
  onConfirmDeleteWorker,
  isClearAllMode = false,
  onConfirmClearAll
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (isClearAllMode) {
      if (onConfirmClearAll) onConfirmClearAll();
    } else if (workerToDelete && onConfirmDeleteWorker) {
      onConfirmDeleteWorker(workerToDelete.id);
    }
    setConfirmationInput('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className={`p-4 sm:p-5 text-white flex items-center justify-between ${
          isClearAllMode ? 'bg-rose-950' : 'bg-slate-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-lg ${isClearAllMode ? 'bg-rose-800 text-rose-200' : 'bg-rose-900 text-rose-300'}`}>
              {isClearAllMode ? <AlertOctagon className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                {isClearAllMode ? 'حذف كافة البيانات بالكامل' : 'تأكيد حذف العامل'}
              </h3>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isClearAllMode ? 'إجراء حرج لا يمكن التراجع عنه' : 'سيتم حذف العامل وتقييماته من النظام'}
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
        <div className="p-5 sm:p-6 space-y-4">
          {isClearAllMode ? (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 leading-relaxed">
                <strong>تحذير هام:</strong> سيؤدي هذا الإجراء إلى حذف جميع العمال (400 عامل) وسجلات تقييماتهم في كافة خطوط الإنتاج.
              </div>
              <p className="text-xs text-slate-600">
                إذا أردت البدء من جديد بمصفوفة فارغة تماماً، اضغط على زر "تأكيد الحذف الشامل". يمكنك دائماً استعادة الـ 400 عامل التجريبيين بنقرة واحدة لاحقاً.
              </p>
            </div>
          ) : (
            <div className="space-y-3 text-xs text-slate-700">
              <p>
                هل أنت متأكد من رغبتك في حذف العامل التالي من خط الإنتاج؟
              </p>
              {workerToDelete && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{workerToDelete.name}</div>
                    <div className="font-mono text-slate-500 text-[11px] mt-0.5">
                      كود: {workerToDelete.empCode} · وردية {workerToDelete.shift}
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-1 rounded border border-rose-200">
                    سيتم الحذف
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-colors flex items-center gap-1.5 ${
              isClearAllMode 
                ? 'bg-rose-700 hover:bg-rose-800' 
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {isClearAllMode ? 'نعم، حذف كافة البيانات' : 'حذف العامل نهائياً'}
          </button>
        </div>

      </div>
    </div>
  );
};
