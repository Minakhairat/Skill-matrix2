import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProductionLine, Model, Worker, SkillLevel, Stage, AuditLogEntry, ActionType } from './types/matrix';
import { generateInitialLines, generate400Workers } from './utils/mockGenerator';
import { 
  DEFAULT_WORKSTATION_TARGET, 
  DEFAULT_WORKER_FLEXIBILITY_TARGET, 
  DEFAULT_MIN_QUALIFIED_LEVEL,
  STORAGE_KEY_WORKERS,
  STORAGE_KEY_LINES,
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_HISTORY
} from './utils/constants';
import { loadInitialLogs, getActionTypeMeta } from './utils/historyLogger';
import { Header } from './components/Header';
import { LineModelBar } from './components/LineModelBar';
import { SkillsMatrixGrid } from './components/SkillsMatrixGrid';
import { GapAnalysisDashboard } from './components/GapAnalysisDashboard';
import { ShiftPerformanceView } from './components/ShiftPerformanceView';
import { WorkerProfilesView } from './components/WorkerProfilesView';
import { PrintReportView } from './components/PrintReportView';
import { TargetSettingsModal } from './components/TargetSettingsModal';
import { ImportExportModal } from './components/ImportExportModal';
import { WorkerEditModal } from './components/WorkerEditModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { HistoryModal } from './components/HistoryModal';
import { Footer } from './components/Footer';
import { calculateWorkerFlexibility } from './utils/matrixCalculations';

