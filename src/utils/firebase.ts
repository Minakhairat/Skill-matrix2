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
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  onSnapshot, 
  getDocFromServer,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ProductionLine, Worker, AppUser, UserRole, TerminologyConfig, PlantLeadership } from '../types/matrix';

// Primary Admin configured in applet runtime
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

// Check admin status
export async function verifyAdminStatus(user: FirebaseUser): Promise<boolean> {
  if (!user || !user.email) return false;
  const normalizedEmail = user.email.toLowerCase().trim();
  if (normalizedEmail === PRIMARY_ADMIN_EMAIL.toLowerCase().trim()) {
    // Ensure document in admins collection exists for rule checks
    try {
      await setDoc(doc(db, 'admins', user.uid), {
        uid: user.uid,
        email: normalizedEmail,
        createdAt: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      // Ignore if rules fail or already exists
    }
    return true;
  }

  try {
    const adminDoc = await getDoc(doc(db, 'admins', user.uid));
    return adminDoc.exists();
  } catch (err) {
    return false;
  }
}

// Resolve user role and assigned lines
export async function resolveUserPermissions(
  user: FirebaseUser,
  lines: ProductionLine[],
  preferredRole?: UserRole
): Promise<AppUser> {
  const normalizedEmail = (user.email || '').toLowerCase().trim();
  const isPrimary = normalizedEmail === PRIMARY_ADMIN_EMAIL.toLowerCase().trim();
  
  // Find lines assigned to this email
  const assigned = lines
    .filter(l => (l.supervisorEmail || '').toLowerCase().trim() === normalizedEmail)
    .map(l => l.id);

  let role: UserRole = 'supervisor';
  if (isPrimary) {
    role = 'admin';
  } else if (preferredRole === 'admin') {
    const isApprovedAdmin = await verifyAdminStatus(user);
    role = isApprovedAdmin ? 'admin' : 'supervisor';
  } else {
    // Check if in admins collection
    const isApprovedAdmin = await verifyAdminStatus(user);
    if (isApprovedAdmin && !preferredRole) {
      role = 'admin';
    } else {
      role = 'supervisor';
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
        supervisorEmail: line.supervisorEmail || '',
        supervisorName: line.supervisor || '',
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
      supervisorEmail: line.supervisorEmail || '',
      supervisorName: line.supervisor || '',
      shiftCount: 3,
      models: line.models || [],
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || 'user'
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
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
      if (snapshot.empty) return;
      const loadedLines: ProductionLine[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        loadedLines.push({
          id: d.id || docSnap.id,
          name: d.name || docSnap.id,
          nameEn: d.name || '',
          code: d.id || docSnap.id,
          supervisor: d.supervisorName || '',
          supervisorEmail: d.supervisorEmail || '',
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
      if (snapshot.empty) return;
      const loadedWorkers: Worker[] = [];
      snapshot.forEach(docSnap => {
        const d = docSnap.data();
        loadedWorkers.push({
          id: d.id || docSnap.id,
          empCode: d.code || docSnap.id,
          name: d.name || '',
          lineId: d.lineId || '',
          shift: (d.shift as 'A' | 'B' | 'C') || 'A',
          targetStagesCount: 3,
          minProficiencyTarget: 3,
          skills: d.skills || {},
          hireDate: '2023-01-01',
          notes: d.notes || ''
        });
      });
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
