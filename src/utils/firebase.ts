import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as fbSignOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';

export { onAuthStateChanged };
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocs,
  setDoc, 
  deleteDoc, 
  collection, 
  query,
  where,
  onSnapshot, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ProductionLine, Worker, AppUser, UserRole, TerminologyConfig, PlantLeadership } from '../types/matrix';

// Pre-approved Admin emails configured in applet runtime
export const DEFAULT_ADMIN_EMAILS = ['minakhairat1@gmail.com', 'minakhairat2@gmail.com'];
export const PRIMARY_ADMIN_EMAIL = 'minakhairat1@gmail.com';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Initial connection test per requirements
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline status or test document uninitialized.');
    }
    return false;
  }
}

// Google Sign In
export async function loginWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await fbSignOut(auth);
}

// Helper to ensure admin document in /admins/{uid}
export async function ensureAdminDocument(user: FirebaseUser): Promise<void> {
  if (!user || !user.uid || !user.email) return;
  const normalizedEmail = user.email.toLowerCase().trim();
  try {
    await setDoc(doc(db, 'admins', user.uid), {
      uid: user.uid,
      email: normalizedEmail,
      role: 'admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Could not ensure admin document:', e);
  }
}

// Set user role explicitly in Firestore
export async function setUserRole(
  user: FirebaseUser, 
  role: UserRole, 
  assignedLineIds: string[] = []
): Promise<void> {
  if (!user || !user.uid || !user.email) return;
  const normalizedEmail = user.email.toLowerCase().trim();

  if (role === 'admin') {
    await ensureAdminDocument(user);
  } else {
    // If user changes to supervisor and not in default admin emails list, remove from admins collection
    if (!DEFAULT_ADMIN_EMAILS.includes(normalizedEmail)) {
      try {
        await deleteDoc(doc(db, 'admins', user.uid));
      } catch (e) {
        console.warn('Could not remove admin doc on demotion:', e);
      }
    }
  }

  // Update users profile collection
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: normalizedEmail,
      displayName: user.displayName || user.email || 'مستخدم',
      role,
      assignedLineIds,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Could not update user profile:', e);
  }
}

// Check admin status
export async function verifyAdminStatus(user: FirebaseUser): Promise<boolean> {
  if (!user || !user.email) return false;
  const normalizedEmail = user.email.toLowerCase().trim();
  if (DEFAULT_ADMIN_EMAILS.includes(normalizedEmail)) {
    await ensureAdminDocument(user);
    return true;
  }

  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    if (adminDoc.exists()) return true;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists() && userDoc.data().role === 'admin') {
      await ensureAdminDocument(user);
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}

// Resolve user role and assigned lines - querying Firestore directly so supervisor lines are always accurate
export async function resolveUserPermissions(
  user: FirebaseUser,
  lines: ProductionLine[],
  preferredRole?: UserRole
): Promise<AppUser> {
  const normalizedEmail = (user.email || '').toLowerCase().trim();
  const isDefaultAdmin = DEFAULT_ADMIN_EMAILS.includes(normalizedEmail);
  
  // 1. Gather assigned line IDs from Firestore directly
  const assignedSet = new Set<string>();

  try {
    const linesSnap = await getDocs(collection(db, 'lines'));
    linesSnap.forEach(d => {
      const data = d.data();
      const supEmail = (data.supervisorEmail || '').toLowerCase().trim();
      if (supEmail && supEmail === normalizedEmail) {
        assignedSet.add(d.id);
      }
    });
  } catch (e) {
    console.warn('Could not read lines collection in resolveUserPermissions:', e);
  }

  // Also check provided lines in memory
  if (lines && lines.length > 0) {
    lines.forEach(l => {
      if ((l.supervisorEmail || '').toLowerCase().trim() === normalizedEmail) {
        assignedSet.add(l.id);
      }
    });
  }

  // Also check existing user document in Firestore to retain any pre-assigned line IDs
  let existingUserRole: UserRole | undefined;
  try {
    const uDoc = await getDoc(doc(db, 'users', user.uid));
    if (uDoc.exists()) {
      const uData = uDoc.data();
      if (Array.isArray(uData.assignedLineIds)) {
        uData.assignedLineIds.forEach((id: string) => assignedSet.add(id));
      }
      if (uData.role) {
        existingUserRole = uData.role as UserRole;
      }
    }
  } catch (e) {
    console.warn('Could not read user doc in resolveUserPermissions:', e);
  }

  const assigned = Array.from(assignedSet);

  let role: UserRole = 'supervisor';
  if (isDefaultAdmin) {
    role = 'admin';
    await ensureAdminDocument(user);
  } else if (preferredRole === 'admin') {
    role = 'admin';
    await ensureAdminDocument(user);
  } else if (preferredRole === 'supervisor') {
    role = 'supervisor';
  } else if (existingUserRole === 'admin') {
    role = 'admin';
    await ensureAdminDocument(user);
  } else {
    const isApprovedAdmin = await verifyAdminStatus(user);
    role = isApprovedAdmin ? 'admin' : 'supervisor';
    if (role === 'admin') {
      await ensureAdminDocument(user);
    }
  }

  const appUser: AppUser = {
    uid: user.uid,
    email: normalizedEmail,
    displayName: user.displayName || user.email || 'مستخدم',
    role,
    assignedLineIds: assigned
  };

  // Sync profile to Firestore
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: normalizedEmail,
      displayName: appUser.displayName,
      role: appUser.role,
      assignedLineIds: appUser.assignedLineIds,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Could not sync user profile to Firestore:', e);
  }

  return appUser;
}

