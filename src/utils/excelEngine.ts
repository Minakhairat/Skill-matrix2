import * as XLSX from 'xlsx';
import { Worker, Stage, ProductionLine, SkillLevel } from '../types/matrix';
import { calculateStageMetric, calculateWorkerFlexibility } from './matrixCalculations';

export function exportMatrixToExcel(
  workers: Worker[],
  stages: Stage[],
  lineName: string,
  modelName: string
) {
  // Construct tabular data
  const headers = [
    'كود العامل (Emp Code)',
    'اسم العامل (Name)',
    'الوردية (Shift)',
    'تاريخ التعيين (Hire Date)',
    ...stages.map(s => `${s.name} [المطلوب: ${s.targetWorkersCount} عمال]`),
    'المراحل المؤهل بها (≥3)',
    'الهدف (3 مراحل)',
    'حالة تحقيق الهدف'
  ];

  const rows = workers.map(w => {
    const flex = calculateWorkerFlexibility(w, stages);
    const stageRatings = stages.map(s => w.skills[s.id] ?? 0);

    return [
      w.empCode,
      w.name,
      w.shift === 'A' ? 'صباحي (A)' : w.shift === 'B' ? 'مسائي (B)' : 'ليلي (C)',
      w.hireDate,
      ...stageRatings,
      flex.qualifiedStagesCount,
      w.targetStagesCount,
      flex.isTargetMet ? 'محقق (Target Met)' : 'يحتاج تدريب (Needs Training)'
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

  // Set column widths
  const colWidths = [
    { wch: 15 }, // Code
    { wch: 25 }, // Name
    { wch: 15 }, // Shift
    { wch: 15 }, // Hire Date
    ...stages.map(() => ({ wch: 22 })),
    { wch: 20 },
    { wch: 15 },
    { wch: 22 }
  ];
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'مصفوفة المهارات');

  // Trigger download
  const cleanLineName = lineName.replace(/[\/\\?%*:|"<>]/g, '_');
  const cleanModelName = modelName.replace(/[\/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `Skill_Matrix_${cleanLineName}_${cleanModelName}.xlsx`);
}

export function exportGapReportToExcel(
  stages: Stage[],
  workers: Worker[],
  lineName: string
) {
  const headers = [
    'كود المرحلة',
    'اسم المرحلة (Operation / Station)',
    'التصنيف',
    'العدد المستهدف (Target)',
    'الحد الأدنى للدرجة المطلوبة',
    'العمال المؤهلين حالياً',
    'العمال قيد التدريب (1-2)',
    'الفجوة (العجز / الفائض)',
    'نسبة التغطية %',
    'الحالة'
  ];

  const rows = stages.map(stage => {
    const m = calculateStageMetric(stage, workers);
    return [
      stage.code,
      stage.name,
      stage.category,
      m.target,
      `المستوى ${stage.minRequiredLevel}`,
      m.qualifiedCount,
      m.traineeCount,
      m.gap > 0 ? `عجز (-${m.gap})` : m.gap === 0 ? 'مكتمل (0)' : `فائض (+${Math.abs(m.gap)})`,
      `${m.coveragePercentage}%`,
      m.gap > 0 ? (m.isCriticalShortage ? 'عجز حرج' : 'نقص تدريب') : 'مغطى بالكامل'
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'تقرير الفجوات والموازنة');

  const cleanLineName = lineName.replace(/[\/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `Line_Balancing_Gap_Report_${cleanLineName}.xlsx`);
}

export function downloadBlankTemplate(stages: Stage[], sampleLineName: string) {
  const headers = [
    'كود العامل (Emp Code)',
    'اسم العامل (Name)',
    'الوردية (A / B / C)',
    'تاريخ التعيين (YYYY-MM-DD)',
    ...stages.map(s => `${s.code} - ${s.name}`)
  ];

  const exampleRows = [
    ['EMP-501', 'محمد أحمد علي', 'A', '2024-01-15', ...stages.map((_, i) => (i < 3 ? 3 : 0))],
    ['EMP-502', 'محمود إبراهيم حسن', 'B', '2024-02-01', ...stages.map((_, i) => (i === 1 ? 4 : i === 2 ? 2 : 0))],
    ['EMP-503', 'سامح طارق السيد', 'A', '2023-11-20', ...stages.map((_, i) => (i < 4 ? 3 : 1))]
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'نموذج إدخال العمال');

  XLSX.writeFile(wb, `Template_Workers_Import_${sampleLineName}.xlsx`);
}

export async function parseImportFile(
  file: File,
  stages: Stage[],
  targetLineId: string
): Promise<{ success: boolean; workersAdded: number; errors: string[]; parsedWorkers: Worker[] }> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (!json || json.length < 2) {
          resolve({ success: false, workersAdded: 0, errors: ['الملف فارغ أو لا يحتوي على صفوف بيانات.'], parsedWorkers: [] });
          return;
        }

        const headers: string[] = (json[0] || []).map(h => String(h || '').trim());
        const dataRows = json.slice(1);

        const parsedWorkers: Worker[] = [];
        const errors: string[] = [];

        dataRows.forEach((row, rowIdx) => {
          if (!row || row.length === 0 || !row[0]) return; // Skip empty row

          const empCode = String(row[0] || '').trim();
          const name = String(row[1] || '').trim();
          const rawShift = String(row[2] || 'A').toUpperCase().trim();
          const shift: 'A' | 'B' | 'C' = rawShift.includes('B') ? 'B' : rawShift.includes('C') ? 'C' : 'A';
          const hireDate = String(row[3] || new Date().toISOString().split('T')[0]).trim();

          if (!empCode || !name) {
            errors.push(`السطر ${rowIdx + 2}: كود العامل أو الاسم مفقود.`);
            return;
          }

          const skills: Record<string, SkillLevel> = {};

          // Match each stage with column
          stages.forEach((stage) => {
            // Find index of column matching stage code or stage name
            const colIndex = headers.findIndex(h =>
              h.includes(stage.code) ||
              h.includes(stage.name) ||
              stage.name.includes(h)
            );

            if (colIndex !== -1 && row[colIndex] !== undefined) {
              const val = parseInt(String(row[colIndex]), 10);
              if (!isNaN(val) && val >= 0 && val <= 4) {
                skills[stage.id] = val as SkillLevel;
              } else {
                skills[stage.id] = 0;
              }
            } else {
              skills[stage.id] = 0;
            }
          });

          parsedWorkers.push({
            id: `imported-${Date.now()}-${rowIdx}`,
            empCode,
            name,
            lineId: targetLineId,
            shift,
            targetStagesCount: 3,
            minProficiencyTarget: 3,
            skills,
            hireDate
          });
        });

        resolve({
          success: parsedWorkers.length > 0,
          workersAdded: parsedWorkers.length,
          errors,
          parsedWorkers
        });
      } catch (err: any) {
        resolve({
          success: false,
          workersAdded: 0,
          errors: [`فشل في قراءة الملف: ${err.message || 'تنسيق غير مدعوم'}`],
          parsedWorkers: []
        });
      }
    };

    reader.onerror = () => {
      resolve({ success: false, workersAdded: 0, errors: ['حدث خطأ أثناء قراءة الملف.'], parsedWorkers: [] });
    };

    reader.readAsArrayBuffer(file);
  });
}
