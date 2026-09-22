// Veilige browseropslag voor documentversies.
// Alleen VOLLEDIG geredigeerde DOCX-bytes (nooit originele PII) mogen hier terechtkomen.
// IndexedDB is bewust gekozen boven localStorage: het bewaart binaire DOCX-versies
// zonder de quotabeperkingen en synchronisatie-aannames van localStorage.

const DB_NAME = "ind-demo-documents";
const DB_VERSION = 1;
const STORE_NAME = "documents";

let dbPromise = null;

function openDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

/**
 * Slaat de actuele, volledig geredigeerde DOCX-versie van een document op.
 * `versionHistory` bevat herkenbare versieherkomstlabels (bijv. "Origineel", "Na acceptatie: ...").
 */
export async function saveDocumentVersion(id, { fileName, docxBase64, analysisText, version, label, versionHistory }) {
  const db = await openDatabase();
  if (!db) return false;

  const existing = await getDocumentVersion(id);
  const versions = [
    ...(existing?.versions ?? []).filter((item) => item.version !== version),
    { version, label, docxBase64, analysisText, at: new Date().toISOString() },
  ].sort((left, right) => left.version - right.version);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put({
      id,
      fileName,
      docxBase64,
      analysisText,
      version,
      label,
      versionHistory: versionHistory ?? [],
      versions,
      updatedAt: new Date().toISOString(),
    });
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getDocumentVersion(id, version) {
  const db = await openDatabase();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => {
      const record = request.result ?? null;
      if (!record || version == null) {
        resolve(record);
        return;
      }
      const selected = record.versions?.find((item) => item.version === version);
      resolve(selected ? { ...record, ...selected } : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteDocumentVersion(id) {
  const db = await openDatabase();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export function base64ToBlob(base64, mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}

/**
 * Migratie/opschoning: eerdere `localStorage`-records voor opgeslagen reviews mochten nooit
 * DOCX-bytes bevatten. Deze functie verwijdert defensief elk onverwacht binair/PII-gevoelig
 * veld dat ooit in zo'n record terecht zou kunnen zijn gekomen, zodat localStorage uitsluitend
 * lichte, al geredigeerde metadata bevat. Documenten zonder IndexedDB-tegenhanger kunnen de
 * Gotenberg-preview pas weer activeren nadat het brondocument opnieuw is geopend of geüpload.
 */
export function sanitizeSavedReviewRecord(item) {
  if (!item || typeof item !== "object") return item;
  const { docxBase64: _legacyDocx, sourceDocxBase64: _legacySourceDocx, ...rest } = item;
  return rest;
}
