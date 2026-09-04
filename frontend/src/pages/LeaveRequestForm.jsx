import React, { useState, useEffect, useContext } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

const LeaveRequestForm = () => {
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
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  useEffect(() => {
    const fetchLeaveStats = async () => {
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
    };
    fetchLeaveStats();
  }, []);

  const addDaysToDate = (dateStr, days) => {
    if (!dateStr || isNaN(days) || days <= 0) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + (days - 1));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const nextForm = { ...prev, [name]: value };

      if (name === 'requestedDays') {
        const numDays = parseInt(value, 10);
        if (!isNaN(numDays) && numDays > 0 && nextForm.fromDate) {
          const newToDate = addDaysToDate(nextForm.fromDate, numDays);
          if (newToDate) {
            nextForm.toDate = newToDate;
          }
        }
      } else if (name === 'fromDate') {
        const from = value;
        const numDays = parseInt(prev.requestedDays, 10);
        if (from && !isNaN(numDays) && numDays > 0) {
          const newToDate = addDaysToDate(from, numDays);
          if (newToDate) {
            nextForm.toDate = newToDate;
          }
        } else if (from && nextForm.toDate) {
          const f = new Date(from);
          const t = new Date(nextForm.toDate);
          if (!isNaN(f.getTime()) && !isNaN(t.getTime()) && t >= f) {
            const diff = Math.abs(t - f);
            const calcDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
            nextForm.requestedDays = calcDays.toString();
          }
        }
      } else if (name === 'toDate') {
        const to = value;
        const from = nextForm.fromDate;
        if (from && to) {
          const f = new Date(from);
          const t = new Date(to);
          if (!isNaN(f.getTime()) && !isNaN(t.getTime())) {
            const diff = t - f;
            if (diff >= 0) {
              const calcDays = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
              nextForm.requestedDays = calcDays.toString();
            }
          }
        }
      }

      return nextForm;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    try {
      setSubmitting(true);
      await apiClient.post('/leaves', formData);
      navigate('/leaves');
    } catch (error) {
      alert(error.message || 'Error creating leave request. (Are you a student?)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`max-w-2xl mx-auto p-8 rounded-2xl shadow-sm border ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
      <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Request Leave</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Destination</label>
          <input type="text" name="destination" value={formData.destination} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} placeholder="Going to..." />
        </div>
        
        {/* Leaving Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Leaving Date (From)</label>
            <input type="date" name="fromDate" value={formData.fromDate} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Leaving Time</label>
            <input type="time" name="fromTime" value={formData.fromTime} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'}`} />
          </div>
        </div>

        {/* Return Date & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Return Date (To)</label>
            <input type="date" name="toDate" value={formData.toDate} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Return Time</label>
            <input type="time" name="toTime" value={formData.toTime} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'}`} />
          </div>
        </div>

        {/* Leave Duration & Past Leaves Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Requested Leave Duration (Days)</label>
            <input 
              type="number" 
              name="requestedDays" 
              min="1"
              value={formData.requestedDays} 
              onChange={handleChange} 
              required
              placeholder="Enter number of days..."
              className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors font-semibold ${
                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
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
              disabled={hasPreviousLeaves}
              readOnly={hasPreviousLeaves}
              required
              placeholder="Enter leave days already taken..."
              className={`mt-1 block w-full rounded-xl shadow-sm sm:text-sm p-2.5 border transition-colors font-semibold ${
                hasPreviousLeaves
                  ? isDark ? 'bg-gray-800/80 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-100 border-gray-300 text-gray-500 cursor-not-allowed'
                  : isDark ? 'bg-[#1a1c26] border-gray-700 text-white focus:border-indigo-500 focus:ring-indigo-500' : 'bg-white border-gray-300 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500'
              }`} 
            />
            {hasPreviousLeaves && (
              <p className="text-[11px] text-gray-500 mt-1">Locked: Auto-calculated from your previously recorded leave history.</p>
            )}
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Emergency Contact Name & Mobile</label>
          <input type="text" name="emergencyContact" value={formData.emergencyContact} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div>
          <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Reason</label>
          <textarea name="reason" value={formData.reason} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} rows="3"></textarea>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button 
            type="submit" 
            disabled={submitting} 
            className="flex-1 bg-indigo-600 text-white py-2.5 px-4 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-sm flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting Request...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
          <button 
            type="button" 
            onClick={() => navigate('/leaves')}
            className={`px-5 py-2.5 rounded-xl font-medium border transition-colors ${
              isDark 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300'
            }`}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveRequestForm;