// Fetch complete dataset from Firestore on login or restore
export async function fetchFullDatasetFromFirestore(): Promise<{
  lines: ProductionLine[];
  workers: Worker[];
  settings?: {
    targetWorkersPerStage: number;
    targetStagesPerWorker: number;
    minQualifiedLevel: number;
  };
  terminology?: TerminologyConfig;
  leadership?: PlantLeadership;
  hasData: boolean;
}> {
  const result: {
    lines: ProductionLine[];
    workers: Worker[];
    settings?: any;
    terminology?: TerminologyConfig;
    leadership?: PlantLeadership;
    hasData: boolean;
  } = {
    lines: [],
    workers: [],
    hasData: false
  };

  try {
    // 1. Fetch lines
    const linesSnap = await getDocs(collection(db, 'lines'));
    if (!linesSnap.empty) {
      const loadedLines: ProductionLine[] = [];
      linesSnap.forEach(docSnap => {
        const d = docSnap.data();
        loadedLines.push({
          id: d.id || docSnap.id,
          name: d.name || docSnap.id,
          nameEn: d.nameEn || d.name || '',
          code: d.code || d.id || docSnap.id,
          supervisor: d.supervisorName || d.supervisor || '',
          supervisorEmail: (d.supervisorEmail || '').toLowerCase().trim(),
          models: d.models || []
        });
      });
      loadedLines.sort((a, b) => a.id.localeCompare(b.id));
      result.lines = loadedLines;
    }

    // 2. Fetch workers
    const workersSnap = await getDocs(collection(db, 'workers'));
    if (!workersSnap.empty) {
      const loadedWorkers: Worker[] = [];
      workersSnap.forEach(docSnap => {
        const d = docSnap.data();
        loadedWorkers.push({
          id: d.id || docSnap.id,
          empCode: d.code || docSnap.id,
          name: d.name || '',
          lineId: d.lineId || '',
          shift: (d.shift as 'A' | 'B' | 'C') || 'A',
          targetStagesCount: d.targetStagesCount || 3,
          minProficiencyTarget: d.minProficiencyTarget || 3,
          skills: d.skills || {},
          hireDate: d.hireDate || '2023-01-01',
          notes: d.notes || ''
        });
      });
      result.workers = loadedWorkers;
    }

    // 3. Fetch settings
    const settingsSnap = await getDoc(doc(db, 'settings', 'plant_config'));
    if (settingsSnap.exists()) {
      const d = settingsSnap.data();
      result.settings = {
        targetWorkersPerStage: d.targetWorkersPerStage,
        targetStagesPerWorker: d.targetStagesPerWorker,
        minQualifiedLevel: d.minQualifiedLevel
      };
      if (d.terminology) result.terminology = d.terminology;
      if (d.leadership) result.leadership = d.leadership;
    }

    result.hasData = result.lines.length > 0 || result.workers.length > 0;
  } catch (error) {
    console.warn('Could not fetch dataset from Firestore:', error);
  }

  return result;
}

