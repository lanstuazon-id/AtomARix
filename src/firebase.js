// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBj7S_0CHgA19gigBajux1KB6IELClCnCE",
  authDomain: "atomarix.firebaseapp.com",
  projectId: "atomarix",
  storageBucket: "atomarix.firebasestorage.app",
  messagingSenderId: "116860990828",
  appId: "1:116860990828:web:3605549c18cf302ea96f49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline caching (persistence)
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open: offline caching can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support offline caching.');
    }
});