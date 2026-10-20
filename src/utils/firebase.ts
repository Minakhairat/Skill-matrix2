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
export const DEFAULT_ADMIN_EMAILS = ['minakhairat1@gmail.com', 'minakhairat2@gmail.com', 'minakhairat96@gmail.com'];
export const PRIMARY_ADMIN_EMAIL = 'minakhairat96@gmail.com';

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

// Resolve user role and assigned lines - querying Firestore directly
export async function resolveUserPermissions(
  user: FirebaseUser,
  lines: ProductionLine[],
  preferredRole?: UserRole
): Promise<AppUser> {
  const normalizedEmail = (user.email || '').toLowerCase().trim();
  const assignedSet = new Set<string>();
  let assignedAdminEmail: string | undefined;

  // 1. Gather lines assigned to this supervisor from Firestore
  try {
    const linesSnap = await getDocs(query(collection(db, 'lines'), where('supervisorEmail', '==', normalizedEmail)));
    linesSnap.forEach(d => {
      const data = d.data();
      assignedSet.add(data.id || d.id);
      if (!assignedAdminEmail && data.adminEmail) {
        assignedAdminEmail = data.adminEmail;
      }
    });
  } catch (e) {
    console.warn('Could not read assigned lines in resolveUserPermissions:', e);
  }

  // Also check provided lines in memory
  if (lines && lines.length > 0) {
    lines.forEach(l => {
      if ((l.supervisorEmail || '').toLowerCase().trim() === normalizedEmail) {
        assignedSet.add(l.id);
        if (!assignedAdminEmail && l.adminEmail) {
          assignedAdminEmail = l.adminEmail;
        }
      }
    });
  }

  const assigned = Array.from(assignedSet);

  let role: UserRole = 'admin';
  if (preferredRole) {
    role = preferredRole;
  } else if (assigned.length > 0) {
    // If lines have been assigned to this email by an admin, prioritize supervisor
    role = 'supervisor';
  } else {
    // Default to admin mode for their own isolated factory
    role = 'admin';
  }

  if (role === 'admin') {
    await ensureAdminDocument(user);
  }

  const appUser: AppUser = {
    uid: user.uid,
    email: normalizedEmail,
    displayName: user.displayName || user.email || 'مستخدم',
    role,
    assignedLineIds: assigned,
    assignedAdminEmail
  };

  // Sync profile to Firestore
  try {
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: normalizedEmail,
      displayName: appUser.displayName,
      role: appUser.role,
      assignedLineIds: appUser.assignedLineIds,
      assignedAdminEmail: appUser.assignedAdminEmail || '',
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Could not sync user profile to Firestore:', e);
  }

  return appUser;
}

