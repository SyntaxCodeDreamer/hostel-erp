import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { ShieldAlert, UserCheck, Plus, Trash2, Phone, Mail } from 'lucide-react';

const TrustLeader = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [members, setMembers] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [activeTab, setActiveTab] = useState('trust'); // 'trust' or 'leader'
  
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [memberData, setMemberData] = useState({ name: '', email: '', position: '', contactNumber: '', joiningDate: new Date().toISOString().split('T')[0] });
  const [leaderData, setLeaderData] = useState({ name: '', email: '', password: '', role: 'Leader', contactNumber: '', duration: '' });

  const userRoleLower = (user?.role || '').toLowerCase();
  const isAdmin = userRoleLower === 'admin';

  const getAuthToken = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    return userInfo?.token || localStorage.getItem('token');
  };

  useEffect(() => {
    fetchTrustMembers();
    fetchLeaders();
  }, []);

  const fetchTrustMembers = async () => {
    try {
      const token = getAuthToken();
      const res = await axios.get('/api/trust/members', { headers: { Authorization: `Bearer ${token}` } });
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching trust members:', error);
    }
  };

  const fetchLeaders = async () => {
    try {
      const token = getAuthToken();
      const res = await axios.get('/api/trust/leaders', { headers: { Authorization: `Bearer ${token}` } });
      setLeaders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching leaders:', error);
    }
  };

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const token = getAuthToken();
      const payload = {
        ...memberData,
        joiningDate: memberData.joiningDate || new Date().toISOString().split('T')[0]
      };
      await axios.post('/api/trust/members', payload, { headers: { Authorization: `Bearer ${token}` } });
      setShowForm(false);
      setMemberData({ name: '', email: '', position: '', contactNumber: '', joiningDate: new Date().toISOString().split('T')[0] });
      fetchTrustMembers();
    } catch (error) {
      console.error('Error creating member:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to add trust member');
    }
  };

  const handleLeaderSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const token = getAuthToken();
      await axios.post('/api/trust/leaders', leaderData, { headers: { Authorization: `Bearer ${token}` } });
      setShowForm(false);
      setLeaderData({ name: '', email: '', password: '', role: 'Leader', contactNumber: '', duration: '' });
      fetchLeaders();
    } catch (error) {
      console.error('Error creating leader:', error);
      setErrorMsg(error.response?.data?.message || 'Failed to add leader account');
    }
  };

  const handleDeleteMember = async (id) => {
    try {
      const token = getAuthToken();
      await axios.delete(`/api/trust/members/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchTrustMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const handleDeleteLeader = async (id) => {
    try {
      const token = getAuthToken();
      await axios.delete(`/api/trust/leaders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchLeaders();
    } catch (error) {
      console.error('Error deleting leader:', error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Trust & Leadership Directory</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage hostel trust members and appointed student leaders.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setShowForm(!showForm); setErrorMsg(''); }} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-indigo-700 transition flex items-center gap-1.5"
          >
            <Plus size={16} />
            {showForm ? 'Cancel' : `Add ${activeTab === 'trust' ? 'Trust Member' : 'Leader'}`}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex gap-4 border-b ${isDark ? 'border-gray-800/80' : 'border-gray-200'}`}>
        <button 
          onClick={() => { setActiveTab('trust'); setShowForm(false); setErrorMsg(''); }}
          className={`py-2.5 px-4 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
            activeTab === 'trust' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
              : isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ShieldAlert size={16} />
          Trust Members ({members.length})
        </button>
        <button 
          onClick={() => { setActiveTab('leader'); setShowForm(false); setErrorMsg(''); }}
          className={`py-2.5 px-4 border-b-2 font-semibold text-sm transition flex items-center gap-2 ${
            activeTab === 'leader' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' 
              : isDark ? 'border-transparent text-gray-400 hover:text-gray-200' : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <UserCheck size={16} />
          Appointed Leaders ({leaders.length})
        </button>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800/60 p-3 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Add Form */}
      {showForm && isAdmin && (
        <div className={`p-6 rounded-2xl border shadow-sm ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          {activeTab === 'trust' ? (
            <form onSubmit={handleMemberSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Member Name</label>
                  <input type="text" required value={memberData.name} onChange={(e) => setMemberData({...memberData, name: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Full Name..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email Address (Login ID) *</label>
                  <input type="email" required value={memberData.email} onChange={(e) => setMemberData({...memberData, email: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="trustee@example.com..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Position / Designation</label>
                  <input type="text" required value={memberData.position} onChange={(e) => setMemberData({...memberData, position: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="e.g. Trustee, Chairperson..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact Number</label>
                  <input type="text" required value={memberData.contactNumber} onChange={(e) => setMemberData({...memberData, contactNumber: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Mobile phone..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Joining Date</label>
                  <input type="date" value={memberData.joiningDate} onChange={(e) => setMemberData({...memberData, joiningDate: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 transition">Save Trust Member</button>
            </form>
          ) : (
            <form onSubmit={handleLeaderSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Leader Name</label>
                  <input type="text" required value={leaderData.name} onChange={(e) => setLeaderData({...leaderData, name: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Leader name..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Role / Designation</label>
                  <input type="text" required value={leaderData.role} onChange={(e) => setLeaderData({...leaderData, role: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Hostel Leader / Captain..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email (Login ID)</label>
                  <input type="email" required value={leaderData.email} onChange={(e) => setLeaderData({...leaderData, email: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="leader@hostel.com..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Password</label>
                  <input type="password" required value={leaderData.password} onChange={(e) => setLeaderData({...leaderData, password: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Set password..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact Number</label>
                  <input type="text" required value={leaderData.contactNumber} onChange={(e) => setLeaderData({...leaderData, contactNumber: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Phone..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Duration (Term)</label>
                  <input type="text" required value={leaderData.duration} onChange={(e) => setLeaderData({...leaderData, duration: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="e.g. 2025 - 2026" />
                </div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 transition">Save Leader Account</button>
            </form>
          )}
        </div>
      )}

      {/* Directory Table */}
      <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className={isDark ? 'bg-[#1a1c26]' : 'bg-gray-50 border-b border-gray-200'}>
              <tr>
                <th className={`p-4 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Name</th>
                <th className={`p-4 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{activeTab === 'trust' ? 'Position' : 'Role'}</th>
                <th className={`p-4 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact Number</th>
                <th className={`p-4 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{activeTab === 'trust' ? 'Joining Date' : 'Duration'}</th>
                {isAdmin && <th className={`p-4 font-semibold text-xs uppercase tracking-wider text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Action</th>}
              </tr>
            </thead>
            <tbody className={`divide-y ${isDark ? 'divide-gray-800/40' : 'divide-gray-100'}`}>
              {activeTab === 'trust' ? (
                members.map((member) => (
                  <tr key={member._id} className={`transition ${isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                    <td className="p-4">
                      <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{member.name || member.fullName || 'Trustee Member'}</div>
                      {member.email && (
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                          <Mail size={12} />
                          {member.email}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-sm">
                      <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border dark:border-indigo-800/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {member.position || 'Trustee'}
                      </span>
                    </td>
                    <td className={`p-4 text-sm flex items-center gap-1.5 mt-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      <Phone size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                      {member.contactNumber || 'N/A'}
                    </td>
                    <td className={`p-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatDate(member.joiningDate || member.createdAt)}</td>
                    {isAdmin && (
                      <td className="p-4 text-center">
                        <button onClick={() => handleDeleteMember(member._id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition p-1" title="Remove">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                leaders.map((leader) => (
                  <tr key={leader._id} className={`transition ${isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                    <td className="p-4">
                      <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{leader.userId?.name || leader.name || 'Leader'}</div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                        <Mail size={12} />
                        {leader.userId?.email || leader.email || 'leader@hostel.com'}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-800/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {leader.role || 'Leader Captain'}
                      </span>
                    </td>
                    <td className={`p-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{leader.contactNumber || 'N/A'}</td>
                    <td className={`p-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{leader.duration || '2025-2026'}</td>
                    {isAdmin && (
                      <td className="p-4 text-center">
                        <button onClick={() => handleDeleteLeader(leader._id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition p-1" title="Remove">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
              
              {((activeTab === 'trust' && members.length === 0) || (activeTab === 'leader' && leaders.length === 0)) && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No {activeTab === 'trust' ? 'Trust Members' : 'Leaders'} registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default TrustLeader;
