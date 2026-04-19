import axios from 'axios';
import { api } from '@/lib/api/client';
import { normalizeTier, type SubscriptionTier } from '@/lib/subscription';

const CHUNK_SIZE = 40 * 1024 * 1024;
const MAX_SIZE = 200 * 1024 * 1024;

export type Profile = {
  id: string;
  email: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  age?: number | null;
  teachingLevel?: string | null;
  interests?: string[];
  academicFields?: string[];
  onboardingCompleted?: boolean;
  subscription_tier?: SubscriptionTier;
  subscription_status?: string;
  subscription_end_date?: string | null;
  billing_tier?: SubscriptionTier;
  planLabel?: string;
  isAdminGranted?: boolean;
  isUnlimited?: boolean;
  document_count?: number;
  feature_access?: {
    canTeach: boolean;
    canGame: boolean;
    canUseSimulations: boolean;
    canPodcast: boolean;
    canUseLive?: boolean;
    canUseTts?: boolean;
    canUseProModels?: boolean;
  };
};

export type StudyDocument = {
  id: string;
  title?: string;
  name?: string;
  status: 'uploading' | 'registering' | 'processing' | 'ready' | 'failed';
  source_type?: 'file' | 'url' | 'note' | 'topic';
  source_quality?: 'trusted' | 'acceptable' | 'unverified';
  source_url?: string | null;
  primary_source?: boolean;
  created_at?: string;
};

export type StudyModule = {
  id: string;
  title: string;
  content?: string;
  topic?: string;
  progress?: {
    completed?: boolean;
    attempts?: number;
    score?: number;
  };
  questions?: Array<{
    question: string;
    options?: string[];
    answer?: string;
    explanation?: string;
  }>;
};

export type ChatBlock = {
  type: string;
  [key: string]: unknown;
};

export type ChatMessage = {
  role: 'student' | 'tutor' | 'assistant' | 'user';
  text: string;
  blocks?: ChatBlock[];
  timestamp?: number;
  webSources?: Array<{ title: string; url: string }>;
};

export type AnalyticsOverview = {
  streakDays?: number;
  quizzesTaken?: number;
  averageScore?: number;
  documentsStudied?: number;
  xp?: number;
};

export async function fetchProfile() {
  const { data } = await api.get<{ profile: Profile | null }>('/auth/profile');
  if (data.profile) {
    data.profile.subscription_tier = normalizeTier(data.profile.subscription_tier);
    data.profile.billing_tier = normalizeTier(data.profile.billing_tier);
  }
  return data.profile;
}

export async function createProfile(payload: {
  displayName?: string | null;
  age?: number | null;
  teachingLevel?: string;
  interests?: string[];
  academicFields?: string[];
}) {
  const { data } = await api.post<{ profile: Profile }>('/auth/profile', payload);
  if (data.profile) {
    data.profile.subscription_tier = normalizeTier(data.profile.subscription_tier);
    data.profile.billing_tier = normalizeTier(data.profile.billing_tier);
  }
  return data.profile;
}

export async function updateProfile(payload: Partial<Profile>) {
  const { data } = await api.put<{ profile: Profile }>('/auth/profile', payload);
  if (data.profile) {
    data.profile.subscription_tier = normalizeTier(data.profile.subscription_tier);
    data.profile.billing_tier = normalizeTier(data.profile.billing_tier);
  }
  return data.profile;
}

export async function listDocuments() {
  const { data } = await api.get<{ documents: StudyDocument[] }>('/documents');
  return data.documents || [];
}

export async function getDocument(documentId: string) {
  const { data } = await api.get<StudyDocument>(`/documents/${documentId}`);
  return data;
}

export async function deleteDocument(documentId: string) {
  await api.delete(`/documents/${documentId}`);
}

export async function reprocessDocument(documentId: string) {
  const { data } = await api.post(`/documents/${documentId}/reprocess`);
  return data;
}

async function blobFromUri(uri: string) {
  const response = await fetch(uri);
  return response.blob();
}

async function signUpload(filename: string) {
  const { data } = await api.post<{ signedUrl: string; storagePath: string }>('/documents/sign-upload', {
    filename,
  });
  return data;
}

async function registerUpload(body: Record<string, unknown>) {
  const { data } = await api.post('/documents/register', body);
  return data;
}

export async function uploadDocumentAsset(
  file: { name: string; uri: string; mimeType?: string | null; size?: number | null },
  onProgress?: (value: number) => void,
) {
  const sourceBlob = await blobFromUri(file.uri);
  const totalSize = file.size || sourceBlob.size;

  if (totalSize > MAX_SIZE) {
    throw new Error('File is too large. Maximum upload size is 200MB.');
  }

  const extension = `.${(file.name.split('.').pop() || 'pdf').toLowerCase()}`;

  if (totalSize <= CHUNK_SIZE) {
    const signData = await signUpload(file.name);
    await axios.put(signData.signedUrl, sourceBlob, {
      headers: { 'Content-Type': file.mimeType || 'application/octet-stream' },
      onUploadProgress: event => {
        if (event.total) onProgress?.(Math.round((event.loaded * 100) / event.total));
      },
    });

    return registerUpload({
      storagePath: signData.storagePath,
      originalName: file.name,
      fileSize: totalSize,
      fileType: extension,
    });
  }

  const totalChunks = Math.ceil(totalSize / CHUNK_SIZE);
  const signedUploads = await Promise.all(
    Array.from({ length: totalChunks }).map((_, index) => signUpload(`${file.name}.part${index}`)),
  );

  const chunkProgress = new Array(totalChunks).fill(0);
  const updateProgress = () => {
    const loaded = chunkProgress.reduce((sum, current) => sum + current, 0);
    onProgress?.(Math.round((loaded / totalSize) * 100));
  };

  await Promise.all(
    signedUploads.map((signedUpload, index) => {
      const start = index * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalSize);
      const chunk = sourceBlob.slice(start, end);

      return axios.put(signedUpload.signedUrl, chunk, {
        headers: { 'Content-Type': 'application/octet-stream' },
        onUploadProgress: event => {
          chunkProgress[index] = event.loaded;
          updateProgress();
        },
      });
    }),
  );

  return registerUpload({
    storagePaths: signedUploads.map(item => item.storagePath),
    originalName: file.name,
    fileSize: totalSize,
    fileType: extension,
  });
}

