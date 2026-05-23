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

// Helper functions
function getCountryCode(location) {
  if (!location || location === '...') return 'XX';
  const l = location.toLowerCase();

  // Australia
  if (l.includes('australia') || l.includes('barossa') || l.includes('mclaren vale') ||
      l.includes('margaret river') || l.includes('hunter valley') || l.includes('yarra valley') ||
      l.includes('south australia') || l.includes('western australia') || l.includes('victoria') ||
      l.includes('new south wales') || l.includes('clare valley') || l.includes('coonawarra') ||
      l.includes('eden valley') || l.includes('nuriootpa') || l.includes('tanunda') ||
      l.includes('krondorf') || l.includes('angaston') || l.includes('keyneton') ||
      l.includes('bethany') || l.includes('seppeltsfield') || l.includes('marananga') ||
      l.includes('pokolbin') || l.includes('dixons creek') || l.includes('healesville') ||
      l.includes('gembrook') || l.includes('wilyabrup')) {
    return 'AU';
  }
  // Nueva Zelanda
  if (l.includes('nueva zelanda') || l.includes('new zealand') ||
      l.includes('canterbury') || l.includes('waipara') || l.includes('christchurch') ||
      l.includes('kumeu') || l.includes('auckland') || l.includes('marlborough') ||
      l.includes('blenheim') || l.includes('renwick') || l.includes('waiheke') ||
      l.includes('hawke') || l.includes('napier') || l.includes('hastings') ||
      l.includes('martinborough') || l.includes('wairarapa') || l.includes('otago') ||
      l.includes('queenstown') || l.includes('nelson') || l.includes('wanaka')) {
    return 'NZ';
  }
  // Sudáfrica
  if (l.includes('sudáfrica') || l.includes('south africa') || l.includes('stellenbosch') ||
      l.includes('franschhoek') || l.includes('western cape') || l.includes('constantia') ||
      l.includes('helderberg') || l.includes('simonsberg') || l.includes('koelenhof') ||
      l.includes('somerset west') || l.includes('paarl')) {
    return 'ZA';
  }
  // Argentina
  if (l.includes('argentina') || l.includes('mendoza') || l.includes('luján de cuyo') ||
      l.includes('valle de uco') || l.includes('maipú') || l.includes('agrelo')) {
    return 'AR';
  }
  // Chile
  if (l.includes('chile') || l.includes('maipo') || l.includes('colchagua') ||
      l.includes('casablanca') || l.includes('aconcagua') || l.includes('pirque') ||
      l.includes('melipilla') || l.includes('panquehue') || l.includes('apalta')) {
    return 'CL';
  }
  // Canadá
  if (l.includes('canadá') || l.includes('canada') || l.includes('okanagan') ||
      l.includes('british columbia') || l.includes('ontario') || l.includes('niagara') ||
      l.includes('kelowna') || l.includes('whistler') || l.includes('banff')) {
    return 'CA';
  }
  // Alemania
  if (l.includes('alemania') || l.includes('germany') || l.includes('palatinado') ||
      l.includes('franconia') || l.includes('bayern') || l.includes('rheingau') ||
      l.includes('mosela') || l.includes('saar') || l.includes('württemberg') ||
      l.includes('hesse') || l.includes('rheinhessen') || l.includes('pfalz') ||
      l.includes('rheinland-pfalz') || l.includes('mosel')) {
    return 'DE';
  }
  // Francia
  if (l.includes('francia') || l.includes('france') || l.includes('burdeos') ||
      l.includes('bordeaux') || l.includes('aquitania') || l.includes('ródano') ||
      l.includes('rhone') || l.includes('borgoña') || l.includes('burgundy') ||
      l.includes('beaune') || l.includes('jura') || l.includes('hérault') ||
      l.includes('occitania') || l.includes('provenza') || l.includes('provence') ||
      l.includes('vaucluse') || l.includes('var') || l.includes('languedoc') ||
      l.includes('champagne') || l.includes('saboia') || l.includes('alsacia')) {
    return 'FR';
  }
  // Italia
  if (l.includes('italia') || l.includes('italy') || l.includes('toscana') ||
      l.includes('piamonte') || l.includes('piemonte') || l.includes('veneto') ||
      l.includes('sicilia') || l.includes('lombardía') || l.includes('trentino') ||
      l.includes('alto adige') || l.includes('umbria') || l.includes('montalcino') ||
      l.includes('bolgheri') || l.includes('chianti') || l.includes('barbaresco') ||
      l.includes('barolo') || l.includes('alba') || l.includes('firenze') ||
      l.includes('valpolicella') || l.includes('puglia') || l.includes('amalfi') ||
      l.includes('cerdeña') || l.includes('sardinia') || l.includes('san casciano')) {
    return 'IT';
  }
  // España
  if (l.includes('españa') || l.includes('spain') || l.includes('rioja') ||
      l.includes('ribera') || l.includes('priorat') || l.includes('cataluña') ||
      l.includes('penedès') || l.includes('galicia') || l.includes('navarra') ||
      l.includes('jerez') || l.includes('valladolid') || l.includes('burgos') ||
      l.includes('tarragona') || l.includes('barcelona') || l.includes('haro') ||
      l.includes('elciego') || l.includes('ollauri') || l.includes('peñafiel') ||
      l.includes('pesquera de duero')) {
    return 'ES';
  }
  // Portugal
  if (l.includes('portugal') || l.includes('douro') || l.includes('alentejo') ||
      l.includes('dão') || l.includes('vinho verde') || l.includes('lisboa') ||
      l.includes('algarve')) {
    return 'PT';
  }
  // Austria
  if (l.includes('austria') || l.includes('österreich') || l.includes('wachau') ||
      l.includes('burgenland') || l.includes('kamptal') || l.includes('kremstal') ||
      l.includes('lech') || l.includes('ischgl') || l.includes('kitzbühel') ||
      l.includes('sölden') || l.includes('tirol')) {
    return 'AT';
  }
  // Suiza
  if (l.includes('suiza') || l.includes('switzerland') || l.includes('schweiz') ||
      l.includes('valais') || l.includes('vaud') || l.includes('genève') ||
      l.includes('zermatt') || l.includes('verbier') || l.includes('st. moritz') ||
      l.includes('arosa') || l.includes('engadina')) {
    return 'CH';
  }
  // Grecia
  if (l.includes('grecia') || l.includes('greece') || l.includes('santorini') ||
      l.includes('creta') || l.includes('peloponeso') || l.includes('macedonia')) {
    return 'GR';
  }
  // Hungría
  if (l.includes('hungría') || l.includes('hungary') || l.includes('tokaj')) {
    return 'HU';
  }
  // Croacia
  if (l.includes('croacia') || l.includes('croatia') || l.includes('istria') ||
      l.includes('dalmacia') || l.includes('dubrovnik') || l.includes('split')) {
    return 'HR';
  }
  // Eslovenia
  if (l.includes('eslovenia') || l.includes('slovenia')) return 'SI';
  // Rep. Checa
  if (l.includes('checa') || l.includes('czech') || l.includes('moravia')) return 'CZ';
  // Bulgaria
  if (l.includes('bulgaria')) return 'BG';
  // Rumania
  if (l.includes('rumanía') || l.includes('romania')) return 'RO';
  // Georgia
  if (l.includes('georgia') || l.includes('kakheti')) return 'GE';
  // Chipre
  if (l.includes('chipre') || l.includes('cyprus')) return 'CY';
  // Luxemburgo
  if (l.includes('luxemburgo') || l.includes('luxembourg')) return 'LU';
  // USA
  if (l.includes('usa') || l.includes('california') || l.includes('washington') ||
      l.includes('oregon') || l.includes('oregón') || l.includes('virginia') ||
      l.includes('missouri') || l.includes('wisconsin') || l.includes('napa') ||
      l.includes('sonoma') || l.includes('estados unidos')) {
    return 'US';
  }
  return 'XX';
}

