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