// Fetch complete dataset from Firestore strictly partitioned by user role & workspace owner
export async function fetchFullDatasetFromFirestore(
  user?: AppUser | null,
  activeRole?: UserRole
): Promise<{
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
  assignedLinesCount: number;
  message?: string;
}> {
  const result = {
    lines: [] as ProductionLine[],
    workers: [] as Worker[],
    settings: undefined as any,
    terminology: undefined as TerminologyConfig | undefined,
    leadership: undefined as PlantLeadership | undefined,
    hasData: false,
    assignedLinesCount: 0,
    message: ''
  };

  if (!user || !user.email) {
    return result;
  }

  const normalizedEmail = user.email.toLowerCase().trim();
  const effectiveRole = activeRole || user.role;

  try {
    // ------------------------------------------------------------------------
    // CASE 1: USER IS IN ADMIN ROLE
    // Must ONLY see data created by THIS admin (adminEmail === normalizedEmail)
    // ------------------------------------------------------------------------
    if (effectiveRole === 'admin') {
      // 1. Fetch lines owned by this admin
      const adminLinesQuery = query(
        collection(db, 'lines'), 
        where('adminEmail', '==', normalizedEmail)
      );
      let linesSnap = await getDocs(adminLinesQuery);

      // Backwards-compatibility fallback: if this is primary admin and no lines found with adminEmail
      if (linesSnap.empty && DEFAULT_ADMIN_EMAILS.includes(normalizedEmail)) {
        const allLinesSnap = await getDocs(collection(db, 'lines'));
        const legacyDocs = allLinesSnap.docs.filter(d => {
          const data = d.data();
          return !data.adminEmail || data.adminEmail === normalizedEmail || data.adminEmail === PRIMARY_ADMIN_EMAIL;
        });
        if (legacyDocs.length > 0) {
          linesSnap = { docs: legacyDocs, empty: false } as any;
        }
      }

      if (!linesSnap.empty) {
        const loadedLines: ProductionLine[] = [];
        linesSnap.docs.forEach(docSnap => {
          const d = docSnap.data();
          loadedLines.push({
            id: d.id || docSnap.id,
            name: d.name || docSnap.id,
            nameEn: d.nameEn || d.name || '',
            code: d.code || d.id || docSnap.id,
            supervisor: d.supervisorName || d.supervisor || '',
            supervisorEmail: (d.supervisorEmail || '').toLowerCase().trim(),
            adminEmail: d.adminEmail || normalizedEmail,
            adminId: d.adminId || user.uid,
            models: d.models || []
          });
        });
        loadedLines.sort((a, b) => a.id.localeCompare(b.id));
        result.lines = loadedLines;
      }

      // 2. Fetch workers owned by this admin
      const adminWorkersQuery = query(
        collection(db, 'workers'),
        where('adminEmail', '==', normalizedEmail)
      );
      let workersSnap = await getDocs(adminWorkersQuery);

      if (workersSnap.empty && DEFAULT_ADMIN_EMAILS.includes(normalizedEmail)) {
        const allWorkersSnap = await getDocs(collection(db, 'workers'));
        const legacyWorkers = allWorkersSnap.docs.filter(d => {
          const data = d.data();
          return !data.adminEmail || data.adminEmail === normalizedEmail || data.adminEmail === PRIMARY_ADMIN_EMAIL;
        });
        if (legacyWorkers.length > 0) {
          workersSnap = { docs: legacyWorkers, empty: false } as any;
        }
      }

      if (!workersSnap.empty) {
        const loadedWorkers: Worker[] = [];
        workersSnap.docs.forEach(docSnap => {
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
            notes: d.notes || '',
            adminEmail: d.adminEmail || normalizedEmail,
            adminId: d.adminId || user.uid,
            supervisorEmail: d.supervisorEmail || ''
          });
        });
        result.workers = loadedWorkers;
      }

      // 3. Fetch admin-scoped settings
      try {
        let settingsSnap = await getDoc(doc(db, 'settings', user.uid));
        if (!settingsSnap.exists()) {
          settingsSnap = await getDoc(doc(db, 'settings', 'plant_config'));
        }
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
      } catch (e) {
        console.warn('Could not read admin settings:', e);
      }

      result.hasData = result.lines.length > 0 || result.workers.length > 0;
      result.assignedLinesCount = result.lines.length;
      return result;
    }

    // ------------------------------------------------------------------------
    // CASE 2: USER IS IN SUPERVISOR ROLE
    // Must ONLY see data of lines where supervisorEmail === normalizedEmail
    // If no admin assigned this supervisor to any line, NO data is returned!
    // ------------------------------------------------------------------------
    if (effectiveRole === 'supervisor') {
      const supervisorLinesQuery = query(
        collection(db, 'lines'),
        where('supervisorEmail', '==', normalizedEmail)
      );
      const linesSnap = await getDocs(supervisorLinesQuery);

      if (linesSnap.empty) {
        // No admin has assigned this supervisor to any lines!
        result.lines = [];
        result.workers = [];
        result.hasData = false;
        result.assignedLinesCount = 0;
        result.message = 'لم يتم إسناد أي خطوط إنتاج إلى بريدك الإلكتروني من قبل أي مدير نظام (Admin) حتى الآن.';
        return result;
      }

      const assignedLines: ProductionLine[] = [];
      const assignedLineIds: string[] = [];
      let parentAdminEmail: string | undefined;
      let parentAdminId: string | undefined;

      linesSnap.docs.forEach(docSnap => {
        const d = docSnap.data();
        const lineId = d.id || docSnap.id;
        assignedLineIds.push(lineId);
        if (!parentAdminEmail && d.adminEmail) parentAdminEmail = d.adminEmail;
        if (!parentAdminId && d.adminId) parentAdminId = d.adminId;

        assignedLines.push({
          id: lineId,
          name: d.name || lineId,
          nameEn: d.nameEn || d.name || '',
          code: d.code || lineId,
          supervisor: d.supervisorName || d.supervisor || '',
          supervisorEmail: (d.supervisorEmail || '').toLowerCase().trim(),
          adminEmail: d.adminEmail || '',
          adminId: d.adminId || '',
          models: d.models || []
        });
      });

      assignedLines.sort((a, b) => a.id.localeCompare(b.id));
      result.lines = assignedLines;
      result.assignedLinesCount = assignedLines.length;

      // 2. Fetch workers that belong to the supervisor's assigned lines ONLY
      if (assignedLineIds.length > 0) {
        let workersQuery;
        if (parentAdminEmail) {
          workersQuery = query(
            collection(db, 'workers'),
            where('adminEmail', '==', parentAdminEmail)
          );
        } else {
          workersQuery = collection(db, 'workers');
        }

        const workersSnap = await getDocs(workersQuery);
        const filteredWorkers: Worker[] = [];
        workersSnap.docs.forEach(docSnap => {
          const d = docSnap.data();
          if (assignedLineIds.includes(d.lineId)) {
            filteredWorkers.push({
              id: d.id || docSnap.id,
              empCode: d.code || docSnap.id,
              name: d.name || '',
              lineId: d.lineId,
              shift: (d.shift as 'A' | 'B' | 'C') || 'A',
              targetStagesCount: d.targetStagesCount || 3,
              minProficiencyTarget: d.minProficiencyTarget || 3,
              skills: d.skills || {},
              hireDate: d.hireDate || '2023-01-01',
              notes: d.notes || '',
              adminEmail: d.adminEmail || parentAdminEmail || '',
              adminId: d.adminId || parentAdminId || '',
              supervisorEmail: d.supervisorEmail || normalizedEmail
            });
          }
        });
        result.workers = filteredWorkers;
      }

      // 3. Fetch settings from the parent admin who created these lines
      if (parentAdminId) {
        try {
          const settingsSnap = await getDoc(doc(db, 'settings', parentAdminId));
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
        } catch (e) {
          console.warn('Could not read parent admin settings:', e);
        }
      }

      result.hasData = result.lines.length > 0;
      return result;
    }
  } catch (error) {
    console.warn('Could not fetch dataset from Firestore:', error);
  }

  return result;
}

