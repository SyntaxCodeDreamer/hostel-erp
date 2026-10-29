import React, { useEffect, useState, useContext, useMemo } from 'react';
import apiClient from '../utils/apiClient';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { 
  Clock, Plus, Search, Check, X, Phone, User, Calendar, 
  AlertCircle, CheckCircle2, XCircle, Trash2, ShieldCheck, 
  MessageSquare, FileText, Sparkles, Filter, ChevronRight
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { capitalizeName } from '../utils/formatters';

const Permissions = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Student Profile
  const [myStudent, setMyStudent] = useState(null);
  const [studentsList, setStudentsList] = useState([]);

  // Modal State for Requesting Permission
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Review Modal State (for Admin/Leader)
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    permission: null,
    status: '',
    remarks: '',
    loading: false
  });

  // Form State
  const todayStr = new Date().toISOString().split('T')[0];
  const [formData, setFormData] = useState({
    studentId: '',
    tillDate: todayStr,
    tillTime: '',
    reason: '',
    otherPersonPhone: ''
  });

  const isStudent = (user?.role || '').toLowerCase() === 'student';
  const isLeader = (user?.role || '').toLowerCase() === 'leader';
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  const isAdminOrLeader = isAdmin || isLeader;

  // Quick Time Shortcuts
  const quickTimes = [
    { label: '8:30 PM', value: '20:30' },
    { label: '9:00 PM', value: '21:00' },
    { label: '9:30 PM', value: '21:30' },
    { label: '10:00 PM', value: '22:00' },
    { label: '10:30 PM', value: '22:30' },
    { label: '11:00 PM', value: '23:00' },
  ];

  const fetchPermissions = async () => {
    try {
      const { data } = await apiClient.get('/permissions');
      const list = Array.isArray(data) ? data : [];
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setPermissions(list);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyProfile = async () => {
    try {
      const { data } = await apiClient.get('/students/me');
      if (data?._id) {
        setMyStudent(data);
      }
    } catch (err) {
      // Non-student without profile
    }
  };

  const fetchAllStudents = async () => {
    try {
      const res = await apiClient.get('/students');
      const list = Array.isArray(res.data) ? res.data : (res.data?.students || []);
      setStudentsList(list);
    } catch (err) {
      console.error('Error fetching students list:', err);
    }
  };

  useEffect(() => {
    fetchPermissions();
    if (['student', 'leader'].includes((user?.role || '').toLowerCase())) {
      fetchMyProfile();
    }
    if ((user?.role || '').toLowerCase() === 'admin') {
      fetchAllStudents();
    }
  }, [user]);

  const handleOpenModal = () => {
    setFormData({
      studentId: isAdmin ? (studentsList.length > 0 ? studentsList[0]._id : '') : '',
      tillDate: new Date().toISOString().split('T')[0],
      tillTime: '',
      reason: '',
      otherPersonPhone: ''
    });
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setFormError('');
  };

  const handleSubmitPermission = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (isAdmin && !formData.studentId) {
      setFormError('Please select a student resident.');
      return;
    }
    if (!formData.tillTime.trim()) {
      setFormError('Please specify till which time you need permission.');
      return;
    }
    if (!formData.reason.trim()) {
      setFormError('Please enter a reason for your permission request.');
      return;
    }
    if (!formData.otherPersonPhone.trim()) {
      setFormError('Please provide other person phone number.');
      return;
    }

    const cleanPhone = formData.otherPersonPhone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit phone number for the other person.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/permissions', {
        studentId: isAdmin ? formData.studentId : undefined,
        tillDate: formData.tillDate || todayStr,
        tillTime: formData.tillTime.trim(),
        reason: formData.reason.trim(),
        otherPersonPhone: formData.otherPersonPhone.trim()
      });

      setFormSuccess('Permission request submitted successfully!');
      setTimeout(() => {
        setIsModalOpen(false);
        setSubmitting(false);
        fetchPermissions();
      }, 700);
    } catch (err) {
      setSubmitting(false);
      setFormError(err.response?.data?.message || err.message || 'Failed to submit permission request. Please try again.');
    }
  };

  const handleOpenReview = (permission, status) => {
    setReviewModal({
      isOpen: true,
      permission,
      status,
      remarks: '',
      loading: false
    });
  };

  const handleCloseReview = () => {
    if (reviewModal.loading) return;
    setReviewModal({ isOpen: false, permission: null, status: '', remarks: '', loading: false });
  };

  const handleConfirmReview = async () => {
    if (!reviewModal.permission) return;
    setReviewModal(prev => ({ ...prev, loading: true }));
    try {
      await apiClient.put(`/permissions/${reviewModal.permission._id}/status`, {
        status: reviewModal.status,
        remarks: reviewModal.remarks
      });
      handleCloseReview();
      fetchPermissions();
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating permission status');
      setReviewModal(prev => ({ ...prev, loading: false }));
    }
  };

  const handleDeletePermission = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this permission request?')) return;
    try {
      await apiClient.delete(`/permissions/${id}`);
      fetchPermissions();
    } catch (err) {
      alert(err.response?.data?.message || 'Error canceling permission');
    }
  };

  const formatDisplayTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    const raw = timeStr.trim();
    if (raw.toLowerCase().includes('am') || raw.toLowerCase().includes('pm')) {
      return raw;
    }
    const parts = raw.split(':');
    if (parts.length >= 2) {
      let h = parseInt(parts[0], 10);
      const m = parts[1];
      if (isNaN(h)) return raw;
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    }
    return raw;
  };

  const formatDateDisplay = (dateVal) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Filtered list
  const filteredPermissions = useMemo(() => {
    return permissions.filter((p) => {
      const status = (p.status || 'pending').toLowerCase();
      const matchStatus = statusFilter === 'All' || status === statusFilter.toLowerCase();
      if (!matchStatus) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const sName = (p.studentName || p.studentId?.fullName || '').toLowerCase();
      const room = (p.roomNumber || p.studentId?.roomNumber || '').toLowerCase();
      const reason = (p.reason || '').toLowerCase();
      const phone = (p.otherPersonPhone || '').toLowerCase();
      const tillTime = (p.tillTime || '').toLowerCase();

      return sName.includes(q) || room.includes(q) || reason.includes(q) || phone.includes(q) || tillTime.includes(q);
    });
  }, [permissions, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredPermissions.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPermissions = filteredPermissions.slice(startIndex, startIndex + itemsPerPage);

  // Statistics
  const stats = useMemo(() => {
    const total = permissions.length;
    const pending = permissions.filter(p => (p.status || '').toLowerCase() === 'pending').length;
    const approved = permissions.filter(p => (p.status || '').toLowerCase() === 'approved').length;
    const rejected = permissions.filter(p => (p.status || '').toLowerCase() === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [permissions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-500">
              <Clock size={24} />
            </div>
            <div>
              <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Permissions
              </h1>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Ask for out-of-hostel time permission and track approvals.
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Students and Leaders can submit permissions */}
        {(isStudent || isAdminOrLeader) && (
          <button
            onClick={handleOpenModal}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm shrink-0"
          >
            <Plus size={18} />
            <span>Ask for Permission</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total Requests</span>
            <FileText size={16} className="text-indigo-400" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.total}</div>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>Pending</span>
            <Clock size={16} className="text-amber-400" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>{stats.pending}</div>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Approved</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{stats.approved}</div>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>Rejected</span>
            <XCircle size={16} className="text-rose-400" />
          </div>
          <div className={`text-2xl font-bold mt-2 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{stats.rejected}</div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
        isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="relative w-full sm:w-80">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Search student, room, reason, phone..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className={`w-full pl-9 pr-3 py-2 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark ? 'bg-[#1a1c26] border-gray-700 text-white placeholder-gray-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
            }`}
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Filter size={15} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
          <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Filter:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={`border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
            }`}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Main Content Table / List */}
      {loading ? (
        <div className="p-12 flex justify-center items-center">
          <LoadingSpinner label="Loading permissions..." />
        </div>
      ) : (
        <div className={`border rounded-xl overflow-hidden shadow-xs ${
          isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className={isDark ? 'bg-[#1a1c26]' : 'bg-gray-50'}>
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Student Resident
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Till Which Time
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Reason
                  </th>
                  <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Other Person Phone
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                  <th className="px-5 py-3.5 text-center text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Actions / Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800 text-sm">
                {paginatedPermissions.map((item) => {
                  const sName = capitalizeName(item.studentName || item.studentId?.fullName || 'Student Resident');
                  const room = item.roomNumber || item.studentId?.roomNumber || 'N/A';
                  const status = (item.status || 'Pending').toLowerCase();
                  const isOwn = (
                    (myStudent?._id && (item.studentId?._id === myStudent._id || item.studentId === myStudent._id)) ||
                    (user?._id && (item.studentId?.userId?._id === user._id || item.studentId?.userId === user._id))
                  );

                  return (
                    <tr key={item._id} className={`transition-colors ${
                      isDark ? 'hover:bg-[#1a1c29]' : 'hover:bg-gray-50'
                    }`}>
                      {/* Student Info */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                            isDark ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800/40' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                          }`}>
                            {sName.charAt(0)}
                          </div>
                          <div>
                            <div className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                              {sName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                                isDark ? 'bg-gray-800 text-gray-300' : 'bg-gray-100 text-gray-600'
                              }`}>
                                Room {room}
                              </span>
                              <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {formatDateDisplay(item.appliedDate || item.createdAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Till Which Time */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-indigo-500/10 border-indigo-500/30 text-indigo-400 font-bold">
                          <Clock size={16} className="text-indigo-400" />
                          <span>Till {formatDisplayTime(item.tillTime)}</span>
                        </div>
                        {item.tillDate && (
                          <div className={`text-xs mt-1 ml-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Date: {formatDateDisplay(item.tillDate)}
                          </div>
                        )}
                      </td>

                      {/* Reason */}
                      <td className="px-5 py-4">
                        <p className={`text-xs sm:text-sm font-medium line-clamp-2 max-w-xs ${
                          isDark ? 'text-gray-200' : 'text-gray-800'
                        }`}>
                          {item.reason}
                        </p>
                      </td>

                      {/* Other Person Phone */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <a 
                          href={`tel:${item.otherPersonPhone}`}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                            isDark 
                              ? 'bg-[#1a1c26] border-gray-700 text-emerald-400 hover:border-emerald-600' 
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title="Call other person"
                        >
                          <Phone size={13} className="shrink-0" />
                          <span>{item.otherPersonPhone}</span>
                        </a>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        {status === 'approved' && (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50 px-2.5 py-1 rounded-full text-xs font-semibold">
                            <Check size={12} /> Approved
                          </span>
                        )}
                        {status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800/50 px-2.5 py-1 rounded-full text-xs font-semibold">
                            <X size={12} /> Rejected
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800/50 px-2.5 py-1 rounded-full text-xs font-semibold">
                            <Clock size={12} /> Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 whitespace-nowrap text-center">
                        {status === 'approved' || status === 'rejected' ? (
                          <div className="flex flex-col items-center justify-center text-xs">
                            <span className={`font-semibold ${
                              status === 'approved'
                                ? isDark ? 'text-emerald-400' : 'text-emerald-600'
                                : isDark ? 'text-rose-400' : 'text-rose-600'
                            }`}>
                              {status === 'approved'
                                ? `Approved by ${item.reviewerName || 'Staff'}`
                                : `Rejected by ${item.reviewerName || 'Staff'}`}
                            </span>
                            {item.remarks && (
                              <span className={`italic text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                "{item.remarks}"
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            {/* Admin / Leader Review Buttons */}
                            {isAdminOrLeader && (
                              <>
                                <button
                                  onClick={() => handleOpenReview(item, 'Approved')}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-950/90 dark:text-emerald-300 dark:border dark:border-emerald-700 transition shadow-xs flex items-center gap-1"
                                >
                                  <Check size={13} />
                                  <span>Approve</span>
                                </button>
                                <button
                                  onClick={() => handleOpenReview(item, 'Rejected')}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white dark:bg-rose-950/90 dark:text-rose-300 dark:border dark:border-rose-700 transition shadow-xs flex items-center gap-1"
                                >
                                  <X size={13} />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {/* Student's Own Pending Request: Cancel option */}
                            {isOwn && (
                              <button
                                onClick={() => handleDeletePermission(item._id)}
                                className={`p-1.5 rounded-lg border transition ${
                                  isDark ? 'border-gray-700 text-rose-400 hover:bg-rose-950/40' : 'border-gray-300 text-rose-600 hover:bg-rose-50'
                                }`}
                                title="Cancel permission request"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}

                            {!isAdminOrLeader && !isOwn && (
                              <span className="text-xs text-gray-400 italic">Pending review</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredPermissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`px-6 py-12 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <div className="flex flex-col items-center justify-center">
                        <div className="p-3 rounded-full bg-gray-500/10 mb-3">
                          <Clock size={28} className="text-gray-400" />
                        </div>
                        <p className="font-semibold text-base mb-1">No permission requests found</p>
                        <p className="text-xs max-w-sm mb-4">
                          {searchQuery || statusFilter !== 'All'
                            ? 'Try adjusting your search query or status filter.'
                            : 'Students can click the "Ask for Permission" button above to submit an out-of-hostel request.'}
                        </p>
                        {isStudent && (
                          <button
                            onClick={handleOpenModal}
                            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                          >
                            Ask for Permission
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {filteredPermissions.length > 0 && (
            <div className={`px-4 py-3 sm:px-6 sm:py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
              isDark ? 'border-gray-800 text-gray-400 bg-[#14161f]' : 'border-gray-200 text-gray-600 bg-gray-50'
            }`}>
              <div>
                Showing <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{startIndex + 1}</span> to{' '}
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{Math.min(startIndex + itemsPerPage, filteredPermissions.length)}</span> of{' '}
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{filteredPermissions.length}</span> permissions
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                    isDark ? 'border-gray-700 bg-[#1a1c26] text-white hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
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

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className={`px-3 py-1.5 rounded-lg border font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
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

      {/* ========================================================================= */}
      {/* Ask for Permission Modal */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#181a26] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between ${
              isDark ? 'border-gray-800/80 bg-[#14161f]' : 'border-gray-100 bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Ask for Permission</h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Submit an out-of-hostel permission request.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={submitting}
                className={`p-1.5 rounded-lg transition ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitPermission} className="p-5 sm:p-6 space-y-4">
              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Student selector for Admin ONLY */}
              {isAdmin && (
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Student Resident <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData(prev => ({ ...prev, studentId: e.target.value }))}
                    required
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">-- Choose Student Resident --</option>
                    {studentsList.map(st => (
                      <option key={st._id} value={st._id}>
                        {capitalizeName(st.fullName)} (Room {st.roomNumber || 'N/A'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Student / Leader info badge if NOT admin */}
              {!isAdmin && (
                <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                  isDark ? 'bg-[#14161f] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}>
                  <div>
                    <span className="font-bold">{capitalizeName(myStudent?.fullName || user?.name)}</span>
                    <span className="mx-2">•</span>
                    <span>Room {myStudent?.roomNumber || 'Unassigned'}</span>
                  </div>
                  <span className="text-indigo-400 font-semibold">{myStudent?.mobile || user?.email}</span>
                </div>
              )}

              {/* Date & Till Which Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.tillDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, tillDate: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Till Which Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    placeholder="e.g. 21:30"
                    value={formData.tillTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, tillTime: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
              </div>

              {/* Quick Time Selection Pills */}
              <div>
                <span className={`block text-[11px] font-semibold mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Quick Select Return Time:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {quickTimes.map(qt => (
                    <button
                      key={qt.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, tillTime: qt.value }))}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition ${
                        formData.tillTime === qt.value
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : isDark
                          ? 'bg-[#14161f] border-gray-700 text-gray-300 hover:border-gray-500'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {qt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other Person Phone Number */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Other Person Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <input
                    type="tel"
                    required
                    placeholder="Enter friend / companion / parent contact number"
                    value={formData.otherPersonPhone}
                    onChange={(e) => setFormData(prev => ({ ...prev, otherPersonPhone: e.target.value }))}
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                <span className={`block text-[11px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Contact number of accompanying friend, family member, or reference person.
                </span>
              </div>

              {/* Reason */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why you need permission (e.g., college project, library, dinner with family, coaching class, etc.)..."
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${
                    isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t dark:border-gray-800">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleCloseModal}
                  className={`px-4 py-2.5 text-xs font-semibold rounded-xl border transition ${
                    isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold rounded-xl transition shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      <span>Submit Permission Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Review Confirmation Modal (for Admin & Leader) */}
      {/* ========================================================================= */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#181a26] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            <div className={`p-5 border-b flex items-center justify-between ${
              reviewModal.status === 'Approved'
                ? isDark ? 'bg-emerald-950/40 border-emerald-900/60' : 'bg-emerald-50 border-emerald-200'
                : isDark ? 'bg-rose-950/40 border-rose-900/60' : 'bg-rose-50 border-rose-200'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl text-white ${
                  reviewModal.status === 'Approved' ? 'bg-emerald-600' : 'bg-rose-600'
                }`}>
                  {reviewModal.status === 'Approved' ? <Check size={18} /> : <X size={18} />}
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {reviewModal.status === 'Approved' ? 'Approve Permission' : 'Reject Permission'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Student: {capitalizeName(reviewModal.permission?.studentName)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseReview}
                disabled={reviewModal.loading}
                className={`p-1.5 rounded-lg transition ${
                  isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-200 text-gray-500'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                isDark ? 'bg-[#14161f] border-gray-800 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'
              }`}>
                <div><span className="font-bold">Till Time:</span> {formatDisplayTime(reviewModal.permission?.tillTime)}</div>
                <div><span className="font-bold">Other Person Phone:</span> {reviewModal.permission?.otherPersonPhone}</div>
                <div><span className="font-bold">Reason:</span> {reviewModal.permission?.reason}</div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g., Gate entry permitted, return strictly on time..."
                  value={reviewModal.remarks}
                  onChange={(e) => setReviewModal(prev => ({ ...prev, remarks: e.target.value }))}
                  className={`w-full px-3.5 py-2 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={reviewModal.loading}
                  onClick={handleCloseReview}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl border transition ${
                    isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-300 hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={reviewModal.loading}
                  onClick={handleConfirmReview}
                  className={`px-5 py-2 text-xs font-bold rounded-xl text-white transition flex items-center gap-1.5 ${
                    reviewModal.status === 'Approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {reviewModal.loading ? 'Updating...' : `Confirm ${reviewModal.status}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Permissions;
