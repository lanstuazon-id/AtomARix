import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBj7S_0CHgA19gigBajux1KB6IELClCnCE",
  authDomain: "atomarix.firebaseapp.com",
  projectId: "atomarix",
  storageBucket: "atomarix.firebasestorage.app",
  messagingSenderId: "116860990828",
  appId: "1:116860990828:web:3605549c18cf302ea96f49"
};

const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});
export const auth = getAuth(app);