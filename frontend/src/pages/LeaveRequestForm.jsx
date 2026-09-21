import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate, useParams } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import { Clock, Lock, ArrowLeft, AlertCircle } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const LeaveRequestForm = () => {
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    reason: '',
    fromDate: '',
    fromTime: '09:00',
    toDate: '',
    toTime: '18:00',
    requestedDays: '',
    previousLeaveDays: '0',
    destination: '',
    emergencyContact: ''
  });
  const [hasPreviousLeaves, setHasPreviousLeaves] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingLeave, setLoadingLeave] = useState(isEditMode);
  const [isLocked, setIsLocked] = useState(false);
  const [leaveStatus, setLeaveStatus] = useState('Pending');
  const [appliedDate, setAppliedDate] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [reviewerInfo, setReviewerInfo] = useState(null);
  const [reviewedAtDate, setReviewedAtDate] = useState('');

  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  useEffect(() => {
    const initForm = async () => {
      if (isEditMode) {
        try {
          setLoadingLeave(true);
          const { data: leave } = await apiClient.get(`/leaves/${id}`);
          if (leave) {
            const status = leave.status || 'Pending';
            setLeaveStatus(status);
            if (status !== 'Pending') {
              setIsLocked(true);
            }
            setAppliedDate(leave.appliedDate || leave.createdAt || '');
            if (leave.reviewedBy) {
              setReviewerInfo(leave.reviewedBy);
            }
            if (leave.reviewedAt || leave.updatedAt) {
              setReviewedAtDate(leave.reviewedAt || leave.updatedAt);
            }
            setFormData({
              reason: leave.reason || '',
              fromDate: leave.fromDate ? leave.fromDate.split('T')[0] : '',
              fromTime: leave.fromTime || '09:00',
              toDate: leave.toDate ? leave.toDate.split('T')[0] : '',
              toTime: leave.toTime || '18:00',
              requestedDays: leave.requestedDays !== undefined && leave.requestedDays !== null ? leave.requestedDays.toString() : '',
              previousLeaveDays: leave.previousLeaveDays !== undefined && leave.previousLeaveDays !== null ? leave.previousLeaveDays.toString() : '0',
              destination: leave.destination || '',
              emergencyContact: leave.emergencyContact || ''
            });
            setHasPreviousLeaves(true); // Lock baseline field during edit
          }
        } catch (err) {
          console.error('Error fetching leave for editing:', err);
          setErrorMessage(err.message || 'Failed to load leave request details.');
        } finally {
          setLoadingLeave(false);
        }
      } else {
        try {
          const [{ data: myProfile }, { data: leaves }] = await Promise.all([
            apiClient.get('/students/me').catch(() => ({ data: null })),
            apiClient.get('/leaves').catch(() => ({ data: [] }))
          ]);

          if (Array.isArray(leaves)) {
            const studentId = myProfile?._id;
            const myLeaves = leaves.filter(l => 
              (l.studentId?._id === studentId || l.studentId === studentId)
            );

            if (myLeaves.length > 0) {
              setHasPreviousLeaves(true);
            }

            const approvedLeaves = myLeaves.filter(l => 
              l.status === 'Approved' || l.status === 'approved'
            );

            let sumDays = 0;
            approvedLeaves.forEach(l => {
              if (l.requestedDays !== undefined && l.requestedDays !== null && l.requestedDays !== '') {
                sumDays += Number(l.requestedDays);
              } else if (l.fromDate && l.toDate) {
                const f = new Date(l.fromDate);
                const t = new Date(l.toDate);
                if (!isNaN(f.getTime()) && !isNaN(t.getTime())) {
                  const diff = Math.abs(t - f);
                  sumDays += Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
                }
              }
            });

            let initialBaseline = 0;
            if (approvedLeaves.length > 0) {
              const sorted = [...approvedLeaves].sort((a, b) => new Date(a.createdAt || a.fromDate) - new Date(b.createdAt || b.fromDate));
              initialBaseline = Number(sorted[0].previousLeaveDays || 0);
            }

            const totalTaken = sumDays + initialBaseline;
            setFormData(prev => ({ ...prev, previousLeaveDays: totalTaken.toString() }));
          }
        } catch (err) {
          console.error('Error fetching leave stats:', err);
        }
      }
    };

    initForm();
  }, [id, isEditMode]);

  const handleChange = (e) => {
    if (isLocked) return;
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLocked) {
      alert(`Cannot edit leave request because it has already been ${leaveStatus.toLowerCase()}.`);
      return;
    }
    if (submitting) return;

    try {
      setSubmitting(true);
      if (isEditMode) {
        await apiClient.put(`/leaves/${id}`, formData);
      } else {
        await apiClient.post('/leaves', formData);
      }
      navigate('/leaves');
    } catch (error) {
      alert(error.message || `Error ${isEditMode ? 'updating' : 'creating'} leave request.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingLeave) {
    return (
      <div className="max-w-2xl mx-auto p-12 text-center">
        <LoadingSpinner label="Loading Leave Details..." />
      </div>
    );
  }

  return (
    <div className={`max-w-2xl mx-auto p-8 rounded-2xl shadow-sm border ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/leaves')}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold mb-2 transition-colors ${
              isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowLeft size={14} />
            Back to Leaves
          </button>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {isEditMode ? 'Edit Leave Request' : 'Request Leave'}
          </h2>
        </div>
        {isEditMode && (
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
            leaveStatus.toLowerCase() === 'approved'
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800/50'
              : leaveStatus.toLowerCase() === 'rejected'
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-400 border border-rose-300 dark:border-rose-800/50'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800/50'
          }`}>
            {leaveStatus}
          </span>
        )}
      </div>

      {/* Applied Date Badge */}
      {appliedDate && (
        <div className={`p-3 rounded-xl mb-5 text-xs inline-flex items-center gap-2 border ${
          isDark ? 'bg-indigo-950/30 border-indigo-800/50 text-indigo-300' : 'bg-indigo-50/80 border-indigo-200 text-indigo-800'
        }`}>
          <Clock size={14} className="shrink-0 text-indigo-500" />
          <span>
            Originally Applied On: <strong>{new Date(appliedDate).toLocaleDateString()}</strong> at <strong>{new Date(appliedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
          </span>
        </div>
      )}

      {/* Locked Alert if Approved or Rejected */}
      {isLocked && (
        <div className="p-4 rounded-xl mb-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-800 dark:text-rose-300">
          <Lock className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          <div>
            <div className="font-semibold text-sm">Editing Disabled (Status: {leaveStatus})</div>
            <div className="text-xs mt-1 opacity-90 leading-relaxed">
              This leave request was <strong>{leaveStatus.toLowerCase()}</strong>
              {reviewerInfo?.name ? (
                <> by <strong>{reviewerInfo.name}</strong>{reviewerInfo.role ? ` (${reviewerInfo.role})` : ''}</>
              ) : (
                ' by administrators'
              )}
              {reviewedAtDate ? (
                <> on <strong>{new Date(reviewedAtDate).toLocaleDateString()}</strong> at <strong>{new Date(reviewedAtDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></>
              ) : ''}.
              Once approved or rejected, leave details can no longer be modified.
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl mb-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-rose-800 dark:text-rose-300 text-sm">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Destination</label>
          <input 
            type="text" 
            name="destination" 
            value={formData.destination} 
            onChange={handleChange} 
            disabled={isLocked}
            required 
            className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${
              isLocked 
                ? isDark ? 'bg-gray-800/60 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                : isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`} 
            placeholder="Going to..." 
          />
        </div>
        
        {/* Leaving Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Leaving Date (From)</label>
            <input 
              type="date" 
              name="fromDate" 
              value={formData.fromDate} 
              onChange={handleChange} 
              disabled={isLocked}
              required 
              className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${
                isLocked
                  ? isDark ? 'bg-gray-800/60 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                  : isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'
              }`} 
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Leaving Time</label>
            <input 
              type="time" 
              name="fromTime" 
              value={formData.fromTime} 
              onChange={handleChange} 
              disabled={isLocked}
              required 
              className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${
                isLocked
                  ? isDark ? 'bg-gray-800/60 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                  : isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'
              }`} 
            />
          </div>
        </div>

        {/* Return Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Return Date (To)</label>
            <input 
              type="date" 
              name="toDate" 
              value={formData.toDate} 
              onChange={handleChange} 
              disabled={isLocked}
              required 
              className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${
                isLocked
                  ? isDark ? 'bg-gray-800/60 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                  : isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'
              }`} 
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Return Time</label>
            <input 
              type="time" 
              name="toTime" 
              value={formData.toTime} 
              onChange={handleChange} 
              disabled={isLocked}
              required 
              className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${
                isLocked
                  ? isDark ? 'bg-gray-800/60 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                  : isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'
              }`} 
            />
          </div>
        </div>

        {/* Leave Duration & Past Leaves Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Requested Leave Duration (Days)</label>
            <input 
              type="number" 
              name="requestedDays" 
              min="0"
              value={formData.requestedDays} 
              onChange={handleChange} 
              disabled={isLocked}
              required
              placeholder="Enter number of days..."
              className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors font-semibold ${
                isLocked
                  ? isDark ? 'bg-gray-800/60 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                  : isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`} 
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Leave Days Already Taken</label>
            <input 
              type="number" 
              name="previousLeaveDays" 
              min="0"
              value={formData.previousLeaveDays} 
              onChange={handleChange} 
              disabled={hasPreviousLeaves || isLocked}
              readOnly={hasPreviousLeaves || isLocked}
              required
              placeholder="Enter leave days already taken..."
              className={`mt-1 block w-full rounded-xl shadow-sm sm:text-sm p-2.5 border transition-colors font-semibold ${
                hasPreviousLeaves || isLocked
                  ? isDark ? 'bg-gray-800/80 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                  : isDark ? 'bg-[#1a1c26] border-gray-700 text-white focus:border-indigo-500 focus:ring-indigo-500' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500'
              }`} 
            />
            {hasPreviousLeaves && (
              <p className="text-[11px] text-gray-500 mt-1">Locked: Auto-calculated from recorded leave history.</p>
            )}
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Emergency Contact Name & Mobile</label>
          <input 
            type="text" 
            name="emergencyContact" 
            value={formData.emergencyContact} 
            onChange={handleChange} 
            disabled={isLocked}
            required 
            className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${
              isLocked
                ? isDark ? 'bg-gray-800/60 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                : isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`} 
          />
        </div>
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Reason</label>
          <textarea 
            name="reason" 
            value={formData.reason} 
            onChange={handleChange} 
            disabled={isLocked}
            required 
            className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${
              isLocked
                ? isDark ? 'bg-gray-800/60 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                : isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
            }`} 
            rows="3"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          {!isLocked && (
            <button 
              type="submit" 
              disabled={submitting} 
              className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {isEditMode ? 'Updating Request...' : 'Submitting Request...'}
                </>
              ) : (
                isEditMode ? 'Update Leave Request' : 'Submit Request'
              )}
            </button>
          )}
          <button 
            type="button" 
            onClick={() => navigate('/leaves')}
            className={`px-5 py-2.5 rounded-xl font-medium border transition-colors ${
              isLocked ? 'w-full text-center' : ''
            } ${
              isDark 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
          >
            {isLocked ? 'Back to Leaves' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveRequestForm;
