const DB_NAME = 'photobooth-kiosk-sync';
const DB_VERSION = 1;
const STORE_NAME = 'guest-output-jobs';

const requestToPromise = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
});

const openDatabase = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    reject(new Error('This browser does not support persistent offline storage'));
    return;
  }
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: 'id' });
    }
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error || new Error('Unable to open offline storage'));
});

const withStore = async (mode, operation) => {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    const result = await operation(store);
    await new Promise((resolve, reject) => {
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Offline storage transaction failed'));
      transaction.onabort = () => reject(transaction.error || new Error('Offline storage transaction aborted'));
    });
    return result;
  } finally {
    database.close();
  }
};

export const createOfflineRequestId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
  return `offline${Date.now()}${Math.random().toString(16).slice(2)}`;
};

export const enqueueGuestOutput = async ({ payload, localSessionId }) => {
  const id = String(payload?.clientRequestId || createOfflineRequestId());
  const job = {
    id,
    payload: { ...payload, clientRequestId: id },
    localSessionId: Number(localSessionId) || 0,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: '',
  };
  await withStore('readwrite', (store) => requestToPromise(store.put(job)));
  return job;
};

export const listQueuedGuestOutputs = () => withStore('readonly', (store) => requestToPromise(store.getAll()));

export const getQueuedGuestOutputCount = async () => (await listQueuedGuestOutputs()).length;

const deleteQueuedGuestOutput = (id) => withStore('readwrite', (store) => requestToPromise(store.delete(id)));

const recordSyncFailure = (job, error) => withStore('readwrite', (store) => requestToPromise(store.put({
  ...job,
  attempts: (job.attempts || 0) + 1,
  lastError: String(error || 'Unable to reach home host').slice(0, 240),
  lastAttemptAt: new Date().toISOString(),
})));

/**
 * Runs queued uploads one at a time so a kiosk does not saturate a weak event
 * connection. `upload` must return { data, retryable, error }.
 */
export const syncQueuedGuestOutputs = async (upload) => {
  const jobs = (await listQueuedGuestOutputs()).sort((a, b) => String(a.queuedAt).localeCompare(String(b.queuedAt)));
  const synced = [];
  const pending = [];

  for (const job of jobs) {
    let result;
    try {
      result = await upload(job.payload);
    } catch (error) {
      result = { data: null, retryable: true, error: error?.message || 'Unable to reach home host' };
    }
    if (result?.data) {
      await deleteQueuedGuestOutput(job.id);
      synced.push({ job, data: result.data });
      continue;
    }

    await recordSyncFailure(job, result?.error || 'Unable to reach home host');
    pending.push(job.id);
    if (result?.retryable !== true) break;
  }

  return { synced, pending, remaining: (await getQueuedGuestOutputCount()) };
};