export default function App() {
  // 1. Core State
  const [lines, setLines] = useState<ProductionLine[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LINES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved lines', e);
    }
    return generateInitialLines();
  });

  const [workers, setWorkers] = useState<Worker[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WORKERS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved workers', e);
    }
    const initialLines = generateInitialLines();
    return generate400Workers(initialLines);
  });

  // Settings State
  const [targetWorkersPerStage, setTargetWorkersPerStage] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.targetWorkersPerStage ?? DEFAULT_WORKSTATION_TARGET;
      }
    } catch (e) {}
    return DEFAULT_WORKSTATION_TARGET;
  });

  const [targetStagesPerWorker, setTargetStagesPerWorker] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.targetStagesPerWorker ?? DEFAULT_WORKER_FLEXIBILITY_TARGET;
      }
    } catch (e) {}
    return DEFAULT_WORKER_FLEXIBILITY_TARGET;
  });

  const [minQualifiedLevel, setMinQualifiedLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.minQualifiedLevel ?? DEFAULT_MIN_QUALIFIED_LEVEL;
      }
    } catch (e) {}
    return DEFAULT_MIN_QUALIFIED_LEVEL;
  });

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => {
    return loadInitialLogs();
  });

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'matrix' | 'balancing' | 'performance' | 'workers' | 'print'>('matrix');
  const [selectedLineId, setSelectedLineId] = useState<string>(lines[0]?.id || 'LINE-A');
  const [selectedModelId, setSelectedModelId] = useState<string>(lines[0]?.models[0]?.id || 'MOD-A1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');

  // Modals State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isWorkerEditOpen, setIsWorkerEditOpen] = useState(false);
  const [workerToEdit, setWorkerToEdit] = useState<Worker | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedWorkerForModal, setSelectedWorkerForModal] = useState<Worker | null>(null);

  // Persistence to LocalStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_WORKERS, JSON.stringify(workers));
    } catch (e) {
      console.warn('LocalStorage limit reached or disabled', e);
    }
  }, [workers]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LINES, JSON.stringify(lines));
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }, [lines]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SETTINGS,
        JSON.stringify({ targetWorkersPerStage, targetStagesPerWorker, minQualifiedLevel })
      );
    } catch (e) {}
  }, [targetWorkersPerStage, targetStagesPerWorker, minQualifiedLevel]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(logs));
    } catch (e) {}
  }, [logs]);

  // Helper to add audit logs
  const logAction = useCallback((actionType: ActionType, title: string, details: string) => {
    const meta = getActionTypeMeta(actionType);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + now.toLocaleDateString('ar-EG');
    
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: timeStr,
      actionType,
      title,
      details,
      badgeLabel: meta.label,
      badgeClass: meta.badgeClass
    };

    setLogs(prev => [newEntry, ...prev.slice(0, 99)]); // Keep last 100 entries
  }, []);

  // Active Line & Model Objects
  const selectedLine = useMemo(() => {
    return lines.find(l => l.id === selectedLineId) || lines[0];
  }, [lines, selectedLineId]);

  const selectedModel = useMemo(() => {
    return selectedLine.models.find(m => m.id === selectedModelId) || selectedLine.models[0];
  }, [selectedLine, selectedModelId]);

  // Synchronize model if line changes
  const handleSelectLine = (line: ProductionLine) => {
    setSelectedLineId(line.id);
    if (line.models.length > 0) {
      setSelectedModelId(line.models[0].id);
    }
  };

  // Line Workers (Filtered by line, shift, and search)
  const lineWorkers = useMemo(() => {
    return workers.filter(w => w.lineId === selectedLine.id);
  }, [workers, selectedLine.id]);

  const filteredLineWorkers = useMemo(() => {
    return lineWorkers.filter(w => {
      if (selectedShift !== 'ALL' && w.shift !== selectedShift) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = w.name.toLowerCase().includes(q);
        const matchesCode = w.empCode.toLowerCase().includes(q);
        if (!matchesName && !matchesCode) return false;
      }
      return true;
    });
  }, [lineWorkers, selectedShift, searchQuery]);

  // Stages of currently selected model
  const currentStages = useMemo(() => {
    return selectedModel.stages.map(stage => ({
      ...stage,
      targetWorkersCount: targetWorkersPerStage,
      minRequiredLevel: minQualifiedLevel as SkillLevel
    }));
  }, [selectedModel, targetWorkersPerStage, minQualifiedLevel]);

  // Handlers with audit logging
  const handleUpdateWorkerSkill = useCallback((workerId: string, stageId: string, newLevel: SkillLevel) => {
    const targetWorker = workers.find(w => w.id === workerId);
    const targetStage = currentStages.find(s => s.id === stageId);
    const oldLevel = targetWorker ? (targetWorker.skills[stageId] ?? 0) : 0;

    setWorkers(prevWorkers => {
      return prevWorkers.map(w => {
        if (w.id === workerId) {
          const updatedSkills = { ...w.skills, [stageId]: newLevel };
          return { ...w, skills: updatedSkills };
        }
        return w;
      });
    });

    // Also update modal worker if open
    setSelectedWorkerForModal(prev => {
      if (prev && prev.id === workerId) {
        return {
          ...prev,
          skills: { ...prev.skills, [stageId]: newLevel }
        };
      }
      return prev;
    });

    if (targetWorker && targetStage) {
      logAction(
        'skill_update',
        `تعديل مهارة العامل ${targetWorker.name}`,
        `تم تعديل التقييم في مرحلة "${targetStage.name}" من المستوى ${oldLevel} إلى المستوى ${newLevel}.`
      );
    }
  }, [workers, currentStages, logAction]);

  const handleTransferWorkerLine = useCallback((workerId: string, targetLineId: string) => {
    const targetWorker = workers.find(w => w.id === workerId);
    const targetLine = lines.find(l => l.id === targetLineId);

    setWorkers(prev => prev.map(w => {
      if (w.id === workerId) {
        return { ...w, lineId: targetLineId };
      }
      return w;
    }));

    if (targetWorker && targetLine) {
      logAction(
        'rebalance',
        `نقل العامل ${targetWorker.name} لسد العجز`,
        `تم تحويل العامل ${targetWorker.name} (${targetWorker.empCode}) إلى خط "${targetLine.name}".`
      );
    }
  }, [workers, lines, logAction]);

  const handleSaveWorker = (savedWorker: Worker) => {
    const exists = workers.some(w => w.id === savedWorker.id);
    if (exists) {
      // Edit existing
      setWorkers(prev => prev.map(w => w.id === savedWorker.id ? savedWorker : w));
      logAction(
        'worker_edited',
        `تعديل بيانات العامل ${savedWorker.name}`,
        `تم تحديث بيانات العامل ${savedWorker.name} (الكود: ${savedWorker.empCode}) والوردية ${savedWorker.shift}.`
      );
    } else {
      // Add new
      setWorkers(prev => [savedWorker, ...prev]);
      logAction(
        'worker_added',
        `إضافة العامل الجديد ${savedWorker.name}`,
        `تم تسجيل العامل (الكود: ${savedWorker.empCode}) على خط ${selectedLine.name} في الوردية ${savedWorker.shift}.`
      );
    }
    setWorkerToEdit(null);
  };

  const handleDeleteWorker = (workerId: string) => {
    const targetWorker = workers.find(w => w.id === workerId);
    setWorkers(prev => prev.filter(w => w.id !== workerId));
    if (targetWorker) {
      logAction(
        'worker_deleted',
        `حذف العامل ${targetWorker.name}`,
        `تم حذف العامل ${targetWorker.name} (${targetWorker.empCode}) وكافة تقييماته نهائياً من النظام.`
      );
    }
    setWorkerToDelete(null);
    if (selectedWorkerForModal?.id === workerId) {
      setSelectedWorkerForModal(null);
    }
  };

  const handleClearAllData = () => {
    setWorkers([]);
    logAction(
      'all_cleared',
      'مسح شامل لكافة بيانات العمال',
      'تم مسح كافة سجلات العمال ومصفوفة المهارات بالكامل من المتصفح.'
    );
  };

  const handleClearHistory = () => {
    setLogs([]);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  };

  const handleImportSuccess = (newWorkers: Worker[]) => {
    setWorkers(prev => {
      const updated = [...prev];
      newWorkers.forEach(nw => {
        const idx = updated.findIndex(u => u.empCode === nw.empCode);
        if (idx !== -1) {
          updated[idx] = { ...updated[idx], ...nw };
        } else {
          updated.push(nw);
        }
      });
      return updated;
    });

    logAction(
      'data_imported',
      `استيراد ${newWorkers.length} عامل من ملف Excel`,
      `تم استيراد وتحديث تقييمات ${newWorkers.length} عامل بنجاح في خط الإنتاج.`
    );
  };

  const handleReset400Workers = () => {
    const freshLines = generateInitialLines();
    const freshWorkers = generate400Workers(freshLines);
    setLines(freshLines);
    setWorkers(freshWorkers);
    setSelectedLineId(freshLines[0].id);
    setSelectedModelId(freshLines[0].models[0].id);

    logAction(
      'data_imported',
      'استعادة الـ 400 عامل التجريبيين',
      'تمت إعادة توليد 400 عامل واقعي موزعين على كافة خطوط الإنتاج والورديات.'
    );
  };

  const handleApplyToAllStages = () => {
    setLines(prevLines => {
      return prevLines.map(line => ({
        ...line,
        models: line.models.map(model => ({
          ...model,
          stages: model.stages.map(stage => ({
            ...stage,
            targetWorkersCount: targetWorkersPerStage,
            minRequiredLevel: minQualifiedLevel as SkillLevel
          }))
        }))
      }));
    });

    logAction(
      'target_changed',
      'تحديث معايير وأهداف الخطوط',
      `تم تطبيق هدف ${targetWorkersPerStage} عمال لكل مرحلة، والمستوى ${minQualifiedLevel} كحد أدنى، ومرونة ${targetStagesPerWorker} مراحل للعامل.`
    );
  };

  // Qualified workers meeting flexibility target on this line
  const qualifiedWorkersMeetingTarget = useMemo(() => {
    return lineWorkers.filter(w => {
      const flex = calculateWorkerFlexibility(w, currentStages, minQualifiedLevel, targetStagesPerWorker);
      return flex.isTargetMet;
    }).length;
  }, [lineWorkers, currentStages, minQualifiedLevel, targetStagesPerWorker]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900" dir="rtl">
      
      {/* 3-Zone Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onOpenAddWorker={() => {
          setWorkerToEdit(null);
          setIsWorkerEditOpen(true);
        }}
        onResetSampleData={handleReset400Workers}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenClearAllModal={() => setIsClearAllModalOpen(true)}
        totalWorkersCount={workers.length}
      />

      {/* Production Line, Model & Shift Toolbar */}
      <LineModelBar
        lines={lines}
        selectedLine={selectedLine}
        onSelectLine={handleSelectLine}
        selectedModel={selectedModel}
        onSelectModel={(model) => setSelectedModelId(model.id)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedShift={selectedShift}
        onSelectShift={setSelectedShift}
        workerCountOnLine={lineWorkers.length}
        totalLineStagesCount={currentStages.length}
        targetWorkersPerStage={targetWorkersPerStage}
        qualifiedWorkersMeetingTarget={qualifiedWorkersMeetingTarget}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-6 lg:p-8 flex flex-col">
        {activeTab === 'matrix' && (
          <div className="flex-1 flex flex-col min-h-[500px]">
            <SkillsMatrixGrid
              workers={filteredLineWorkers}
              stages={currentStages}
              onUpdateWorkerSkill={handleUpdateWorkerSkill}
              onSelectWorkerDetails={(worker) => setSelectedWorkerForModal(worker)}
              onEditWorker={(worker) => {
                setWorkerToEdit(worker);
                setIsWorkerEditOpen(true);
              }}
              onDeleteWorker={(worker) => setWorkerToDelete(worker)}
            />
          </div>
        )}

        {activeTab === 'balancing' && (
          <GapAnalysisDashboard
            stages={currentStages}
            lineWorkers={lineWorkers}
            allWorkers={workers}
            lineName={selectedLine.name}
            currentLineId={selectedLine.id}
            onUpdateWorkerSkill={handleUpdateWorkerSkill}
            onTransferWorkerLine={handleTransferWorkerLine}
          />
        )}

        {activeTab === 'performance' && (
          <ShiftPerformanceView
            line={selectedLine}
            model={selectedModel}
            stages={currentStages}
            lineWorkers={lineWorkers}
            onOpenWorkerModal={(worker) => setSelectedWorkerForModal(worker)}
          />
        )}

        {activeTab === 'workers' && (
          <WorkerProfilesView
            workers={filteredLineWorkers}
            stages={currentStages}
            onUpdateWorkerSkill={handleUpdateWorkerSkill}
            selectedWorkerForModal={selectedWorkerForModal}
            onOpenWorkerModal={(worker) => setSelectedWorkerForModal(worker)}
            onCloseWorkerModal={() => setSelectedWorkerForModal(null)}
            onEditWorker={(worker) => {
              setWorkerToEdit(worker);
              setIsWorkerEditOpen(true);
            }}
            onDeleteWorker={(worker) => setWorkerToDelete(worker)}
          />
        )}

        {activeTab === 'print' && (
          <PrintReportView
            line={selectedLine}
            model={selectedModel}
            stages={currentStages}
            workers={lineWorkers}
          />
        )}
      </main>

      {/* Modals & Dialogs */}
      <TargetSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        targetWorkersPerStage={targetWorkersPerStage}
        onUpdateTargetWorkersPerStage={setTargetWorkersPerStage}
        targetStagesPerWorker={targetStagesPerWorker}
        onUpdateTargetStagesPerWorker={setTargetStagesPerWorker}
        minQualifiedLevel={minQualifiedLevel}
        onUpdateMinQualifiedLevel={setMinQualifiedLevel}
        onApplyToAllStages={handleApplyToAllStages}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        stages={currentStages}
        workers={workers}
        lineName={selectedLine.name}
        modelName={selectedModel.name}
        currentLineId={selectedLine.id}
        onImportSuccess={handleImportSuccess}
        onReset400Workers={handleReset400Workers}
      />

      <WorkerEditModal
        isOpen={isWorkerEditOpen}
        onClose={() => {
          setIsWorkerEditOpen(false);
          setWorkerToEdit(null);
        }}
        onSaveWorker={handleSaveWorker}
        workerToEdit={workerToEdit}
        lines={lines}
        currentLineId={selectedLine.id}
        stages={currentStages}
      />

      <ConfirmDeleteModal
        isOpen={Boolean(workerToDelete) || isClearAllModalOpen}
        onClose={() => {
          setWorkerToDelete(null);
          setIsClearAllModalOpen(false);
        }}
        workerToDelete={workerToDelete}
        onConfirmDeleteWorker={handleDeleteWorker}
        isClearAllMode={isClearAllModalOpen}
        onConfirmClearAll={handleClearAllData}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        logs={logs}
        onClearHistory={handleClearHistory}
      />

      {/* Dedicated Engineering Footer */}
      <Footer />

    </div>
  );
}
