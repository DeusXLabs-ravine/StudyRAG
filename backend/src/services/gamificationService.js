const supabase = require('../config/database');

// Level thresholds: L1=0, L2=100, L3=300, L4=600, L5=1000, then +500 per level
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000];
function getLevelForXP(totalXP) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      // Beyond defined thresholds, +500 per level
      if (i === LEVEL_THRESHOLDS.length - 1) {
        const extra = Math.floor((totalXP - LEVEL_THRESHOLDS[i]) / 500);
        return i + 1 + extra;
      }
      return i + 1;
    }
  }
  return 1;
}

function getXPForNextLevel(level) {
  if (level <= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[level - 1] || 0;
  return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] + (level - LEVEL_THRESHOLDS.length) * 500;
}

// XP rewards
const XP_REWARDS = {
  quiz_correct: 10,
  game_complete: 20,
  module_done: 50,
  combo_bonus: 5,     // per consecutive correct (cap 25)
  streak_day: 10,
  perfect_score: 2,   // multiplier
  daily_goal: 20,
};

// Achievement definitions with tier thresholds
const ACHIEVEMENTS = {
  first_correct: { label: 'First Blood', tiers: [1, 5, 10, 25, 50] },
  streak_fire: { label: 'On Fire', tiers: [7, 14, 30, 60, 100] },
  xp_master: { label: 'XP Master', tiers: [100, 500, 1000, 5000, 10000] },
  quiz_ace: { label: 'Quiz Ace', tiers: [1, 5, 10, 25, 50] },
  combo_king: { label: 'Combo King', tiers: [3, 5, 7, 10, 15] },
  speed_demon: { label: 'Speed Demon', tiers: [1, 5, 10, 25, 50] },
  module_master: { label: 'Module Master', tiers: [1, 5, 10, 25, 50] },
  game_champ: { label: 'Game Champ', tiers: [1, 10, 25, 50, 100] },
};

async function ensureGameStats(userId) {
  const { data } = await supabase
    .from('user_game_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!data) {
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('user_game_stats').insert({
      user_id: userId,
      total_xp: 0,
      level: 1,
      games_played: 0,
      games_won: 0,
      best_combo: 0,
      daily_xp_goal: 20,
      daily_xp_earned: 0,
      daily_xp_date: today,
      updated_at: new Date().toISOString(),
    });
    return {
      user_id: userId, total_xp: 0, level: 1,
      games_played: 0, games_won: 0, best_combo: 0,
      daily_xp_goal: 20, daily_xp_earned: 0, daily_xp_date: today,
    };
  }
  return data;
}

