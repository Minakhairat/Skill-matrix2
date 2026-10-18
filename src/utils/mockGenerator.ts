import { ProductionLine, Worker, SkillLevel } from '../types/matrix';
import { DEFAULT_WORKER_FLEXIBILITY_TARGET, DEFAULT_MIN_QUALIFIED_LEVEL } from './constants';

const ARABIC_FIRST_NAMES = [
  'أحمد', 'محمد', 'محمود', 'إبراهيم', 'علي', 'حسن', 'مصطفى', 'عمر', 'كريم', 'طارق',
  'سامح', 'خالد', 'وائل', 'هاني', 'حسام', 'يوسف', 'عمرو', 'وليد', 'أشرف', 'ماجد',
  'سعيد', 'عبدالرحمن', 'عادل', 'سامي', 'فادي', 'جمال', 'نبيل', 'ياسر', 'شريف', 'مدحت',
  'أيمن', 'عصام', 'إيهاب', 'عاطف', 'باسم', 'رامي', 'تامر', 'أسامة', 'صلاح', 'ممدوح'
];

const ARABIC_LAST_NAMES = [
  'السيد', 'عبدالله', 'عثمان', 'إسماعيل', 'خليل', 'رمضان', 'منصور', 'حسن', 'فهمي', 'سليمان',
  'الشريف', 'البدري', 'النجار', 'فاروق', 'زكي', 'سالم', 'رضوان', 'المصري', 'الهواري', 'قاسم',
  'عطية', 'غانم', 'صقر', 'درويش', 'عفيفي', 'شحاتة', 'مهران', 'هيكل', 'جمعة', 'عويس',
  'عمارة', 'حماد', 'علام', 'مرسي', 'زهران', 'جاد', 'غنيم', 'فوزي', 'بركات', 'عرفة'
];

