
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyANOUKYFoLpHLjnCRs_e7jokrMONOmOF8c",
  authDomain: "fir-21f48.firebaseapp.com",
  projectId: "fir-21f48",
  storageBucket: "fir-21f48.firebasestorage.app",
  messagingSenderId: "882060321556",
  appId: "1:882060321556:web:2fe9fe3c43256c2d0bd801",
  measurementId: "G-C2CHF33JXN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Since we have real credentials, isMock is always false
export const isMock = false;