async function awardXP(userId, amount, source, sourceId = null) {
  // Insert XP ledger entry
  await supabase.from('user_xp').insert({
    user_id: userId,
    amount,
    source,
    source_id: sourceId,
  });

  // Update game stats
  const stats = await ensureGameStats(userId);
  const today = new Date().toISOString().split('T')[0];
  const newTotalXP = (stats.total_xp || 0) + amount;
  const newLevel = getLevelForXP(newTotalXP);
  const leveledUp = newLevel > (stats.level || 1);

  // Reset daily XP if new day
  const dailyEarned = stats.daily_xp_date === today
    ? (stats.daily_xp_earned || 0) + amount
    : amount;

  // Check daily goal completion
  let dailyGoalBonus = 0;
  const wasUnderGoal = stats.daily_xp_date === today
    ? (stats.daily_xp_earned || 0) < (stats.daily_xp_goal || 20)
    : true;
  if (wasUnderGoal && dailyEarned >= (stats.daily_xp_goal || 20)) {
    dailyGoalBonus = XP_REWARDS.daily_goal;
  }

  const finalTotalXP = newTotalXP + dailyGoalBonus;
  const finalLevel = getLevelForXP(finalTotalXP);

  await supabase
    .from('user_game_stats')
    .update({
      total_xp: finalTotalXP,
      level: finalLevel,
      daily_xp_earned: dailyEarned + dailyGoalBonus,
      daily_xp_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (dailyGoalBonus > 0) {
    await supabase.from('user_xp').insert({
      user_id: userId,
      amount: dailyGoalBonus,
      source: 'daily_goal_bonus',
    });
  }

  return { totalXP: finalTotalXP, level: finalLevel, leveledUp, dailyGoalBonus, dailyEarned: dailyEarned + dailyGoalBonus };
}

async function updateStreak(userId) {
  const today = new Date().toISOString().split('T')[0];

  const { data: streak } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (!streak) {
    // First activity ever
    await supabase.from('user_streaks').insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_activity_date: today,
      streak_freezes: 0,
      updated_at: new Date().toISOString(),
    });
    // Award streak XP
    await awardXP(userId, XP_REWARDS.streak_day, 'streak_day');
    return { currentStreak: 1, longest: 1, isNew: true };
  }

  if (streak.last_activity_date === today) {
    // Already active today
    return { currentStreak: streak.current_streak, longest: streak.longest_streak, isNew: false };
  }

  const lastDate = new Date(streak.last_activity_date);
  const todayDate = new Date(today);
  const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

  let newStreak;
  if (diffDays === 1) {
    // Consecutive day
    newStreak = (streak.current_streak || 0) + 1;
  } else if (diffDays === 2 && streak.streak_freezes > 0) {
    // Used a streak freeze
    newStreak = (streak.current_streak || 0) + 1;
    await supabase.from('user_streaks').update({
      streak_freezes: streak.streak_freezes - 1,
    }).eq('user_id', userId);
  } else {
    // Streak broken
    newStreak = 1;
  }

  const newLongest = Math.max(newStreak, streak.longest_streak || 0);

  await supabase.from('user_streaks').update({
    current_streak: newStreak,
    longest_streak: newLongest,
    last_activity_date: today,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  // Award streak XP
  await awardXP(userId, XP_REWARDS.streak_day, 'streak_day');

  return { currentStreak: newStreak, longest: newLongest, isNew: true };
}

async function checkAchievements(userId) {
  const stats = await ensureGameStats(userId);
  const { data: streak } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: existingAchievements } = await supabase
    .from('user_achievements')
    .select('achievement_key, tier')
    .eq('user_id', userId);

  const existing = new Set((existingAchievements || []).map(a => `${a.achievement_key}:${a.tier}`));
  const newUnlocks = [];

  // Helper to check and award tiers
  const checkTiers = (key, value) => {
    const def = ACHIEVEMENTS[key];
    if (!def) return;
    for (let i = 0; i < def.tiers.length; i++) {
      if (value >= def.tiers[i] && !existing.has(`${key}:${i + 1}`)) {
        newUnlocks.push({ achievement_key: key, tier: i + 1, label: def.label });
      }
    }
  };

  // Check each achievement type
  checkTiers('xp_master', stats.total_xp || 0);
  checkTiers('streak_fire', streak?.current_streak || 0);
  checkTiers('game_champ', stats.games_played || 0);
  checkTiers('combo_king', stats.best_combo || 0);

  // For quiz_ace, first_correct, speed_demon, module_master we need counts
  const { count: correctCount } = await supabase
    .from('user_xp')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'quiz_correct');

  checkTiers('first_correct', correctCount || 0);

  const { count: perfectCount } = await supabase
    .from('user_xp')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'perfect_score');

  checkTiers('quiz_ace', perfectCount || 0);

  const { count: timedCount } = await supabase
    .from('user_xp')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'speed_round_complete');

  checkTiers('speed_demon', timedCount || 0);

  const { count: moduleCount } = await supabase
    .from('user_xp')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'module_done');

  checkTiers('module_master', moduleCount || 0);

  // Insert new achievements
  if (newUnlocks.length > 0) {
    await supabase.from('user_achievements').insert(
      newUnlocks.map(u => ({
        user_id: userId,
        achievement_key: u.achievement_key,
        tier: u.tier,
      }))
    );
  }

  return newUnlocks;
}

