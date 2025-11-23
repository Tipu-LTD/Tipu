import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyC0mFHMVb8WvanEVnSGFjfYrrRJSiW6z94",
  authDomain: "tipu-3fa9c.firebaseapp.com",
  projectId: "tipu-3fa9c",
  storageBucket: "tipu-3fa9c.firebasestorage.app",
  messagingSenderId: "1060648444718",
  appId: "1:1060648444718:web:8a665550441a39845c50bf",
  measurementId: "G-8B5R4KHYWX"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