function getCountryCodeFromHousekeeping(location) {
  if (!location) return 'XX';
  const l = location.toLowerCase();

  if (l.includes('suiza') || l.includes('switzerland') || l.includes('zermatt') ||
      l.includes('verbier') || l.includes('st. moritz') || l.includes('arosa') ||
      l.includes('engadina') || l.includes('sils maria')) return 'CH';
  if (l.includes('francia') || l.includes('france') || l.includes('courchevel') ||
      l.includes('chamonix') || l.includes('val thorens') || l.includes('val d\'isère') ||
      l.includes('méribel') || l.includes('tignes') || l.includes('morzine') ||
      l.includes('alpes franceses') || l.includes('marne')) return 'FR';
  if (l.includes('austria') || l.includes('st. anton') || l.includes('lech') ||
      l.includes('zürs') || l.includes('ischgl') || l.includes('kitzbühel') ||
      l.includes('saalbach') || l.includes('warth') || l.includes('arlberg') ||
      l.includes('sölden') || l.includes('tirol') || l.includes('oberlech') ||
      l.includes('berchtesgaden')) return 'AT';
  if (l.includes('italia') || l.includes('italy') || l.includes('cortina') ||
      l.includes('val gardena') || l.includes('cerdeña') || l.includes('sardinia') ||
      l.includes('dolomitas') || l.includes('amalfi') || l.includes('positano') ||
      l.includes('puglia') || l.includes('costa smeralda') || l.includes('porto cervo') ||
      l.includes('fasano') || l.includes('santa margherita')) return 'IT';
  if (l.includes('españa') || l.includes('spain') || l.includes('mallorca') ||
      l.includes('ibiza') || l.includes('lanzarote') || l.includes('costa del sol') ||
      l.includes('baleares') || l.includes('canarias') || l.includes('marbella') ||
      l.includes('gran canaria') || l.includes('barcelona') || l.includes('maspalomas') ||
      l.includes('costa teguise')) return 'ES';
  if (l.includes('grecia') || l.includes('greece') || l.includes('santorini') ||
      l.includes('mykonos') || l.includes('creta') || l.includes('corfú') ||
      l.includes('rodas') || l.includes('heraklion') || l.includes('rethymno') ||
      l.includes('elounda') || l.includes('lindos') || l.includes('halkidiki')) return 'GR';
  if (l.includes('portugal') || l.includes('algarve') || l.includes('lisboa') ||
      l.includes('lisbon') || l.includes('madeira') || l.includes('albufeira') ||
      l.includes('almancil') || l.includes('portimão') || l.includes('porches')) return 'PT';
  if (l.includes('suecia') || l.includes('sweden') || l.includes('åre') ||
      l.includes('sälen') || l.includes('jukkasjärvi') || l.includes('halmstad') ||
      l.includes('strömstad') || l.includes('visby') || l.includes('gotland') ||
      l.includes('riksgränsen') || l.includes('estocolmo') || l.includes('tänndalen') ||
      l.includes('härjedalen') || l.includes('dalarna')) return 'SE';
  if (l.includes('finlandia') || l.includes('finland') || l.includes('rovaniemi') ||
      l.includes('saariselkä') || l.includes('levi') || l.includes('ylläs') ||
      l.includes('ruka') || l.includes('köngäs')) return 'FI';
  if (l.includes('noruega') || l.includes('norway') || l.includes('trysil') ||
      l.includes('hemsedal') || l.includes('lofoten') || l.includes('larvik') ||
      l.includes('geiranger') || l.includes('lofthus') || l.includes('voss') ||
      l.includes('flåm') || l.includes('lyngen') || l.includes('tromsø') ||
      l.includes('svalbard') || l.includes('longyearbyen') || l.includes('stalheim') ||
      l.includes('hardanger') || l.includes('sognefjord') || l.includes('eidfjord')) return 'NO';
  if (l.includes('islandia') || l.includes('iceland') || l.includes('höfn')) return 'IS';
  if (l.includes('dinamarca') || l.includes('denmark') || l.includes('skagen') ||
      l.includes('copenhague') || l.includes('copenhagen')) return 'DK';
  if (l.includes('alemania') || l.includes('germany') || l.includes('baviera') ||
      l.includes('allgäu') || l.includes('grainau') || l.includes('garmisch') ||
      l.includes('berchtesgaden') || l.includes('bad hindelang')) return 'DE';
  if (l.includes('croacia') || l.includes('croatia') || l.includes('dubrovnik') ||
      l.includes('split') || l.includes('dalmacia') || l.includes('istria') ||
      l.includes('zivogosce') || l.includes('orebić') || l.includes('pelješac')) return 'HR';
  if (l.includes('reino unido') || l.includes('uk') || l.includes('united kingdom') ||
      l.includes('escocia') || l.includes('scotland') || l.includes('scotland') ||
      l.includes('lake district') || l.includes('cotswolds') || l.includes('perthshire') ||
      l.includes('edimburgo') || l.includes('inverness') || l.includes('isle of skye') ||
      l.includes('highland') || l.includes('broadway') || l.includes('malmesbury') ||
      l.includes('keswick') || l.includes('ambleside') || l.includes('windermere') ||
      l.includes('langdale') || l.includes('barnsley') || l.includes('crieff') ||
      l.includes('auchterarder') || l.includes('europa (varios)')) return 'GB';
  if (l.includes('irlanda') || l.includes('ireland') || l.includes('mayo') ||
      l.includes('limerick') || l.includes('donegal') || l.includes('longford')) return 'IE';
  if (l.includes('turquía') || l.includes('turkey') || l.includes('bodrum') ||
      l.includes('antalya') || l.includes('belek')) return 'TR';
  if (l.includes('montenegro') || l.includes('tivat') || l.includes('budva') ||
      l.includes('herceg novi')) return 'ME';
  if (l.includes('canadá') || l.includes('canada') || l.includes('whistler') ||
      l.includes('banff') || l.includes('british columbia') || l.includes('alberta') ||
      l.includes('lake louise')) return 'CA';
  if (l.includes('usa') || l.includes('california') || l.includes('florida') ||
      l.includes('alaska') || l.includes('wyoming') || l.includes('colorado')) return 'US';
  if (l.includes('nórdicos') || l.includes('europa') || l.includes('internacional') ||
      l.includes('múltiples') || l.includes('80+') || l.includes('14 países') ||
      l.includes('150+ resorts') || l.includes('alpes')) return 'GB';
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
        emailVerified: email ? false : null,
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

  const housekeeping = housekeepingData.map((item, index) => {
    const email = item["Email de Contacto"] || '';
    return {
      id: index + 1,
      name: item["Nombre de la Empresa"] || '',
      email: email,
      emailVerified: email ? false : null,
      location: item["Ubicación"] || '',
      season: item["Temporada"] || '',
      country: getCountryCodeFromHousekeeping(item["Ubicación"]),
      status: "Pending",
      notes: "",
      hidden: false
    };
  });

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
      IS: "🇮🇸", DK: "🇩🇰", CL: "🇨🇱", GE: "🇬🇪", CY: "🇨🇾",
      LU: "🇱🇺", IE: "🇮🇪", TR: "🇹🇷", ME: "🇲🇪", BE: "🇧🇪",
      XX: "🏳️"
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