export async function addUrl(url: string) {
  const { data } = await api.post('/documents/register-url', { url });
  return data;
}

export async function addNote(title: string, content: string) {
  const { data } = await api.post('/documents/register-note', { title, content });
  return data;
}

export async function addTopic(topic: string, description?: string) {
  const { data } = await api.post('/documents/register-topic', { topic, description });
  return data;
}

export async function submitScan(file: { uri: string; name?: string; mimeType?: string | null }) {
  // Backend route is multipart — send the image with the `image` field so
  // multer picks it up on the Express side (see backend/src/routes/ocrRoutes.js).
  const form = new FormData();
  const filename = file.name || `scan-${Date.now()}.jpg`;
  // React Native's FormData accepts this shape — TS complains, hence the cast.
  form.append('image', {
    uri: file.uri,
    name: filename,
    type: file.mimeType || 'image/jpeg',
  } as unknown as Blob);

  const { data } = await api.post('/documents/ocr/scan', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data as { document?: StudyDocument; text?: string };
}

export async function togglePrimarySource(documentId: string, isPrimary: boolean) {
  const { data } = await api.patch(`/documents/${documentId}/primary`, { isPrimary });
  return data;
}

export async function listCourses() {
  const { data } = await api.get<{ courses: Array<{ id: string; title: string; description?: string }> }>('/courses');
  return data.courses || [];
}

export async function listModules(documentId?: string, courseId?: string) {
  const { data } = await api.get<{ modules: StudyModule[]; generating?: boolean }>('/modules', {
    params: {
      ...(documentId ? { documentId } : {}),
      ...(courseId ? { courseId } : {}),
    },
  });
  return data;
}

export async function getModule(moduleId: string) {
  const { data } = await api.get<StudyModule>(`/modules/${moduleId}`);
  return data;
}

export async function updateModuleProgress(
  moduleId: string,
  score: number,
  answers?: string[],
  durationSeconds?: number,
) {
  const { data } = await api.put(`/modules/${moduleId}/progress`, {
    score,
    answers,
    durationSeconds,
  });
  return data;
}

export async function getTutorGreeting(moduleId: string) {
  const { data } = await api.post<{ greeting: string }>(`/modules/${moduleId}/tutor/greeting`);
  return data.greeting;
}

export async function sendTutorMessage(moduleId: string, message: string, conversationHistory: ChatMessage[]) {
  const { data } = await api.post<{ reply: string; webSources?: Array<{ title: string; url: string }> }>(
    `/modules/${moduleId}/tutor/chat`,
    {
      message,
      conversationHistory,
    },
  );
  return data;
}

export async function sendChatQuery(query: string, documentId?: string | null, durationSeconds?: number | null) {
  const { data } = await api.post('/chat/query', { query, documentId, durationSeconds });
  return data as {
    answer?: string;
    text?: string;
    blocks?: ChatBlock[];
    sources?: Array<{ title: string; url?: string }>;
    webSources?: Array<{ title: string; url: string }>;
  };
}

export async function getChatHistory() {
  const { data } = await api.get<{ messages: ChatMessage[] }>('/chat/history');
  return data.messages || [];
}

export async function getOverview() {
  const { data } = await api.get<AnalyticsOverview>('/analytics/overview');
  return data;
}

export async function getTopics() {
  const { data } = await api.get<{ topics: Array<{ topic: string; score: number }> }>('/analytics/topics');
  return data.topics || [];
}

export async function getWeakAreas() {
  const { data } = await api.get<{ weakAreas: Array<{ topic: string; score: number }> }>('/analytics/weak-areas');
  return data.weakAreas || [];
}

export async function getActivity(days = 30) {
  const { data } = await api.get<{ timeline: Array<{ date: string; minutes: number }> }>('/analytics/activity', {
    params: { days },
  });
  return data.timeline || [];
}

export async function getSettings() {
  const { data } = await api.get<{ settings: Record<string, string> }>('/analytics/settings');
  return data.settings || {};
}

export async function updateSetting(key: string, value: string) {
  const { data } = await api.put('/analytics/settings', { key, value });
  return data;
}

export async function getLearningProfile() {
  const { data } = await api.get('/analytics/learning-profile');
  return data;
}

export async function fetchVoices() {
  const { data } = await api.get<{ voices: Array<{ voiceId: string; name: string }> }>('/tts/voices');
  return data.voices || [];
}

export async function getPodcastSections(documentId: string) {
  const { data } = await api.get<
    Array<{ sectionIndex: number; heading: string; audioUrl?: string; transcript?: string; status?: string }>
  >(`/podcast/sections/${documentId}`);
  return data || [];
}
