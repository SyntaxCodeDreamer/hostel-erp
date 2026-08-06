import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../utils/apiClient';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, Calendar, CheckSquare, Wallet, BookOpen, TrendingUp, Activity, Megaphone, Award, FileText, ExternalLink, Layers
} from 'lucide-react';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isAdminOrLeader = user?.role === 'Admin' || user?.role === 'Leader' || user?.role === 'admin' || user?.role === 'leader';
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const isDark = theme === 'dark';

  const [refreshToggle, setRefreshToggle] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [refreshToggle]);

  const handleRefresh = () => {
    setRefreshToggle(prev => !prev);
  };

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, annRes] = await Promise.all([
        apiClient.get('/analytics').catch(() => ({ data: null })),
        apiClient.get('/announcements').catch(() => ({ data: [] }))
      ]);

      if (analyticsRes.data) {
        setData(analyticsRes.data);
      } else {
        setData({
          totalStudents: 0,
          pendingLeaves: 0,
          pendingTasks: 0,
          monthlyExpenseTotal: 0,
          leavesByStatus: [],
          studentsByCourse: [],
          taskStatusBreakdown: [],
          expensesByCategory: []
        });
      }

      setAnnouncements(annRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Student view restriction removed so they can access the awesome dashboard widgets

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const d = data || {
    totalStudents: 0,
    pendingLeaves: 0,
    pendingTasks: 0,
    monthlyExpenseTotal: 0,
    leavesByStatus: [],
    studentsByCourse: [],
    taskStatusBreakdown: [],
    expensesByCategory: []
  };

  const defaultLeaveData = { 'Pending': 0, 'Approved': 0, 'Rejected': 0 };
  if (d.leavesByStatus && d.leavesByStatus.length > 0) {
    d.leavesByStatus.forEach(l => {
      if (l._id) defaultLeaveData[l._id] = l.count;
    });
  }
  const leaveBarData = Object.keys(defaultLeaveData).map(key => ({
    name: key,
    count: defaultLeaveData[key]
  }));

  const coursePieData = (d.studentsByCourse && d.studentsByCourse.length > 0)
    ? d.studentsByCourse.map((c) => ({ name: c._id || 'Course', value: c.count || 0 }))
    : [{ name: 'B.Tech Computer Science', value: 2 }, { name: 'MCA Applications', value: 1 }];

  const choreData = (d.taskStatusBreakdown && d.taskStatusBreakdown.length > 0)
    ? d.taskStatusBreakdown.map((t) => ({ name: t._id === 'Pending' || t._id === 'pending' ? 'Pending' : t._id === 'In Progress' || t._id === 'in_progress' ? 'In Progress' : 'Completed', value: t.count || 0 }))
    : [{ name: 'Pending', value: d.pendingTasks || 0 }, { name: 'In Progress', value: 0 }];

  const expenseData = (d.expensesByCategory && d.expensesByCategory.length > 0)
    ? d.expensesByCategory.map((e) => ({ category: e._id || 'Misc', amount: e.totalAmount || 0 }))
    : [{ category: 'Milk', amount: 450 }, { category: 'Electricity', amount: 980 }, { category: 'Vegetables', amount: 180 }, { category: 'Maintenance', amount: 75 }];

  const progressChartData = (d.progressByCategory && d.progressByCategory.length > 0)
    ? d.progressByCategory.map((p) => ({ name: p._id || 'Other', count: p.count || 0 }))
    : [{ name: 'Academic', count: 0 }, { name: 'Extracurricular', count: 0 }, { name: 'Internship/Project', count: 0 }, { name: 'Certificate', count: 0 }, { name: 'Sports', count: 0 }];

  const recentProgressList = d.recentProgressItems || [];

  const COURSE_COLORS = ['#818cf8', '#34d399', '#f43f5e', '#fbbf24', '#a78bfa'];
  const CHORE_COLORS = { 'Pending': '#10b981', 'In Progress': '#f59e0b', 'Completed': '#3b82f6' };

  const totalResidentsCount = d.totalStudents !== undefined ? d.totalStudents : 0;
  const pendingLeavesCount = d.pendingLeaves !== undefined ? d.pendingLeaves : 0;
  const pendingChoresCount = d.pendingTasks !== undefined ? d.pendingTasks : 0;
  const monthlyExpenseVal = d.monthlyExpenseTotal !== undefined ? d.monthlyExpenseTotal : 0;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`p-4 sm:p-8 space-y-8 rounded-2xl transition-colors duration-200 font-sans ${isDark ? 'bg-[#0b0c10] text-gray-100' : 'bg-gray-100/60 text-gray-900'}`}
    >
      
      {/* Top Banner Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className={`text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Welcome back!</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Here is a quick snapshot of the hostel operations today.</p>
        </div>
        <div className={`flex items-center gap-2 border px-4 py-2 rounded-xl text-xs font-semibold shadow-xs self-start sm:self-auto ${
          isDark ? 'bg-[#1a1c26] border-purple-900/50 text-purple-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
        }`}>
          <Calendar size={16} className={isDark ? 'text-purple-400' : 'text-indigo-600'} />
          <span>Academic Term 2026</span>
        </div>
      </motion.div>

      {/* 4 Stat Overview Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Stat 1: Total Residents */}
        <motion.div whileHover={{ y: -5 }} className={`border rounded-2xl p-5 flex items-center justify-between shadow-xs transition-shadow hover:shadow-md ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{isAdminOrLeader ? 'Total Residents' : 'My Profile'}</p>
            <h2 className={`text-3xl font-extrabold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{isAdminOrLeader ? totalResidentsCount : 'Active'}</h2>
          </div>
          <div className="p-3.5 bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/30 text-purple-600 dark:text-purple-400 rounded-xl">
            <Users size={22} />
          </div>
        </motion.div>

        {/* Stat 2: Pending Leaves */}
        <motion.div whileHover={{ y: -5 }} className={`border rounded-2xl p-5 flex items-center justify-between shadow-xs transition-shadow hover:shadow-md ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{isAdminOrLeader ? 'Pending Leaves' : 'My Pending Leaves'}</p>
            <h2 className={`text-3xl font-extrabold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{pendingLeavesCount}</h2>
            <p className="text-[11px] text-amber-500 font-semibold mt-1">{isAdminOrLeader ? 'Requires review / sign-off' : 'Waiting for approval'}</p>
          </div>
          <div className="p-3.5 bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/30 text-amber-600 dark:text-amber-400 rounded-xl">
            <Calendar size={22} />
          </div>
        </motion.div>

        {/* Stat 3: Pending Chores */}
        <motion.div whileHover={{ y: -5 }} className={`border rounded-2xl p-5 flex items-center justify-between shadow-xs transition-shadow hover:shadow-md ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{isAdminOrLeader ? 'Pending Chores' : 'My Pending Chores'}</p>
            <h2 className={`text-3xl font-extrabold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{pendingChoresCount}</h2>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">Assigned duties in progress</p>
          </div>
          <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckSquare size={22} />
          </div>
        </motion.div>

        {/* Stat 4: Total Ledgers / Expenses (or Approved Leave Days for Student) */}
        <motion.div whileHover={{ y: -5 }} className={`border rounded-2xl p-5 flex items-center justify-between shadow-xs transition-shadow hover:shadow-md ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{isAdminOrLeader ? 'Total Ledgers' : 'Approved Leave Days'}</p>
            <h2 className={`text-3xl font-extrabold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{isAdminOrLeader ? `₹${monthlyExpenseVal}` : (d.totalLeaveDays !== undefined ? d.totalLeaveDays : monthlyExpenseVal)}</h2>
            <p className="text-[11px] text-indigo-500 font-semibold mt-1">
              {isAdminOrLeader ? 'Current total registered' : 'Total number of days'}
            </p>
          </div>
          <div className="p-3.5 bg-indigo-100 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            {isAdminOrLeader ? <Wallet size={22} /> : <Calendar size={22} />}
          </div>
        </motion.div>

      </motion.div>

      {/* Row 1 Charts */}
      {isAdminOrLeader && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 1: Leave Status Distribution */}
        <div className={`border rounded-2xl p-6 shadow-xs transition hover:shadow-md ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-base font-bold tracking-wide ${isDark ? 'text-white' : 'text-gray-800'}`}>Leave Status Distribution</h3>
            <TrendingUp size={18} className="text-purple-500" />
          </div>
          <div style={{ width: '100%', height: 260, minHeight: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaveBarData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#27293d" : "#f1f5f9"} />
                <XAxis dataKey="name" stroke={isDark ? "#9ca3af" : "#64748b"} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={isDark ? "#9ca3af" : "#64748b"} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: isDark ? '#1f212e' : '#f8fafc' }} contentStyle={{ backgroundColor: isDark ? '#1a1c26' : '#ffffff', borderColor: isDark ? '#374151' : '#e2e8f0', borderRadius: '12px', color: isDark ? '#ffffff' : '#0f172a' }} />
                <Bar dataKey="count" fill="#7c3aed" radius={[6, 6, 0, 0]} barSize={55} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Course Enrollments */}
        <div className={`border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition hover:shadow-md ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-bold tracking-wide ${isDark ? 'text-white' : 'text-gray-800'}`}>Course Enrollments</h3>
            <Activity size={18} className="text-emerald-500" />
          </div>
          <div style={{ width: '100%', height: 220, minHeight: 220 }} className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={coursePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={6}
                  dataKey="value"
                  stroke="none"
                >
                  {coursePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COURSE_COLORS[index % COURSE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1a1c26' : '#ffffff', borderColor: isDark ? '#374151' : '#e2e8f0', borderRadius: '12px', color: isDark ? '#ffffff' : '#0f172a' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {coursePieData.map((item, index) => (
              <div key={item.name} className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COURSE_COLORS[index % COURSE_COLORS.length] }}></span>
                <span>{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
      )}

      {/* Row 2 Charts */}
      {isAdminOrLeader && (
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Chart 3: Chore Status breakdown */}
        <div className={`border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition hover:shadow-md ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-bold tracking-wide ${isDark ? 'text-white' : 'text-gray-800'}`}>Chore Status breakdown</h3>
            <CheckSquare size={18} className="text-emerald-500" />
          </div>
          <div style={{ width: '100%', height: 220, minHeight: 220 }} className="relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={choreData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  dataKey="value"
                  stroke="none"
                >
                  {choreData.map((entry) => (
                    <Cell key={entry.name} fill={CHORE_COLORS[entry.name] || '#3b82f6'} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: isDark ? '#1a1c26' : '#ffffff', borderColor: isDark ? '#374151' : '#e2e8f0', borderRadius: '12px', color: isDark ? '#ffffff' : '#0f172a' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {choreData.map((item) => (
              <div key={item.name} className={`flex items-center gap-2 text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <span className="w-3 h-3 rounded-xs inline-block" style={{ backgroundColor: CHORE_COLORS[item.name] || '#3b82f6' }}></span>
                <span>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Expense breakdown by Category */}
        <div className={`border rounded-2xl p-6 shadow-xs transition hover:shadow-md ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-base font-bold tracking-wide ${isDark ? 'text-white' : 'text-gray-800'}`}>Expense breakdown by Category</h3>
            <Wallet size={18} className="text-rose-500" />
          </div>
          <div style={{ width: '100%', height: 260, minHeight: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#27293d" : "#f1f5f9"} />
                <XAxis type="number" stroke={isDark ? "#9ca3af" : "#64748b"} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="category" stroke={isDark ? "#9ca3af" : "#64748b"} fontSize={12} tickLine={false} axisLine={false} width={90} />
                <Tooltip cursor={{ fill: isDark ? '#1f212e' : '#f8fafc' }} contentStyle={{ backgroundColor: isDark ? '#1a1c26' : '#ffffff', borderColor: isDark ? '#374151' : '#e2e8f0', borderRadius: '12px', color: isDark ? '#ffffff' : '#0f172a' }} />
                <Bar dataKey="amount" fill="#ff4d6d" radius={[0, 6, 6, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>
      )}

      {/* Student Progress Report Flowchart & Category Chart */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 1 Col: Progress Report Category Breakdown Chart */}
        <div className={`border rounded-2xl p-6 shadow-xs flex flex-col justify-between transition hover:shadow-md ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-base font-bold tracking-wide flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <Award size={18} className="text-indigo-500" /> Progress Categories
            </h3>
          </div>
          <div style={{ width: '100%', height: 250, minHeight: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#27293d" : "#f1f5f9"} />
                <XAxis dataKey="name" stroke={isDark ? "#9ca3af" : "#64748b"} fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke={isDark ? "#9ca3af" : "#64748b"} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: isDark ? '#1f212e' : '#f8fafc' }} contentStyle={{ backgroundColor: isDark ? '#1a1c26' : '#ffffff', borderColor: isDark ? '#374151' : '#e2e8f0', borderRadius: '12px', color: isDark ? '#ffffff' : '#0f172a' }} />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 2 Cols: Student Progress Report Interactive Flowchart / Timeline */}
        <div className={`lg:col-span-2 border rounded-2xl p-6 shadow-xs space-y-4 transition ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-base font-bold tracking-wide flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <Layers size={18} className="text-indigo-500" /> Student Progress Report Flowchart
            </h3>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
              Live Submissions Flowchart
            </span>
          </div>

          {recentProgressList.length === 0 ? (
            <div className={`p-8 text-center rounded-xl border border-dashed ${isDark ? 'border-gray-800 text-gray-400' : 'border-gray-300 text-gray-500'}`}>
              <Activity size={24} className="mx-auto text-indigo-500 mb-2 opacity-60" />
              <p className="text-sm font-medium">No progress report items submitted yet.</p>
              <p className="text-xs mt-1 opacity-75">Student custom progress records will automatically appear in this live flowchart node graph!</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-indigo-500 before:via-purple-500 before:to-emerald-500">
              {recentProgressList.map((item, idx) => {
                const cat = item.category || 'Academic';
                let badgeColor = 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
                if (cat === 'Extracurricular') badgeColor = 'bg-sky-950/80 text-sky-300 border-sky-700/60';
                else if (cat === 'Internship/Project') badgeColor = 'bg-purple-950/80 text-purple-300 border-purple-700/60';
                else if (cat === 'Certificate') badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
                else if (cat === 'Sports') badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-700/60';

                return (
                  <motion.div
                    key={item._id || idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`relative p-4 rounded-xl border transition hover:shadow-md ${isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
                  >
                    {/* Flowchart Node Dot */}
                    <span className="absolute -left-[27px] top-4 h-4 w-4 rounded-full bg-indigo-600 border-2 border-[#14161f] shadow-sm flex items-center justify-center">
                      <span className="h-1.5 w-1.5 rounded-full bg-white"></span>
                    </span>

                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
                          {cat}
                        </span>
                        {item.studentName && (
                          <span className="text-xs font-semibold text-gray-300">
                            {item.studentName} {item.roomNumber ? `• Room ${item.roomNumber}` : ''}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-gray-400 font-medium">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h4>
                    {item.description && <p className={`text-xs mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.description}</p>}
                    
                    {item.proofLink && (
                      <div className="mt-2">
                        <a
                          href={item.proofLink.startsWith('http') ? item.proofLink : `https://${item.proofLink}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300 underline"
                        >
                          <ExternalLink size={12} /> View Proof Document / Link
                        </a>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

      </motion.div>

      {/* Row 3: Circulars & Regulations */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 Cols: Recent Circulars */}
        <div className={`lg:col-span-2 border rounded-2xl p-6 shadow-xs space-y-4 transition ${isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-base font-bold tracking-wide flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
              <Megaphone size={18} className="text-indigo-500" /> Recent Circulars
            </h3>
          </div>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((item, i) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                key={item._id} 
                className={`border p-4 rounded-xl flex items-center justify-between transition hover:shadow-md ${isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-gray-50 border-gray-200'}`}
              >
                <div>
                  <h4 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h4>
                  <p className={`text-xs mt-1 line-clamp-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.description || item.content}</p>
                  <p className="text-[11px] text-gray-500 mt-2">Posted by <span className="text-indigo-600 font-semibold">{item.createdBy?.name || item.createdBy?.email || 'Admin'}</span></p>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap ml-4">
                  {new Date(item.createdAt || Date.now()).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
            {announcements.length === 0 && (
              <div className="space-y-2">
                <div className={`border p-3 rounded-xl flex justify-between items-center text-xs ${isDark ? 'bg-[#1a1c26] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                  <span>Annual Hostel General Meetup</span>
                  <span className="text-gray-500">Posted by admin@hostel.com</span>
                </div>
                <div className={`border p-3 rounded-xl flex justify-between items-center text-xs ${isDark ? 'bg-[#1a1c26] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                  <span>Water Supply Maintenance Schedule</span>
                  <span className="text-gray-500">Posted by leader@hostel.com</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Residency Regulations Card */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 p-6 rounded-2xl text-white shadow-lg flex flex-col justify-between"
        >
          <div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <BookOpen size={20} /> Residency Regulations
            </h3>
            <ul className="space-y-3 text-xs leading-relaxed text-indigo-100">
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span><strong>Mess Timings</strong>: 7:30 AM - 9:30 AM, 12:30 PM - 2:00 PM, 7:30 PM - 9:30 PM.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Out-of-hostel entry requires approval via Leave Tracker.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Cleanliness is checked weekly. Ensure task logs are updated.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold">•</span>
                <span>Any maintenance issues must be immediately flagged to Leaders.</span>
              </li>
            </ul>
          </div>
        </motion.div>

      </motion.div>

    </motion.div>
  );
};

export default Dashboard;
