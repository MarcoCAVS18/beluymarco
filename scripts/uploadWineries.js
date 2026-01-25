import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Helper function to extract country code from location
function getCountryCode(location) {
  if (!location || location === '...') return 'XX';

  const locationLower = location.toLowerCase();

  // Alemania/Germany
  if (locationLower.includes('alemania') || locationLower.includes('germany') ||
      locationLower.includes('palatinado') || locationLower.includes('franconia') ||
      locationLower.includes('bayern') || locationLower.includes('rheingau') ||
      locationLower.includes('mosela') || locationLower.includes('saar') ||
      locationLower.includes('württemberg') || locationLower.includes('hesse') ||
      locationLower.includes('rheinhessen') || locationLower.includes('pfalz') ||
      locationLower.includes('rheinland-pfalz') || locationLower.includes('alsacia')) {
    return 'DE';
  }

  // Francia
  if (locationLower.includes('francia') || locationLower.includes('france') ||
      locationLower.includes('burdeos') || locationLower.includes('bordeaux') ||
      locationLower.includes('aquitania') || locationLower.includes('saboya') ||
      locationLower.includes('ródano') || locationLower.includes('rhone') ||
      locationLower.includes('borgoña') || locationLower.includes('burgundy') ||
      locationLower.includes('beaune') || locationLower.includes('jura') ||
      locationLower.includes('provenza') || locationLower.includes('provence') ||
      locationLower.includes('languedoc') || locationLower.includes('roussillon') ||
      locationLower.includes('champaña') || locationLower.includes('champagne') ||
      locationLower.includes('beaujolais') || locationLower.includes('alsacia')) {
    return 'FR';
  }

  // Austria
  if (locationLower.includes('austria') || locationLower.includes('österreich') ||
      locationLower.includes('wachau') || locationLower.includes('burgenland') ||
      locationLower.includes('kamptal') || locationLower.includes('kremstal')) {
    return 'AT';
  }

  // Suiza
  if (locationLower.includes('suiza') || locationLower.includes('switzerland') ||
      locationLower.includes('schweiz') || locationLower.includes('valais')) {
    return 'CH';
  }

  // España
  if (locationLower.includes('españa') || locationLower.includes('spain') ||
      locationLower.includes('rioja') || locationLower.includes('ribera') ||
      locationLower.includes('priorat') || locationLower.includes('cataluña') ||
      locationLower.includes('penedès') || locationLower.includes('galicia') ||
      locationLower.includes('pontevedra') || locationLower.includes('navarra') ||
      locationLower.includes('jerez') || locationLower.includes('cádiz') ||
      locationLower.includes('valladolid') || locationLower.includes('burgos') ||
      locationLower.includes('tarragona') || locationLower.includes('lleida') ||
      locationLower.includes('barcelona')) {
    return 'ES';
  }

  // Portugal
  if (locationLower.includes('portugal') || locationLower.includes('douro') ||
      locationLower.includes('alentejo') || locationLower.includes('dão') ||
      locationLower.includes('vinho verde')) {
    return 'PT';
  }

  // Italia
  if (locationLower.includes('italia') || locationLower.includes('italy') ||
      locationLower.includes('toscana') || locationLower.includes('piamonte') ||
      locationLower.includes('piemonte') || locationLower.includes('veneto') ||
      locationLower.includes('sicilia') || locationLower.includes('lombardía') ||
      locationLower.includes('lombardia') || locationLower.includes('trentino') ||
      locationLower.includes('alto adige') || locationLower.includes('umbría') ||
      locationLower.includes('umbria')) {
    return 'IT';
  }

  // Estados Unidos
  if (locationLower.includes('usa') || locationLower.includes('california') ||
      locationLower.includes('washington') || locationLower.includes('oregon') ||
      locationLower.includes('oregón') || locationLower.includes('virginia') ||
      locationLower.includes('missouri') || locationLower.includes('wisconsin') ||
      locationLower.includes('napa') || locationLower.includes('sonoma')) {
    return 'US';
  }

  // Grecia
  if (locationLower.includes('grecia') || locationLower.includes('greece') ||
      locationLower.includes('santorini') || locationLower.includes('macedonia')) {
    return 'GR';
  }

  // Hungría
  if (locationLower.includes('hungría') || locationLower.includes('hungary') ||
      locationLower.includes('tokaj')) {
    return 'HU';
  }

  // Croacia
  if (locationLower.includes('croacia') || locationLower.includes('croatia') ||
      locationLower.includes('istria') || locationLower.includes('dalmacia')) {
    return 'HR';
  }

  // Eslovenia
  if (locationLower.includes('eslovenia') || locationLower.includes('slovenia')) {
    return 'SI';
  }

  // Georgia
  if (locationLower.includes('georgia') || locationLower.includes('kakheti')) {
    return 'GE';
  }

  // República Checa
  if (locationLower.includes('checa') || locationLower.includes('czech') ||
      locationLower.includes('moravia')) {
    return 'CZ';
  }

  // Chipre
  if (locationLower.includes('chipre') || locationLower.includes('cyprus')) {
    return 'CY';
  }

  // Luxemburgo
  if (locationLower.includes('luxemburgo') || locationLower.includes('luxembourg')) {
    return 'LU';
  }

  // Bulgaria
  if (locationLower.includes('bulgaria')) {
    return 'BG';
  }

  // Rumanía
  if (locationLower.includes('rumanía') || locationLower.includes('romania')) {
    return 'RO';
  }

  return 'XX'; // Unknown
}

