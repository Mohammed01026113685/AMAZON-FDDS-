
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc,
  writeBatch
} from "firebase/firestore";
import { auth, db, isMock } from "../firebase-config";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { HistoryRecord } from "../types";

const USERS_DOC_ID = 'users_list';
const SETTINGS_DOC_ID = 'app_settings';
const ADMIN_EMAIL = 'mohammedhashmed88@gmail.com';
const ALIAS_DOC_ID = 'agent_aliases';

// Collection name 'reps' as requested
const historyCollection = collection(db, "reps");
const usersCollection = collection(db, "users");
const settingsCollection = collection(db, "settings");

// --- MOCK STORAGE KEYS ---
const LS_KEYS = {
    USER: 'mock_user_session',
    HISTORY: 'mock_data_history',
    ALIASES: 'mock_data_aliases',
    SETTINGS: 'mock_data_settings',
    USERS: 'mock_data_users'
};

// --- MOCK AUTH STATE ---
let mockAuthSubscribers: ((user: User | null) => void)[] = [];

const handleFirestoreError = (operation: string, error: any) => {
    const msg = error.message || '';
    if (error.code === 'unavailable' || msg.includes('offline') || error.code === 'permission-denied') {
        console.warn(`[Firebase] ${operation}: Service unavailable. Falling back to default.`);
    } else {
        console.error(`[Firebase] ${operation} Error:`, error);
    }
    return null;
};

// --- AUTH SERVICES ---

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (isMock) {
      const stored = localStorage.getItem(LS_KEYS.USER);
      if (stored) {
          try {
              callback(JSON.parse(stored));
          } catch {
              callback(null);
          }
      } else {
          callback(null);
      }
      
      mockAuthSubscribers.push(callback);
      return () => {
          mockAuthSubscribers = mockAuthSubscribers.filter(cb => cb !== callback);
      };
  }
  return onAuthStateChanged(auth, callback);
};

export const loginUser = async (e: string, p: string) => {
  if (isMock) {
      await new Promise(r => setTimeout(r, 800));
      if (e) {
          const mockUser = {
              uid: 'mock-user-id-123',
              email: e,
              displayName: 'Mock User',
              emailVerified: true,
              isAnonymous: false,
              metadata: {},
              providerData: [],
              refreshToken: '',
              tenantId: null,
              delete: async () => {},
              getIdToken: async () => 'mock-token',
              getIdTokenResult: async () => ({ token: 'mock', claims: {}, signInProvider: 'password' } as any),
              reload: async () => {},
              toJSON: () => ({}),
              phoneNumber: null,
              photoURL: null,
              providerId: 'firebase'
          } as unknown as User;
          
          localStorage.setItem(LS_KEYS.USER, JSON.stringify(mockUser));
          mockAuthSubscribers.forEach(cb => cb(mockUser));
          return;
      }
      throw new Error("Invalid mock credentials");
  }

  try {
      await signInWithEmailAndPassword(auth, e, p);
  } catch (error: any) {
      if(error.code === 'auth/invalid-credential') throw new Error("البريد الإلكتروني أو كلمة المرور غير صحيحة");
      if(error.code === 'auth/network-request-failed') throw new Error("خطأ في الاتصال بالشبكة");
      if(error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') throw new Error("خطأ في مفتاح API. يرجى التحقق من الإعدادات.");
      throw new Error(error.message);
  }
};

export const logoutUser = async () => {
    if (isMock) {
        localStorage.removeItem(LS_KEYS.USER);
        mockAuthSubscribers.forEach(cb => cb(null));
        return;
    }
    return signOut(auth);
};

export const isUserAdmin = (user: User | null) => {
    return user !== null;
};

// --- USER MANAGEMENT SERVICES ---

export const fetchRegisteredUsers = async () => {
    if (isMock) {
        const stored = localStorage.getItem(LS_KEYS.USERS);
        return stored ? JSON.parse(stored) : [];
    }
    try {
        const docRef = doc(usersCollection, USERS_DOC_ID);
        const snapshot = await getDoc(docRef);
        if(snapshot.exists()) {
            return snapshot.data().users || [];
        }
    } catch (e) {
        handleFirestoreError('fetchRegisteredUsers', e);
    }
    return [];
};

export const createNewUser = async (email: string, pass: string) => {
    if (isMock) {
        const stored = localStorage.getItem(LS_KEYS.USERS);
        const users = stored ? JSON.parse(stored) : [];
        if (users.some((u: any) => u.email === email)) throw new Error("User exists in mock DB");
        users.push({ email, role: 'admin', createdAt: new Date().toISOString() });
        localStorage.setItem(LS_KEYS.USERS, JSON.stringify(users));
        return;
    }

    const docRef = doc(usersCollection, USERS_DOC_ID);
    let users = [];
    try {
        const snapshot = await getDoc(docRef);
        if(snapshot.exists()) {
            users = snapshot.data().users || [];
        }
    } catch (e) {
        handleFirestoreError('createNewUser', e);
    }
    
    if(users.some((u: any) => u.email === email)) throw new Error("المستخدم موجود بالفعل في القائمة");
    users.push({ email, createdAt: new Date().toISOString(), role: 'admin' });
    await setDoc(docRef, { users }, { merge: true });
};

// --- APP SETTINGS SERVICES ---

export const fetchAppTitle = async () => {
    if (isMock) {
        return localStorage.getItem(LS_KEYS.SETTINGS) || "LogiTrack (Demo)";
    }
    try {
        const docRef = doc(settingsCollection, SETTINGS_DOC_ID);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data().appTitle;
        }
    } catch (e) {
        handleFirestoreError('fetchAppTitle', e);
    }
    return null;
};

