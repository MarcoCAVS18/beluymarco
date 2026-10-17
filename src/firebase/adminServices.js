// Solo para la cuenta admin (las reglas rechazan estas operaciones a cualquier otra).
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

// ==================== INVITACIONES ====================
export const listMembers = async () => {
  const snap = await getDocs(collection(db, 'members'));
  return snap.docs.map((d) => ({ ...d.data(), email: d.id })).sort((a, b) => (b.invitedAt?.seconds || 0) - (a.invitedAt?.seconds || 0));
};

// El email es el id del documento (en minúsculas): así las reglas lo encuentran directo
export const saveMember = (email, { name, sectors, status = 'active', isNew = false }) =>
  setDoc(
    doc(db, 'members', email.trim().toLowerCase()),
    {
      email: email.trim().toLowerCase(),
      name: (name || '').trim(),
      sectors,
      status,
      ...(isNew ? { invitedAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

export const setMemberStatus = (email, status) => updateDoc(doc(db, 'members', email), { status, updatedAt: serverTimestamp() });

export const deleteMember = (email) => deleteDoc(doc(db, 'members', email));

// ==================== USO DEL PROYECTO (Cloud Monitoring, solo lectura) ====================
// Límites gratis diarios de Firestore (plan Spark). Se reinician a la medianoche del Pacífico.
export const FREE_LIMITS = { reads: 50000, writes: 20000, deletes: 20000 };

const METRICS = {
  reads: 'firestore.googleapis.com/document/read_count',
  writes: 'firestore.googleapis.com/document/write_count',
  deletes: 'firestore.googleapis.com/document/delete_count',
};

// Medianoche de hoy en la hora del Pacífico, en UTC (ahí se reinicia la cuota)
export const pacificMidnight = (now = new Date()) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const sinceMidnight = ((+parts.hour % 24) * 3600 + +parts.minute * 60 + +parts.second) * 1000;
  return new Date(now.getTime() - sinceMidnight - now.getMilliseconds());
};

const sumSeries = (data) =>
  (data.timeSeries || []).reduce((n, ts) => n + (ts.points || []).reduce((m, p) => m + Number(p.value?.int64Value || 0), 0), 0);

const queryMetric = async (token, projectId, metric, start, end, periodSeconds) => {
  const params = new URLSearchParams({
    filter: `metric.type="${metric}"`,
    'interval.startTime': start.toISOString(),
    'interval.endTime': end.toISOString(),
    'aggregation.alignmentPeriod': `${periodSeconds}s`,
    'aggregation.perSeriesAligner': 'ALIGN_SUM',
    'aggregation.crossSeriesReducer': 'REDUCE_SUM',
  });
  const res = await fetch(`https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error?.message || 'No se pudieron leer las métricas');
    err.status = res.status;
    throw err;
  }
  return data;
};

// Uso de hoy (desde que se reinició la cuota) y lecturas de los últimos 7 días
export const getUsage = async (token, projectId) => {
  const end = new Date();
  const start = pacificMidnight(end);
  const period = Math.max(60, Math.ceil((end - start) / 1000));
  const [reads, writes, deletes] = await Promise.all(
    Object.values(METRICS).map(async (m) => sumSeries(await queryMetric(token, projectId, m, start, end, period)))
  );

  // Historial: 7 días hacia atrás, de a un día
  const weekStart = new Date(start.getTime() - 6 * 86400000);
  const hist = await queryMetric(token, projectId, METRICS.reads, weekStart, end, 86400);
  const days = (hist.timeSeries?.[0]?.points || [])
    .map((p) => ({ day: p.interval.endTime, reads: Number(p.value?.int64Value || 0) }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return { today: { reads, writes, deletes }, days, since: start, at: end };
};