async function uploadWineries() {
  try {
    console.log("🍷 Iniciando carga de bodegas a Firebase...\n");

    // Leer el JSON
    const jsonPath = path.join(__dirname, "..", "csvjson.json");
    const rawData = fs.readFileSync(jsonPath, "utf8");
    const wineries = JSON.parse(rawData);

    console.log(`📊 Total de bodegas a cargar: ${wineries.length}\n`);

    // Limpiar colección existente
    console.log("🗑️  Limpiando colección existente...");
    const wineriesCol = collection(db, "wineries");
    const existingDocs = await getDocs(wineriesCol);

    for (const docSnapshot of existingDocs.docs) {
      await deleteDoc(doc(db, "wineries", docSnapshot.id));
    }
    console.log(`   Eliminados ${existingDocs.size} documentos existentes.\n`);

    // Subir cada bodega
    console.log("📤 Subiendo bodegas...");
    let uploaded = 0;
    const countryCounts = {};

    for (let i = 0; i < wineries.length; i++) {
      const winery = wineries[i];
      const id = (i + 1).toString();
      const location = winery["Ubicación"] || "";
      const countryCode = getCountryCode(location);

      // Contar países
      countryCounts[countryCode] = (countryCounts[countryCode] || 0) + 1;

      const wineryData = {
        id: i + 1,
        name: winery["Bodega (Weingut)"] || "",
        location: location,
        harvestStart: winery["Inicio de vendimia"] || "",
        email: winery["Email de contacto"] || "",
        country: countryCode,
        status: "Pending",
        contacted: false,
        hidden: false,
        notes: "",
        lastUpdated: new Date().toISOString()
      };

      await setDoc(doc(db, "wineries", id), wineryData);
      uploaded++;

      // Mostrar progreso cada 50 bodegas
      if (uploaded % 50 === 0) {
        console.log(`   ✓ ${uploaded}/${wineries.length} bodegas subidas...`);
      }
    }

    console.log(`\n✅ ¡Completado! ${uploaded} bodegas cargadas exitosamente.\n`);

    // Mostrar distribución por país
    console.log("🌍 Distribución por país:");
    const sortedCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]);
    for (const [country, count] of sortedCountries) {
      console.log(`   ${country}: ${count} bodegas`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error al cargar bodegas:", error);
    process.exit(1);
  }
}

uploadWineries();