async function getUserGameStats(userId) {
  const stats = await ensureGameStats(userId);

  const { data: streak } = await supabase
    .from('user_streaks')
    .select('*')
    .eq('user_id', userId)
    .single();

  const { data: achievements } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  const { data: recentXP } = await supabase
    .from('user_xp')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  const today = new Date().toISOString().split('T')[0];
  const dailyXPEarned = stats.daily_xp_date === today ? (stats.daily_xp_earned || 0) : 0;

  const nextLevelXP = getXPForNextLevel(stats.level + 1);
  const currentLevelXP = getXPForNextLevel(stats.level);
  const progressToNext = nextLevelXP > currentLevelXP
    ? ((stats.total_xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100
    : 100;

  return {
    totalXP: stats.total_xp || 0,
    level: stats.level || 1,
    gamesPlayed: stats.games_played || 0,
    gamesWon: stats.games_won || 0,
    bestCombo: stats.best_combo || 0,
    dailyXPGoal: stats.daily_xp_goal || 20,
    dailyXPEarned: dailyXPEarned,
    currentStreak: streak?.current_streak || 0,
    longestStreak: streak?.longest_streak || 0,
    progressToNextLevel: Math.min(100, Math.round(progressToNext)),
    nextLevelXP,
    achievements: (achievements || []).map(a => ({
      key: a.achievement_key,
      tier: a.tier,
      label: ACHIEVEMENTS[a.achievement_key]?.label || a.achievement_key,
      unlockedAt: a.unlocked_at,
    })),
    recentXP: (recentXP || []).map(x => ({
      amount: x.amount,
      source: x.source,
      createdAt: x.created_at,
    })),
  };
}

async function submitGameResult(userId, { gameType, score, correct, total, combo, timeMs }) {
  const stats = await ensureGameStats(userId);

  // Calculate XP
  let xpEarned = 0;
  const isPerfect = correct === total && total > 0;

  // Base XP per correct answer
  xpEarned += (correct || 0) * XP_REWARDS.quiz_correct;

  // Game completion bonus
  xpEarned += XP_REWARDS.game_complete;

  // Combo bonus (capped at 25)
  if (combo > 0) {
    xpEarned += Math.min(combo * XP_REWARDS.combo_bonus, 25);
  }

  // Perfect score multiplier
  if (isPerfect) {
    xpEarned = Math.round(xpEarned * XP_REWARDS.perfect_score);
  }

  // Update games stats
  const newGamesPlayed = (stats.games_played || 0) + 1;
  const newGamesWon = isPerfect ? (stats.games_won || 0) + 1 : (stats.games_won || 0);
  const newBestCombo = Math.max(stats.best_combo || 0, combo || 0);

  await supabase.from('user_game_stats').update({
    games_played: newGamesPlayed,
    games_won: newGamesWon,
    best_combo: newBestCombo,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId);

  // Award XP
  const source = gameType === 'speed_round' ? 'speed_round_complete' : 'game_complete';
  const xpResult = await awardXP(userId, xpEarned, source, gameType);

  // Track correct answers for achievements
  if (correct > 0) {
    await supabase.from('user_xp').insert({
      user_id: userId,
      amount: 0,
      source: 'quiz_correct',
      source_id: `${gameType}_${Date.now()}`,
    });
  }
  if (isPerfect) {
    await supabase.from('user_xp').insert({
      user_id: userId,
      amount: 0,
      source: 'perfect_score',
      source_id: `${gameType}_${Date.now()}`,
    });
  }

  // Update streak
  const streakResult = await updateStreak(userId);

  // Check achievements
  const newAchievements = await checkAchievements(userId);

  return {
    xpEarned,
    totalXP: xpResult.totalXP,
    level: xpResult.level,
    leveledUp: xpResult.leveledUp,
    dailyGoalBonus: xpResult.dailyGoalBonus,
    streak: streakResult.currentStreak,
    newAchievements,
    isPerfect,
    gamesPlayed: newGamesPlayed,
  };
}

module.exports = {
  awardXP,
  updateStreak,
  checkAchievements,
  getUserGameStats,
  submitGameResult,
  ACHIEVEMENTS,
  XP_REWARDS,
};
