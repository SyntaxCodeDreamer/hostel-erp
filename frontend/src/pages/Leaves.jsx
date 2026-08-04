import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Calendar, Plus, MapPin } from 'lucide-react';

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const getAuthToken = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    return userInfo?.token || localStorage.getItem('token');
  };

  const fetchLeaves = async () => {
    try {
      const token = getAuthToken();
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      const { data } = await axios.get('/api/leaves', config);
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(b.createdAt || b.fromDate || 0) - new Date(a.createdAt || a.fromDate || 0));
      setLeaves(list);
    } catch (error) {
      console.error('Error fetching leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      const token = getAuthToken();
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };
      await axios.put(`/api/leaves/${id}/status`, { status }, config);
      fetchLeaves();
    } catch (error) {
      alert(error.response?.data?.message || 'Error updating status');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const calculateLeaveDays = (fromDateStr, toDateStr) => {
    if (!fromDateStr || !toDateStr) return 0;
    const from = new Date(fromDateStr);
    const to = new Date(toDateStr);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) return 0;
    const diffTime = Math.abs(to - from);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const getStudentName = (leave) => {
    const s = leave.studentId;
    if (!s) return 'Student Resident';
    return s.fullName || s.name || s.userId?.name || s.userId?.email || 'Student Resident';
  };

  const getRoom = (leave) => {
    const s = leave.studentId;
    return s?.roomNumber ? `Room ${s.roomNumber}` : '';
  };

  const getStatusBadge = (status) => {
    const s = (status || 'pending').toLowerCase();
    if (s === 'approved') {
      return <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50 px-2.5 py-1 rounded-full text-xs font-semibold">Approved</span>;
    } else if (s === 'rejected') {
      return <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800/50 px-2.5 py-1 rounded-full text-xs font-semibold">Rejected</span>;
    }
    return <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800/50 px-2.5 py-1 rounded-full text-xs font-semibold">Pending</span>;
  };

  const isAdminOrLeader = user?.role === 'Admin' || user?.role === 'Leader' || user?.role === 'admin' || user?.role === 'leader';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Leave Tracker</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Track and verify student resident out-of-hostel requests.</p>
        </div>
        {(user?.role === 'Student' || user?.role === 'student') && (
          <Link 
            to="/leaves/request" 
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} />
            Request Leave
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b font-bold text-sm flex items-center gap-2 ${isDark ? 'border-gray-800/60 text-white' : 'border-gray-100 text-gray-900'}`}>
            <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
            Leave History Logs
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className={isDark ? 'bg-[#1a1c26] divide-gray-800' : 'bg-gray-50 divide-gray-200 border-b border-gray-200'}>
                <tr>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Resident</th>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Destination</th>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Reason</th>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Absence Period</th>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                  {isAdminOrLeader && (
                    <th className={`px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-800/40' : 'divide-gray-100'}`}>
                {leaves.map((leave) => {
                  const sName = getStudentName(leave);
                  const room = getRoom(leave);
                  const statusLower = (leave.status || 'pending').toLowerCase();

                  return (
                    <tr key={leave._id} className={`transition ${isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{sName}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{room} {room ? '•' : ''} Emergency: {leave.emergencyContact || 'N/A'}</div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className="flex items-center gap-1">
                          <MapPin size={14} className="text-indigo-600 dark:text-indigo-400" />
                          <span>{leave.destination || 'N/A'}</span>
                        </div>
                      </td>
                      <td className={`px-6 py-4 max-w-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div>{leave.reason || 'No reason specified'}</div>
                        {leave.remarks && <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Remarks: {leave.remarks}</div>}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div>{formatDate(leave.fromDate)} — {formatDate(leave.toDate)}</div>
                        <div className="mt-1.5 inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                          {calculateLeaveDays(leave.fromDate, leave.toDate)} {calculateLeaveDays(leave.fromDate, leave.toDate) === 1 ? 'Day' : 'Days'} Leave
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(leave.status)}
                      </td>
                      {isAdminOrLeader && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {statusLower === 'pending' && (
                            <div className="flex justify-center space-x-2">
                              <button 
                                onClick={() => handleStatusUpdate(leave._id, 'Approved')} 
                                className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border dark:border-emerald-800/50 dark:hover:bg-emerald-900 px-3 py-1 rounded-lg text-xs font-semibold transition"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleStatusUpdate(leave._id, 'Rejected')} 
                                className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-950/80 dark:text-rose-400 dark:border dark:border-rose-800/50 dark:hover:bg-rose-900 px-3 py-1 rounded-lg text-xs font-semibold transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {leaves.length === 0 && (
                  <tr>
                    <td colSpan={isAdminOrLeader ? 6 : 5} className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
