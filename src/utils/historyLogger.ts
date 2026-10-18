import { AuditLogEntry, ActionType } from '../types/matrix';
import { STORAGE_KEY_HISTORY } from './constants';

export function getActionTypeMeta(actionType: ActionType): { label: string; badgeClass: string } {
  switch (actionType) {
    case 'skill_update':
      return { label: 'تعديل مهارة', badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'worker_added':
      return { label: 'إضافة عامل', badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'worker_edited':
      return { label: 'تعديل بيانات', badgeClass: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'worker_deleted':
      return { label: 'حذف عامل', badgeClass: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'all_cleared':
      return { label: 'مسح شامل', badgeClass: 'bg-red-100 text-red-800 border-red-300' };
    case 'target_changed':
      return { label: 'تعديل الأهداف', badgeClass: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'data_imported':
      return { label: 'استيراد إكسيل', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300' };
    case 'rebalance':
      return { label: 'موازنة ذكية', badgeClass: 'bg-purple-50 text-purple-700 border-purple-200' };
    default:
      return { label: 'إجراء عام', badgeClass: 'bg-slate-50 text-slate-700 border-slate-200' };
  }
}

export function loadInitialLogs(): AuditLogEntry[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Failed to load logs', e);
  }

  // Pre-seed with realistic factory initialization logs
  const now = new Date();
  const formatTime = (minusMinutes: number) => {
    const d = new Date(now.getTime() - minusMinutes * 60000);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('ar-EG');
  };

  return [
    {
      id: 'log-1',
      timestamp: formatTime(5),
      actionType: 'target_changed',
      title: 'ضبط أهداف الخط والمصنع',
      details: 'تم تحديد هدف المرحلة بـ 5 عمال مؤهلين، والحد الأدنى للدرجة 3، وهدف مرونة العامل بـ 3 مراحل.',
      badgeLabel: 'تعديل الأهداف',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    {
      id: 'log-2',
      timestamp: formatTime(15),
      actionType: 'data_imported',
      title: 'تهيئة قاعدة بيانات عمال المصنع (400 عامل)',
      details: 'تم تحميل وتوزيع 400 عامل على 4 خطوط إنتاج (خط التجميع الإلكتروني، الميكانيكا، الربط، والتعبئة).',
      badgeLabel: 'استيراد إكسيل',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300'
    },
    {
      id: 'log-3',
      timestamp: formatTime(30),
      actionType: 'skill_update',
      title: 'تقييم أولي لمصفوفة المهارات',
      details: 'تم اعتماد درجات التقييم الرباعية (1 متدرب، 2 تحت إشراف، 3 مستقل، 4 خبير ومدرب).',
      badgeLabel: 'تعديل مهارة',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    }
  ];
}
