import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function addCoverLetters() {
  try {
    console.log("📄 Actualizando rutas de Cover Letters en Firestore...");
    
    // Definimos las rutas exactas a tus archivos en public/cover
    const coverLettersData = {
      winery: '/cover/Cover Letter W - January 2026.pdf',
      housekeeping: '/cover/Cover Letter HK - January 2026.pdf'
    };

    // Hacemos un update específico al documento config/app
    await updateDoc(doc(db, "config", "app"), {
      coverLetters: coverLettersData
    });

    console.log("✅ Cover Letters actualizadas correctamente en la base de datos.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error actualizando las cover letters:", error);
    process.exit(1);
  }
}

addCoverLetters();