// Dedicated function to confirm and save supervisor email to Firestore
export async function saveSupervisorEmailToFirestore(
  lineOrId: string | ProductionLine, 
  supervisorName: string, 
  supervisorEmail: string
): Promise<void> {
  const lineId = typeof lineOrId === 'string' ? lineOrId : lineOrId.id;
  const lineObj = typeof lineOrId === 'object' ? lineOrId : null;
  const normalizedEmail = (supervisorEmail || '').toLowerCase().trim();
  const path = `lines/${lineId}`;

  const payload: any = {
    id: lineId,
    name: lineObj?.name || lineId,
    code: lineObj?.code || lineId,
    supervisor: supervisorName.trim(),
    supervisorName: supervisorName.trim(),
    supervisorEmail: normalizedEmail,
    shiftCount: 3,
    models: lineObj?.models || [],
    updatedAt: new Date().toISOString(),
    updatedBy: auth.currentUser?.email || 'admin'
  };

  if (lineObj?.nameEn) {
    payload.nameEn = lineObj.nameEn;
  }

  try {
    await setDoc(doc(db, 'lines', lineId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }

  // Update or link the user in users collection if exists
  if (normalizedEmail) {
    try {
      const usersSnap = await getDocs(query(collection(db, 'users'), where('email', '==', normalizedEmail)));
      for (const uDoc of usersSnap.docs) {
        const uData = uDoc.data();
        const existingLines: string[] = Array.isArray(uData.assignedLineIds) ? uData.assignedLineIds : [];
        if (!existingLines.includes(lineId)) {
          await setDoc(doc(db, 'users', uDoc.id), {
            assignedLineIds: [...existingLines, lineId],
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (e) {
      console.warn('Could not link supervisor user doc:', e);
    }
  }
}

// Push local dataset to Firestore (Admin action)
export async function syncFullDatasetToFirestore(data: {
  lines: ProductionLine[];
  workers: Worker[];
  settings: {
    targetWorkersPerStage: number;
    targetStagesPerWorker: number;
    minQualifiedLevel: number;
  };
  terminology: TerminologyConfig;
  leadership: PlantLeadership;
}): Promise<{ linesCount: number; workersCount: number }> {
  const pathSettings = 'settings/plant_config';
  try {
    await setDoc(doc(db, 'settings', 'plant_config'), {
      ...data.settings,
      terminology: data.terminology,
      leadership: data.leadership,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || 'admin'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathSettings);
  }

  // Sync lines
  for (const line of data.lines) {
    const pathLine = `lines/${line.id}`;
    try {
      await setDoc(doc(db, 'lines', line.id), {
        id: line.id,
        name: line.name,
        nameEn: line.nameEn || '',
        code: line.code || line.id,
        supervisor: line.supervisor || '',
        supervisorName: line.supervisor || '',
        supervisorEmail: (line.supervisorEmail || '').toLowerCase().trim(),
        shiftCount: 3,
        models: line.models || [],
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'admin'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathLine);
    }
  }

  // Sync workers in chunks using batches
  const BATCH_SIZE = 400; // max 500
  for (let i = 0; i < data.workers.length; i += BATCH_SIZE) {
    const chunk = data.workers.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const w of chunk) {
      const ref = doc(db, 'workers', w.id);
      batch.set(ref, {
        id: w.id,
        code: w.empCode,
        name: w.name,
        department: '',
        lineId: w.lineId,
        shift: w.shift,
        skills: w.skills,
        performanceRate: 95,
        notes: w.notes || '',
        hireDate: w.hireDate || '2023-01-01',
        targetStagesCount: w.targetStagesCount || 3,
        minProficiencyTarget: w.minProficiencyTarget || 3,
        updatedAt: new Date().toISOString(),
        updatedBy: auth.currentUser?.email || 'admin'
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workers (batch)');
    }
  }

  return { linesCount: data.lines.length, workersCount: data.workers.length };
}

// Single line update
export async function updateLineInFirestore(line: ProductionLine): Promise<void> {
  const path = `lines/${line.id}`;
  try {
    await setDoc(doc(db, 'lines', line.id), {
      id: line.id,
      name: line.name,
      nameEn: line.nameEn || '',
      code: line.code || line.id,
      supervisor: line.supervisor || '',
      supervisorName: line.supervisor || '',
      supervisorEmail: (line.supervisorEmail || '').toLowerCase().trim(),
      shiftCount: 3,
      models: line.models || [],
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || 'user'
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Single line deletion
export async function deleteLineFromFirestore(lineId: string): Promise<void> {
  const path = `lines/${lineId}`;
  try {
    await deleteDoc(doc(db, 'lines', lineId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Single worker update
export async function updateWorkerInFirestore(worker: Worker): Promise<void> {
  const path = `workers/${worker.id}`;
  try {
    await setDoc(doc(db, 'workers', worker.id), {
      id: worker.id,
      code: worker.empCode,
      name: worker.name,
      department: '',
      lineId: worker.lineId,
      shift: worker.shift,
      skills: worker.skills,
      performanceRate: 95,
      notes: worker.notes || '',
      hireDate: worker.hireDate || '2023-01-01',
      targetStagesCount: worker.targetStagesCount || 3,
      minProficiencyTarget: worker.minProficiencyTarget || 3,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || 'user'
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Worker deletion
export async function deleteWorkerFromFirestore(workerId: string): Promise<void> {
  const path = `workers/${workerId}`;
  try {
    await deleteDoc(doc(db, 'workers', workerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Batch deletion of workers from Firestore (e.g. clear all workers or clear a line's workers)
export async function clearAllWorkersFromFirestore(lineId?: string): Promise<number> {
  try {
    let workersQuery = collection(db, 'workers');
    let snapshot;
    if (lineId) {
      snapshot = await getDocs(query(workersQuery, where('lineId', '==', lineId)));
    } else {
      snapshot = await getDocs(workersQuery);
    }

    if (snapshot.empty) return 0;

    const docsToDelete = snapshot.docs;
    const BATCH_SIZE = 400;
    for (let i = 0; i < docsToDelete.length; i += BATCH_SIZE) {
      const chunk = docsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const d of chunk) {
        batch.delete(d.ref);
      }
      await batch.commit();
    }

    return docsToDelete.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'workers (batch delete)');
  }
}

// Real-time listener for plant lines and workers
export function setupRealtimeSync(callbacks: {
  onLinesUpdate: (lines: ProductionLine[]) => void;
  onWorkersUpdate: (workers: Worker[]) => void;
  onSettingsUpdate?: (settings: any) => void;
  onError: (err: any) => void;
}) {
  const unsubLines = onSnapshot(
    collection(db, 'lines'),
    snapshot => {
      if (snapshot.empty) {
        // If snapshot is empty, don't overwrite if local has default lines unless user deleted all
        return;
      }
      const loadedLines: ProductionLine[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        loadedLines.push({
          id: d.id || docSnap.id,
          name: d.name || docSnap.id,
          nameEn: d.nameEn || d.name || '',
          code: d.code || d.id || docSnap.id,
          supervisor: d.supervisorName || d.supervisor || '',
          supervisorEmail: (d.supervisorEmail || '').toLowerCase().trim(),
          models: d.models || []
        });
      });
      // Sort lines by ID
      loadedLines.sort((a, b) => a.id.localeCompare(b.id));
      callbacks.onLinesUpdate(loadedLines);
    },
    error => {
      callbacks.onError(error);
    }
  );

  const unsubWorkers = onSnapshot(
    collection(db, 'workers'),
    snapshot => {
      const loadedWorkers: Worker[] = [];
      if (!snapshot.empty) {
        snapshot.forEach(docSnap => {
          const d = docSnap.data();
          loadedWorkers.push({
            id: d.id || docSnap.id,
            empCode: d.code || docSnap.id,
            name: d.name || '',
            lineId: d.lineId || '',
            shift: (d.shift as 'A' | 'B' | 'C') || 'A',
            targetStagesCount: d.targetStagesCount || 3,
            minProficiencyTarget: d.minProficiencyTarget || 3,
            skills: d.skills || {},
            hireDate: d.hireDate || '2023-01-01',
            notes: d.notes || ''
          });
        });
      }
      // When snapshot changes (even to empty after deletion), emit the loaded workers list!
      callbacks.onWorkersUpdate(loadedWorkers);
    },
    error => {
      callbacks.onError(error);
    }
  );

  return () => {
    unsubLines();
    unsubWorkers();
  };
}
