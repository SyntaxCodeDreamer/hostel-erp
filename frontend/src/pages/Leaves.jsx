import React, { useEffect, useState, useContext, useMemo } from 'react';
import apiClient from '../utils/apiClient';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Calendar, Plus, MapPin, Search, Clock, Lock, Edit3 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const Leaves = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [myStudentId, setMyStudentId] = useState('');

  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const fetchLeaves = async () => {
    try {
      const { data } = await apiClient.get('/leaves');
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
    const fetchMyProfile = async () => {
      try {
        const { data } = await apiClient.get('/students/me');
        if (data?._id) setMyStudentId(data._id);
      } catch (err) {
        // Non-student without profile
      }
    };
    fetchMyProfile();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    try {
      await apiClient.put(`/leaves/${id}/status`, { status });
      fetchLeaves();
    } catch (error) {
      alert(error.message || 'Error updating status');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      const status = (leave.status || '').toLowerCase();
      const matchStatus = statusFilter === 'All' || status === statusFilter.toLowerCase();
      if (!matchStatus) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const sName = getStudentName(leave).toLowerCase();
      const reason = (leave.reason || '').toLowerCase();
      const dest = (leave.destination || '').toLowerCase();
      return sName.includes(q) || reason.includes(q) || dest.includes(q);
    });
  }, [leaves, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredLeaves.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLeaves = filteredLeaves.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Leaves</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Track and verify student resident out-of-hostel requests.</p>
        </div>
        {(['student', 'leader'].includes((user?.role || '').toLowerCase())) && (
          <Link 
            to="/leaves/request" 
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus size={16} />
            Request Leave
          </Link>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex justify-end items-center gap-2">
        <label className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status Filter:</label>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            isDark ? 'bg-[#14161f] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <option value="All">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading Leave Requests..." />
      ) : (
        <div className={`rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b font-bold text-sm flex items-center justify-between ${isDark ? 'border-gray-800/60 text-white' : 'border-gray-100 text-gray-900'}`}>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Leave History Logs</span>
            </div>
            <span className="text-xs font-medium opacity-60">
              Showing {filteredLeaves.length} record{filteredLeaves.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y text-sm">
              <thead className={isDark ? 'bg-[#1a1c26] divide-gray-800' : 'bg-gray-50 divide-gray-200 border-b border-gray-200'}>
                <tr>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Resident</th>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Applied On</th>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Destination</th>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Reason</th>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Absence Period</th>
                  <th className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                  <th className={`px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-800/40' : 'divide-gray-100'}`}>
                {paginatedLeaves.map((leave) => {
                  const sName = getStudentName(leave);
                  const room = getRoom(leave);
                  const statusLower = (leave.status || 'pending').toLowerCase();
                  const reviewerName = leave.reviewerName || leave.reviewedBy?.name || 'Admin';
                  const reviewerRole = leave.reviewerRole || leave.reviewedBy?.role || '';

                  return (
                    <tr key={leave._id} className={`transition ${isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{sName}</div>
                        <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{room} {room ? '•' : ''} Emergency: {leave.emergencyContact || 'N/A'}</div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <div className={`font-semibold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          <Clock size={13} className="text-indigo-500 shrink-0" />
                          <span>{formatDate(leave.appliedDate || leave.createdAt)}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 pl-4 mt-0.5 font-medium">
                          {formatTime(leave.appliedDate || leave.createdAt)}
                        </div>
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
                        <div>
                          <div><span className="font-semibold text-indigo-500">Out:</span> {formatDate(leave.fromDate)} {leave.fromTime ? `@ ${leave.fromTime}` : ''}</div>
                          <div><span className="font-semibold text-emerald-500">In:</span> {formatDate(leave.toDate)} {leave.toTime ? `@ ${leave.toTime}` : ''}</div>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                            {leave.requestedDays !== undefined && leave.requestedDays !== null && leave.requestedDays !== '' 
                              ? `${leave.requestedDays} ${Number(leave.requestedDays) === 1 ? 'Day' : 'Days'}`
                              : `${calculateLeaveDays(leave.fromDate, leave.toDate)} Days`} Requested
                          </span>
                          {leave.previousLeaveDays !== undefined && leave.previousLeaveDays !== null && leave.previousLeaveDays !== '' && (
                            <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                              {leave.previousLeaveDays} {Number(leave.previousLeaveDays) === 1 ? 'Day' : 'Days'} Prev. Taken
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div>{getStatusBadge(leave.status)}</div>
                        {(leave.reviewerName || leave.reviewedBy) && (statusLower === 'approved' || statusLower === 'rejected') && (
                          <div className="mt-1.5 flex flex-col gap-0.5">
                            <div className={`font-semibold flex items-center gap-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                              <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">By:</span>
                              <span>{reviewerName}</span>
                            </div>
                            {(leave.reviewedAt || leave.updatedAt) && (
                              <div className="text-[10px] text-gray-400 dark:text-gray-500">
                                {formatDate(leave.reviewedAt || leave.updatedAt)} {formatTime(leave.reviewedAt || leave.updatedAt)}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {(() => {
                          const isOwnLeave = (
                            (myStudentId && (leave.studentId?._id === myStudentId || leave.studentId === myStudentId)) ||
                            (user?._id && (leave.studentId?.userId?._id === user._id || leave.studentId?.userId === user._id))
                          );

                          // If the leave has already been decided (Approved or Rejected)
                          if (statusLower === 'approved' || statusLower === 'rejected') {
                            return (
                              <div className="flex flex-col items-center justify-center text-xs">
                                <span className={`font-semibold ${
                                  statusLower === 'approved'
                                    ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                                    : isDark ? 'text-rose-400' : 'text-rose-600'
                                }`}>
                                  {statusLower === 'approved'
                                    ? `Approved by ${reviewerName}`
                                    : `Rejected by ${reviewerName}`}
                                </span>
                              </div>
                            );
                          }

                          // If still pending and it's the student's own request
                          if (isOwnLeave) {
                            return (
                              <Link 
                                to={`/leaves/edit/${leave._id}`}
                                className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs"
                              >
                                <Edit3 size={13} />
                                <span>Edit</span>
                              </Link>
                            );
                          }

                          // If still pending and user is Admin or Leader
                          if (isAdminOrLeader) {
                            return (
                              <div className="flex justify-center space-x-2">
                                <button 
                                  onClick={() => handleStatusUpdate(leave._id, 'Approved')} 
                                  className="bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400 dark:border dark:border-emerald-800/50 dark:hover:bg-emerald-900 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs"
                                >
                                  Approve
                                </button>
                                <button 
                                  onClick={() => handleStatusUpdate(leave._id, 'Rejected')} 
                                  className="bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-950/80 dark:text-rose-400 dark:border dark:border-rose-800/50 dark:hover:bg-rose-900 px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-xs"
                                >
                                  Reject
                                </button>
                              </div>
                            );
                          }

                          return (
                            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium italic">
                              Pending Review
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  );
                })}
                {filteredLeaves.length === 0 && (
                  <tr>
                    <td colSpan={7} className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      No leave requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls Footer */}
          {filteredLeaves.length > 0 && (
            <div className={`px-4 py-3 sm:px-6 sm:py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
              isDark ? 'border-gray-800 text-gray-400 bg-[#14161f]' : 'border-gray-200 text-gray-600 bg-gray-50'
            }`}>
              <div className="text-center sm:text-left">
                Showing <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{startIndex + 1}</span> to{' '}
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{Math.min(startIndex + itemsPerPage, filteredLeaves.length)}</span> of{' '}
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{filteredLeaves.length}</span> leave requests
              </div>

              <div className="flex items-center justify-center gap-1.5 w-full sm:w-auto max-w-full overflow-x-auto py-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg border font-medium transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDark ? 'border-gray-700 bg-[#1a1c26] text-white hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  Previous
                </button>

                <div className="flex items-center gap-1 overflow-x-auto max-w-[170px] xs:max-w-[240px] sm:max-w-none shrink py-0.5 scrollbar-none">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 ${
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : isDark
                          ? 'border border-gray-700 bg-[#1a1c26] text-gray-300 hover:bg-gray-800'
                          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg border font-medium transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDark ? 'border-gray-700 bg-[#1a1c26] text-white hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Leaves;
