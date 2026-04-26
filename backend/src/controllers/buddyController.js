'use strict';

/**
 * buddyController
 *
 * REST surface for Study Buddy (Max-tier only).
 *   GET    /api/buddy/presets          — list shipping personas
 *   GET    /api/buddy/voices           — voice catalog (id → descriptor)
 *   GET    /api/buddy/profile          — my active profile (or null)
 *   POST   /api/buddy/profile          — create (rejects if one exists)
 *   PATCH  /api/buddy/profile/:id      — update subset of fields
 *   DELETE /api/buddy/profile/:id      — soft-delete (allows re-onboarding)
 *   GET    /api/buddy/sessions         — recent sessions (paginated)
 *   GET    /api/buddy/sessions/:id     — one session + notes + transcript meta
 *   GET    /api/buddy/memory           — paginated memory list
 *   DELETE /api/buddy/memory/:id       — forget one item
 *   POST   /api/buddy/memory/wipe      — wipe ALL memory for my active profile
 *   GET    /api/buddy/usage            — minutes used / soft / hard this cycle
 */

const supabase = require('../config/database');
const {
  PRESETS,
  VOICE_MAP,
  DEFAULT_VOICE,
  resolvePreset,
} = require('../services/buddyPersonaService');
const {
  getSubscriptionSnapshotForUser,
} = require('../services/subscriptionService');
const { getUsageCount } = require('../middleware/tierAuth');

// ── Small helpers ────────────────────────────────────────────────────────────

const ALLOWED_RELATIONSHIPS = new Set(['new_friend', 'close_friend', 'rival', 'mentor']);
const MAX_INTERESTS = 12;
const MAX_FIELDS = 6;

