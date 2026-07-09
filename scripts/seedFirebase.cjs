/**
 * seedFirebase.cjs — usa firebase-compat.js (bundle UMD, sin dependencias externas)
 * Compatible con Node 22.
 * Ejecutar con: node scripts/seedFirebase.cjs
 */

// ⚠️  GUARD: este script usa batch.set() que sobreescribe documentos, borrando
// status/notes/hidden ya marcados. Para evitar destruir progreso por accidente,
// requiere --force-destroy. Usá scripts/seedFirebase.js (la versión .js) que solo
// crea documentos nuevos sin tocar los existentes.
if (!process.argv.includes('--force-destroy')) {
  console.error('❌ Este script SOBREESCRIBE wineries y housekeeping (resetea status, notes, hidden).');
  console.error('   Usá scripts/seedFirebase.js que solo crea nuevos, o pasá --force-destroy.');
  process.exit(1);
}

const firebase = require('../node_modules/firebase/firebase-compat.js');
const wineriesData = require('../csvjson.json');
const housekeepingData = require('../housekeeping.json');

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ── Helpers de país ────────────────────────────────────────────────────────────

function getCountryCode(location) {
  if (!location || location === '...') return 'XX';
  const l = location.toLowerCase();

  if (l.includes('australia') || l.includes('barossa') || l.includes('mclaren vale') ||
      l.includes('margaret river') || l.includes('hunter valley') || l.includes('yarra valley') ||
      l.includes('south australia') || l.includes('western australia') || l.includes('victoria') ||
      l.includes('new south wales') || l.includes('clare valley') || l.includes('coonawarra') ||
      l.includes('eden valley') || l.includes('nuriootpa') || l.includes('tanunda') ||
      l.includes('marananga') || l.includes('seppeltsfield') || l.includes('angaston') ||
      l.includes('keyneton') || l.includes('pokolbin') || l.includes('dixons creek') ||
      l.includes('healesville') || l.includes('gembrook') || l.includes('wilyabrup') ||
      l.includes('coldstream') || l.includes('yering') || l.includes('falls creek') ||
      l.includes('mt hotham') || l.includes('thredbo') || l.includes('perisher')) {
    return 'AU';
  }
  if (l.includes('nueva zelanda') || l.includes('new zealand') ||
      l.includes('marlborough') || l.includes('blenheim') || l.includes('renwick') ||
      l.includes('hawke') || l.includes('napier') || l.includes('hastings') ||
      l.includes('havelock north') || l.includes('otago') || l.includes('queenstown') ||
      l.includes('wanaka') || l.includes('bannockburn') || l.includes('gibbston') ||
      l.includes('waipara') || l.includes('christchurch') || l.includes('kumeu') ||
      l.includes('auckland') || l.includes('martinborough') || l.includes('wairarapa') ||
      l.includes('nelson') || l.includes('mount cook') || l.includes('coronet peak')) {
    return 'NZ';
  }
  if (l.includes('sudáfrica') || l.includes('south africa') || l.includes('stellenbosch') ||
      l.includes('franschhoek') || l.includes('western cape') || l.includes('constantia') ||
      l.includes('somerset west') || l.includes('paarl') || l.includes('hermanus') ||
      l.includes('hemel-en-aarde') || l.includes('robertson') || l.includes('swartland')) {
    return 'ZA';
  }
  if (l.includes('argentina') || l.includes('mendoza') || l.includes('luján de cuyo') ||
      l.includes('valle de uco') || l.includes('maipú') || l.includes('agrelo') ||
      l.includes('tupungato') || l.includes('tunuyán') || l.includes('vistalba')) {
    return 'AR';
  }
  if (l.includes('chile') || l.includes('maipo') || l.includes('colchagua') ||
      l.includes('casablanca') || l.includes('aconcagua') || l.includes('pirque') ||
      l.includes('melipilla') || l.includes('apalta') || l.includes('limarí') ||
      l.includes('curicó') || l.includes('millahue') || l.includes('san antonio')) {
    return 'CL';
  }
  if (l.includes('canadá') || l.includes('canada') || l.includes('okanagan') ||
      l.includes('british columbia') || l.includes('ontario') || l.includes('niagara') ||
      l.includes('kelowna') || l.includes('whistler') || l.includes('banff') ||
      l.includes('alberta') || l.includes('tofino') || l.includes('newfoundland')) {
    return 'CA';
  }
  if (l.includes('alemania') || l.includes('germany') || l.includes('rheingau') ||
      l.includes('mosela') || l.includes('mosel') || l.includes('saar') ||
      l.includes('pfalz') || l.includes('nahe') || l.includes('württemberg') ||
      l.includes('rheinhessen') || l.includes('palatinado') || l.includes('baviera') ||
      l.includes('neustadt') || l.includes('bernkastel') || l.includes('wehlen') ||
      l.includes('deidesheim') || l.includes('rüdesheim') || l.includes('bockenau')) {
    return 'DE';
  }
  if (l.includes('francia') || l.includes('france') || l.includes('bordeaux') ||
      l.includes('burdeos') || l.includes('ródano') || l.includes('rhone') ||
      l.includes('borgoña') || l.includes('burgundy') || l.includes('beaune') ||
      l.includes('champagne') || l.includes('alsacia') || l.includes('provence') ||
      l.includes('languedoc') || l.includes('margaux') || l.includes('pauillac') ||
      l.includes('saint-julien') || l.includes('saint-émilion') || l.includes('pomerol') ||
      l.includes('pessac') || l.includes('gevrey') || l.includes('vosne') ||
      l.includes('nuits-saint') || l.includes('puligny') || l.includes('reims') ||
      l.includes('châteauneuf') || l.includes('ampuis') || l.includes('kaysersberg') ||
      l.includes('turckheim') || l.includes('mareuil') || l.includes('jura')) {
    return 'FR';
  }
  if (l.includes('italia') || l.includes('italy') || l.includes('toscana') ||
      l.includes('piamonte') || l.includes('piemonte') || l.includes('veneto') ||
      l.includes('sicilia') || l.includes('trentino') || l.includes('alto adige') ||
      l.includes('montalcino') || l.includes('bolgheri') || l.includes('chianti') ||
      l.includes('barbaresco') || l.includes('barolo') || l.includes('alba') ||
      l.includes('firenze') || l.includes('valpolicella') || l.includes('cerdeña') ||
      l.includes('sardinia') || l.includes('san casciano') || l.includes('gaiole') ||
      l.includes('montepulciano') || l.includes('serralunga') || l.includes('la morra') ||
      l.includes('castiglione f') || l.includes('neive,') || l.includes('menfi') ||
      l.includes('marsala') || l.includes('mezzolombardo') || l.includes('magreid') ||
      l.includes('friuli') || l.includes('fumane') || l.includes('peschiera') ||
      l.includes('sant\'ambrogio') || l.includes('dolomitas') || l.includes('cortina') ||
      l.includes('val gardena') || l.includes('aosta') || l.includes('courmayeur')) {
    return 'IT';
  }
  if (l.includes('españa') || l.includes('spain') || l.includes('rioja') ||
      l.includes('ribera') || l.includes('priorat') || l.includes('cataluña') ||
      l.includes('penedès') || l.includes('galicia') || l.includes('navarra') ||
      l.includes('jerez') || l.includes('haro,') || l.includes('laguardia') ||
      l.includes('briones') || l.includes('valbuena') || l.includes('gratallops') ||
      l.includes('cambados') || l.includes('vilafranca') || l.includes('mallorca') ||
      l.includes('ibiza') || l.includes('marbella') || l.includes('canarias') ||
      l.includes('lanzarote') || l.includes('costa del sol')) {
    return 'ES';
  }
  if (l.includes('portugal') || l.includes('douro') || l.includes('alentejo') ||
      l.includes('vinho verde') || l.includes('lisboa') || l.includes('algarve') ||
      l.includes('pinhão') || l.includes('reguengos') || l.includes('estremoz') ||
      l.includes('vidigueira') || l.includes('melgaço') || l.includes('sintra') ||
      l.includes('comporta') || l.includes('porches') || l.includes('carvoeiro')) {
    return 'PT';
  }
  if (l.includes('austria') || l.includes('österreich') || l.includes('wachau') ||
      l.includes('burgenland') || l.includes('kamptal') || l.includes('kremstal') ||
      l.includes('lech,') || l.includes('ischgl') || l.includes('kitzbühel') ||
      l.includes('tirol') || l.includes('kammern') || l.includes('langenlois') ||
      l.includes('mautern') || l.includes('unterloiben') || l.includes('wösendorf') ||
      l.includes('weissenkirchen') || l.includes('gols,') || l.includes('vorarlberg') ||
      l.includes('arlberg') || l.includes('warth,') || l.includes('obertauern') ||
      l.includes('seefeld') || l.includes('andermatt') || l.includes('zillertal')) {
    return 'AT';
  }
  if (l.includes('suiza') || l.includes('switzerland') || l.includes('schweiz') ||
      l.includes('valais') || l.includes('vaud') || l.includes('zermatt') ||
      l.includes('verbier') || l.includes('st. moritz') || l.includes('davos') ||
      l.includes('grindelwald') || l.includes('sils maria') || l.includes('engelberg')) {
    return 'CH';
  }
  if (l.includes('grecia') || l.includes('greece') || l.includes('santorini') ||
      l.includes('mykonos') || l.includes('creta') || l.includes('halkidiki') ||
      l.includes('elounda') || l.includes('oia,') || l.includes('imerovigli') ||
      l.includes('naoussa') || l.includes('amyndeon') || l.includes('peloponeso')) {
    return 'GR';
  }
  if (l.includes('hungría') || l.includes('hungary') || l.includes('tokaj')) return 'HU';
  if (l.includes('croacia') || l.includes('croatia') || l.includes('istria') ||
      l.includes('dalmacia') || l.includes('dubrovnik') || l.includes('hvar') ||
      l.includes('rovinj') || l.includes('zadar') || l.includes('korčula')) return 'HR';
  if (l.includes('eslovenia') || l.includes('slovenia')) return 'SI';
  if (l.includes('checa') || l.includes('czech') || l.includes('moravia')) return 'CZ';
  if (l.includes('bulgaria')) return 'BG';
  if (l.includes('rumanía') || l.includes('romania')) return 'RO';
  if (l.includes('georgia') || l.includes('kakheti') || l.includes('bekaa') ||
      l.includes('lebanon') || l.includes('ghazir')) return 'GE';
  if (l.includes('chipre') || l.includes('cyprus')) return 'CY';
  if (l.includes('luxemburgo') || l.includes('luxembourg')) return 'LU';
  if (l.includes('israel') || l.includes('katzrin') || l.includes('zichron')) return 'IL';
  if (l.includes('usa') || l.includes('california') || l.includes('washington') ||
      l.includes('oregon') || l.includes('napa') || l.includes('sonoma') ||
      l.includes('healdsburg') || l.includes('rutherford') || l.includes('yountville') ||
      l.includes('glen ellen') || l.includes('newberg') || l.includes('beaverton') ||
      l.includes('walla walla') || l.includes('big sur') || l.includes('sausalito') ||
      l.includes('walland') || l.includes('hawaii') || l.includes('tennessee') ||
      l.includes('montana,') || l.includes('colorado,') || l.includes('utah,')) {
    return 'US';
  }
  if (l.includes('reino unido') || l.includes('united kingdom') || l.includes('scotland') ||
      l.includes('cornwall') || l.includes('hampshire') || l.includes('gloucestershire') ||
      l.includes('oxfordshire') || l.includes('argyll') || l.includes('auchterarder') ||
      l.includes('fort william') || l.includes('dornoch') || l.includes('taplow') ||
      l.includes('cheltenham') || l.includes('new milton') || l.includes('highland')) return 'GB';
  if (l.includes('irlanda') || l.includes('ireland') || l.includes('limerick') ||
      l.includes('kildare') || l.includes('galway') || l.includes('wicklow') ||
      l.includes('mayo,') || l.includes('adare') || l.includes('kenmare') ||
      l.includes('county')) return 'IE';
  if (l.includes('turquía') || l.includes('turkey') || l.includes('bodrum') ||
      l.includes('istanbul') || l.includes('fethiye') || l.includes('göcek') ||
      l.includes('mugla') || l.includes('besiktas')) return 'TR';
  if (l.includes('montenegro') || l.includes('tivat') || l.includes('budva') ||
      l.includes('herceg novi') || l.includes('luštica') || l.includes('portonovi')) return 'ME';
  if (l.includes('noruega') || l.includes('norway') || l.includes('lofoten') ||
      l.includes('geiranger') || l.includes('tromsø') || l.includes('norddal') ||
      l.includes('ballstad') || l.includes('steigen') || l.includes('nordland') ||
      l.includes('norefjell') || l.includes('voss,')) return 'NO';
  if (l.includes('suecia') || l.includes('sweden') || l.includes('åre,') ||
      l.includes('jukkasjärvi') || l.includes('harads') || l.includes('saltsjöbaden') ||
      l.includes('lidingö') || l.includes('borgholm') || l.includes('smögen') ||
      l.includes('norrbotten') || l.includes('jämtland')) return 'SE';
  if (l.includes('finlandia') || l.includes('finland') || l.includes('rovaniemi') ||
      l.includes('saariselkä') || l.includes('levi,') || l.includes('ylläs') ||
      l.includes('ruka,') || l.includes('kittilä') || l.includes('kuusamo') ||
      l.includes('lapland') || l.includes('pudasjärvi')) return 'FI';
  if (l.includes('islandia') || l.includes('iceland') || l.includes('nesjavellir') ||
      l.includes('skaftá') || l.includes('hella,') || l.includes('fljót')) return 'IS';
  if (l.includes('dinamarca') || l.includes('denmark') || l.includes('copenhagen')) return 'DK';
  if (l.includes('bélgica') || l.includes('belgium')) return 'BE';
  if (l.includes('países bajos') || l.includes('netherlands')) return 'NL';
  return 'XX';
}

