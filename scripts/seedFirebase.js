import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, writeBatch } from "firebase/firestore";
import wineriesData from '../csvjson.json' with { type: 'json' };
import housekeepingData from '../housekeeping.json' with { type: 'json' };

// Firebase config
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

// Helper functions (copiadas de constants.js)
function getCountryCode(location) {
  if (!location || location === '...') return 'XX';
  const locationLower = location.toLowerCase();

  if (locationLower.includes('alemania') || locationLower.includes('germany') ||
      locationLower.includes('palatinado') || locationLower.includes('franconia') ||
      locationLower.includes('bayern') || locationLower.includes('rheingau') ||
      locationLower.includes('mosela') || locationLower.includes('saar') ||
      locationLower.includes('württemberg') || locationLower.includes('hesse')) {
    return 'DE';
  }
  if (locationLower.includes('canterbury') || locationLower.includes('waipara') ||
      locationLower.includes('christchurch') || locationLower.includes('kumeu') ||
      locationLower.includes('auckland') || locationLower.includes('marlborough') ||
      locationLower.includes('blenheim') || locationLower.includes('renwick') ||
      locationLower.includes('waiheke') || locationLower.includes('hawke') ||
      locationLower.includes('napier') || locationLower.includes('hastings') ||
      locationLower.includes('martinborough') || locationLower.includes('wairarapa') ||
      locationLower.includes('otago') || locationLower.includes('queenstown') ||
      locationLower.includes('nelson') || locationLower.includes('wanaka')) {
    return 'NZ';
  }
  if (locationLower.includes('burdeos') || locationLower.includes('bordeaux') ||
      locationLower.includes('aquitania') || locationLower.includes('saboia') ||
      locationLower.includes('ródano') || locationLower.includes('rhone') ||
      locationLower.includes('borgoña') || locationLower.includes('burgundy') ||
      locationLower.includes('beaune') || locationLower.includes('jura') ||
      locationLower.includes('hérault') || locationLower.includes('occitania') ||
      locationLower.includes('provenza') || locationLower.includes('provence') ||
      locationLower.includes('vaucluse') || locationLower.includes('var')) {
    return 'FR';
  }
  if (locationLower.includes('california') || locationLower.includes('washington') ||
      locationLower.includes('oregon') || locationLower.includes('oregón') ||
      locationLower.includes('virginia') || locationLower.includes('missouri') ||
      locationLower.includes('wisconsin')) {
    return 'US';
  }
  if (locationLower.includes('italia') || locationLower.includes('italy') ||
      locationLower.includes('toscana') || locationLower.includes('piemonte') ||
      locationLower.includes('veneto') || locationLower.includes('sicilia')) {
    return 'IT';
  }
  if (locationLower.includes('españa') || locationLower.includes('spain') ||
      locationLower.includes('rioja') || locationLower.includes('ribera') ||
      locationLower.includes('priorat') || locationLower.includes('cataluña')) {
    return 'ES';
  }
  if (locationLower.includes('portugal') || locationLower.includes('douro') ||
      locationLower.includes('alentejo') || locationLower.includes('dão')) {
    return 'PT';
  }
  if (locationLower.includes('austria') || locationLower.includes('österreich') ||
      locationLower.includes('viena') || locationLower.includes('wachau') ||
      locationLower.includes('burgenland')) {
    return 'AT';
  }
  if (locationLower.includes('suiza') || locationLower.includes('switzerland') ||
      locationLower.includes('schweiz') || locationLower.includes('valais') ||
      locationLower.includes('vaud') || locationLower.includes('genève')) {
    return 'CH';
  }
  if (locationLower.includes('grecia') || locationLower.includes('greece') ||
      locationLower.includes('santorini') || locationLower.includes('creta') ||
      locationLower.includes('peloponeso')) {
    return 'GR';
  }
  if (locationLower.includes('hungría') || locationLower.includes('hungary') ||
      locationLower.includes('tokaj') || locationLower.includes('eger')) {
    return 'HU';
  }
  if (locationLower.includes('checa') || locationLower.includes('czech') ||
      locationLower.includes('moravia') || locationLower.includes('bohemia')) {
    return 'CZ';
  }
  return 'XX';
}

