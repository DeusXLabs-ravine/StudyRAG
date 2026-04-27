import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Target, Flame, Brain, BookOpen, Zap, 
  ArrowRight, Clock, Award, Shield, FileText, PieChart as PieChartIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area
} from 'recharts';
import * as analyticsService from '../services/analyticsService';
import { MorphingSquare } from '../components/ui/morphing-square';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

export default function Analytics() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [topics, setTopics] = useState([]);
  const [quizTrend, setQuizTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overview, topicsData, trendData] = await Promise.all([
        analyticsService.getOverview(),
        analyticsService.getTopics(),
        analyticsService.getQuizTrend(),
      ]);
      setData(overview || {});
      setTopics(Array.isArray(topicsData) ? topicsData : []);
      setQuizTrend(Array.isArray(trendData) ? trendData : []);
    } catch (err) {
      console.error('Analytics load error', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <MorphingSquare message="Analyzing your growth..." />
      </div>
    );
  }

  const { 
    mastery = { score: 0, topicCount: 0 }, 
    streak = { currentStreak: 0, longestStreak: 0 }, 
    flashcardStats = { total: 0, dueToday: 0, mastered: 0 },
    timeByMode = [],
    timeTrend = [],
    docMastery = [],
    performance = { totalXp: 0, level: 1, totalDocs: 0, totalSessions: 0 },
    recommendation
  } = data;

  // Format time data for pie chart
  const pieData = timeByMode.map(m => ({
    name: m.mode.charAt(0).toUpperCase() + m.mode.slice(1),
    value: Math.round(m.seconds / 60) // minutes
  })).filter(d => d.value > 0);

  // Format time trend for area chart
  const trendData = timeTrend.map(t => ({
    date: t.date,
    minutes: Math.round(t.seconds / 60)
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Learning Insights</h1>
          <p className="text-gray-500 font-medium">Real-time mapping of your knowledge vault</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Current Rank</p>
            <p className="text-lg font-black text-gray-900 leading-none">Level {performance.level}</p>
          </div>
        </div>
      </header>

      {/* Top Stats - High Level Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Target className="h-5 w-5" />}
          label="Overall Mastery"
          value={`${mastery.score}%`}
          sub={`${mastery.topicCount} Topics Learned`}
          color="blue"
        />
        <StatCard
          icon={<Flame className="h-5 w-5" />}
          label="Study Streak"
          value={`${streak.currentStreak} Days`}
          sub={`Personal Best: ${streak.longestStreak}`}
          color="orange"
        />
        <StatCard
          icon={<Shield className="h-5 w-5" />}
          label="Knowledge Vault"
          value={performance.totalDocs}
          sub="Primary Sources"
          color="purple"
        />
        <StatCard
          icon={<Zap className="h-5 w-5" />}
          label="Total XP"
          value={performance.totalXp.toLocaleString()}
          sub={`${performance.totalSessions} Sessions`}
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Progress Charts */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Document Mastery Table */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <FileText className="h-6 w-6 text-blue-500" />
              Source Coverage
            </h2>
            <div className="space-y-6">
              {docMastery.length > 0 ? (
                docMastery.map((doc) => (
                  <div key={doc.id} className="group cursor-pointer" onClick={() => navigate(`/learn?doc=${doc.id}`)}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-sm font-bold text-gray-800 group-hover:text-primary transition-colors">{doc.name}</span>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                          {doc.completedModules} / {doc.totalModules} Modules Mastered
                        </p>
                      </div>
                      <span className="text-sm font-black text-gray-900">{doc.completion}%</span>
                    </div>
                    <div className="w-full bg-gray-50 rounded-full h-3 overflow-hidden border border-gray-100">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${doc.completion}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState message="Upload documents to track mastery" />
              )}
            </div>
          </section>

          {/* Quiz Performance Chart */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-green-500" />
              Performance Trend
            </h2>
            <div className="h-[300px] w-full">
              {quizTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quizTrend.slice(-10)}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="score" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="Complete quizzes to see data" />
              )}
            </div>
          </section>

          {/* Daily Activity (Time Trend) */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm overflow-hidden">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <Zap className="h-6 w-6 text-yellow-500" />
              Study Intensity
            </h2>
            <div className="h-[300px] w-full">
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => new Date(val).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: 'Minutes', angle: -90, position: 'insideLeft', style: { fontSize: 10, fontWeight: 700, fill: '#94a3b8' } }}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="minutes" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMinutes)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No study time recorded yet" />
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Distribution & Recs */}
        <div className="space-y-8">
          
          {/* Study Time Distribution */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <Clock className="h-6 w-6 text-orange-500" />
              Time Allocation
            </h2>
            <div className="h-[240px] relative">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={8}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState message="No study time recorded" />
              )}
            </div>
          </section>

          {/* Flashcard Mastery */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
              <Brain className="h-6 w-6 text-purple-500" />
              Retention
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Due Today</p>
                <p className="text-2xl font-black text-orange-500">{flashcardStats.dueToday}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Mastered</p>
                <p className="text-2xl font-black text-emerald-500">{flashcardStats.mastered}</p>
              </div>
            </div>
            <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Mastery Rate</span>
                <span className="text-xs font-black text-primary">
                  {flashcardStats.total > 0 ? Math.round((flashcardStats.mastered / flashcardStats.total) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-primary/10 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${flashcardStats.total > 0 ? (flashcardStats.mastered / flashcardStats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </section>

          {/* Recommendation */}
          {recommendation && (
            <section className="bg-gray-900 rounded-2xl p-6 text-white relative overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 p-4">
                <Zap className="h-8 w-8 text-yellow-400 fill-current opacity-20" />
              </div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-yellow-400 border border-white/10 uppercase tracking-widest mb-6">
                  Sage Suggestion
                </div>
                <h3 className="text-xl font-black mb-2 leading-tight">{recommendation.title}</h3>
                <p className="text-sm text-gray-400 font-medium mb-8 leading-relaxed">{recommendation.description}</p>
                <button
                  onClick={() => navigate(recommendation.link)}
                  className="w-full py-4 bg-white text-gray-900 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-yellow-400 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Apply Recommendation <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    green: 'bg-green-50 text-green-600 border-green-100',
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 border ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-3xl font-black text-gray-900 leading-none tracking-tight">{value}</p>
        <div className="flex items-center gap-1.5 mt-4">
          <div className="w-1 h-1 rounded-full bg-gray-300" />
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{sub}</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 p-6">
      <PieChartIcon className="h-8 w-8 mb-3 opacity-20" />
      <p className="uppercase tracking-widest text-[10px] font-black text-center">{message}</p>
    </div>
  );
}