// Dedicated function to confirm and save supervisor email to Firestore
export async function saveSupervisorEmailToFirestore(
  lineOrId: string | ProductionLine, 
  supervisorName: string, 
  supervisorEmail: string,
  user?: AppUser | null
): Promise<void> {
  const lineId = typeof lineOrId === 'string' ? lineOrId : lineOrId.id;
  const lineObj = typeof lineOrId === 'object' ? lineOrId : null;
  const normalizedEmail = (supervisorEmail || '').toLowerCase().trim();
  const currentAdminEmail = user?.email || auth.currentUser?.email || PRIMARY_ADMIN_EMAIL;
  const currentAdminUid = user?.uid || auth.currentUser?.uid || '';

  const docKey = currentAdminUid ? `${currentAdminUid}_${lineId}` : lineId;
  const path = `lines/${docKey}`;

  const payload: any = {
    id: lineId,
    name: lineObj?.name || lineId,
    code: lineObj?.code || lineId,
    supervisor: supervisorName.trim(),
    supervisorName: supervisorName.trim(),
    supervisorEmail: normalizedEmail,
    adminEmail: currentAdminEmail.toLowerCase().trim(),
    adminId: currentAdminUid,
    shiftCount: 3,
    models: lineObj?.models || [],
    updatedAt: new Date().toISOString(),
    updatedBy: currentAdminEmail
  };

  if (lineObj?.nameEn) {
    payload.nameEn = lineObj.nameEn;
  }

  try {
    await setDoc(doc(db, 'lines', docKey), payload, { merge: true });
    // Also save under raw lineId for backwards compatibility if needed
    if (docKey !== lineId) {
      await setDoc(doc(db, 'lines', lineId), payload, { merge: true });
    }
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
            uid: uDoc.id,
            email: normalizedEmail,
            displayName: uData.displayName || normalizedEmail.split('@')[0],
            role: 'supervisor',
            assignedLineIds: [...existingLines, lineId],
            assignedAdminEmail: currentAdminEmail,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      }
    } catch (e) {
      console.warn('Could not link supervisor user doc:', e);
    }
  }
}

