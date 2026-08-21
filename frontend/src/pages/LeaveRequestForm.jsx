import React, { useState, useContext } from 'react';
import apiClient from '../utils/apiClient';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';

const LeaveRequestForm = () => {
  const [formData, setFormData] = useState({
    reason: '',
    fromDate: '',
    toDate: '',
    destination: '',
    emergencyContact: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
          <input type="text" name="destination" value={formData.destination} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>From Date</label>
            <input type="date" name="fromDate" value={formData.fromDate} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'}`} />
          </div>
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>To Date</label>
            <input type="date" name="toDate" value={formData.toDate} onChange={handleChange} required className={`mt-1 block w-full rounded-xl shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border transition-colors ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white [color-scheme:dark]' : 'bg-white border-gray-300 text-gray-900'}`} />
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
