import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARQLA3ays6cDJbqlVv6uc4gyiWAM2o0S8",
  authDomain: "emails---trabajos.firebaseapp.com",
  projectId: "emails---trabajos",
  storageBucket: "emails---trabajos.firebasestorage.app",
  messagingSenderId: "577304335313",
  appId: "1:577304335313:web:657ed45bb98267a035c6f0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);
