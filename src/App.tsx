import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ProductionLine, Model, Worker, SkillLevel, Stage, AuditLogEntry, ActionType, TerminologyConfig, PlantLeadership, FullSystemBackup, AppUser } from './types/matrix';
import { generateInitialLines, generate400Workers } from './utils/mockGenerator';
import { 
  DEFAULT_WORKSTATION_TARGET, 
  DEFAULT_WORKER_FLEXIBILITY_TARGET, 
  DEFAULT_MIN_QUALIFIED_LEVEL,
  DEFAULT_TERMINOLOGY,
  DEFAULT_LEADERSHIP,
  STORAGE_KEY_WORKERS,
  STORAGE_KEY_LINES,
  STORAGE_KEY_SETTINGS,
  STORAGE_KEY_HISTORY,
  STORAGE_KEY_TERMINOLOGY,
  STORAGE_KEY_LEADERSHIP
} from './utils/constants';
import { loadInitialLogs, getActionTypeMeta } from './utils/historyLogger';
import { Header, TabType } from './components/Header';
import { LineModelBar } from './components/LineModelBar';
import { SkillsMatrixGrid } from './components/SkillsMatrixGrid';
import { GapAnalysisDashboard } from './components/GapAnalysisDashboard';
import { ShiftPerformanceView } from './components/ShiftPerformanceView';
import { WorkerProfilesView } from './components/WorkerProfilesView';
import { AIAdvisorView } from './components/AIAdvisorView';
import { FactorySetupView } from './components/FactorySetupView';
import { PrintReportView } from './components/PrintReportView';
import { TargetSettingsModal } from './components/TargetSettingsModal';
import { ImportExportModal } from './components/ImportExportModal';
import { WorkerEditModal } from './components/WorkerEditModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { HistoryModal } from './components/HistoryModal';
import { GeminiApiKeyModal } from './components/GeminiApiKeyModal';
import { AuthModal } from './components/AuthModal';
import { 
  testConnection, 
  auth, 
  onAuthStateChanged, 
  resolveUserPermissions, 
  setupRealtimeSync,
  syncFullDatasetToFirestore,
  updateWorkerInFirestore,
  deleteWorkerFromFirestore,
  updateLineInFirestore,
  deleteLineFromFirestore,
  clearAllWorkersFromFirestore,
  saveSupervisorEmailToFirestore,
  fetchFullDatasetFromFirestore,
  logoutUser
} from './utils/firebase';
import { Bot, MessageSquare, Cloud, ShieldCheck, UserCheck, AlertTriangle, RefreshCw, CheckCircle2, Lock } from 'lucide-react';
import { GeminiAIChatView } from './components/GeminiAIChatView';
import { Footer } from './components/Footer';
import { calculateWorkerFlexibility } from './utils/matrixCalculations';

