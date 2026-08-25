
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { 
  getFirestore, 
  initializeFirestore,
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc,
  doc, 
  query,
  orderBy,
  getDoc,
  writeBatch,
  updateDoc,
  where,
  setLogLevel
} from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, User, createUserWithEmailAndPassword } from "firebase/auth";
import { HistoryRecord } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyANOUKYFoLpHLjnCRs_e7jokrMONOmOF8c",
  authDomain: "fir-21f48.firebaseapp.com",
  projectId: "fir-21f48",
  storageBucket: "fir-21f48.firebasestorage.app",
  messagingSenderId: "882060321556",
  appId: "1:882060321556:web:2fe9fe3c43256c2d0bd801",
  measurementId: "G-C2CHF33JXN"
};

// Initialize Primary App
const app = initializeApp(firebaseConfig);

// Initialize Analytics safely
isSupported().then(supported => {
  if (supported) {
    getAnalytics(app);
  }
}).catch(e => console.warn("Analytics not supported:", e?.message || "Unknown error"));

// Initialize Firestore
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
setLogLevel('silent');
export const auth = getAuth(app);

// Admin Email Constant
export const ADMIN_EMAIL = "mohammedhashmed88@gmail.com";

// Check if user is Admin
export const isUserAdmin = (user: User | null): boolean => {
    return user?.email === ADMIN_EMAIL;
};

// Collections
const COLLECTION_NAME = "reps";
const USERS_DOC_ID = "users_list_v1"; 
const SETTINGS_DOC_ID = "app_settings_v1"; // New document for settings like aliases

const historyCollection = collection(db, COLLECTION_NAME);

// --- Auth Functions ---

export const loginUser = async (email: string, pass: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    console.error("Login Error:", error.code, error.message);
    let msg = "بيانات الدخول غير صحيحة";
    if(error.code === 'auth/network-request-failed') msg = "فشل الاتصال بالشبكة. يرجى التحقق من الإنترنت.";
    if(error.code === 'auth/too-many-requests') msg = "تم حظر الحساب مؤقتاً لكثرة المحاولات.";
    if(error.code === 'auth/invalid-credential') msg = "البريد الإلكتروني أو كلمة المرور خطأ.";
    throw new Error(msg);
  }
};

export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout Error:", error);
  }
};

// Create User (Admin Feature)
export const createNewUser = async (email: string, pass: string, role: string = "user", stationAccess: string = "All") => {
    try {
        const secondaryAuth = getAuth(initializeApp(firebaseConfig, `Secondary_${Date.now()}`)); 
        await createUserWithEmailAndPassword(secondaryAuth, email, pass);
        
        const userRef = doc(db, COLLECTION_NAME, USERS_DOC_ID);
        const userSnap = await getDoc(userRef);
        let currentUsers = userSnap.exists() ? (userSnap.data().users || []) : [];
        
        if (!currentUsers.find((u: any) => u.email === email)) {
            currentUsers.push({
                email: email,
                role: role,
                stationAccess: stationAccess,
                createdAt: new Date().toISOString(),
                createdBy: auth.currentUser?.email || 'unknown'
            });
            await setDoc(userRef, { users: currentUsers }, { merge: true });
        }
        return true;
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') throw new Error("هذا البريد مسجل بالفعل.");
        if (error.code === 'auth/weak-password') throw new Error("كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل).");
        throw error;
    }
};

// Fetch Registered Users List
export const fetchRegisteredUsers = async () => {
    if (!auth.currentUser || !isUserAdmin(auth.currentUser)) return [];
    
    try {
        const userRef = doc(db, COLLECTION_NAME, USERS_DOC_ID);
        const userSnap = await getDoc(userRef);
        
        let users: any[] = [];
        if (userSnap.exists()) {
            users = userSnap.data().users || [];
        }
        users.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        
        if (!users.find(u => u.email === ADMIN_EMAIL)) {
            users.unshift({ email: ADMIN_EMAIL, role: 'Super Admin', createdAt: 'Main Account' });
        }
        return users;
    } catch (error) {
        console.warn("Error fetching users:", error instanceof Error ? error.message : error);
        return [{ email: ADMIN_EMAIL, role: 'Super Admin', createdAt: 'Main Account (Fallback)' }];
    }
};

// --- General Settings (App Title) ---
export const fetchGlobalSettings = async (): Promise<{ appTitle?: string, dailyGoal?: number, autoSortByFailed?: boolean } | null> => {
    try {
        const settingsRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
        const snap = await getDoc(settingsRef);
        if (snap.exists()) {
            return snap.data() as { appTitle?: string, dailyGoal?: number, autoSortByFailed?: boolean };
        }
        return null;
    } catch (error) {
        return null;
    }
};

export const fetchAppTitle = async (): Promise<string | null> => {
    const settings = await fetchGlobalSettings();
    return settings?.appTitle || null;
};

