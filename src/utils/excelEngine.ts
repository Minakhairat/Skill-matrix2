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

/**
 * Full System Backup Export (JSON format)
 * Contains all 400+ workers, all lines/machines, models, stages, settings, leadership, and audit logs.
 */
export function exportFullSystemJSON(backup: import('../types/matrix').FullSystemBackup) {
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `MatrixPro_Full_Backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Full System Backup Export (Multi-sheet Excel Workbook)
 */
export function exportFullSystemExcel(backup: import('../types/matrix').FullSystemBackup) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Workers
  const workerHeaders = ['الكود', 'الاسم', 'كود الخط/الماكينة', 'الوردية', 'تاريخ التعيين', 'المستهدف', 'ملاحظات', 'المهارات (JSON)'];
  const workerRows = backup.workers.map(w => [
    w.empCode,
    w.name,
    w.lineId,
    w.shift,
    w.hireDate || '',
    w.targetStagesCount || 3,
    w.notes || '',
    JSON.stringify(w.skills || {})
  ]);
  const wsWorkers = XLSX.utils.aoa_to_sheet([workerHeaders, ...workerRows]);
  XLSX.utils.book_append_sheet(wb, wsWorkers, 'العمال_Workers');

  // Sheet 2: Lines, Models & Stages Hierarchy
  const hierarchyHeaders = ['معرف الخط', 'اسم الخط', 'كود الخط', 'المشرف', 'معرف الموديل', 'اسم الموديل', 'كود الموديل', 'معرف المرحلة', 'اسم المرحلة', 'كود المرحلة', 'مستهدف العمال', 'الحد الأدنى', 'الأهمية', 'التصنيف'];
  const hierarchyRows: any[] = [];
  backup.lines.forEach(line => {
    line.models.forEach(model => {
      model.stages.forEach(stage => {
        hierarchyRows.push([
          line.id,
          line.name,
          line.code,
          line.supervisor,
          model.id,
          model.name,
          model.code,
          stage.id,
          stage.name,
          stage.code,
          stage.targetWorkersCount,
          stage.minRequiredLevel,
          stage.criticality || 'normal',
          stage.category || 'تشغيل'
        ]);
      });
    });
  });
  const wsHierarchy = XLSX.utils.aoa_to_sheet([hierarchyHeaders, ...hierarchyRows]);
  XLSX.utils.book_append_sheet(wb, wsHierarchy, 'الهيكل_Hierarchy');

  // Sheet 3: System Settings & Metadata
  const metadataHeaders = ['المفتاح (Key)', 'القيمة (Value)'];
  const metadataRows = [
    ['version', backup.version || '2.0'],
    ['exportDate', backup.exportDate],
    ['totalWorkers', backup.totalWorkers],
    ['totalLines', backup.totalLines],
    ['engineerName', backup.leadership.engineerName],
    ['managerName', backup.leadership.managerName],
    ['targetWorkersPerStage', backup.settings.targetWorkersPerStage],
    ['targetStagesPerWorker', backup.settings.targetStagesPerWorker],
    ['minQualifiedLevel', backup.settings.minQualifiedLevel],
    ['terminology_preset', backup.terminology.preset],
    ['lineLabel', backup.terminology.lineLabel],
    ['lineLabelPlural', backup.terminology.lineLabelPlural],
    ['modelLabel', backup.terminology.modelLabel],
    ['modelLabelPlural', backup.terminology.modelLabelPlural],
    ['stageLabel', backup.terminology.stageLabel],
    ['stageLabelPlural', backup.terminology.stageLabelPlural]
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet([metadataHeaders, ...metadataRows]);
  XLSX.utils.book_append_sheet(wb, wsMeta, 'الإعدادات_Config');

  // Sheet 4: Audit Logs
  if (backup.logs && backup.logs.length > 0) {
    const logHeaders = ['المعرف', 'التوقيت', 'نوع الإجراء', 'العنوان', 'التفاصيل', 'الشارة'];
    const logRows = backup.logs.map(l => [
      l.id,
      l.timestamp,
      l.actionType,
      l.title,
      l.details,
      l.badgeLabel
    ]);
    const wsLogs = XLSX.utils.aoa_to_sheet([logHeaders, ...logRows]);
    XLSX.utils.book_append_sheet(wb, wsLogs, 'السجل_Logs');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `MatrixPro_Full_System_${dateStr}.xlsx`);
}

/**
 * Parse Full System Backup File (.json or .xlsx)
 */
export async function parseFullSystemBackup(file: File): Promise<{
  success: boolean;
  data?: import('../types/matrix').FullSystemBackup;
  error?: string;
}> {
  return new Promise((resolve) => {
    // 1. JSON file
    if (file.name.endsWith('.json')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content);
          if (parsed && Array.isArray(parsed.workers) && Array.isArray(parsed.lines)) {
            resolve({ success: true, data: parsed });
          } else {
            resolve({ success: false, error: 'الملف لا يحتوي على بنية بيانات صحيحة لـ MatrixPro (مفقود العمال أو الخطوط).' });
          }
        } catch (err: any) {
          resolve({ success: false, error: `فشل قراءة ملف JSON: ${err.message}` });
        }
      };
      reader.onerror = () => resolve({ success: false, error: 'تعذر قراءة ملف JSON.' });
      reader.readAsText(file);
      return;
    }

    // 2. Excel file (.xlsx / .xls)
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        
        // Find sheets
        const workersSheetName = workbook.SheetNames.find(n => n.includes('العمال') || n.includes('Workers'));
        const hierarchySheetName = workbook.SheetNames.find(n => n.includes('الهيكل') || n.includes('Hierarchy'));
        const configSheetName = workbook.SheetNames.find(n => n.includes('الإعدادات') || n.includes('Config'));

        if (!workersSheetName && !hierarchySheetName) {
          resolve({
            success: false,
            error: 'ملف الإكسيل غير مطابق لنموذج النسخة الاحتياطية الشاملة لـ MatrixPro.'
          });
          return;
        }

        // Parse Config Sheet if present
        let settings = { targetWorkersPerStage: 5, targetStagesPerWorker: 3, minQualifiedLevel: 3 };
        let leadership = { engineerName: 'م. مينا خيرت', managerName: 'أ. أحمد فؤاد' };
        let terminology: import('../types/matrix').TerminologyConfig = {
          preset: 'lines_models',
          lineLabel: 'خط إنتاج',
          lineLabelPlural: 'خطوط الإنتاج',
          modelLabel: 'موديل',
          modelLabelPlural: 'الموديلات',
          stageLabel: 'مرحلة',
          stageLabelPlural: 'المراحل'
        };

        if (configSheetName) {
          const configSheet = workbook.Sheets[configSheetName];
          const configRows: any[][] = XLSX.utils.sheet_to_json(configSheet, { header: 1 });
          const configMap: Record<string, string> = {};
          configRows.forEach(row => {
            if (row && row[0]) configMap[String(row[0]).trim()] = String(row[1] || '').trim();
          });
          if (configMap['engineerName']) leadership.engineerName = configMap['engineerName'];
          if (configMap['managerName']) leadership.managerName = configMap['managerName'];
          if (configMap['targetWorkersPerStage']) settings.targetWorkersPerStage = Number(configMap['targetWorkersPerStage']) || 5;
          if (configMap['targetStagesPerWorker']) settings.targetStagesPerWorker = Number(configMap['targetStagesPerWorker']) || 3;
          if (configMap['minQualifiedLevel']) settings.minQualifiedLevel = Number(configMap['minQualifiedLevel']) || 3;
          if (configMap['terminology_preset']) terminology.preset = configMap['terminology_preset'] as any;
          if (configMap['lineLabel']) terminology.lineLabel = configMap['lineLabel'];
          if (configMap['lineLabelPlural']) terminology.lineLabelPlural = configMap['lineLabelPlural'];
          if (configMap['modelLabel']) terminology.modelLabel = configMap['modelLabel'];
          if (configMap['modelLabelPlural']) terminology.modelLabelPlural = configMap['modelLabelPlural'];
          if (configMap['stageLabel']) terminology.stageLabel = configMap['stageLabel'];
          if (configMap['stageLabelPlural']) terminology.stageLabelPlural = configMap['stageLabelPlural'];
        }

        // Parse Hierarchy
        const linesMap = new Map<string, import('../types/matrix').ProductionLine>();
        if (hierarchySheetName) {
          const hSheet = workbook.Sheets[hierarchySheetName];
          const hRows: any[][] = XLSX.utils.sheet_to_json(hSheet, { header: 1 });
          hRows.slice(1).forEach(row => {
            if (!row || !row[0]) return;
            const lineId = String(row[0]).trim();
            const lineName = String(row[1] || lineId).trim();
            const lineCode = String(row[2] || lineId).trim();
            const supervisor = String(row[3] || '').trim();
            const modelId = String(row[4] || `${lineId}-MOD1`).trim();
            const modelName = String(row[5] || 'موديل قياسي').trim();
            const modelCode = String(row[6] || 'M-01').trim();
            const stageId = String(row[7] || `${modelId}-S1`).trim();
            const stageName = String(row[8] || 'مرحلة 1').trim();
            const stageCode = String(row[9] || 'OP-01').trim();
            const target = Number(row[10]) || 5;
            const minLevel = (Number(row[11]) || 3) as any;
            const criticality = (row[12] || 'normal') as any;
            const category = String(row[13] || 'تشغيل').trim();

            if (!linesMap.has(lineId)) {
              linesMap.set(lineId, {
                id: lineId,
                name: lineName,
                nameEn: lineName,
                code: lineCode,
                supervisor,
                models: []
              });
            }
            const line = linesMap.get(lineId)!;
            let model = line.models.find(m => m.id === modelId);
            if (!model) {
              model = { id: modelId, name: modelName, nameEn: modelName, code: modelCode, lineId, stages: [] };
              line.models.push(model);
            }
            if (!model.stages.some(s => s.id === stageId)) {
              model.stages.push({
                id: stageId,
                name: stageName,
                nameEn: stageName,
                code: stageCode,
                targetWorkersCount: target,
                minRequiredLevel: minLevel,
                criticality,
                category
              });
            }
          });
        }

        const lines = Array.from(linesMap.values());

        // Parse Workers
        const workers: Worker[] = [];
        if (workersSheetName) {
          const wSheet = workbook.Sheets[workersSheetName];
          const wRows: any[][] = XLSX.utils.sheet_to_json(wSheet, { header: 1 });
          wRows.slice(1).forEach((row, i) => {
            if (!row || !row[0]) return;
            const empCode = String(row[0]).trim();
            const name = String(row[1] || empCode).trim();
            const lineId = String(row[2] || lines[0]?.id || 'LINE-A').trim();
            const shiftRaw = String(row[3] || 'A').toUpperCase().trim();
            const shift: 'A' | 'B' | 'C' = shiftRaw.includes('B') ? 'B' : shiftRaw.includes('C') ? 'C' : 'A';
            const hireDate = String(row[4] || '2025-01-01').trim();
            const targetStages = Number(row[5]) || 3;
            const notes = String(row[6] || '').trim();
            let skills: Record<string, SkillLevel> = {};
            try {
              if (row[7]) skills = JSON.parse(String(row[7]));
            } catch (e) {}

            workers.push({
              id: `imported-worker-${i}-${Date.now()}`,
              empCode,
              name,
              lineId,
              shift,
              targetStagesCount: targetStages,
              minProficiencyTarget: 3,
              skills,
              hireDate,
              notes
            });
          });
        }

        resolve({
          success: workers.length > 0 || lines.length > 0,
          data: {
            version: '2.0',
            exportDate: new Date().toISOString(),
            totalWorkers: workers.length,
            totalLines: lines.length,
            terminology,
            settings,
            leadership,
            lines: lines.length > 0 ? lines : undefined as any,
            workers
          }
        });
      } catch (err: any) {
        resolve({ success: false, error: `فشل قراءة مصنف إكسيل: ${err.message}` });
      }
    };
    reader.onerror = () => resolve({ success: false, error: 'تعذر قراءة ملف إكسيل.' });
    reader.readAsArrayBuffer(file);
  });
}