function sanitizeInterests(arr) {
  if (!Array.isArray(arr)) return undefined;
  const cleaned = arr
    .map(s => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .map(s => s.slice(0, 40));
  return Array.from(new Set(cleaned)).slice(0, MAX_INTERESTS);
}

function sanitizeFields(arr) {
  if (!Array.isArray(arr)) return undefined;
  const cleaned = arr
    .map(s => (typeof s === 'string' ? s.trim() : ''))
    .filter(Boolean)
    .map(s => s.slice(0, 48));
  return Array.from(new Set(cleaned)).slice(0, MAX_FIELDS);
}

function sanitizeVoiceId(voiceId) {
  if (typeof voiceId !== 'string') return undefined;
  return VOICE_MAP[voiceId] ? voiceId : DEFAULT_VOICE;
}

function sanitizePersonality(p) {
  if (!p || typeof p !== 'object') return undefined;
  const out = {};
  const allow = {
    energy: ['low', 'medium', 'high'],
    humor: ['dry', 'goofy', 'neutral', 'witty'],
    formality: ['casual', 'balanced', 'formal'],
    confidence: ['humble', 'balanced', 'assertive'],
  };
  for (const [k, allowed] of Object.entries(allow)) {
    if (typeof p[k] === 'string' && allowed.includes(p[k])) out[k] = p[k];
  }
  return out;
}

// ── Tier gate helper ─────────────────────────────────────────────────────────
async function requireBuddyAccess(req, res) {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const sub = await getSubscriptionSnapshotForUser(user.id, user.email);
  if (!sub?.featureAccess?.canUseBuddy) {
    res.status(403).json({
      error: 'Feature locked',
      feature: 'buddy',
      message: 'Study Buddy is available on the Max plan. Upgrade to unlock it.',
      upgradeRequired: true,
    });
    return null;
  }
  return sub;
}

// ── GET /presets ─────────────────────────────────────────────────────────────
async function listPresets(req, res, next) {
  try {
    const items = Object.entries(PRESETS).map(([key, preset]) => ({
      key,
      name: preset.name,
      pronouns: preset.pronouns,
      descriptor: preset.descriptor,
      voice_id: preset.voice_id,
      relationship_mode: preset.relationship_mode,
      personality: preset.personality,
    }));
    res.json({ presets: items });
  } catch (err) { next(err); }
}

// ── GET /voices ──────────────────────────────────────────────────────────────
const VOICE_DESCRIPTIONS = Object.freeze({
  'warm-low':    { label: 'Warm — low',    description: 'Deep and calm; feels grounded.' },
  'warm-mid':    { label: 'Warm — mid',    description: 'Friendly neutral; the safe default.' },
  'warm-bright': { label: 'Warm — bright', description: 'Expressive and sunny.' },
  'cool-low':    { label: 'Cool — low',    description: 'Dry, understated.' },
  'cool-mid':    { label: 'Cool — mid',    description: 'Balanced and composed.' },
  'cool-bright': { label: 'Cool — bright', description: 'Crisp, wittier read.' },
  'soft-low':    { label: 'Soft — low',    description: 'Gentle, quieter tone.' },
  'soft-bright': { label: 'Soft — bright', description: 'Airy and reassuring.' },
});

async function listVoices(req, res, next) {
  try {
    const voices = Object.keys(VOICE_MAP).map(id => ({
      id,
      ...VOICE_DESCRIPTIONS[id],
      sample_url: `/audio/samples/${id}.wav`,
    }));
    res.json({ voices, default: DEFAULT_VOICE });
  } catch (err) { next(err); }
}

// ── GET /profile (my active profile) ─────────────────────────────────────────
async function getMyProfile(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;
    const { data, error } = await supabase
      .from('buddy_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    res.json({ profile: data || null });
  } catch (err) { next(err); }
}

// ── POST /profile ────────────────────────────────────────────────────────────
async function createProfile(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;
    const userId = req.user.id;

    // Reject if an active profile already exists (unique partial index would also reject)
    const { data: existing } = await supabase
      .from('buddy_profiles')
      .select('id')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return res.status(409).json({
        error: 'Profile exists',
        message: 'You already have an active buddy. Update it or delete it first.',
      });
    }

    const body = req.body || {};
    const presetKey = typeof body.presetKey === 'string' ? body.presetKey : null;
    const preset = presetKey ? resolvePreset(presetKey) : null;

    const name = (typeof body.name === 'string' && body.name.trim())
      ? body.name.trim().slice(0, 40)
      : preset?.name || 'Buddy';
    const pronouns = typeof body.pronouns === 'string' ? body.pronouns.trim().slice(0, 24) : (preset?.pronouns || 'they/them');
    const voiceId = sanitizeVoiceId(body.voice_id) ?? (preset?.voice_id || DEFAULT_VOICE);
    const personality = sanitizePersonality(body.personality) ?? preset?.personality ?? {};
    const interests = sanitizeInterests(body.interests) ?? [];
    const fields = sanitizeFields(body.field_affinities) ?? [];
    const studyStyle = typeof body.study_style === 'string' ? body.study_style.slice(0, 200) : null;
    const rawRel = typeof body.relationship_mode === 'string' ? body.relationship_mode : (preset?.relationship_mode || 'new_friend');
    const relationship = ALLOWED_RELATIONSHIPS.has(rawRel) ? rawRel : 'new_friend';
    const avatarStyle = (body.avatar_style && typeof body.avatar_style === 'object') ? body.avatar_style : {};

    const { data, error } = await supabase
      .from('buddy_profiles')
      .insert({
        user_id: userId,
        name,
        pronouns,
        voice_id: voiceId,
        personality,
        interests,
        field_affinities: fields,
        study_style: studyStyle,
        relationship_mode: relationship,
        avatar_style: avatarStyle,
      })
      .select('*')
      .single();

    if (error) throw error;
    res.status(201).json({ profile: data });
  } catch (err) {
    if (err?.code === '23505') {
      return res.status(409).json({ error: 'Profile exists', message: 'You already have an active buddy.' });
    }
    next(err);
  }
}