function getCountryCodeFromHousekeeping(location) {
  if (!location) return 'XX';
  const locationLower = location.toLowerCase();

  if (locationLower.includes('suiza') || locationLower.includes('switzerland') ||
      locationLower.includes('zermatt') || locationLower.includes('verbier') ||
      locationLower.includes('st. moritz')) return 'CH';
  if (locationLower.includes('francia') || locationLower.includes('france') ||
      locationLower.includes('courchevel') || locationLower.includes('chamonix') ||
      locationLower.includes('val thorens')) return 'FR';
  if (locationLower.includes('austria') || locationLower.includes('st. anton') ||
      locationLower.includes('lech') || locationLower.includes('zürs') ||
      locationLower.includes('ischgl') || locationLower.includes('kitzbühel') ||
      locationLower.includes('saalbach') || locationLower.includes('warth')) return 'AT';
  if (locationLower.includes('italia') || locationLower.includes('italy') ||
      locationLower.includes('cortina') || locationLower.includes('val gardena') ||
      locationLower.includes('cerdeña') || locationLower.includes('sardinia')) return 'IT';
  if (locationLower.includes('españa') || locationLower.includes('spain') ||
      locationLower.includes('mallorca') || locationLower.includes('ibiza') ||
      locationLower.includes('lanzarote') || locationLower.includes('costa del sol')) return 'ES';
  if (locationLower.includes('grecia') || locationLower.includes('greece') ||
      locationLower.includes('santorini') || locationLower.includes('mykonos')) return 'GR';
  if (locationLower.includes('portugal') || locationLower.includes('algarve') ||
      locationLower.includes('lisboa') || locationLower.includes('lisbon')) return 'PT';
  if (locationLower.includes('suecia') || locationLower.includes('sweden') ||
      locationLower.includes('åre') || locationLower.includes('sälen') ||
      locationLower.includes('jukkasjärvi') || locationLower.includes('halmstad') ||
      locationLower.includes('strömstad') || locationLower.includes('visby') ||
      locationLower.includes('gotland')) return 'SE';
  if (locationLower.includes('finlandia') || locationLower.includes('finland') ||
      locationLower.includes('rovaniemi') || locationLower.includes('saariselkä') ||
      locationLower.includes('levi')) return 'FI';
  if (locationLower.includes('noruega') || locationLower.includes('norway') ||
      locationLower.includes('trysil') || locationLower.includes('hemsedal') ||
      locationLower.includes('lofoten') || locationLower.includes('larvik') ||
      locationLower.includes('geiranger') || locationLower.includes('lofthus')) return 'NO';
  if (locationLower.includes('islandia') || locationLower.includes('iceland') ||
      locationLower.includes('höfn')) return 'IS';
  if (locationLower.includes('dinamarca') || locationLower.includes('denmark') ||
      locationLower.includes('skagen') || locationLower.includes('copenhague') ||
      locationLower.includes('copenhagen')) return 'DK';
  if (locationLower.includes('reino unido') || locationLower.includes('uk') ||
      locationLower.includes('europa (varios)')) return 'GB';
  return 'XX';
}

async function seedWineries() {
  console.log('📝 Seeding wineries...');
  const batch = writeBatch(db);

  const wineries = wineriesData
    .filter(item => item["Bodega (Weingut)"] && item["Bodega (Weingut)"] !== '...' && item["Bodega (Weingut)"].trim() !== '')
    .map((item, index) => {
      let email = item["Email de contacto"] || '';
      let harvestStart = item["Inicio de vendimia"] || '';

      if (email === '' && harvestStart && harvestStart.includes('@')) {
        email = harvestStart;
        harvestStart = 'TBD';
      }

      return {
        id: index + 1,
        name: item["Bodega (Weingut)"],
        email: email,
        location: item["Ubicación"] || '',
        harvestStart: harvestStart,
        country: getCountryCode(item["Ubicación"]),
        status: "Pending",
        notes: "",
        hidden: false
      };
    });

  wineries.forEach((winery) => {
    const wineryRef = doc(db, "wineries", winery.id.toString());
    batch.set(wineryRef, winery);
  });

  await batch.commit();
  console.log(`✅ ${wineries.length} wineries seeded`);
}

async function seedHousekeeping() {
  console.log('📝 Seeding housekeeping...');
  const batch = writeBatch(db);

  const housekeeping = housekeepingData.map((item, index) => ({
    id: index + 1,
    name: item["Nombre de la Empresa"] || '',
    email: item["Email de Contacto"] || '',
    location: item["Ubicación"] || '',
    season: item["Temporada"] || '',
    country: getCountryCodeFromHousekeeping(item["Ubicación"]),
    status: "Pending",
    notes: "",
    hidden: false
  }));

  housekeeping.forEach((hotel) => {
    const hotelRef = doc(db, "housekeeping", hotel.id.toString());
    batch.set(hotelRef, hotel);
  });

  await batch.commit();
  console.log(`✅ ${housekeeping.length} hotels seeded`);
}