// Push local dataset to Firestore (Admin action strictly partitioned to admin's workspace)
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
}, user?: AppUser | null): Promise<{ linesCount: number; workersCount: number }> {
  const currentUserEmail = (user?.email || auth.currentUser?.email || PRIMARY_ADMIN_EMAIL).toLowerCase().trim();
  const currentUserUid = user?.uid || auth.currentUser?.uid || 'admin';

  // 1. Sync Settings scoped to admin
  const settingsDocId = currentUserUid;
  const pathSettings = `settings/${settingsDocId}`;
  try {
    await setDoc(doc(db, 'settings', settingsDocId), {
      ...data.settings,
      terminology: data.terminology,
      leadership: data.leadership,
      adminEmail: currentUserEmail,
      adminId: currentUserUid,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUserEmail
    });
    // Also update plant_config for backwards compatibility if primary admin
    if (DEFAULT_ADMIN_EMAILS.includes(currentUserEmail)) {
      await setDoc(doc(db, 'settings', 'plant_config'), {
        ...data.settings,
        terminology: data.terminology,
        leadership: data.leadership,
        adminEmail: currentUserEmail,
        adminId: currentUserUid,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserEmail
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, pathSettings);
  }

  // 2. Sync lines scoped to admin
  const lineSupervisorMap = new Map<string, string>();
  for (const line of data.lines) {
    const docKey = `${currentUserUid}_${line.id}`;
    const pathLine = `lines/${docKey}`;
    const supEmail = (line.supervisorEmail || '').toLowerCase().trim();
    if (supEmail) {
      lineSupervisorMap.set(line.id, supEmail);
    }

    const payload = {
      id: line.id,
      name: line.name,
      nameEn: line.nameEn || '',
      code: line.code || line.id,
      supervisor: line.supervisor || '',
      supervisorName: line.supervisor || '',
      supervisorEmail: supEmail,
      adminEmail: currentUserEmail,
      adminId: currentUserUid,
      shiftCount: 3,
      models: line.models || [],
      updatedAt: new Date().toISOString(),
      updatedBy: currentUserEmail
    };

    try {
      await setDoc(doc(db, 'lines', docKey), payload);
      // Also update line.id directly for backwards compatibility
      await setDoc(doc(db, 'lines', line.id), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, pathLine);
    }
  }

  // 3. Sync workers in batches scoped to admin
  const BATCH_SIZE = 400;
  for (let i = 0; i < data.workers.length; i += BATCH_SIZE) {
    const chunk = data.workers.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    for (const w of chunk) {
      const docKey = `${currentUserUid}_${w.id}`;
      const ref = doc(db, 'workers', docKey);
      const supEmail = lineSupervisorMap.get(w.lineId) || (w.supervisorEmail || '').toLowerCase().trim();

      const workerPayload = {
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
        adminEmail: currentUserEmail,
        adminId: currentUserUid,
        supervisorEmail: supEmail,
        targetStagesCount: w.targetStagesCount || 3,
        minProficiencyTarget: w.minProficiencyTarget || 3,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserEmail
      };

      batch.set(ref, workerPayload);
      // Also update under w.id for primary admin legacy support
      if (DEFAULT_ADMIN_EMAILS.includes(currentUserEmail)) {
        batch.set(doc(db, 'workers', w.id), workerPayload);
      }
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
export async function updateLineInFirestore(line: ProductionLine, user?: AppUser | null): Promise<void> {
  const currentAdminEmail = line.adminEmail || user?.email || auth.currentUser?.email || PRIMARY_ADMIN_EMAIL;
  const currentAdminUid = line.adminId || user?.uid || auth.currentUser?.uid || '';
  const docKey = currentAdminUid ? `${currentAdminUid}_${line.id}` : line.id;
  const path = `lines/${docKey}`;

  const payload: any = {
    id: line.id,
    name: line.name,
    nameEn: line.nameEn || '',
    code: line.code || line.id,
    supervisor: line.supervisor || '',
    supervisorName: line.supervisor || '',
    supervisorEmail: (line.supervisorEmail || '').toLowerCase().trim(),
    adminEmail: currentAdminEmail.toLowerCase().trim(),
    adminId: currentAdminUid,
    shiftCount: 3,
    models: line.models || [],
    updatedAt: new Date().toISOString(),
    updatedBy: user?.email || auth.currentUser?.email || 'user'
  };

  try {
    await setDoc(doc(db, 'lines', docKey), payload, { merge: true });
    if (docKey !== line.id) {
      await setDoc(doc(db, 'lines', line.id), payload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Single line deletion
export async function deleteLineFromFirestore(lineId: string, user?: AppUser | null): Promise<void> {
  const currentAdminUid = user?.uid || auth.currentUser?.uid || '';
  const docKey = currentAdminUid ? `${currentAdminUid}_${lineId}` : lineId;
  const path = `lines/${docKey}`;
  try {
    await deleteDoc(doc(db, 'lines', docKey));
    if (docKey !== lineId) {
      await deleteDoc(doc(db, 'lines', lineId)).catch(() => {});
    }
    await clearAllWorkersFromFirestore(lineId, user);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Single worker update
export async function updateWorkerInFirestore(worker: Worker, user?: AppUser | null): Promise<void> {
  const currentAdminEmail = worker.adminEmail || user?.email || auth.currentUser?.email || PRIMARY_ADMIN_EMAIL;
  const currentAdminUid = worker.adminId || user?.uid || auth.currentUser?.uid || '';
  const docKey = currentAdminUid ? `${currentAdminUid}_${worker.id}` : worker.id;
  const path = `workers/${docKey}`;

  const payload = {
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
    adminEmail: currentAdminEmail.toLowerCase().trim(),
    adminId: currentAdminUid,
    supervisorEmail: (worker.supervisorEmail || '').toLowerCase().trim(),
    targetStagesCount: worker.targetStagesCount || 3,
    minProficiencyTarget: worker.minProficiencyTarget || 3,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.email || auth.currentUser?.email || 'user'
  };

  try {
    await setDoc(doc(db, 'workers', docKey), payload, { merge: true });
    if (docKey !== worker.id) {
      await setDoc(doc(db, 'workers', worker.id), payload, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Worker deletion
export async function deleteWorkerFromFirestore(workerId: string, user?: AppUser | null): Promise<void> {
  const currentAdminUid = user?.uid || auth.currentUser?.uid || '';
  const docKey = currentAdminUid ? `${currentAdminUid}_${workerId}` : workerId;
  const path = `workers/${docKey}`;
  try {
    await deleteDoc(doc(db, 'workers', docKey));
    if (docKey !== workerId) {
      await deleteDoc(doc(db, 'workers', workerId)).catch(() => {});
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Batch deletion of workers from Firestore
export async function clearAllWorkersFromFirestore(lineId?: string, user?: AppUser | null): Promise<number> {
  try {
    const currentAdminEmail = (user?.email || auth.currentUser?.email || PRIMARY_ADMIN_EMAIL).toLowerCase().trim();
    let q;
    if (lineId) {
      q = query(
        collection(db, 'workers'), 
        where('lineId', '==', lineId),
        where('adminEmail', '==', currentAdminEmail)
      );
    } else {
      q = query(
        collection(db, 'workers'),
        where('adminEmail', '==', currentAdminEmail)
      );
    }

    const snapshot = await getDocs(q);
    if (snapshot.empty) return 0;

    const docsToDelete = snapshot.docs;
    const BATCH_SIZE = 150;
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