// ── PATCH /profile/:id ───────────────────────────────────────────────────────
async function updateProfile(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;

    const { id } = req.params;
    const body = req.body || {};
    const patch = {};

    if (typeof body.name === 'string' && body.name.trim()) patch.name = body.name.trim().slice(0, 40);
    if (typeof body.pronouns === 'string') patch.pronouns = body.pronouns.trim().slice(0, 24);

    const voiceId = sanitizeVoiceId(body.voice_id);
    if (voiceId !== undefined) patch.voice_id = voiceId;

    const personality = sanitizePersonality(body.personality);
    if (personality !== undefined) patch.personality = personality;

    const interests = sanitizeInterests(body.interests);
    if (interests !== undefined) patch.interests = interests;

    const fields = sanitizeFields(body.field_affinities);
    if (fields !== undefined) patch.field_affinities = fields;

    if (typeof body.study_style === 'string') patch.study_style = body.study_style.slice(0, 200);
    if (typeof body.relationship_mode === 'string' && ALLOWED_RELATIONSHIPS.has(body.relationship_mode)) {
      patch.relationship_mode = body.relationship_mode;
    }
    if (body.avatar_style && typeof body.avatar_style === 'object') patch.avatar_style = body.avatar_style;

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('buddy_profiles')
      .update(patch)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .select('*')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Profile not found' });
    res.json({ profile: data });
  } catch (err) { next(err); }
}

// ── DELETE /profile/:id (soft) ───────────────────────────────────────────────
async function deleteProfile(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;

    const { id } = req.params;
    const { error } = await supabase
      .from('buddy_profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) { next(err); }
}

// ── GET /sessions ────────────────────────────────────────────────────────────
async function listSessions(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;
    const limit = Math.min(50, parseInt(req.query.limit || '20', 10));
    const { data, error } = await supabase
      .from('buddy_sessions')
      .select('id, started_at, ended_at, duration_seconds, mode, summary, document_id')
      .eq('user_id', req.user.id)
      .order('started_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ sessions: data || [] });
  } catch (err) { next(err); }
}

// ── GET /sessions/:id ────────────────────────────────────────────────────────
async function getSession(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;
    const { id } = req.params;
    const { data: session, error } = await supabase
      .from('buddy_sessions')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const { data: notes } = await supabase
      .from('buddy_notes')
      .select('id, content, tag, at_offset_seconds, created_at')
      .eq('session_id', id)
      .order('at_offset_seconds', { ascending: true });
    res.json({ session, notes: notes || [] });
  } catch (err) { next(err); }
}

// ── GET /memory ──────────────────────────────────────────────────────────────
async function listMemory(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;
    const limit = Math.min(200, parseInt(req.query.limit || '100', 10));
    const { data: profile } = await supabase
      .from('buddy_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!profile) return res.json({ memory: [] });

    const { data, error } = await supabase
      .from('buddy_memory')
      .select('id, kind, content, importance, created_at, last_accessed_at')
      .eq('user_id', req.user.id)
      .eq('buddy_profile_id', profile.id)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    res.json({ memory: data || [] });
  } catch (err) { next(err); }
}

// ── DELETE /memory/:id ───────────────────────────────────────────────────────
async function deleteMemory(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;
    const { id } = req.params;
    const { error } = await supabase
      .from('buddy_memory')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    if (error) throw error;
    res.json({ deleted: true });
  } catch (err) { next(err); }
}

// ── POST /memory/wipe ────────────────────────────────────────────────────────
async function wipeMemory(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;
    const { data: profile } = await supabase
      .from('buddy_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .is('deleted_at', null)
      .maybeSingle();
    if (!profile) return res.json({ wiped: 0 });
    const { error, count } = await supabase
      .from('buddy_memory')
      .delete({ count: 'exact' })
      .eq('user_id', req.user.id)
      .eq('buddy_profile_id', profile.id);
    if (error) throw error;
    res.json({ wiped: count || 0 });
  } catch (err) { next(err); }
}

// ── GET /usage ───────────────────────────────────────────────────────────────
async function getUsage(req, res, next) {
  try {
    const sub = await requireBuddyAccess(req, res);
    if (!sub) return;
    const limits = sub.limits || {};
    const soft = Number(limits.buddyMinutesSoft || 0);
    const hard = Number(limits.buddyMinutesHard || 0);
    const used = getUsageCount(req.user.id, 'buddy_minutes');
    res.json({
      used,
      soft,
      hard,
      isUnlimited: Boolean(sub.isUnlimited),
      remaining: sub.isUnlimited ? null : Math.max(0, hard - used),
    });
  } catch (err) { next(err); }
}

module.exports = {
  listPresets,
  listVoices,
  getMyProfile,
  createProfile,
  updateProfile,
  deleteProfile,
  listSessions,
  getSession,
  listMemory,
  deleteMemory,
  wipeMemory,
  getUsage,
};