export const saveGlobalSettings = async (settings: { appTitle?: string, dailyGoal?: number, autoSortByFailed?: boolean }) => {
    if (!auth.currentUser) throw new Error("غير مصرح");
    try {
        const settingsRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
        await setDoc(settingsRef, settings, { merge: true });
    } catch (error) {
        throw error;
    }
};

export const saveAppTitle = async (title: string) => {
    await saveGlobalSettings({ appTitle: title });
};

// --- Aliases Management ---

// --- Email Settings ---
export const fetchEmailSettings = async (): Promise<string[]> => {
    try {
        const settingsRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
        const snap = await getDoc(settingsRef);
        if (snap.exists() && snap.data().reportEmails) {
            return snap.data().reportEmails;
        }
        return [];
    } catch (error) {
        console.error("Error fetching email settings", error);
        return [];
    }
};

export const saveEmailSettings = async (emails: string[]) => {
    if (!auth.currentUser || !isUserAdmin(auth.currentUser)) throw new Error("غير مصرح");
    try {
        const settingsRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
        await setDoc(settingsRef, { reportEmails: emails }, { merge: true });
    } catch (error) {
        console.error("Error saving email settings", error);
        throw error;
    }
};

export const fetchAliases = async (): Promise<Record<string, string>> => {
    try {
        const settingsRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
        const snap = await getDoc(settingsRef);
        if (snap.exists() && snap.data().aliases) {
            return snap.data().aliases;
        }
        return {};
    } catch (error) {
        console.warn("Error fetching aliases:", error instanceof Error ? error.message : error);
        return {};
    }
};

export const saveAliases = async (aliases: Record<string, string>) => {
    if (!auth.currentUser) throw new Error("غير مصرح");
    try {
        const settingsRef = doc(db, COLLECTION_NAME, SETTINGS_DOC_ID);
        await setDoc(settingsRef, { aliases }, { merge: true });
    } catch (error) {
        console.error("Error saving aliases", error);
        throw error;
    }
};

// --- Intelligent History Fixer ---

// 1. Scan history for a specific agent name
export const scanHistoryForAgent = async (rawName: string): Promise<HistoryRecord[]> => {
    if (!auth.currentUser) return [];
    const allHistory = await fetchHistory();
    // Filter records where the rawName exists in the agents list
    return allHistory.filter(record => 
        record.agents && record.agents.some(a => a.daName === rawName)
    );
};

// 2. Batch update historical records (Merge or Rename)
export const batchUpdateAgentName = async (datesToFix: string[], oldName: string, newName: string) => {
    if (!auth.currentUser) throw new Error("غير مصرح");
    
    const batch = writeBatch(db);
    
    try {
        for (const date of datesToFix) {
            const docRef = doc(db, COLLECTION_NAME, date);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data() as HistoryRecord;
                let agents = data.agents || [];
                let modified = false;

                const oldAgentIndex = agents.findIndex(a => a.daName === oldName);
                const newAgentIndex = agents.findIndex(a => a.daName === newName);

                if (oldAgentIndex !== -1) {
                    const oldAgentData = agents[oldAgentIndex];

                    if (newAgentIndex !== -1) {
                        // CASE 1: MERGE (Both exist on this day)
                        agents[newAgentIndex].delivered += oldAgentData.delivered;
                        agents[newAgentIndex].total += oldAgentData.total;
                        agents[newAgentIndex].successRate = agents[newAgentIndex].total > 0 
                            ? (agents[newAgentIndex].delivered / agents[newAgentIndex].total) * 100 
                            : 0;
                        agents.splice(oldAgentIndex, 1);
                        modified = true;
                    } else {
                        // CASE 2: RENAME (Only old exists)
                        agents[oldAgentIndex].daName = newName;
                        modified = true;
                    }
                }

                if (modified) {
                    batch.update(docRef, { agents: agents });
                }
            }
        }
        
        await batch.commit();
        return true;
    } catch (error) {
        console.error("Batch update failed:", error);
        throw error;
    }
};

// 3. NEW: Permanently Delete Agent from History
export const deleteAgentGlobally = async (agentName: string) => {
    if (!auth.currentUser) throw new Error("غير مصرح");
    
    const allHistory = await fetchHistory();
    const batch = writeBatch(db);
    let modificationCount = 0;

    for (const record of allHistory) {
        if (record.agents && record.agents.some(a => a.daName === agentName)) {
            const docRef = doc(db, COLLECTION_NAME, record.id || record.date);
            // Filter out the agent
            const newAgents = record.agents.filter(a => a.daName !== agentName);
            
            // Recalculate Station Totals (Optional but keeps data clean)
            // Note: We don't recalculate station totals here to preserve historical accuracy of the station's performance 
            // even if we remove an agent. But if you want to completely erase their existence, uncomment below.
            
            /*
            const newStationTotal = newAgents.reduce((acc, curr) => ({
                delivered: acc.delivered + curr.delivered,
                total: acc.total + curr.total
            }), { delivered: 0, total: 0 });
            const successRate = newStationTotal.total > 0 ? (newStationTotal.delivered / newStationTotal.total) * 100 : 0;
            */

            batch.update(docRef, { agents: newAgents });
            modificationCount++;
        }
    }

    if (modificationCount > 0) {
        await batch.commit();
    }
    return modificationCount;
};


