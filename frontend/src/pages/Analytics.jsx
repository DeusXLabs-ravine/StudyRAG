import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Target, Flame, Brain, BookOpen, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as analyticsService from '../services/analyticsService';
import Spinner from '../components/common/Spinner';

export default function Analytics() {
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [topics, setTopics] = useState([]);
  const [quizTrend, setQuizTrend] = useState([]);
  const [weakAreas, setWeakAreas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, topicsData, trendData, weakData] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getTopics(),
        analyticsService.getQuizTrend(),
        analyticsService.getWeakAreas(),
      ]);
      setOverview(overviewData);
      setTopics(topicsData);
      setQuizTrend(trendData);
      setWeakAreas(weakData);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  const mastery = overview?.mastery || { score: 0, topicCount: 0 };
  const streak = overview?.streak || { currentStreak: 0, longestStreak: 0, totalDays: 0 };
  const recommendation = overview?.recommendation;
  const flashcardStats = overview?.flashcardStats || {};

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Target className="h-5 w-5 text-blue-500" />}
          label="Overall Mastery"
          value={`${mastery.score}%`}
          sub={`${mastery.topicCount} topics`}
          color="blue"
        />
        <StatCard
          icon={<Flame className="h-5 w-5 text-orange-500" />}
          label="Study Streak"
          value={`${streak.currentStreak} days`}
          sub={`Best: ${streak.longestStreak} days`}
          color="orange"
        />
        <StatCard
          icon={<Brain className="h-5 w-5 text-purple-500" />}
          label="Flashcards Due"
          value={flashcardStats.dueToday || 0}
          sub={`${flashcardStats.mastered || 0} mastered`}
          color="purple"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-green-500" />}
          label="Total Days"
          value={streak.totalDays}
          sub="studied"
          color="green"
        />
      </div>

      {/* AI Recommendation */}
      {recommendation && (
        <div className="mb-8 p-5 bg-gradient-to-r from-primary-50 to-blue-50 rounded-xl border border-primary-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Zap className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">AI Recommendation</p>
                <p className="text-sm text-gray-600">{recommendation.message}</p>
              </div>
            </div>
            <button
              onClick={() => {
                if (recommendation.action === 'learn') navigate('/learn');
                else if (recommendation.action === 'quiz') navigate('/quiz');
                else if (recommendation.action === 'flashcards') navigate('/flashcards');
              }}
              className="flex items-center gap-1 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              Go <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Topic Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" /> Topic Mastery
          </h2>
          {topics.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No topic data yet. Complete modules or quizzes to see your progress.</p>
          ) : (
            <div className="space-y-3">
              {topics.map(topic => (
                <div key={topic.topic}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{topic.topic}</span>
                    <span className={`text-xs font-medium ${getMasteryColor(topic.mastery)}`}>
                      {topic.avgScore}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getMasteryBarColor(topic.mastery)}`}
                      style={{ width: `${topic.avgScore}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Weak Areas */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-red-400" /> Areas to Improve
          </h2>
          {weakAreas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-green-600 font-medium">Looking good!</p>
              <p className="text-xs text-gray-500 mt-1">No weak areas detected. Keep it up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {weakAreas.map(area => (
                <div key={area.topic} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-red-800">{area.topic}</p>
                    <p className="text-xs text-red-600">{area.attempts} attempts</p>
                  </div>
                  <span className="text-sm font-bold text-red-600">{area.avgScore}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quiz Score Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gray-400" /> Quiz Score Trend
          </h2>
          {quizTrend.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No quiz history yet. Take a quiz to see your trend.</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {quizTrend.map((entry, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center justify-end"
                >
                  <span className="text-[10px] text-gray-500 mb-1">{entry.score}%</span>
                  <div
                    className={`w-full rounded-t ${entry.isExam ? 'bg-purple-400' : entry.score >= 70 ? 'bg-green-400' : 'bg-red-400'}`}
                    style={{ height: `${entry.score}%` }}
                    title={`${entry.score}% - ${entry.difficulty}${entry.isExam ? ' (Exam)' : ''}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Flashcard Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Flashcard Overview</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{flashcardStats.new || 0}</p>
              <p className="text-xs text-blue-500">New</p>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <p className="text-2xl font-bold text-orange-600">{flashcardStats.learning || 0}</p>
              <p className="text-xs text-orange-500">Learning</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{flashcardStats.mastered || 0}</p>
              <p className="text-xs text-green-500">Mastered</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{flashcardStats.dueToday || 0}</p>
              <p className="text-xs text-purple-500">Due Today</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  const bgColors = {
    blue: 'bg-blue-50 border-blue-100',
    orange: 'bg-orange-50 border-orange-100',
    purple: 'bg-purple-50 border-purple-100',
    green: 'bg-green-50 border-green-100',
  };

  return (
    <div className={`p-4 rounded-xl border ${bgColors[color]}`}>
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-gray-500">{label}</span></div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{sub}</p>
    </div>
  );
}

function getMasteryColor(mastery) {
  switch (mastery) {
    case 'mastered': return 'text-green-600';
    case 'proficient': return 'text-blue-600';
    case 'developing': return 'text-yellow-600';
    case 'beginner': return 'text-orange-600';
    default: return 'text-red-600';
  }
}

function getMasteryBarColor(mastery) {
  switch (mastery) {
    case 'mastered': return 'bg-green-500';
    case 'proficient': return 'bg-blue-500';
    case 'developing': return 'bg-yellow-500';
    case 'beginner': return 'bg-orange-500';
    default: return 'bg-red-500';
  }
}
