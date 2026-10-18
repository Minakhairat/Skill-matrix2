import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProductionLine, Model, Worker, SkillLevel, Stage } from './types/matrix';
import { generateInitialLines, generate400Workers } from './utils/mockGenerator';
import { 
  DEFAULT_WORKSTATION_TARGET, 
  DEFAULT_WORKER_FLEXIBILITY_TARGET, 
  DEFAULT_MIN_QUALIFIED_LEVEL,
  STORAGE_KEY_WORKERS,
  STORAGE_KEY_LINES,
  STORAGE_KEY_SETTINGS
} from './utils/constants';
import { Header } from './components/Header';
import { LineModelBar } from './components/LineModelBar';
import { SkillsMatrixGrid } from './components/SkillsMatrixGrid';
import { GapAnalysisDashboard } from './components/GapAnalysisDashboard';
import { WorkerProfilesView } from './components/WorkerProfilesView';
import { PrintReportView } from './components/PrintReportView';
import { TargetSettingsModal } from './components/TargetSettingsModal';
import { ImportExportModal } from './components/ImportExportModal';
import { WorkerEditModal } from './components/WorkerEditModal';
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

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'matrix' | 'balancing' | 'workers' | 'print'>('matrix');
  const [selectedLineId, setSelectedLineId] = useState<string>(lines[0]?.id || 'LINE-A');
  const [selectedModelId, setSelectedModelId] = useState<string>(lines[0]?.models[0]?.id || 'MOD-A1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');

  // Modals State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isAddWorkerOpen, setIsAddWorkerOpen] = useState(false);
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

  // Handlers
  const handleUpdateWorkerSkill = useCallback((workerId: string, stageId: string, newLevel: SkillLevel) => {
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
  }, []);

  const handleTransferWorkerLine = useCallback((workerId: string, targetLineId: string) => {
    setWorkers(prev => prev.map(w => {
      if (w.id === workerId) {
        return { ...w, lineId: targetLineId };
      }
      return w;
    }));
  }, []);

  const handleSaveNewWorker = (newWorker: Worker) => {
    setWorkers(prev => [newWorker, ...prev]);
  };

  const handleImportSuccess = (newWorkers: Worker[]) => {
    setWorkers(prev => {
      // Merge or update existing by empCode
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
  };

  const handleReset400Workers = () => {
    const freshLines = generateInitialLines();
    const freshWorkers = generate400Workers(freshLines);
    setLines(freshLines);
    setWorkers(freshWorkers);
    setSelectedLineId(freshLines[0].id);
    setSelectedModelId(freshLines[0].models[0].id);
  };

  const handleApplyToAllStages = () => {
    // When user changes global target (e.g. 5 workers, 3 stages), update state
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
        onOpenAddWorker={() => setIsAddWorkerOpen(true)}
        onResetSampleData={handleReset400Workers}
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

        {activeTab === 'workers' && (
          <WorkerProfilesView
            workers={filteredLineWorkers}
            stages={currentStages}
            onUpdateWorkerSkill={handleUpdateWorkerSkill}
            selectedWorkerForModal={selectedWorkerForModal}
            onOpenWorkerModal={(worker) => setSelectedWorkerForModal(worker)}
            onCloseWorkerModal={() => setSelectedWorkerForModal(null)}
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
        isOpen={isAddWorkerOpen}
        onClose={() => setIsAddWorkerOpen(false)}
        onSaveWorker={handleSaveNewWorker}
        lines={lines}
        currentLineId={selectedLine.id}
        stages={currentStages}
      />

    </div>
  );
}