export const subscribeToAuth = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// --- Database Functions ---

export const saveDailyRecord = async (record: HistoryRecord) => {
  if (!auth.currentUser) throw new Error("يجب تسجيل الدخول أولاً");
  
  const access = await getUserStationAccess(auth.currentUser.email || '');
  if (access !== 'All' && access !== record.station) {
      throw new Error(`⛔ عذراً، مسموح لك فقط بالحفظ لمحطة ${access}.`);
  }
  
  try {
    const docId = record.station ? `${record.station}_${record.date}` : record.date;
    await setDoc(doc(db, COLLECTION_NAME, docId), record);
    return true;
  } catch (error: any) {
    console.error("Error adding document: ", error);
    if (error.code === 'permission-denied') {
        throw new Error("ليس لديك صلاحية للكتابة.");
    }
    throw error;
  }
};

// UPDATE Daily Record (Admin Feature)
export const updateDailyRecord = async (docId: string, agents: any[], stationTotal: any) => {
    if (!auth.currentUser || !isUserAdmin(auth.currentUser)) throw new Error("غير مصرح (Admin Only).");

    try {
        const docRef = doc(db, COLLECTION_NAME, docId);
        await updateDoc(docRef, {
            agents: agents,
            stationTotal: stationTotal
        });
        return true;
    } catch (error: any) {
        console.error("Error updating document:", error);
        throw error;
    }
};

export const deleteDailyRecord = async (docId: string) => {
  if (!auth.currentUser) throw new Error("يجب تسجيل الدخول أولاً");
  if (!isUserAdmin(auth.currentUser)) throw new Error("صلاحية المدير فقط.");

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, docId));
    return true;
  } catch (error: any) {
    console.error("Error deleting document: ", error);
    throw error;
  }
};

// Maintenance: Delete Old Records
export const deleteOldRecords = async (cutoffDate: string) => {
    if (!auth.currentUser || !isUserAdmin(auth.currentUser)) throw new Error("غير مصرح");
    
    // Manual filtering because Firestore query inequalities are tricky with IDs
    const batchLimit = 400; // Firestore limit is 500
    const allRecords = await fetchHistory();
    const toDelete = allRecords.filter(r => r.date < cutoffDate);
    
    if (toDelete.length === 0) throw new Error("لا توجد سجلات قديمة للحذف.");

    const batch = writeBatch(db);
    toDelete.forEach(rec => {
        const docRef = doc(db, COLLECTION_NAME, rec.id || rec.date);
        batch.delete(docRef);
    });
    
    await batch.commit();
    return toDelete.length;
};

export const fetchHistory = async (): Promise<HistoryRecord[]> => {
  if (!auth.currentUser) return [];

  try {
    const q = query(historyCollection);
    const querySnapshot = await getDocs(q);
    const data: HistoryRecord[] = [];
    querySnapshot.forEach((doc) => {
      // Filter out config documents
      if (doc.exists() && doc.id !== USERS_DOC_ID && doc.id !== SETTINGS_DOC_ID) {
        const docData = doc.data() as HistoryRecord;
        docData.id = doc.id;
        if (!docData.date) {
            // Check if it has a station prefix (e.g. DAW1_2026-08-21)
            const parts = doc.id.split('_');
            if (parts.length === 2) {
                docData.date = parts[1];
                if (!docData.station) docData.station = parts[0];
            } else {
                docData.date = doc.id;
            }
        }
        if (!docData.station && doc.id.includes('_')) {
             docData.station = doc.id.split('_')[0];
        }
        if (docData.date) {
             data.push(docData);
        }
      }
    });
    return data.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  } catch (error: any) {
    console.warn("Error fetching documents: ", error instanceof Error ? error.message : error);
    return [];
  }
};

export const getUserStationAccess = async (email: string): Promise<string> => {
    try {
        if (email === ADMIN_EMAIL || email.toLowerCase() === 'ahmed.samir.abdelaziz@bosta.co') return 'All';
        const userRef = doc(db, COLLECTION_NAME, USERS_DOC_ID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const users = userSnap.data().users || [];
            const user = users.find((u: any) => u.email === email);
            return user ? (user.stationAccess || 'All') : 'All';
        }
        return 'All';
    } catch (error) {
        return 'All';
    }
};

export const getCurrentUserRole = async (email: string): Promise<string> => {
    if (email.toLowerCase() === 'ahmed.samir.abdelaziz@bosta.co') return 'manager';
    try {
        const userRef = doc(db, COLLECTION_NAME, USERS_DOC_ID);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const users = userSnap.data().users || [];
            const user = users.find((u: any) => u.email === email);
            return user ? user.role : 'user';
        }
        return 'user';
    } catch (error) {
        return 'user';
    }
};
