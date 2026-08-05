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
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ title: '', description: '', category: 'General', isPinned: false });
  const isAdminOrLeader = user?.role === 'Admin' || user?.role === 'Leader' || user?.role === 'admin' || user?.role === 'leader';

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const res = await apiClient.get('/announcements');
      setAnnouncements(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post('/announcements', formData);
      setShowForm(false);
      setFormData({ title: '', description: '', category: 'General', isPinned: false });
      fetchAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/announcements/${id}`);
      fetchAnnouncements();
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
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Circular Board</h1>
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
          <div className="flex gap-4">
            <div className="flex-1">
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
            <div className="flex items-center mt-6">
              <input 
                type="checkbox" 
                id="isPinned"
                checked={formData.isPinned}
                onChange={(e) => setFormData({...formData, isPinned: e.target.checked})}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
              />
              <label htmlFor="isPinned" className={`ml-2 block text-sm font-medium cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>Pin to top</label>
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 transition">Publish Announcement</button>
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border dark:border-indigo-800/40 px-2.5 py-1 rounded-full uppercase tracking-wider">{ann.category || 'General'}</span>
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

        {announcements.length === 0 && (
          <div className={`col-span-full text-center py-12 rounded-2xl border ${isDark ? 'bg-[#14161f] border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-500'}`}>
            No circulars published yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
