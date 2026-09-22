import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../utils/apiClient';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { ShieldAlert, UserCheck, Plus, Trash2, Phone, Mail, KeyRound, Eye, GraduationCap, X, Search } from 'lucide-react';
import AdminResetPasswordModal from '../components/AdminResetPasswordModal';

const TrustLeader = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [leaders, setLeaders] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeTab, setActiveTab] = useState('trust'); // 'trust' or 'leader'
  
  const [showForm, setShowForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [memberData, setMemberData] = useState({ name: '', email: '', position: '', contactNumber: '', joiningDate: new Date().toISOString().split('T')[0], password: '' });
  const [leaderData, setLeaderData] = useState({ name: '', email: '', password: '', role: 'Leader', contactNumber: '', duration: '', studentId: '' });
  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [studentSearchFilter, setStudentSearchFilter] = useState('');
  const [resetModalUser, setResetModalUser] = useState(null);
  const [assigningStudentModal, setAssigningStudentModal] = useState(null);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignSearchFilter, setAssignSearchFilter] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const userRoleLower = (user?.role || '').toLowerCase();
  const isAdmin = userRoleLower === 'admin';

  useEffect(() => {
    fetchTrustMembers();
    fetchLeaders();
    fetchStudentsList();
  }, []);

  const fetchTrustMembers = async () => {
    try {
      const res = await apiClient.get('/trust/members');
      setMembers(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching trust members:', error);
    }
  };

  const fetchLeaders = async () => {
    try {
      const res = await apiClient.get('/trust/leaders');
      setLeaders(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching leaders:', error);
    }
  };

  const fetchStudentsList = async () => {
    try {
      const res = await apiClient.get('/students');
      const list = Array.isArray(res.data) ? res.data : (res.data?.students || []);
      setStudents(list);
    } catch (error) {
      console.error('Error fetching students list:', error);
    }
  };

  const [submittingMember, setSubmittingMember] = useState(false);
  const [submittingLeader, setSubmittingLeader] = useState(false);

  const handleMemberSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (submittingMember) return;
    try {
      setSubmittingMember(true);
      const payload = {
        ...memberData,
        joiningDate: memberData.joiningDate || new Date().toISOString().split('T')[0]
      };
      await apiClient.post('/trust/members', payload);
      setShowForm(false);
      setMemberData({ name: '', email: '', position: '', contactNumber: '', joiningDate: new Date().toISOString().split('T')[0], password: '' });
      fetchTrustMembers();
    } catch (error) {
      console.error('Error creating member:', error);
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to add trust member');
    } finally {
      setSubmittingMember(false);
    }
  };

  const handleSelectStudent = (studentId) => {
    if (!studentId) {
      setSelectedStudentProfile(null);
      setLeaderData(prev => ({
        ...prev,
        studentId: '',
        name: '',
        email: '',
        contactNumber: ''
      }));
      return;
    }
    const found = students.find(s => s._id === studentId);
    if (found) {
      setSelectedStudentProfile(found);
      setLeaderData(prev => ({
        ...prev,
        studentId: found._id,
        name: found.fullName || '',
        email: found.userId?.email || found.email || '',
        contactNumber: found.mobile || found.mobileNumber || '',
        role: prev.role || 'Leader'
      }));
    }
  };

  const handleLeaderSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (submittingLeader) return;
    try {
      setSubmittingLeader(true);
      await apiClient.post('/trust/leaders', leaderData);
      setShowForm(false);
      setLeaderData({ name: '', email: '', password: '', role: 'Leader', contactNumber: '', duration: '', studentId: '' });
      setSelectedStudentProfile(null);
      setStudentSearchFilter('');
      fetchLeaders();
      fetchStudentsList();
    } catch (error) {
      console.error('Error creating leader:', error);
      setErrorMsg(error.response?.data?.message || error.message || 'Failed to add leader account');
    } finally {
      setSubmittingLeader(false);
    }
  };

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Are you sure you want to remove this trust member?')) return;
    try {
      await apiClient.delete(`/trust/members/${id}`);
      fetchTrustMembers();
    } catch (error) {
      console.error('Error deleting member:', error);
    }
  };

  const handleDeleteLeader = async (id) => {
    if (!window.confirm('Are you sure you want to remove this leader privilege?')) return;
    try {
      await apiClient.delete(`/trust/leaders/${id}`);
      fetchLeaders();
      fetchStudentsList();
    } catch (error) {
      console.error('Error deleting leader:', error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const filteredStudentsForSelect = students.filter(s => {
    if (!studentSearchFilter.trim()) return true;
    const term = studentSearchFilter.toLowerCase();
    return (
      (s.fullName || '').toLowerCase().includes(term) ||
      (s.course || '').toLowerCase().includes(term) ||
      (s.roomNumber || '').toLowerCase().includes(term) ||
      (s.mobile || '').includes(term) ||
      (s.userId?.email || s.email || '').toLowerCase().includes(term)
    );
  });

  const handleOpenAssignModal = (leader) => {
    setAssigningStudentModal(leader);
    const currId = leader.studentId?._id || leader.studentId || leader.student?._id || '';
    setAssignStudentId(currId);
    setAssignSearchFilter('');
  };

  const handleSaveStudentAssignment = async (e) => {
    e?.preventDefault();
    if (!assigningStudentModal || !assignStudentId) return;
    try {
      setIsAssigning(true);
      await apiClient.put(`/trust/leaders/${assigningStudentModal._id}`, {
        studentId: assignStudentId
      });
      setAssigningStudentModal(null);
      setAssignStudentId('');
      await fetchLeaders();
      await fetchStudentsList();
    } catch (err) {
      console.error('Error assigning student profile:', err);
      alert(err.response?.data?.message || 'Failed to assign student profile');
    } finally {
      setIsAssigning(false);
    }
  };

  const filteredStudentsForAssign = students.filter(s => {
    if (!assignSearchFilter.trim()) return true;
    const term = assignSearchFilter.toLowerCase();
    return (
      (s.fullName || '').toLowerCase().includes(term) ||
      (s.course || '').toLowerCase().includes(term) ||
      (s.roomNumber || '').toLowerCase().includes(term) ||
      (s.mobile || '').includes(term) ||
      (s.userId?.email || s.email || '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Trust & Leaders</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{isAdmin ? 'Manage hostel trust members and appointed student leaders.' : 'Directory of hostel trust members and appointed student leaders.'}</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { 
              setShowForm(!showForm); 
              setErrorMsg(''); 
              setSelectedStudentProfile(null);
              setStudentSearchFilter('');
            }} 
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
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Initial Password <span className="text-[11px] font-normal opacity-70">(Optional - auto-generated if blank)</span>
                  </label>
                  <input 
                    type="password" 
                    value={memberData.password || ''} 
                    onChange={(e) => setMemberData({...memberData, password: e.target.value})} 
                    className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} 
                    placeholder="Auto default formula if left blank..." 
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={submittingMember} 
                className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {submittingMember ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Member...
                  </>
                ) : (
                  'Save Trust Member'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLeaderSubmit} className="space-y-5">
              
              {/* STUDENT SELECTION SECTION */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-indigo-50/40 border-indigo-100'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GraduationCap size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-indigo-300' : 'text-indigo-950'}`}>
                      Select Student Profile to Appoint as Leader
                    </span>
                  </div>
                  {selectedStudentProfile && (
                    <button
                      type="button"
                      onClick={() => handleSelectStudent('')}
                      className="text-xs text-rose-500 hover:text-rose-600 dark:text-rose-400 font-semibold self-start sm:self-auto"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Filter by name, room, course, mobile..."
                        value={studentSearchFilter}
                        onChange={(e) => setStudentSearchFilter(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          isDark ? 'bg-[#141620] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <select
                      value={leaderData.studentId || ''}
                      onChange={(e) => handleSelectStudent(e.target.value)}
                      className={`w-full py-2 px-3 text-xs rounded-lg border focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium ${
                        isDark ? 'bg-[#141620] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    >
                      <option value="">-- Choose Existing Student Profile --</option>
                      {filteredStudentsForSelect.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.fullName || 'Student'} (Room: {s.roomNumber || 'N/A'} • {s.course || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Student Card Preview */}
                {selectedStudentProfile && (
                  <div className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                    isDark ? 'bg-[#141620] border-indigo-900/50' : 'bg-white border-indigo-200 shadow-xs'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {(selectedStudentProfile.fullName || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedStudentProfile.fullName}</p>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            Selected Student
                          </span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Room {selectedStudentProfile.roomNumber || 'Unassigned'} • {selectedStudentProfile.course || 'N/A'} • {selectedStudentProfile.collegeName || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <p className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedStudentProfile.mobile || 'No mobile'}</p>
                      <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{selectedStudentProfile.userId?.email || selectedStudentProfile.email || 'No email'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Leader Name *</label>
                  <input type="text" required value={leaderData.name} onChange={(e) => setLeaderData({...leaderData, name: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Leader name..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Role / Designation *</label>
                  <input type="text" required value={leaderData.role} onChange={(e) => setLeaderData({...leaderData, role: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="e.g. Leader, Hostel Captain, Floor Leader..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Email (Login ID) *</label>
                  <input type="email" required value={leaderData.email} onChange={(e) => setLeaderData({...leaderData, email: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="leader@hostel.com..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Password {selectedStudentProfile ? <span className="text-[11px] font-normal opacity-70">(Leave empty to keep existing password)</span> : <span className="text-rose-500">*</span>}
                  </label>
                  <input 
                    type="password" 
                    required={!selectedStudentProfile} 
                    value={leaderData.password} 
                    onChange={(e) => setLeaderData({...leaderData, password: e.target.value})} 
                    className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} 
                    placeholder={selectedStudentProfile ? "Keep current student password..." : "Set login password..."} 
                  />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Contact Number *</label>
                  <input type="text" required value={leaderData.contactNumber} onChange={(e) => setLeaderData({...leaderData, contactNumber: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="Phone..." />
                </div>
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Tenure / Duration <span className="text-xs font-normal opacity-70">(Optional)</span></label>
                  <input type="text" value={leaderData.duration || ''} onChange={(e) => setLeaderData({...leaderData, duration: e.target.value})} className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`} placeholder="e.g. 2026-2027" />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submittingLeader} 
                className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
              >
                {submittingLeader ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving Leader...
                  </>
                ) : (
                  selectedStudentProfile ? 'Appoint Selected Student as Leader' : 'Save Leader Account'
                )}
              </button>
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
                {activeTab === 'trust' && (
                  <th className={`p-4 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Joining Date</th>
                )}
                <th className={`p-4 font-semibold text-xs uppercase tracking-wider text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Action</th>
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
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => setResetModalUser({
                              id: member.userId?._id || member.userId || member.email || member._id,
                              name: member.name || member.fullName || 'Trust Member',
                              email: member.email || member.userId?.email || '',
                              role: member.position || 'Trustee'
                            })} 
                            className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition p-1.5 rounded-lg hover:bg-amber-500/10" 
                            title="Reset Password"
                          >
                            <KeyRound size={16} />
                          </button>
                          <button onClick={() => handleDeleteMember(member._id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition p-1.5 rounded-lg hover:bg-red-500/10" title="Remove">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                leaders.map((leader) => {
                  const s = leader.student;
                  return (
                    <tr key={leader._id} className={`transition ${isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                      <td className="p-4">
                        <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{leader.userId?.name || leader.name || 'Leader'}</div>
                        <div className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                          <Mail size={12} />
                          {leader.userId?.email || leader.email || 'leader@hostel.com'}
                        </div>
                        {s && s.roomNumber && s.roomNumber !== 'Unassigned' ? (
                          <div className={`text-[11px] mt-1 flex items-center gap-1.5 font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <GraduationCap size={13} className="text-indigo-500 shrink-0" />
                            <span>Room {s.roomNumber} • {s.course || 'Resident'}</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(leader)}
                                className="text-[10px] text-indigo-400 hover:underline font-bold ml-1"
                                title="Change assigned student profile"
                              >
                                (Change)
                              </button>
                            )}
                          </div>
                        ) : (
                          isAdmin ? (
                            <div className="mt-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenAssignModal(leader)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 hover:text-amber-400 border border-amber-500/30 transition shadow-xs"
                                title="Assign an existing student resident profile to this leader"
                              >
                                <GraduationCap size={13} />
                                Assign Student Profile
                              </button>
                            </div>
                          ) : (
                            <div className={`text-[11px] mt-1 flex items-center gap-1.5 font-medium ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              <GraduationCap size={13} />
                              <span>Room Unassigned</span>
                            </div>
                          )
                        )}
                      </td>
                      <td className="p-4 text-sm">
                        <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-800/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                          {leader.role || 'Leader'}
                        </span>
                      </td>
                      <td className={`p-4 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{leader.contactNumber || 'N/A'}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => {
                              const sId = s?._id || leader.studentId?._id || leader.studentId;
                              if (sId) {
                                navigate(`/students?studentId=${sId}`);
                              } else {
                                navigate(`/students?search=${encodeURIComponent(leader.userId?.name || leader.name || '')}`);
                              }
                            }}
                            className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition p-1.5 rounded-lg hover:bg-indigo-500/10"
                            title="View Profile in Students Page"
                          >
                            <Eye size={16} />
                          </button>
                          {isAdmin && (
                            <>
                              <button 
                                onClick={() => handleOpenAssignModal(leader)}
                                className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition p-1.5 rounded-lg hover:bg-amber-500/10" 
                                title="Assign / Change Student Profile"
                              >
                                <GraduationCap size={16} />
                              </button>
                              <button 
                                onClick={() => setResetModalUser({
                                  id: leader.userId?._id || leader.userId,
                                  name: leader.userId?.name || leader.name || 'Leader',
                                  email: leader.userId?.email || leader.email || '',
                                  role: leader.role || 'Leader'
                                })} 
                                className="text-amber-500 hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300 transition p-1.5 rounded-lg hover:bg-amber-500/10" 
                                title="Reset Password"
                              >
                                <KeyRound size={16} />
                              </button>
                              <button onClick={() => handleDeleteLeader(leader._id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition p-1.5 rounded-lg hover:bg-red-500/10" title="Revoke Leader Privilege">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              
              {((activeTab === 'trust' && members.length === 0) || (activeTab === 'leader' && leaders.length === 0)) && (
                <tr>
                  <td colSpan={5} className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    No {activeTab === 'trust' ? 'Trust Members' : 'Leaders'} registered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* ASSIGN / LINK STUDENT PROFILE MODAL */}
      {assigningStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border overflow-hidden transition-all ${
            isDark ? 'bg-[#181a26] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'bg-[#141620] border-gray-800' : 'bg-indigo-50/70 border-indigo-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-500">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Assign Student Profile
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Link resident to Leader: <span className="font-bold text-indigo-400">{assigningStudentModal.name || assigningStudentModal.email}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAssigningStudentModal(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveStudentAssignment} className="p-6 space-y-4">
              <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                Select an existing student living in the hostel to associate their room, course, contact, and records with this leader account:
              </p>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Search Students
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, room number, course..."
                    value={assignSearchFilter}
                    onChange={(e) => setAssignSearchFilter(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-[#141620] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  Choose Student Profile <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  className={`w-full p-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium ${
                    isDark ? 'bg-[#141620] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">-- Choose Student to Link --</option>
                  {filteredStudentsForAssign.map((s) => (
                    <option key={s._id} value={s._id}>
                      {s.fullName || 'Student'} (Room {s.roomNumber || 'N/A'} • {s.course || 'N/A'}) - {s.mobile || ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Student Preview Card */}
              {(() => {
                const sel = students.find(item => item._id === assignStudentId);
                if (!sel) return null;
                return (
                  <div className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    isDark ? 'bg-[#141620] border-indigo-900/50' : 'bg-indigo-50/60 border-indigo-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                        {(sel.fullName || 'S').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{sel.fullName}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          Room {sel.roomNumber || 'Unassigned'} • {sel.course || 'N/A'} • {sel.collegeName || 'N/A'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      Will Link
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setAssigningStudentModal(null)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                    isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!assignStudentId || isAssigning}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  {isAssigning ? 'Linking Profile...' : 'Save & Link Student Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      <AdminResetPasswordModal
        isOpen={!!resetModalUser}
        onClose={() => setResetModalUser(null)}
        targetUser={resetModalUser}
      />
    </div>
  );
};

export default TrustLeader;
