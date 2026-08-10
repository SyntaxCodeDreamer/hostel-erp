import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../utils/apiClient';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Plus, Clock, User as UserIcon } from 'lucide-react';

const Tasks = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [tasks, setTasks] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [studentsList, setStudentsList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const userRole = (user?.role || '').toLowerCase();
  const isAdminOrLeader = userRole === 'admin' || userRole === 'leader';

  useEffect(() => {
    fetchInitialTasks();
    if (isAdminOrLeader) {
      fetchStudentsForAssignment();
    }
  }, [isAdminOrLeader]);

  const fetchInitialTasks = async () => {
    try {
      setInitialLoading(true);
      const res = await apiClient.get('/tasks?page=1&limit=6');
      if (res.data && Array.isArray(res.data.data)) {
        setTasks(res.data.data);
        setHasMore(res.data.hasMore);
        setPage(1);
      } else if (Array.isArray(res.data)) {
        setTasks(res.data);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMoreTasks = async () => {
    if (loading || !hasMore) return;
    try {
      setLoading(true);
      const nextPage = page + 1;
      const res = await apiClient.get(`/tasks?page=${nextPage}&limit=6`);
      if (res.data && Array.isArray(res.data.data)) {
        setTasks(prev => {
          const existingIds = new Set(prev.map(t => t._id));
          const newItems = res.data.data.filter(t => !existingIds.has(t._id));
          return [...prev, ...newItems];
        });
        setHasMore(res.data.hasMore);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 250) {
        if (hasMore && !loading && !initialLoading) {
          loadMoreTasks();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, initialLoading, page]);

  const fetchStudentsForAssignment = async () => {
    try {
      const res = await apiClient.get('/students');
      setStudentsList(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching students for assignment:', error);
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      await apiClient.post('/tasks', formData);
      setShowForm(false);
      setFormData({ title: '', description: '', assignedTo: '', priority: 'Medium', dueDate: '' });
      fetchInitialTasks();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await apiClient.put(`/tasks/${id}/status`, { status });
      fetchInitialTasks();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const getAssigneeName = (task) => {
    const u = task.assignedTo;
    if (!u) return 'Unassigned';
    return u.fullName || u.name || u.email || 'Student Resident';
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || 'medium').toLowerCase();
    if (p === 'high') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400 dark:border dark:border-rose-800/50';
    if (p === 'medium') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 dark:border dark:border-amber-800/50';
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border dark:border-emerald-800/50';
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'completed') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border dark:border-emerald-800/50';
    if (s === 'in_progress' || s === 'in progress') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-400 dark:border dark:border-blue-800/50';
    return 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 dark:border dark:border-amber-800/50';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Tasks</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Assign and trace weekly hostel chore completions.</p>
        </div>
        {isAdminOrLeader && (
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-indigo-700 transition flex items-center gap-1.5"
          >
            <Plus size={16} />
            {showForm ? 'Cancel' : 'Assign Task'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={`p-6 rounded-2xl border space-y-4 shadow-sm ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Title</label>
              <input 
                type="text" required 
                value={formData.title} 
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                placeholder="Chore task title..."
              />
            </div>
            <div className="sm:col-span-2">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
              <textarea 
                required rows="2"
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                placeholder="Detailed instructions..."
              />
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Assign To Student</label>
              <select 
                required
                value={formData.assignedTo} 
                onChange={(e) => setFormData({...formData, assignedTo: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              >
                <option value="">Select Student</option>
                {studentsList.map(s => {
                  const targetId = s.userId?._id || s.userId || s._id;
                  const name = s.fullName || s.name || s.userId?.name || s.userId?.email || 'Student';
                  return (
                    <option key={s._id} value={targetId}>{name} (Room {s.roomNumber || 'N/A'})</option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Priority</label>
              <select 
                value={formData.priority} 
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Due Date</label>
              <input 
                type="date" required 
                value={formData.dueDate} 
                onChange={(e) => setFormData({...formData, dueDate: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>
          </div>
          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating Task...
              </>
            ) : (
              'Create & Assign Task'
            )}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tasks.map((task) => (
          <div key={task._id} className={`p-5 rounded-2xl border flex flex-col justify-between shadow-sm transition ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
            <div>
              <div className="flex justify-between items-center mb-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${getPriorityBadge(task.priority)}`}>
                  {task.priority || 'Medium'}
                </span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getStatusBadge(task.status)}`}>
                  {task.status || 'Pending'}
                </span>
              </div>

              <h3 className={`text-base font-bold tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>{task.title || 'Untitled Task'}</h3>
              <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{task.description || 'No description provided.'}</p>
              
              <div className={`mt-4 pt-3 border-t space-y-1.5 text-xs ${isDark ? 'border-gray-800/60 text-gray-400' : 'border-gray-100 text-gray-600'}`}>
                <p className="flex items-center gap-1.5">
                  <UserIcon size={14} className="text-indigo-600 dark:text-indigo-400" />
                  <span>Assigned To: <strong className={isDark ? 'text-gray-200' : 'text-gray-900'}>{getAssigneeName(task)}</strong></span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Clock size={14} className="text-amber-600 dark:text-amber-400" />
                  <span>Due: <strong className={isDark ? 'text-gray-200' : 'text-gray-900'}>{formatDate(task.dueDate)}</strong></span>
                </p>
              </div>
            </div>
            
            {/* Status Update Actions */}
            {(isAdminOrLeader || user?._id === task.assignedTo?._id || user?._id === task.assignedTo) && (task.status || '').toLowerCase() !== 'completed' && (
              <div className={`mt-4 flex gap-2 pt-3 border-t ${isDark ? 'border-gray-800/60' : 'border-gray-100'}`}>
                {(task.status || '').toLowerCase() === 'pending' && (
                  <button onClick={() => updateStatus(task._id, 'In Progress')} className="flex-1 bg-blue-600 text-white dark:bg-blue-950/80 dark:text-blue-300 dark:border dark:border-blue-800/50 text-xs py-1.5 font-semibold rounded-lg hover:bg-blue-700 transition">Start</button>
                )}
                <button onClick={() => updateStatus(task._id, 'Completed')} className="flex-1 bg-emerald-600 text-white dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800/50 text-xs py-1.5 font-semibold rounded-lg hover:bg-emerald-700 transition">Complete</button>
              </div>
            )}
          </div>
        ))}

        {tasks.length === 0 && !initialLoading && (
          <div className={`col-span-full text-center py-12 rounded-2xl border ${isDark ? 'bg-[#14161f] border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
            No tasks assigned yet.
          </div>
        )}

        {loading && (
          <div className="col-span-full py-6 flex justify-center items-center gap-2 text-sm text-indigo-500 font-medium">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            Loading more tasks...
          </div>
        )}

        {!hasMore && tasks.length > 0 && (
          <div className="col-span-full py-4 text-center text-xs text-gray-500 font-medium">
            You have reached the end of all tasks.
          </div>
        )}
      </div>
    </div>
  );
};

export default Tasks;