export function generateInitialLines(): ProductionLine[] {
  return [
    {
      id: 'LINE-A',
      name: 'خط التجميع الإلكتروني (Line A)',
      nameEn: 'Line A - Electronics Assembly',
      code: 'LINE-A',
      supervisor: 'م. أحمد الشريف',
      models: [
        {
          id: 'MOD-A1',
          name: 'موديل إلكتروني قياسي (Alpha-100)',
          nameEn: 'Model Alpha-100 Standard',
          code: 'A-100',
          lineId: 'LINE-A',
          stages: [
            { id: 'STG-A1-1', name: 'تثبيت اللوحة الأم (SMT Mounting)', nameEn: 'SMT Motherboard Mounting', code: 'SMT-01', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'تجميع دقيق' },
            { id: 'STG-A1-2', name: 'لحام المكونات الدقيقة (Micro Soldering)', nameEn: 'Micro Soldering', code: 'SLD-02', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'لحام' },
            { id: 'STG-A1-3', name: 'تركيب الدوائر المطبوعة (PCB Assembly)', nameEn: 'PCB Circuit Assembly', code: 'PCB-03', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'تجميع دقيق' },
            { id: 'STG-A1-4', name: 'توصيل الضفائر والأسلاك (Harness Wiring)', nameEn: 'Harness Wiring', code: 'WRN-04', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'normal', category: 'توصيلات' },
            { id: 'STG-A1-5', name: 'الفحص البصري الآلي (AOI Inspection)', nameEn: 'AOI Optical Inspection', code: 'AOI-05', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'جودة واختبار' },
            { id: 'STG-A1-6', name: 'اختبار الجهد والتيار (Voltage Testing)', nameEn: 'Voltage & Current Testing', code: 'TST-06', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'جودة واختبار' },
            { id: 'STG-A1-7', name: 'تجميع الهيكل الخارجي (Casing Housing)', nameEn: 'Casing Housing Assembly', code: 'CAS-07', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'normal', category: 'تشطيب' }
          ]
        },
        {
          id: 'MOD-A2',
          name: 'موديل إلكتروني احترافي (Alpha-Pro)',
          nameEn: 'Model Alpha-Pro Industrial',
          code: 'A-PRO',
          lineId: 'LINE-A',
          stages: [
            { id: 'STG-A2-1', name: 'تثبيت المعالجات المزدوجة (Dual CPU Mounting)', nameEn: 'Dual CPU Placement', code: 'DCPU-01', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'تجميع دقيق' },
            { id: 'STG-A2-2', name: 'اللحام السطحي بالحرارة العالية (Reflow Soldering)', nameEn: 'Reflow Soldering', code: 'RFLW-02', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'لحام' },
            { id: 'STG-A2-3', name: 'عزل السيليكون ومقاومة الرطوبة (Silicone Conformal)', nameEn: 'Silicone Conformal Coating', code: 'CONF-03', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'عزل وحماية' },
            { id: 'STG-A2-4', name: 'اختبار الإشارات والذبذبات (Signal Frequency Test)', nameEn: 'Signal Frequency Test', code: 'FREQ-04', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'جودة واختبار' },
            { id: 'STG-A2-5', name: 'المعايرة الحرارية (Thermal Calibration)', nameEn: 'Thermal Calibration', code: 'THRM-05', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'جودة واختبار' },
            { id: 'STG-A2-6', name: 'التقفيل بالبراغي العزمية (Torque Fastening)', nameEn: 'Torque Screwing Assembly', code: 'TRQ-06', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'normal', category: 'تشطيب' }
          ]
        }
      ]
    },
    {
      id: 'LINE-B',
      name: 'خط الميكانيكا والتشكيل (Line B)',
      nameEn: 'Line B - Mechanical Forming',
      code: 'LINE-B',
      supervisor: 'م. سامح قاسم',
      models: [
        {
          id: 'MOD-B1',
          name: 'موديل الصمامات الميكانيكية (Mech-Falcon)',
          nameEn: 'Model Mech-Falcon Valve',
          code: 'M-FLC',
          lineId: 'LINE-B',
          stages: [
            { id: 'STG-B1-1', name: 'خراطة الأسطوانات الدقيقة (CNC Lathe)', nameEn: 'CNC Lathe Turning', code: 'CNC-01', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'تشغيل معادن' },
            { id: 'STG-B1-2', name: 'تفريز مجاري الضغط (Milling Channels)', nameEn: 'Milling Pressure Channels', code: 'MIL-02', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'تشغيل معادن' },
            { id: 'STG-B1-3', name: 'التجليخ والصقل السطحي (Surface Grinding)', nameEn: 'Surface Grinding & Lapping', code: 'GRD-03', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'صقل وتشطيب' },
            { id: 'STG-B1-4', name: 'تجميع موانع التسريب (O-Ring & Seals Assembly)', nameEn: 'O-Ring & Seals Assembly', code: 'SEAL-04', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'تجميع ميكانيكي' },
            { id: 'STG-B1-5', name: 'اختبار الضغط الهيدروليكي (Hydrostatic Test)', nameEn: 'Hydrostatic Pressure Test', code: 'HYD-05', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'اختبارات ضغط' },
            { id: 'STG-B1-6', name: 'الطلاء الكهربائي والمقاوم للصدأ (Anti-Corrosion)', nameEn: 'Anti-Corrosion Coating', code: 'COAT-06', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'normal', category: 'معالجة أسطح' }
          ]
        },
        {
          id: 'MOD-B2',
          name: 'موديل المحابس الثقيلة (Mech-Titan)',
          nameEn: 'Model Mech-Titan Heavy Duty',
          code: 'M-TTN',
          lineId: 'LINE-B',
          stages: [
            { id: 'STG-B2-1', name: 'القص بالليزر عالي الكثافة (Laser Cutting)', nameEn: 'Fiber Laser Cutting', code: 'LSR-01', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'قطع وتشكيل' },
            { id: 'STG-B2-2', name: 'الدرفلة والكبس الهيدروليكي (Hydraulic Press)', nameEn: 'Hydraulic Press Bending', code: 'PRS-02', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'قطع وتشكيل' },
            { id: 'STG-B2-3', name: 'لحام الأرجون المتخصص (TIG Precision Welding)', nameEn: 'TIG Precision Welding', code: 'TIG-03', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'لحام' },
            { id: 'STG-B2-4', name: 'فحص اللحام بالموجات فوق الصوتية (UT Testing)', nameEn: 'Ultrasonic Weld Inspection', code: 'UT-04', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'جودة واختبار' },
            { id: 'STG-B2-5', name: 'تجميع التروس ومحركات العزم (Actuator Fitting)', nameEn: 'Actuator & Gear Fitting', code: 'ACT-05', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'تجميع ميكانيكي' },
            { id: 'STG-B2-6', name: 'المعايرة الحركية والتدفق (Flow Calibration)', nameEn: 'Flow Dynamics Calibration', code: 'FLW-06', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'معايرة' }
          ]
        }
      ]
    },
    {
      id: 'LINE-C',
      name: 'خط التجميع والربط المتكامل (Line C)',
      nameEn: 'Line C - Integrated Assembly',
      code: 'LINE-C',
      supervisor: 'م. خالد رضوان',
      models: [
        {
          id: 'MOD-C1',
          name: 'موديل الوحدات المدمجة (Smart-Hybrid)',
          nameEn: 'Model Smart-Hybrid Unit',
          code: 'HBR-01',
          lineId: 'LINE-C',
          stages: [
            { id: 'STG-C1-1', name: 'تركيب المحركات الخطية (Linear Motor Mounting)', nameEn: 'Linear Motor Mount', code: 'LMR-01', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'تركيبات' },
            { id: 'STG-C1-2', name: 'ربط الحساسات الذكية (Sensor Calibration)', nameEn: 'Sensor Alignment & Calib', code: 'SNS-02', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'إلكتروميكانيك' },
            { id: 'STG-C1-3', name: 'برمجة السوفت وير الداخلي (Firmware Flash)', nameEn: 'Firmware Flashing & Config', code: 'FW-03', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'برمجة وضبط' },
            { id: 'STG-C1-4', name: 'اختبار الاستجابة المتزامنة (Sync Response Test)', nameEn: 'Synchronous Response Test', code: 'SYNC-04', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'جودة واختبار' },
            { id: 'STG-C1-5', name: 'التقفيل الميكانيكي والعزل (Seal Lock Closing)', nameEn: 'Seal Lock Closing', code: 'SEAL-05', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'normal', category: 'تقفيل' }
          ]
        }
      ]
    },
    {
      id: 'LINE-D',
      name: 'خط التعبئة والتجهيز للشحن (Line D)',
      nameEn: 'Line D - Packaging & Dispatch',
      code: 'LINE-D',
      supervisor: 'م. طارق عثمان',
      models: [
        {
          id: 'MOD-D1',
          name: 'موديل التصدير النهائي (Export Pack)',
          nameEn: 'Model Export Standard Packing',
          code: 'EXP-PK',
          lineId: 'LINE-D',
          stages: [
            { id: 'STG-D1-1', name: 'فحص المظهر النهائي والنظافة (Cosmetic QC)', nameEn: 'Cosmetic & Cleanliness QC', code: 'CSM-01', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'جودة نهائية' },
            { id: 'STG-D1-2', name: 'طباعة ولصق الباركود وتتبع السيريال (Barcode/QR)', nameEn: 'QR & Serial Labeling', code: 'LBL-02', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'critical', category: 'تكويد وتتبع' },
            { id: 'STG-D1-3', name: 'التفريغ الهوائي والتغليف المضاد للرطوبة (Vacuum)', nameEn: 'Vacuum & Desiccant Pack', code: 'VAC-03', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'تغليف' },
            { id: 'STG-D1-4', name: 'الوضع في الكراتين العازلة للصدمات (Cushioning)', nameEn: 'Shock Absorption Boxing', code: 'BOX-04', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'normal', category: 'تعبئة' },
            { id: 'STG-D1-5', name: 'الوزن الآلي ومطابقة الترانزيت (Auto Weight Check)', nameEn: 'Automated Weight Check', code: 'WGT-05', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'medium', category: 'مراجعة نهائية' },
            { id: 'STG-D1-6', name: 'الرص على البالتات والتحزيم (Palletizing & Strapping)', nameEn: 'Palletizing & Strapping', code: 'PLT-06', targetWorkersCount: 5, minRequiredLevel: 3, criticality: 'normal', category: 'شحن' }
          ]
        }
      ]
    }
  ];
}

