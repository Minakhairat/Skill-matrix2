import React, { useState } from 'react';
import { History, X, Search, Trash2, Filter } from 'lucide-react';
import { AuditLogEntry, ActionType } from '../types/matrix';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: AuditLogEntry[];
  onClearHistory: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearHistory
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    if (filterType !== 'all' && log.actionType !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchesTitle = log.title.toLowerCase().includes(q);
      const matchesDetails = log.details.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDetails) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-800 rounded-lg text-amber-300">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                سجل النشاط والتعديلات (Activity History Log)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5">
                تتبع التعديلات على درجات المهارات وإضافة وحذف العمال وموازنة الخطوط
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

        {/* Filter and Search Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          
          <div className="flex items-center gap-2 overflow-x-auto matrix-scroll pb-1 sm:pb-0">
            <span className="font-semibold text-slate-600 shrink-0">تصفية:</span>
            <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5 font-semibold text-[11px]">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                الكل ({logs.length})
              </button>
              <button
                onClick={() => setFilterType('skill_update')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterType === 'skill_update' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                المهارات
              </button>
              <button
                onClick={() => setFilterType('worker_added')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterType === 'worker_added' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                الإضافات
              </button>
              <button
                onClick={() => setFilterType('worker_deleted')}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterType === 'worker_deleted' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                الحذف
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في السجل..."
              className="w-full text-xs pr-7 pl-2.5 py-1 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

        </div>

        {/* Logs List */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              لا توجد سجلات تطابق البحث أو الفلتر.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${log.badgeClass}`}>
                      {log.badgeLabel}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">
                      {log.title}
                    </h4>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {log.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {log.details}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClearHistory}
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            مسح سجل التعديلات
          </button>

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
