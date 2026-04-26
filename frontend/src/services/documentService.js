import axios from 'axios';
import api from './api';

const CHUNK_SIZE = 40 * 1024 * 1024; // 40MB per chunk
const MAX_SIZE = 200 * 1024 * 1024;  // 200MB total limit

/**
 * Upload a document. Files >40MB are automatically split into chunks
 * and uploaded in parallel to stay under Supabase's per-file limit.
 */
export async function uploadDocument(file, onProgress) {
  if (file.size > MAX_SIZE) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum upload size is 200MB.`
    );
  }

  onProgress?.(0);

  if (file.size <= CHUNK_SIZE) {
    return uploadSingle(file, onProgress);
  }
  return uploadChunked(file, onProgress);
}

/**
 * Standard single-file upload for files ≤40MB.
 */
async function uploadSingle(file, onProgress) {
  const { data: signData } = await api.post('/documents/sign-upload', {
    filename: file.name,
  });

  try {
    await axios.put(signData.signedUrl, file, {
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
      },
      timeout: 600000,
    });
  } catch (err) {
    throw formatUploadError(err, file.size);
  }

  return registerWithRetry({
    storagePath: signData.storagePath,
    originalName: file.name,
    fileSize: file.size,
    fileType: '.' + file.name.split('.').pop().toLowerCase(),
  });
}

/**
 * Chunked upload for files >40MB. Splits into ≤40MB parts,
 * uploads all chunks in parallel to Supabase Storage,
 * then registers with all chunk paths so the backend can reassemble.
 */
async function uploadChunked(file, onProgress) {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

  // Phase 1: Get signed upload URLs for all chunks in parallel
  const signPromises = [];
  for (let i = 0; i < totalChunks; i++) {
    signPromises.push(
      api.post('/documents/sign-upload', {
        filename: `${file.name}.part${i}`,
      })
    );
  }
  const signResults = await Promise.all(signPromises);

  // Phase 2: Upload all chunks in parallel with combined progress tracking
  const chunkProgress = new Array(totalChunks).fill(0);
  const updateProgress = () => {
    const totalLoaded = chunkProgress.reduce((sum, p) => sum + p, 0);
    onProgress?.(Math.round((totalLoaded / file.size) * 100));
  };

  const uploadPromises = signResults.map((result, i) => {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const chunkSize = end - start;

    return axios.put(result.data.signedUrl, chunk, {
      headers: { 'Content-Type': 'application/octet-stream' },
      onUploadProgress: (e) => {
        chunkProgress[i] = e.loaded > chunkSize ? chunkSize : e.loaded;
        updateProgress();
      },
      timeout: 600000,
    }).catch(err => { throw formatUploadError(err, file.size); });
  });

  await Promise.all(uploadPromises);

  // Phase 3: Register with ordered chunk paths
  const storagePaths = signResults.map(r => r.data.storagePath);
  return registerWithRetry({
    storagePaths,
    originalName: file.name,
    fileSize: file.size,
    fileType: '.' + file.name.split('.').pop().toLowerCase(),
  });
}

/**
 * Register document with backend, retrying up to 3 times.
 */
async function registerWithRetry(body) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await api.post('/documents/register', body);
      return data;
    } catch (err) {
      lastErr = err;
      if (attempt < 2) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

function formatUploadError(err, fileSize) {
  const status = err.response?.status;
  const msg = err.response?.data?.error || err.response?.data?.message || err.response?.data?.statusCode;
  if (status === 413 || (msg && (String(msg).includes('size') || String(msg).includes('Payload too large')))) {
    return new Error(
      `Chunk upload failed (file: ${(fileSize / 1024 / 1024).toFixed(0)}MB). ` +
      'Supabase Storage file size limit may need to be increased in Dashboard → Storage settings.'
    );
  }
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return new Error('Upload timed out. Check your internet connection and try again.');
  }
  return new Error(msg || 'File upload failed. Please try again.');
}

export async function listDocuments() {
  const { data } = await api.get('/documents');
  return data.documents;
}

export async function getDocument(id) {
  const { data } = await api.get(`/documents/${id}`);
  return data;
}

export async function deleteDocument(id) {
  const { data } = await api.delete(`/documents/${id}`);
  return data;
}

export async function reprocessDocument(id) {
  const { data } = await api.post(`/documents/${id}/reprocess`);
  return data;
}

export async function registerUrl(url) {
  const { data } = await api.post('/documents/register-url', { url });
  return data;
}

export async function registerNote(title, content) {
  const { data } = await api.post('/documents/register-note', { title, content });
  return data;
}

export async function togglePrimarySource(id, isPrimary) {
  const { data } = await api.patch(`/documents/${id}/primary`, { isPrimary });
  return data;
}

export async function registerTopic(topic, description) {
  const { data } = await api.post('/documents/register-topic', { topic, description });
  return data;
}

export async function getDocumentViewUrl(id) {
  const { data } = await api.get(`/documents/${id}/view-url`);
  return data;
}
