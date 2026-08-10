import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../utils/apiClient';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Pin, Plus, Trash2, Calendar, User as UserIcon } from 'lucide-react';

const Announcements = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [announcements, setAnnouncements] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const userRole = (user?.role || '').toLowerCase();
  const isAdminOrLeader = ['admin', 'leader', 'trust member', 'trustee'].includes(userRole);

  useEffect(() => {
    fetchInitialAnnouncements();
  }, []);

  const fetchInitialAnnouncements = async () => {
    try {
      setInitialLoading(true);
      const res = await apiClient.get('/announcements?page=1&limit=6');
      if (res.data && Array.isArray(res.data.data)) {
        setAnnouncements(res.data.data);
        setHasMore(res.data.hasMore);
        setPage(1);
      } else if (Array.isArray(res.data)) {
        setAnnouncements(res.data);
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMoreAnnouncements = async () => {
    if (loading || !hasMore) return;
    try {
      setLoading(true);
      const nextPage = page + 1;
      const res = await apiClient.get(`/announcements?page=${nextPage}&limit=6`);
      if (res.data && Array.isArray(res.data.data)) {
        setAnnouncements(prev => {
          const existingIds = new Set(prev.map(a => a._id));
          const newItems = res.data.data.filter(a => !existingIds.has(a._id));
          return [...prev, ...newItems];
        });
        setHasMore(res.data.hasMore);
        setPage(nextPage);
      }
    } catch (error) {
      console.error('Error loading more announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 250) {
        if (hasMore && !loading && !initialLoading) {
          loadMoreAnnouncements();
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, initialLoading, page]);

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      await apiClient.post('/announcements', formData);
      setShowForm(false);
      setFormData({ title: '', description: '', category: 'General', targetAudience: 'All', isPinned: false });
      fetchInitialAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/announcements/${id}`);
      fetchInitialAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toLocaleDateString() : d.toLocaleDateString();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Announcements</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>View and publish announcements, notices, and updates.</p>
        </div>
        {isAdminOrLeader && (
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-indigo-700 transition flex items-center gap-1.5"
          >
            <Plus size={16} />
            {showForm ? 'Cancel' : 'Post Circular'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className={`p-6 rounded-2xl border space-y-4 shadow-sm ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Title</label>
            <input 
              type="text" required 
              value={formData.title} 
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              placeholder="Notice title..."
            />
          </div>
          <div>
            <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
            <textarea 
              required rows="3"
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              placeholder="Provide notice details..."
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Category</label>
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              >
                <option>General</option>
                <option>Meeting</option>
                <option>Emergency</option>
                <option>Maintenance</option>
                <option>Event</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Send Notification To</label>
              <select 
                value={formData.targetAudience} 
                onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              >
                <option value="All">Send to All (Admins, Leaders & Students)</option>
                <option value="Students">Only Send Notification to Students</option>
              </select>
            </div>
          </div>
          <div className="flex items-center pt-1">
            <input 
              type="checkbox" 
              id="isPinned"
              checked={formData.isPinned}
              onChange={(e) => setFormData({...formData, isPinned: e.target.checked})}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
            />
            <label htmlFor="isPinned" className={`ml-2 block text-sm font-medium cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Pin to top</label>
          </div>
          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Publishing...
              </>
            ) : (
              'Publish Announcement'
            )}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {announcements.map((ann) => (
          <div key={ann._id} className={`p-6 rounded-2xl border flex flex-col justify-between transition shadow-sm ${
            ann.isPinned 
              ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/10' 
              : isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'
          }`}>
            <div>
              <div className="flex justify-between items-start mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border dark:border-indigo-800/40 px-2.5 py-1 rounded-full uppercase tracking-wider">{ann.category || 'General'}</span>
                  {(ann.targetAudience || '').toLowerCase().includes('student') ? (
                    <span className="text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 dark:border dark:border-purple-800/40 px-2.5 py-1 rounded-full">Students Only</span>
                  ) : (
                    <span className="text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-2.5 py-1 rounded-full">All Users</span>
                  )}
                  {ann.isPinned && <span className="text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-800/40 px-2.5 py-1 rounded-full flex items-center gap-1"><Pin size={12} /> Pinned</span>}
                </div>
                {isAdminOrLeader && (user?._id === ann.createdBy?._id || user?.role === 'Admin' || user?.role === 'admin') && (
                  <button onClick={() => handleDelete(ann._id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition p-1" title="Delete">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <h3 className={`text-lg font-bold tracking-wide ${isDark ? 'text-white' : 'text-gray-900'}`}>{ann.title || 'Untitled Notice'}</h3>
              <p className={`text-sm mt-2 whitespace-pre-wrap leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{ann.description || ann.content || 'No details provided.'}</p>
            </div>

            <div className={`mt-6 pt-4 border-t flex items-center justify-between text-xs ${isDark ? 'border-gray-800/60 text-gray-400' : 'border-gray-100 text-gray-600'}`}>
              <span className="flex items-center gap-1.5">
                <UserIcon size={14} className="text-indigo-600 dark:text-indigo-400" />
                Authored by: <strong className={isDark ? 'text-gray-200' : 'text-gray-900'}>{ann.createdBy?.name || ann.createdBy?.email || 'Admin'}</strong>
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                {formatDate(ann.createdAt || ann.createdDate)}
              </span>
            </div>
          </div>
        ))}

        {announcements.length === 0 && !initialLoading && (
          <div className={`col-span-full text-center py-12 rounded-2xl border ${isDark ? 'bg-[#14161f] border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
            No circulars published yet.
          </div>
        )}

        {loading && (
          <div className="col-span-full py-6 flex justify-center items-center gap-2 text-sm text-indigo-500 font-medium">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            Loading more announcements...
          </div>
        )}

        {!hasMore && announcements.length > 0 && (
          <div className="col-span-full py-4 text-center text-xs text-gray-500 font-medium">
            You have reached the end of all announcements.
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
