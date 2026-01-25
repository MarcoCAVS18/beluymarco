import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyARQLA3ays6cDJbqlVv6uc4gyiWAM2o0S8",
  authDomain: "emails---trabajos.firebaseapp.com",
  projectId: "emails---trabajos",
  storageBucket: "emails---trabajos.firebasestorage.app",
  messagingSenderId: "577304335313",
  appId: "1:577304335313:web:657ed45bb98267a035c6f0"
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