// Generate 400 realistic workers distributed across lines with genuine skill levels
export function generate400Workers(lines: ProductionLine[]): Worker[] {
  const workers: Worker[] = [];
  const shifts: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
  const lineIds = lines.map(l => l.id);

  // Collect all stage IDs grouped by line
  const stagesByLine: Record<string, string[]> = {};
  lines.forEach(line => {
    const stageIds: string[] = [];
    line.models.forEach(model => {
      model.stages.forEach(stg => {
        if (!stageIds.includes(stg.id)) stageIds.push(stg.id);
      });
    });
    stagesByLine[line.id] = stageIds;
  });

  // Total 400 workers: approx 100 per line (LINE-A: 100, LINE-B: 100, LINE-C: 100, LINE-D: 100)
  for (let i = 1; i <= 400; i++) {
    const lineIndex = Math.floor((i - 1) / 100);
    const lineId = lineIds[lineIndex] || lineIds[0];
    const lineStageIds = stagesByLine[lineId] || [];

    const fName = ARABIC_FIRST_NAMES[(i * 7 + 3) % ARABIC_FIRST_NAMES.length];
    const lName = ARABIC_LAST_NAMES[(i * 13 + 5) % ARABIC_LAST_NAMES.length];
    const empCode = `EMP-${String(i).padStart(3, '0')}`;
    const shift = shifts[(i + 1) % 3];

    // Assign realistic skills:
    // User target: each worker should ideally have >= 3 stages at level >= 3.
    // In a real factory:
    // ~45% of workers already meet the target (have 3 or 4 qualified stages at level 3 or 4)
    // ~35% of workers are close (have 2 qualified stages, and 1 or 2 at level 1-2)
    // ~20% of workers are newly hired or in training (have 0 or 1 qualified stage)
    const skills: Record<string, SkillLevel> = {};

    // Determine proficiency profile
    const profileMod = i % 10;
    let targetMetCount = 3; // default
    if (profileMod <= 4) {
      targetMetCount = 3 + (i % 2); // 3 or 4 stages qualified
    } else if (profileMod <= 7) {
      targetMetCount = 2; // 2 stages qualified
    } else {
      targetMetCount = 1; // 1 stage qualified
    }

    // Pick stages to assign
    lineStageIds.forEach((stageId, sIdx) => {
      // Deterministic pseudo-random based on worker index and stage index
      const seed = (i * 31 + sIdx * 17) % 100;
      if (sIdx < targetMetCount) {
        // High skill level (3 or 4)
        skills[stageId] = seed > 40 ? 3 : 4;
      } else if (sIdx === targetMetCount) {
        // Transitional level (1 or 2)
        skills[stageId] = seed > 50 ? 2 : 1;
      } else if (sIdx === targetMetCount + 1 && seed > 60) {
        skills[stageId] = 1;
      } else {
        skills[stageId] = 0;
      }
    });

    // Also occasionally give a cross-line skill to some workers (15% of workers) to enable smart rebalancing between lines
    if (i % 7 === 0) {
      const otherLine = lineIds[(lineIndex + 1) % lineIds.length];
      const otherStages = stagesByLine[otherLine] || [];
      if (otherStages.length > 0) {
        const crossStageId = otherStages[i % otherStages.length];
        skills[crossStageId] = ((i % 2) + 3) as SkillLevel; // level 3 or 4 cross-trained!
      }
    }

    workers.push({
      id: `w-${i}`,
      empCode,
      name: `${fName} ${lName}`,
      lineId,
      shift,
      targetStagesCount: DEFAULT_WORKER_FLEXIBILITY_TARGET,
      minProficiencyTarget: DEFAULT_MIN_QUALIFIED_LEVEL,
      skills,
      hireDate: `202${(i % 5) + 1}-0${(i % 9) + 1}-15`,
      notes: i % 12 === 0 ? 'مرشح لدورة تدريبية متقدمة في الجودة' : undefined
    });
  }

  return workers;
}
