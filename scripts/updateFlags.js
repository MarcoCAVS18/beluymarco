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

async function updateFlags() {
  try {
    console.log("🏳️ Actualizando banderas en Firebase...\n");

    const flags = {
      // Europa Occidental
      DE: "🇩🇪", // Alemania
      FR: "🇫🇷", // Francia
      IT: "🇮🇹", // Italia
      ES: "🇪🇸", // España
      PT: "🇵🇹", // Portugal
      AT: "🇦🇹", // Austria
      CH: "🇨🇭", // Suiza
      GB: "🇬🇧", // Reino Unido
      NL: "🇳🇱", // Países Bajos
      BE: "🇧🇪", // Bélgica
      LU: "🇱🇺", // Luxemburgo

      // Europa del Sur
      GR: "🇬🇷", // Grecia
      CY: "🇨🇾", // Chipre

      // Europa Central/Este
      HU: "🇭🇺", // Hungría
      CZ: "🇨🇿", // República Checa
      HR: "🇭🇷", // Croacia
      SI: "🇸🇮", // Eslovenia
      RO: "🇷🇴", // Rumanía
      BG: "🇧🇬", // Bulgaria
      GE: "🇬🇪", // Georgia

      // Escandinavia
      SE: "🇸🇪", // Suecia
      FI: "🇫🇮", // Finlandia
      NO: "🇳🇴", // Noruega
      DK: "🇩🇰", // Dinamarca
      IS: "🇮🇸", // Islandia

      // Américas
      US: "🇺🇸", // Estados Unidos
      CA: "🇨🇦", // Canadá
      AR: "🇦🇷", // Argentina
      CL: "🇨🇱", // Chile
      MX: "🇲🇽", // México

      // Oceanía
      AU: "🇦🇺", // Australia
      NZ: "🇳🇿", // Nueva Zelanda

      // África
      ZA: "🇿🇦", // Sudáfrica

      // Asia
      JP: "🇯🇵", // Japón

      // Desconocido
      XX: "🏳️"
    };

    await updateDoc(doc(db, "config", "app"), { flags });

    console.log("✅ Banderas actualizadas correctamente.\n");
    console.log("🌍 Países configurados:");
    Object.entries(flags).forEach(([code, flag]) => {
      console.log(`   ${flag} ${code}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateFlags();