export default function App() {
  // 1. Core State
  const [lines, setLines] = useState<ProductionLine[]>(() => {
    try {
      const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('matrixpro_logged_out') === 'true';
      if (isLoggedOut) return [];
      const saved = localStorage.getItem(STORAGE_KEY_LINES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved lines', e);
    }
    return generateInitialLines();
  });

  const [workers, setWorkers] = useState<Worker[]>(() => {
    try {
      const isLoggedOut = typeof window !== 'undefined' && localStorage.getItem('matrixpro_logged_out') === 'true';
      if (isLoggedOut) return [];
      const saved = localStorage.getItem(STORAGE_KEY_WORKERS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
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

  // Terminology State (خطوط vs ماكينات / موديلات vs اسطمبات)
  const [terminology, setTerminology] = useState<TerminologyConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TERMINOLOGY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_TERMINOLOGY;
  });

  // Plant Leadership State (مشرفو الخطوط، المهندس، مدير الإدارة)
  const [leadership, setLeadership] = useState<PlantLeadership>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LEADERSHIP);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return DEFAULT_LEADERSHIP;
  });

  // Audit Logs State
  const [logs, setLogs] = useState<AuditLogEntry[]>(() => {
    return loadInitialLogs();
  });

  // Navigation & View State
  const [activeTab, setActiveTab] = useState<TabType>('matrix');
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
  const [isFloatingChatOpen, setIsFloatingChatOpen] = useState(false);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('matrixpro_current_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncSuccessMsg, setCloudSyncSuccessMsg] = useState<string | null>(null);

  // Helper to load full cloud dataset for user
  const loadCloudDataForUser = useCallback(async (user: AppUser) => {
    setIsCloudSyncing(true);
    try {
      localStorage.removeItem('matrixpro_logged_out');
      const dataset = await fetchFullDatasetFromFirestore();
      if (dataset.hasData && dataset.lines.length > 0) {
        setLines(dataset.lines);
        setWorkers(dataset.workers);
        if (dataset.settings) {
          if (dataset.settings.targetWorkersPerStage) setTargetWorkersPerStage(dataset.settings.targetWorkersPerStage);
          if (dataset.settings.targetStagesPerWorker) setTargetStagesPerWorker(dataset.settings.targetStagesPerWorker);
          if (dataset.settings.minQualifiedLevel) setMinQualifiedLevel(dataset.settings.minQualifiedLevel);
        }
        if (dataset.terminology) setTerminology(dataset.terminology);
        if (dataset.leadership) setLeadership(dataset.leadership);

        // Supervisor line matching from cloud lines
        const userAssigned = dataset.lines.filter(l => 
          (l.supervisorEmail || '').toLowerCase().trim() === user.email.toLowerCase().trim() ||
          user.assignedLineIds.includes(l.id)
        ).map(l => l.id);

        const allAssigned = Array.from(new Set([...user.assignedLineIds, ...userAssigned]));
        const updatedUser: AppUser = {
          ...user,
          assignedLineIds: allAssigned
        };
        setCurrentUser(updatedUser);
        try {
          localStorage.setItem('matrixpro_current_user', JSON.stringify(updatedUser));
        } catch (e) {}

        if (updatedUser.role === 'supervisor') {
          if (allAssigned.length > 0) {
            setSelectedLineId(allAssigned[0]);
            const targetLine = dataset.lines.find(l => l.id === allAssigned[0]);
            if (targetLine && targetLine.models.length > 0) {
              setSelectedModelId(targetLine.models[0].id);
            }
          }
        } else if (dataset.lines.length > 0) {
          setSelectedLineId(dataset.lines[0].id);
          if (dataset.lines[0].models.length > 0) {
            setSelectedModelId(dataset.lines[0].models[0].id);
          }
        }

        setCloudSyncSuccessMsg(`تم استرجاع ومزامنة البيانات السحابية بنجاح (${dataset.workers.length} عامل و ${dataset.lines.length} خطوط) ✓`);
        setTimeout(() => setCloudSyncSuccessMsg(null), 4000);
      } else {
        // Cloud is empty, initialize default if user is admin and push to cloud!
        if (user.role === 'admin') {
          const freshLines = generateInitialLines();
          const freshWorkers = generate400Workers(freshLines);
          setLines(freshLines);
          setWorkers(freshWorkers);
          setSelectedLineId(freshLines[0].id);
          setSelectedModelId(freshLines[0].models[0].id);

          syncFullDatasetToFirestore({
            lines: freshLines,
            workers: freshWorkers,
            settings: { targetWorkersPerStage, targetStagesPerWorker, minQualifiedLevel },
            terminology,
            leadership
          }).then(res => {
            setCloudSyncSuccessMsg(`تمت تهيئة قاعدة البيانات السحابية ورفع ${res.workersCount} عامل أونلاين بنجاح ✓`);
            setTimeout(() => setCloudSyncSuccessMsg(null), 4000);
          }).catch(err => console.warn('Could not auto-seed cloud data:', err));
        } else {
          setCloudSyncSuccessMsg('قاعدة البيانات السحابية فارغة حالياً. يرجى من الأدمن تسجيل الدخول ورفع بيانات المصنع.');
          setTimeout(() => setCloudSyncSuccessMsg(null), 5000);
        }
      }
    } catch (e: any) {
      console.warn('Error loading cloud data for user:', e);
    } finally {
      setIsCloudSyncing(false);
    }
  }, [targetWorkersPerStage, targetStagesPerWorker, minQualifiedLevel, terminology, leadership]);

  // Complete Signout Handler: wipes all browser storage & state clean
  const handleSignOutUser = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.warn('Error during firebase signout:', e);
    }
    // 1. Wipe auth user
    setCurrentUser(null);
    // 2. Mark explicit logged out flag and wipe browser local storage completely
    try {
      localStorage.setItem('matrixpro_logged_out', 'true');
      localStorage.removeItem('matrixpro_current_user');
      localStorage.removeItem(STORAGE_KEY_WORKERS);
      localStorage.removeItem(STORAGE_KEY_LINES);
      localStorage.removeItem(STORAGE_KEY_SETTINGS);
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      localStorage.removeItem(STORAGE_KEY_TERMINOLOGY);
      localStorage.removeItem(STORAGE_KEY_LEADERSHIP);
    } catch (e) {}

    // 3. Reset React state to empty/clean slate
    setWorkers([]);
    setLines([]);
    setLogs([]);
    setSelectedLineId('');
    setSelectedModelId('');
    setCloudSyncSuccessMsg('تم تسجيل الخروج وتفريغ كافة بيانات المتصفح بنجاح لضمان الأمان.');
    setTimeout(() => setCloudSyncSuccessMsg(null), 4000);
  };

  // Initial Firestore Connection Test & Auth Observer
  useEffect(() => {
    testConnection();
    const unsubAuth = onAuthStateChanged(auth, async (fbUser) => {
      const isLoggedOut = localStorage.getItem('matrixpro_logged_out') === 'true';
      if (fbUser && !isLoggedOut) {
        const resolved = await resolveUserPermissions(fbUser, lines, currentUser?.role);
        setCurrentUser(resolved);
        try {
          localStorage.setItem('matrixpro_current_user', JSON.stringify(resolved));
        } catch (e) {}
        await loadCloudDataForUser(resolved);
      }
    });
    return () => unsubAuth();
  }, [loadCloudDataForUser]);

  // Real-time synchronization when user is authenticated
  useEffect(() => {
    if (!currentUser) return;
    const unsubRealtime = setupRealtimeSync({
      onLinesUpdate: (cloudLines) => {
        if (cloudLines && cloudLines.length > 0) {
          setLines(cloudLines);
        }
      },
      onWorkersUpdate: (cloudWorkers) => {
        // Always reflect workers update (including empty if deleted from online database)
        setWorkers(cloudWorkers || []);
      },
      onError: (err) => {
        console.warn('Realtime sync status:', err);
      }
    });
    return () => unsubRealtime();
  }, [currentUser]);

  // If supervisor logs in and has assigned line, ensure selectedLineId is their line
  useEffect(() => {
    if (currentUser?.role === 'supervisor' && currentUser.assignedLineIds.length > 0) {
      if (!currentUser.assignedLineIds.includes(selectedLineId)) {
        setSelectedLineId(currentUser.assignedLineIds[0]);
      }
    }
  }, [currentUser, selectedLineId]);

  // Persistence to LocalStorage (only when not in explicit logged-out state)
  useEffect(() => {
    try {
      const isLoggedOut = localStorage.getItem('matrixpro_logged_out') === 'true';
      if (isLoggedOut || workers.length === 0) return;
      localStorage.setItem(STORAGE_KEY_WORKERS, JSON.stringify(workers));
    } catch (e) {
      console.warn('LocalStorage limit reached or disabled', e);
    }
  }, [workers]);

  useEffect(() => {
    try {
      const isLoggedOut = localStorage.getItem('matrixpro_logged_out') === 'true';
      if (isLoggedOut || lines.length === 0) return;
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
      localStorage.setItem(STORAGE_KEY_TERMINOLOGY, JSON.stringify(terminology));
    } catch (e) {}
  }, [terminology]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LEADERSHIP, JSON.stringify(leadership));
    } catch (e) {}
  }, [leadership]);

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
    return selectedLine?.models.find(m => m.id === selectedModelId) || selectedLine?.models[0];
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
    if (!selectedLine) return [];
    return workers.filter(w => w.lineId === selectedLine.id);
  }, [workers, selectedLine]);

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
    if (!selectedModel) return [];
    return selectedModel.stages.map(stage => ({
      ...stage,
      targetWorkersCount: stage.targetWorkersCount || targetWorkersPerStage,
      minRequiredLevel: stage.minRequiredLevel || (minQualifiedLevel as SkillLevel)
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
        `تم تعديل التقييم في ${terminology.stageLabel} "${targetStage.name}" من المستوى ${oldLevel} إلى المستوى ${newLevel}.`
      );
    }

    if (currentUser) {
      const targetWorker = workers.find(w => w.id === workerId);
      if (targetWorker) {
        const withNew = { ...targetWorker, skills: { ...targetWorker.skills, [stageId]: newLevel } };
        updateWorkerInFirestore(withNew).catch(err => console.warn('Could not sync worker skill to Firestore:', err));
      }
    }
  }, [workers, currentStages, logAction, terminology, currentUser]);

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
        `تم تحويل العامل ${targetWorker.name} (${targetWorker.empCode}) إلى ${terminology.lineLabel} "${targetLine.name}".`
      );
    }
  }, [workers, lines, logAction, terminology]);

  // Check if current user is permitted to edit this line
  const isCurrentLinePermitted = useMemo(() => {
    if (!currentUser || currentUser.role === 'admin') return true;
    return (
      currentUser.assignedLineIds.includes(selectedLineId) ||
      (selectedLine?.supervisorEmail && selectedLine.supervisorEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim())
    );
  }, [currentUser, selectedLineId, selectedLine]);

  // Cloud Database Full Push (Admin feature)
  const handlePushFullDataToCloud = async () => {
    try {
      setIsCloudSyncing(true);
      const res = await syncFullDatasetToFirestore({
        lines,
        workers,
        settings: { targetWorkersPerStage, targetStagesPerWorker, minQualifiedLevel },
        terminology,
        leadership
      });
      setCloudSyncSuccessMsg(`تم رفع ومزامنة ${res.linesCount} خطوط و ${res.workersCount} عمال بنجاح إلى سحابة Firestore!`);
      logAction('data_imported', 'مزامنة سحابية (Firestore)', `تم رفع قاعدة البيانات كاملة (${res.workersCount} عمال و ${res.linesCount} خطوط) إلى السحابة.`);
      setTimeout(() => setCloudSyncSuccessMsg(null), 4000);
    } catch (err: any) {
      console.error('Cloud push failed:', err);
      alert('تعذر الرفع إلى السحابة: ' + (err?.message || ''));
    } finally {
      setIsCloudSyncing(false);
    }
  };

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
        `تم تسجيل العامل (الكود: ${savedWorker.empCode}) على ${selectedLine?.name || terminology.lineLabel} في الوردية ${savedWorker.shift}.`
      );
    }
    setWorkerToEdit(null);

    if (currentUser) {
      updateWorkerInFirestore(savedWorker).catch(err => console.warn('Could not sync worker to Firestore:', err));
    }
  };

  const handleDeleteWorker = async (workerId: string) => {
    const targetWorker = workers.find(w => w.id === workerId);
    setWorkerToDelete(null);
    if (selectedWorkerForModal?.id === workerId) {
      setSelectedWorkerForModal(null);
    }

    if (currentUser) {
      try {
        await deleteWorkerFromFirestore(workerId);
        setWorkers(prev => prev.filter(w => w.id !== workerId));
        if (targetWorker) {
          logAction(
            'worker_deleted',
            `حذف العامل ${targetWorker.name}`,
            `تم حذف العامل ${targetWorker.name} (${targetWorker.empCode}) وكافة تقييماته نهائياً من النظام وقاعدة البيانات السحابية (Firestore).`
          );
        }
        setCloudSyncSuccessMsg(`تم حذف العامل (${targetWorker?.name || workerId}) بنجاح من قاعدة البيانات السحابية (Firestore) ✓`);
        setTimeout(() => setCloudSyncSuccessMsg(null), 3000);
      } catch (err: any) {
        console.error('Could not delete worker from Firestore:', err);
        alert('تعذر حذف العامل من قاعدة البيانات السحابية: ' + (err?.message || 'خطأ في الاتصال أو الصلاحيات'));
      }
    } else {
      setWorkers(prev => prev.filter(w => w.id !== workerId));
      if (targetWorker) {
        logAction(
          'worker_deleted',
          `حذف العامل ${targetWorker.name}`,
          `تم حذف العامل ${targetWorker.name} (${targetWorker.empCode}) محلياً من المتصفح.`
        );
      }
    }
  };

  const handleClearAllData = async () => {
    if (currentUser) {
      try {
        const isSupervisor = currentUser.role === 'supervisor';
        const targetLineId = isSupervisor ? selectedLineId : undefined;
        const lineName = lines.find(l => l.id === selectedLineId)?.name || 'الخط';

        const deletedCount = await clearAllWorkersFromFirestore(targetLineId);

        if (isSupervisor) {
          setWorkers(prev => prev.filter(w => w.lineId !== selectedLineId));
          setCloudSyncSuccessMsg(`تم مسح عمال ${lineName} (${deletedCount} عامل) نهائياً من سحابة Firestore أونلاين ومن المتصفح ✓`);
          logAction(
            'all_cleared',
            `مسح عمال ${lineName}`,
            `تم مسح كافة عمال ${lineName} (${deletedCount} عامل) نهائياً من قاعدة بيانات Firestore وسجلات المتصفح.`
          );
        } else {
          setWorkers([]);
          setCloudSyncSuccessMsg(`تم حذف جميع عمال المصنع (${deletedCount} عامل) نهائياً من قاعدة بيانات Firestore أونلاين والمتصفح ✓`);
          logAction(
            'all_cleared',
            'مسح شامل لكافة بيانات العمال',
            `تم مسح كافة سجلات العمال ومصفوفة المهارات بالكامل (${deletedCount} عامل) من المتصفح وقاعدة البيانات السحابية.`
          );
        }
        setTimeout(() => setCloudSyncSuccessMsg(null), 4000);
      } catch (err: any) {
        console.error('Failed to clear workers from Firestore:', err);
        alert('تعذر مسح البيانات من السحابة: ' + (err?.message || 'خطأ صلاحيات'));
      }
    } else {
      setWorkers([]);
      logAction(
        'all_cleared',
        'مسح شامل لكافة بيانات العمال محلياً',
        'تم مسح سجلات العمال من المتصفح.'
      );
    }
  };

  const handleSaveSupervisorEmail = async (lineId: string, supervisorName: string, supervisorEmail: string) => {
    const lineObj = lines.find(l => l.id === lineId);
    const normalizedEmail = (supervisorEmail || '').toLowerCase().trim();
    const updatedLine: ProductionLine = lineObj ? {
      ...lineObj,
      supervisor: supervisorName.trim() || lineObj.supervisor,
      supervisorEmail: normalizedEmail
    } : {
      id: lineId,
      name: lineId,
      nameEn: lineId,
      code: lineId,
      supervisor: supervisorName.trim(),
      supervisorEmail: normalizedEmail,
      models: []
    };

    setLines(prev => prev.map(l => l.id === lineId ? updatedLine : l));

    if (currentUser) {
      try {
        await saveSupervisorEmailToFirestore(updatedLine, supervisorName, normalizedEmail);
        setCloudSyncSuccessMsg(`تم اعتماد وحفظ إيميل المشرف (${normalizedEmail || 'بدون إيميل'}) للـ ${updatedLine.name} في السحابة بنجاح ✓`);
        setTimeout(() => setCloudSyncSuccessMsg(null), 4000);
      } catch (e: any) {
        console.warn('Failed to save supervisor email:', e);
      }
    }

    logAction(
      'target_changed',
      `اعتماد إيميل المشرف لـ ${updatedLine.name}`,
      `تم اعتماد المشرف ${supervisorName || updatedLine.supervisor} بحساب البريد (${normalizedEmail || 'بدون بريد'}) وحفظه في السحابة بنجاح.`
    );
  };

  const handleClearHistory = () => {
    setLogs([]);
    localStorage.removeItem(STORAGE_KEY_HISTORY);
  };

  const handleResetHistory = () => {
    const initialLogs = loadInitialLogs();
    setLogs(initialLogs);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(initialLogs));
    } catch (e) {}
    logAction(
      'target_changed',
      'إعادة السجل كما كان (استعادة السجل الأصلي)',
      'تمت إعادة ضبط سجل التدقيق والتعديلات إلى حالته الأصلية الافتراضية بنجاح.'
    );
  };

  const handleRestoreFullBackup = (backup: FullSystemBackup) => {
    if (backup.lines && backup.lines.length > 0) {
      setLines(backup.lines);
      setSelectedLineId(backup.lines[0].id);
      if (backup.lines[0].models[0]) {
        setSelectedModelId(backup.lines[0].models[0].id);
      }
    }
    if (backup.workers) {
      setWorkers(backup.workers);
    }
    if (backup.settings) {
      if (backup.settings.targetWorkersPerStage) setTargetWorkersPerStage(backup.settings.targetWorkersPerStage);
      if (backup.settings.targetStagesPerWorker) setTargetStagesPerWorker(backup.settings.targetStagesPerWorker);
      if (backup.settings.minQualifiedLevel) setMinQualifiedLevel(backup.settings.minQualifiedLevel);
    }
    if (backup.terminology) {
      setTerminology(backup.terminology);
    }
    if (backup.leadership) {
      setLeadership(backup.leadership);
    }
    if (backup.logs && backup.logs.length > 0) {
      setLogs(backup.logs);
    }

    logAction(
      'data_imported',
      'استعادة نسخة احتياطية شاملة للنظام',
      `تمت استعادة كافة بيانات المصنع بنجاح (${backup.workers?.length || 0} عامل، ${backup.lines?.length || 0} ${backup.terminology?.lineLabelPlural || terminology.lineLabelPlural}).`
    );
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
      `تم استيراد وتحديث تقييمات ${newWorkers.length} عامل بنجاح في ${terminology.lineLabel}.`
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
      `تمت إعادة توليد 400 عامل واقعي موزعين على كافة ${terminology.lineLabelPlural} والورديات.`
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
      `تحديث معايير وأهداف ${terminology.lineLabelPlural}`,
      `تم تطبيق هدف ${targetWorkersPerStage} عمال لكل ${terminology.stageLabel}، والمستوى ${minQualifiedLevel} كحد أدنى، ومرونة ${targetStagesPerWorker} ${terminology.stageLabelPlural} للعامل.`
    );
  };

  const handleUpdateTerminology = (newTerm: TerminologyConfig) => {
    setTerminology(newTerm);
    logAction(
      'target_changed',
      'تغيير نمط ومصطلحات المصنع',
      `تم تغيير المصطلحات المعتمدة إلى: (${newTerm.lineLabel} / ${newTerm.modelLabel} / ${newTerm.stageLabel}).`
    );
  };

  const handleUpdateLines = (newLines: ProductionLine[]) => {
    const removedLines = lines.filter(oldLine => !newLines.some(nl => nl.id === oldLine.id));
    setLines(newLines);
    logAction(
      'target_changed',
      `تحديث بنية ${terminology.lineLabelPlural} والاسطمبات`,
      `تم حفظ التغييرات على قائمة ${terminology.lineLabelPlural} و ${terminology.modelLabelPlural} و ${terminology.stageLabelPlural}.`
    );
    if (currentUser) {
      // 1. Delete removed lines & their workers from Firestore
      for (const rem of removedLines) {
        deleteLineFromFirestore(rem.id).catch(err => console.warn('Could not delete line from Firestore:', err));
      }
      // 2. Sync remaining lines
      for (const line of newLines) {
        const isPermitted = currentUser.role === 'admin' || 
          currentUser.assignedLineIds.includes(line.id) ||
          (line.supervisorEmail && line.supervisorEmail.toLowerCase().trim() === currentUser.email.toLowerCase().trim());

        if (isPermitted) {
          updateLineInFirestore(line).catch(err => console.warn('Could not sync line to Firestore:', err));
        }
      }
    }
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
      
      {/* Top Responsive Navigation Bar */}
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
        terminology={terminology}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Cloud & Offline Connectivity Status Alert Banner */}
      <div className="bg-slate-100 border-b border-slate-200 text-xs no-print">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-2">
          {currentUser ? (
            currentUser.role === 'admin' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-purple-50/80 border border-purple-200/80 p-2.5 rounded-xl text-purple-950">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-purple-600 text-white rounded-lg shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>أنت تعمل بصلاحيات مدير النظام (Admin)</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        متصل بسحابة Firestore 🌐
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-800 mt-0.5">
                      البيانات تُحفظ وتُزامن أونلاين. يمكنك تعيين إيميل المشرف لكل خط من صفحة الإعدادات، أو رفع كامل قاعدة البيانات الآن.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    disabled={isCloudSyncing}
                    onClick={handlePushFullDataToCloud}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                    <span>{isCloudSyncing ? 'جارٍ الرفع...' : 'رفع البيانات للسحابة (Firestore)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-sky-50/80 border border-sky-200/80 p-2.5 rounded-xl text-sky-950">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-sky-600 text-white rounded-lg shrink-0">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>مشرف خط: {currentUser.email}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                        متصل أونلاين 🌐
                      </span>
                    </div>
                    <p className="text-[11px] text-sky-800 mt-0.5">
                      {currentUser.assignedLineIds.length > 0 
                        ? `الخطوط المصرح لك بإدارتها وتعديلها: ${lines.filter(l => currentUser.assignedLineIds.includes(l.id)).map(l => l.name).join('، ')}`
                        : 'لم يتم تعيين أي خط لهذا البريد حتى الآن من قبل الأدمن.'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-2.5 py-1 text-[11px] font-bold text-sky-800 bg-sky-100 hover:bg-sky-200 rounded-lg transition-colors self-end sm:self-center cursor-pointer"
                >
                  تفاصيل الحساب
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 border border-slate-200 p-2 rounded-xl text-slate-700">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-[11px]">
                  <strong>وضع التشغيل المحلي (أوفلاين)</strong>: البيانات تعمل وتُحفظ محلياً على هذا الجهاز. يمكنك تسجيل الدخول بالجيميل في أي وقت للمزامنة السحابية وتعيين صلاحيات المشرفين.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors self-end sm:self-center shrink-0 cursor-pointer shadow-xs"
              >
                تسجيل الدخول (Google Gmail)
              </button>
            </div>
          )}

          {cloudSyncSuccessMsg && (
            <div className="mt-2 p-2 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg font-bold text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{cloudSyncSuccessMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Production Line / Machine Toolbar (Shown when not in Factory Setup or Print) */}
      {activeTab !== 'factory' && selectedLine && selectedModel && (
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
          terminology={terminology}
          currentUser={currentUser}
          onSaveSupervisorEmail={handleSaveSupervisorEmail}
        />
      )}

      {/* Main Content Viewport */}
      {lines.length === 0 ? (
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col items-center justify-center text-center my-auto">
          <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-5 max-w-xl w-full animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
              <Cloud className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                تم تسجيل الخروج وتفريغ ذاكرة المتصفح
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                تم مسح وتفريغ كافة البيانات من المتصفح بالكامل لضمان الأمان والخصوصية. سجل دخولك كـ <strong>مدير النظام (Admin)</strong> أو <strong>مشرف خط</strong> لاسترجاع بيانات المصنع والعمال أونلاين فوراً من سحابة Firestore.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Cloud className="w-4 h-4" />
                <span>تسجيل الدخول (Google Gmail) واسترجاع البيانات</span>
              </button>

              <button
                type="button"
                onClick={handleReset400Workers}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
              >
                بدء العمل ببيانات تجريبية (400 عامل)
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 max-w-7xl w-full mx-auto p-2.5 sm:p-6 lg:p-8 flex flex-col">
          {activeTab === 'matrix' && (
            <div className="flex-1 flex flex-col min-h-[500px]">
              <SkillsMatrixGrid
                workers={filteredLineWorkers}
                stages={currentStages}
                readOnly={!isCurrentLinePermitted}
                onUpdateWorkerSkill={handleUpdateWorkerSkill}
                onSelectWorkerDetails={(worker) => setSelectedWorkerForModal(worker)}
                onEditWorker={(worker) => {
                  setWorkerToEdit(worker);
                  setIsWorkerEditOpen(true);
                }}
                onDeleteWorker={(worker) => setWorkerToDelete(worker)}
                terminology={terminology}
              />
            </div>
          )}

          {activeTab === 'balancing' && selectedLine && (
            <GapAnalysisDashboard
              stages={currentStages}
              lineWorkers={lineWorkers}
              allWorkers={workers}
              lineName={selectedLine.name}
              currentLineId={selectedLine.id}
              onUpdateWorkerSkill={handleUpdateWorkerSkill}
              onTransferWorkerLine={handleTransferWorkerLine}
              terminology={terminology}
            />
          )}

          {activeTab === 'ai-chat' && selectedLine && selectedModel && (
            <GeminiAIChatView
              line={selectedLine}
              model={selectedModel}
              stages={currentStages}
              lineWorkers={lineWorkers}
              allWorkers={workers}
              leadership={leadership}
              terminology={terminology}
              onNavigateToMatrix={() => setActiveTab('matrix')}
            />
          )}

          {activeTab === 'ai-advisor' && selectedLine && selectedModel && (
            <AIAdvisorView
              line={selectedLine}
              model={selectedModel}
              stages={currentStages}
              lineWorkers={lineWorkers}
              allWorkers={workers}
              leadership={leadership}
              terminology={terminology}
              onNavigateToMatrix={() => setActiveTab('matrix')}
            />
          )}

          {activeTab === 'performance' && selectedLine && selectedModel && (
            <ShiftPerformanceView
              line={selectedLine}
              model={selectedModel}
              stages={currentStages}
              lineWorkers={lineWorkers}
              onOpenWorkerModal={(worker) => setSelectedWorkerForModal(worker)}
              terminology={terminology}
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
              terminology={terminology}
              readOnly={!isCurrentLinePermitted}
            />
          )}

          {activeTab === 'factory' && (
            <FactorySetupView
              lines={lines}
              onUpdateLines={handleUpdateLines}
              terminology={terminology}
              onUpdateTerminology={handleUpdateTerminology}
              targetWorkersPerStage={targetWorkersPerStage}
              onUpdateTargetWorkersPerStage={setTargetWorkersPerStage}
              targetStagesPerWorker={targetStagesPerWorker}
              onUpdateTargetStagesPerWorker={setTargetStagesPerWorker}
              minQualifiedLevel={minQualifiedLevel}
              onUpdateMinQualifiedLevel={setMinQualifiedLevel}
              leadership={leadership}
              onUpdateLeadership={setLeadership}
              currentUser={currentUser}
              onSaveSupervisorEmail={handleSaveSupervisorEmail}
            />
          )}

          {activeTab === 'print' && selectedLine && selectedModel && (
            <PrintReportView
              line={selectedLine}
              model={selectedModel}
              stages={currentStages}
              workers={lineWorkers}
              leadership={leadership}
              terminology={terminology}
            />
          )}
        </main>
      )}

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
        terminology={terminology}
        onUpdateTerminology={handleUpdateTerminology}
      />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        stages={currentStages}
        workers={workers}
        lines={lines}
        allWorkers={workers}
        lineName={selectedLine?.name || terminology.lineLabel}
        modelName={selectedModel?.name || terminology.modelLabel}
        currentLineId={selectedLine?.id || ''}
        onImportSuccess={handleImportSuccess}
        onReset400Workers={handleReset400Workers}
        terminology={terminology}
        leadership={leadership}
        targetWorkersPerStage={targetWorkersPerStage}
        targetStagesPerWorker={targetStagesPerWorker}
        minQualifiedLevel={minQualifiedLevel}
        logs={logs}
        onRestoreFullBackup={handleRestoreFullBackup}
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
        currentLineId={selectedLine?.id || ''}
        stages={currentStages}
        terminology={terminology}
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
        currentUser={currentUser}
        lineName={selectedLine?.name || terminology.lineLabel}
        terminology={terminology}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        logs={logs}
        onClearHistory={handleClearHistory}
        onResetHistory={handleResetHistory}
      />

      <GeminiApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={async (user) => {
          setCurrentUser(user);
          try {
            if (user) {
              localStorage.setItem('matrixpro_current_user', JSON.stringify(user));
              await loadCloudDataForUser(user);
            } else {
              await handleSignOutUser();
            }
          } catch (e) {}
        }}
        lines={lines}
        onSyncAllToCloud={handlePushFullDataToCloud}
        isSyncing={isCloudSyncing}
        onSignOut={handleSignOutUser}
      />

      {/* Floating Gemini AI Chatbot Trigger (Accessible from all screens) */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-end gap-3 no-print">
        {isFloatingChatOpen && selectedLine && selectedModel && (
          <div className="w-[92vw] sm:w-[480px] shadow-2xl rounded-2xl animate-in fade-in slide-in-from-bottom-5 duration-200">
            <GeminiAIChatView
              line={selectedLine}
              model={selectedModel}
              stages={currentStages}
              lineWorkers={lineWorkers}
              allWorkers={workers}
              leadership={leadership}
              terminology={terminology}
              onNavigateToMatrix={() => {
                setIsFloatingChatOpen(false);
                setActiveTab('matrix');
              }}
              isFloating={true}
              onCloseFloating={() => setIsFloatingChatOpen(false)}
            />
          </div>
        )}

        <button
          onClick={() => setIsFloatingChatOpen(prev => !prev)}
          className="group flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 text-white px-4 py-3 rounded-full shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 transition-all border border-indigo-400/40 cursor-pointer"
          title="فتح متحدث الذكاء الاصطناعي لحل المشكلات"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-indigo-700 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 border-2 border-indigo-700 rounded-full" />
          </div>
          <span className="font-bold text-sm hidden sm:inline">
            {isFloatingChatOpen ? 'إغلاق المتحدث' : 'متحدث الذكاء الاصطناعي'}
          </span>
        </button>
      </div>

      {/* Dedicated Engineering Footer */}
      <Footer />

    </div>
  );
}
