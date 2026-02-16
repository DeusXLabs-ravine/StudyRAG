import axios from 'axios';
import api from './api';

/**
 * Upload a document using direct-to-Supabase-Storage flow.
 * 1. Get a signed upload URL from backend (tiny JSON)
 * 2. PUT file directly to Supabase Storage (with progress)
 * 3. Register the uploaded file with backend (tiny JSON)
 */
export async function uploadDocument(file, onProgress) {
  // Client-side validation
  const MAX_SIZE = 50 * 1024 * 1024; // 50MB — Supabase Storage standard upload limit
  if (file.size > MAX_SIZE) {
    throw new Error(
      `File is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum upload size is 50MB. ` +
      'Try compressing the PDF or splitting it into smaller files.'
    );
  }

  // Phase 1: Get signed upload URL
  onProgress?.(0);
  const { data: signData } = await api.post('/documents/sign-upload', {
    filename: file.name,
  });

  // Phase 2: Upload directly to Supabase Storage
  try {
    await axios.put(signData.signedUrl, file, {
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      onUploadProgress: (e) => {
        if (e.total) onProgress?.(Math.round((e.loaded * 100) / e.total));
      },
      timeout: 600000,
    });
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.error || err.response?.data?.message || err.response?.data?.statusCode;
    if (status === 413 || (msg && String(msg).includes('size'))) {
      throw new Error('File is too large for storage. Try a smaller file (under 50MB).');
    }
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      throw new Error('Upload timed out. Check your internet connection and try again.');
    }
    throw new Error(msg || 'File upload failed. Please try again.');
  }

  // Phase 3: Register with backend (retry up to 3 times)
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await api.post('/documents/register', {
        storagePath: signData.storagePath,
        originalName: file.name,
        fileSize: file.size,
        fileType: '.' + file.name.split('.').pop().toLowerCase(),
      });
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
