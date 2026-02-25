import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Target, Flame, Brain, BookOpen, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as analyticsService from '../services/analyticsService';
import { MorphingSquare } from '../components/ui/morphing-square';

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
      setOverview(overviewData || {});
      setTopics(Array.isArray(topicsData) ? topicsData : []);
      setQuizTrend(Array.isArray(trendData) ? trendData : []);
      setWeakAreas(Array.isArray(weakData) ? weakData : []);
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <MorphingSquare message="Analyzing progress" />
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
          label="Learned Topics"
          value={overview?.topicCount || 0}
          sub="Across all docs"
          color="purple"
        />
        <StatCard
          icon={<BookOpen className="h-5 w-5 text-green-500" />}
          label="Flashcards"
          value={flashcardStats.total || 0}
          sub={`${flashcardStats.due || 0} due today`}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Performance Trend */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                Performance Trend
              </h2>
            </div>
            <div className="h-64 flex items-end justify-between gap-2 px-2">
              {quizTrend.length > 0 ? (
                quizTrend.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full">
                      <div
                        className="w-full bg-blue-100 rounded-t-md hover:bg-blue-200 transition-all cursor-help relative"
                        style={{ height: `${d.score}%` }}
                      >
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {d.score}% score
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium rotate-45 origin-left">{d.date}</span>
                  </div>
                ))
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200 uppercase tracking-widest text-[10px] font-black">
                  Complete quizzes to see your trend
                </div>
              )}
            </div>
          </div>

          {/* Topic Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              Topic Breakdown
            </h2>
            <div className="space-y-4">
              {topics.map((t, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{t.name}</span>
                    <span className="text-gray-500 font-bold">{t.mastery}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${t.mastery > 80 ? 'bg-green-500' : t.mastery > 50 ? 'bg-blue-500' : 'bg-orange-500'}`}
                      style={{ width: `${t.mastery}%` }}
                    />
                  </div>
                </div>
              ))}
              {topics.length === 0 && (
                <div className="py-8 text-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                  No topics processed yet
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="space-y-8">
          {/* Weak Areas */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Growth Opportunities
            </h2>
            <div className="space-y-3">
              {weakAreas.length > 0 ? (
                weakAreas.map((w, i) => (
                  <div key={i} className="p-3 bg-white border border-gray-100 rounded-xl hover:border-orange-200 transition-colors">
                    <p className="text-sm font-bold text-gray-900">{w.name}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] font-black uppercase text-orange-500 tracking-widest">Mastery: {w.mastery}%</span>
                      <button
                        onClick={() => navigate('/learn')}
                        className="text-[10px] text-gray-400 hover:text-blue-500 font-black uppercase tracking-widest flex items-center gap-1"
                      >
                        Study <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">No weak areas identified. Keep it up!</p>
              )}
            </div>
          </div>

          {/* Smart Recommendation */}
          {recommendation && (
            <div className="bg-primary/5 rounded-[2rem] border border-primary/10 p-6 relative overflow-hidden">
              <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary/10 rounded-full blur-2xl" />
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-[10px] font-black text-primary border border-primary/10 uppercase tracking-widest mb-4">
                  <Zap className="h-3 w-3" /> Sage Suggestion
                </div>
                <h3 className="text-base font-black text-gray-900 mb-2">{recommendation.title}</h3>
                <p className="text-xs text-gray-600 font-medium leading-relaxed mb-4">{recommendation.description}</p>
                <button
                  onClick={() => navigate(recommendation.link)}
                  className="w-full py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-black transition-colors"
                >
                  Start Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-gray-900 leading-none">{value}</p>
        <p className="text-[10px] font-bold text-gray-500 mt-2 uppercase tracking-tighter opacity-60">{sub}</p>
      </div>
    </div>
  );
}