export const saveAppTitle = async (title: string) => {
    if (isMock) {
        localStorage.setItem(LS_KEYS.SETTINGS, title);
        return;
    }
    const docRef = doc(settingsCollection, SETTINGS_DOC_ID);
    await setDoc(docRef, { appTitle: title }, { merge: true });
};

// --- HISTORY DATA SERVICES ---

export const fetchHistory = async (): Promise<HistoryRecord[]> => {
  if (isMock) {
      console.log("[Firebase] Fetching history from LocalStorage (Mock)");
      const stored = localStorage.getItem(LS_KEYS.HISTORY);
      const data = stored ? JSON.parse(stored) : [];
      return data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  if (!auth.currentUser) return [];

  try {
    console.log("[Firebase] Fetching history from Firestore 'reps' collection...");
    const q = query(historyCollection);
    const querySnapshot = await getDocs(q);
    const data: HistoryRecord[] = [];
    querySnapshot.forEach((doc) => {
      if (doc.exists() && doc.id !== USERS_DOC_ID && doc.id !== SETTINGS_DOC_ID && doc.id !== ALIAS_DOC_ID) {
        const record = doc.data() as HistoryRecord;
        if (record && typeof record.date === 'string' && record.date.length > 0) {
            data.push(record);
        }
      }
    });
    console.log(`[Firebase] Fetched ${data.length} records.`);
    return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error: any) {
    handleFirestoreError('fetchHistory', error);
    return [];
  }
};

export const saveDailyRecord = async (record: HistoryRecord) => {
  if (isMock) {
      console.log("[Firebase] Saving to LocalStorage (Mock Mode)");
      const stored = localStorage.getItem(LS_KEYS.HISTORY);
      let history = stored ? JSON.parse(stored) : [];
      history = history.filter((h: any) => h.date !== record.date);
      history.push(record);
      localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
      return;
  }

  if (!auth.currentUser) throw new Error("Unauthorized");
  try {
      console.log(`[Firebase] Saving record for ${record.date} to Firestore 'reps' collection...`);
      const docRef = doc(historyCollection, record.date); 
      await setDoc(docRef, record);
      console.log("[Firebase] Save successful.");
  } catch (e: any) {
      console.error("[Firebase] Save Failed:", e);
      throw e;
  }
};

export const deleteDailyRecord = async (date: string) => {
    if (isMock) {
        const stored = localStorage.getItem(LS_KEYS.HISTORY);
        if (stored) {
            let history = JSON.parse(stored);
            history = history.filter((h: any) => h.date !== date);
            localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
        }
        return;
    }

    if (!auth.currentUser) throw new Error("Unauthorized");
    try {
        await deleteDoc(doc(historyCollection, date));
    } catch (e) {
        handleFirestoreError('deleteDailyRecord', e);
        throw e;
    }
};

export const updateDailyRecord = async (date: string, agents: any[], stationTotal: any) => {
    if (isMock) {
        const stored = localStorage.getItem(LS_KEYS.HISTORY);
        if (stored) {
            let history = JSON.parse(stored);
            const idx = history.findIndex((h: any) => h.date === date);
            if (idx >= 0) {
                history[idx].agents = agents;
                history[idx].stationTotal = stationTotal;
                localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
            }
        }
        return;
    }

    if (!auth.currentUser) throw new Error("Unauthorized");
    const docRef = doc(historyCollection, date);
    await updateDoc(docRef, { agents, stationTotal });
};

export const deleteOldRecords = async (cutoffDate: string) => {
    if (isMock) {
        const stored = localStorage.getItem(LS_KEYS.HISTORY);
        if (stored) {
            let history = JSON.parse(stored);
            history = history.filter((h: any) => h.date >= cutoffDate);
            localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
        }
        return;
    }

    if (!auth.currentUser) throw new Error("Unauthorized");
    const q = query(historyCollection, where("date", "<", cutoffDate));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();
};

// --- ALIAS SYSTEM SERVICES ---

export const fetchAliases = async (): Promise<Record<string, string>> => {
    if (isMock) {
        const stored = localStorage.getItem(LS_KEYS.ALIASES);
        return stored ? JSON.parse(stored) : {};
    }

    if (!auth.currentUser) return {};
    try {
        const docRef = doc(historyCollection, ALIAS_DOC_ID);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            return snapshot.data() as Record<string, string>;
        }
        return {};
    } catch (e) {
        handleFirestoreError('fetchAliases', e);
        return {};
    }
};