const getCountryCodeFromHousekeeping = getCountryCode;

// ── Seed wineries ──────────────────────────────────────────────────────────────
async function seedWineries() {
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

  console.log(`Seeding ${wineries.length} wineries...`);
  // Firestore compat usa batch de 500 máx
  const BATCH = 499;
  for (let i = 0; i < wineries.length; i += BATCH) {
    const batch = db.batch();
    wineries.slice(i, i + BATCH).forEach(w => {
      batch.set(db.collection('wineries').doc(w.id.toString()), w);
    });
    await batch.commit();
    console.log(`  ${Math.min(i + BATCH, wineries.length)}/${wineries.length}`);
  }
  console.log(`✅ ${wineries.length} wineries seeded`);
}

// ── Seed housekeeping ──────────────────────────────────────────────────────────
async function seedHousekeeping() {
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

  console.log(`Seeding ${housekeeping.length} hotels...`);
  const BATCH = 499;
  for (let i = 0; i < housekeeping.length; i += BATCH) {
    const batch = db.batch();
    housekeeping.slice(i, i + BATCH).forEach(h => {
      batch.set(db.collection('housekeeping').doc(h.id.toString()), h);
    });
    await batch.commit();
    console.log(`  ${Math.min(i + BATCH, housekeeping.length)}/${housekeeping.length}`);
  }
  console.log(`✅ ${housekeeping.length} hotels seeded`);
}