async function seedTemplates() {
  console.log('📝 Seeding templates...');

  const templates = {
    'winery-email': {
      content: `Hi Team,\n\nHope you are doing well.\n\nWe are Belu and Marco, an experienced Cellar Hand couple currently based in Blenheim. We are writing to see if you have any vintage positions available.\n\nWe have completed 5 vintages combined across Australia and New Zealand (Treasury Wines, Dee Vine, etc). We are reliable, experienced in cellar ops/logistics, and ready to start immediately.\n\nPlease find our Resumes and Cover Letters attached.\n\nThanks for your time!\n\nBelu & Marco\n+64 [BELU_NUMBER] / +64 [MARCO_NUMBER]`
    },
    'winery-cover-letter': {
      content: `Subject: Experienced Cellar Hand Couple Team (5+ Combined Vintages) - Belu & Marco\n\nHello Team,\n\nWe are Belu and Marco... [PEGAR AQUÍ LA VERSIÓN COMPLETA QUE HICIMOS]`
    },
    'housekeeping-email': {
      content: `Hi Team,\n\nHope you are having a good week.\n\nWe are Belu and Marco, a hardworking couple team currently in New Zealand and looking for work.\n\nWe are versatile "All-rounders": we have strong experience in Housekeeping, Maintenance, and we can also help as Baristas/Bartenders. We work well together and require minimal supervision.\n\nWe have attached our Resumes and Cover Letters for you to have a look.\n\nLooking forward to hearing from you!\n\nBelu & Marco\n+64 [BELU_NUMBER] / +64 [MARCO_NUMBER]`
    },
    'housekeeping-cover-letter': {
      content: `Subject: Professional Housekeeping Couple Team - Belu & Marco\n\nHello Team,\n\nWe are Belu and Marco... [PEGAR AQUÍ LA VERSIÓN COMPLETA QUE HICIMOS]`
    }
  };

  for (const [key, value] of Object.entries(templates)) {
    await setDoc(doc(db, "templates", key), value);
  }

  console.log(`✅ ${Object.keys(templates).length} templates seeded`);
}

async function seedConfig() {
  console.log('📝 Seeding config...');

  const config = {
    flags: {
      AR: "🇦🇷", NZ: "🇳🇿", AU: "🇦🇺", IT: "🇮🇹", FR: "🇫🇷",
      US: "🇺🇸", ES: "🇪🇸", ZA: "🇿🇦", PT: "🇵🇹", DE: "🇩🇪",
      AT: "🇦🇹", CH: "🇨🇭", GR: "🇬🇷", HU: "🇭🇺", CZ: "🇨🇿",
      GB: "🇬🇧", RO: "🇷🇴", BG: "🇧🇬", HR: "🇭🇷", SI: "🇸🇮",
      NL: "🇳🇱", CA: "🇨🇦", MX: "🇲🇽", JP: "🇯🇵", ID: "🇮🇩",
      VN: "🇻🇳", PF: "🇵🇫", SE: "🇸🇪", FI: "🇫🇮", NO: "🇳🇴",
      IS: "🇮🇸", DK: "🇩🇰", XX: "🏳️"
    },
    statusOptions: [
      { label: 'Pending', color: 'bg-gray-600' },
      { label: 'Sent', color: 'bg-blue-600' },
      { label: 'Replied', color: 'bg-yellow-600' },
      { label: 'Interview', color: 'bg-purple-600' },
      { label: 'Offer', color: 'bg-green-600' },
      { label: 'Rejected', color: 'bg-red-600' },
    ],
    resumes: [
      { id: 1, type: 'Winery', person: 'Belu', file: 'Resume W - January 2026 - Maria Belen Corzo.pdf', path: '/resumes/Resume W - January 2026 - Maria Belen Corzo.pdf' },
      { id: 2, type: 'Winery', person: 'Marco', file: 'Resume W - January 2026 - Marco Piermatei.pdf', path: '/resumes/Resume W - January 2026 - Marco Piermatei.pdf' },
      { id: 3, type: 'Housekeeping', person: 'Belu', file: 'Resume HK - January 2026 - Maria Belen Corzo copia.pdf', path: '/resumes/Resume HK - January 2026 - Maria Belen Corzo copia.pdf' },
      { id: 4, type: 'Housekeeping', person: 'Marco', file: 'Resume HK - January 2026 - Marco Piermatei.pdf', path: '/resumes/Resume HK - January 2026 - Marco Piermatei.pdf' },
    ],
    otherDocuments: [
      { id: 1, name: 'E-Visa', file: 'e-visa.pdf', path: '/documents/e-visa.pdf', description: 'Electronic Visa Documentation' },
    ]
  };

  await setDoc(doc(db, "config", "app"), config);
  console.log('✅ Config seeded');
}

async function seedAll() {
  try {
    console.log('🚀 Starting Firebase seed...\n');

    await seedWineries();
    await seedHousekeeping();
    await seedTemplates();
    await seedConfig();

    console.log('\n🎉 All data seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
}

seedAll();