export const saveAliases = async (aliases: Record<string, string>) => {
    if (isMock) {
        localStorage.setItem(LS_KEYS.ALIASES, JSON.stringify(aliases));
        return;
    }

    if (!auth.currentUser) throw new Error("Unauthorized");
    const docRef = doc(historyCollection, ALIAS_DOC_ID);
    await setDoc(docRef, aliases);
};

export const batchUpdateAgentName = async (dates: string[], oldName: string, newName: string) => {
    if (isMock) {
        const stored = localStorage.getItem(LS_KEYS.HISTORY);
        if (stored) {
            let history = JSON.parse(stored);
            history = history.map((rec: any) => {
                if (dates.includes(rec.date)) {
                    if (rec.agents) {
                        rec.agents = rec.agents.map((a: any) => {
                            if (a.daName === oldName) return { ...a, daName: newName };
                            return a;
                        });
                    }
                }
                return rec;
            });
            localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
        }
        return;
    }

    if (!auth.currentUser) throw new Error("Unauthorized");
    const batch = writeBatch(db);
    for (const date of dates) {
        const docRef = doc(historyCollection, date);
        const snapshot = await getDoc(docRef);
        if(snapshot.exists()) {
            const data = snapshot.data() as HistoryRecord;
            let changed = false;
            const newAgents = data.agents.map(a => {
                if(a.daName === oldName) {
                    changed = true;
                    return { ...a, daName: newName };
                }
                return a;
            });
            if(changed) {
                batch.update(docRef, { agents: newAgents });
            }
        }
    }
    await batch.commit();
};

export const deleteAgentGlobally = async (agentName: string) => {
    if (isMock) {
        const stored = localStorage.getItem(LS_KEYS.HISTORY);
        if (stored) {
            let history = JSON.parse(stored);
            history.forEach((rec: any) => {
                if(rec.agents) {
                    rec.agents = rec.agents.filter((a: any) => a.daName !== agentName);
                }
            });
            localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
        }
        return;
    }

    if (!auth.currentUser) throw new Error("Unauthorized");
    const snapshot = await getDocs(historyCollection);
    const batch = writeBatch(db);
    snapshot.forEach((d) => {
        if(d.id === ALIAS_DOC_ID || d.id === USERS_DOC_ID || d.id === SETTINGS_DOC_ID) return;
        const data = d.data() as HistoryRecord;
        if(data.agents && data.agents.some(a => a.daName === agentName)) {
            const newAgents = data.agents.filter(a => a.daName !== agentName);
            batch.update(d.ref, { agents: newAgents });
        }
    });
    await batch.commit();
};

export { ADMIN_EMAIL, isMock };