// ── Seed templates ─────────────────────────────────────────────────────────────
async function seedTemplates() {
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

  console.log('Seeding templates...');
  for (const [key, value] of Object.entries(templates)) {
    await db.collection('templates').doc(key).set(value);
  }
  console.log(`✅ ${Object.keys(templates).length} templates seeded`);
}

// ── Seed config ────────────────────────────────────────────────────────────────
async function seedConfig() {
  const config = {
    flags: {
      AR: "🇦🇷", NZ: "🇳🇿", AU: "🇦🇺", IT: "🇮🇹", FR: "🇫🇷",
      US: "🇺🇸", ES: "🇪🇸", ZA: "🇿🇦", PT: "🇵🇹", DE: "🇩🇪",
      AT: "🇦🇹", CH: "🇨🇭", GR: "🇬🇷", HU: "🇭🇺", CZ: "🇨🇿",
      GB: "🇬🇧", RO: "🇷🇴", BG: "🇧🇬", HR: "🇭🇷", SI: "🇸🇮",
      NL: "🇳🇱", CA: "🇨🇦", MX: "🇲🇽", SE: "🇸🇪", FI: "🇫🇮",
      NO: "🇳🇴", IS: "🇮🇸", DK: "🇩🇰", CL: "🇨🇱", GE: "🇬🇪",
      CY: "🇨🇾", LU: "🇱🇺", IE: "🇮🇪", TR: "🇹🇷", ME: "🇲🇪",
      BE: "🇧🇪", IL: "🇮🇱", XX: "🏳️"
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
      { id: 1, type: 'Winery', person: 'Belu', file: 'Resume W - July 2026 - Maria Belen Corzo.pdf', path: '/resumes/Resume W - July 2026 - Maria Belen Corzo.pdf' },
      { id: 2, type: 'Winery', person: 'Marco', file: 'Resume W - July 2026 - Marco Piermatei.pdf', path: '/resumes/Resume W - July 2026 - Marco Piermatei.pdf' },
      { id: 3, type: 'Housekeeping', person: 'Belu', file: 'Resume HK - July 2026 - Maria Belen Corzo.pdf', path: '/resumes/Resume HK - July 2026 - Maria Belen Corzo.pdf' },
      { id: 4, type: 'Housekeeping', person: 'Marco', file: 'Resume HK - July 2026 - Marco Piermatei.pdf', path: '/resumes/Resume HK - July 2026 - Marco Piermatei.pdf' },
    ],
    otherDocuments: [
      { id: 1, name: 'E-Visa', file: 'e-visa.pdf', path: '/documents/e-visa.pdf', description: 'Electronic Visa Documentation' },
    ]
  };

  console.log('Seeding config...');
  await db.collection('config').doc('app').set(config);
  console.log('✅ Config seeded');
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function seedAll() {
  try {
    console.log('Starting Firebase seed...\n');
    await seedWineries();
    await seedHousekeeping();
    await seedTemplates();
    await seedConfig();
    console.log('\nAll data seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

seedAll();
