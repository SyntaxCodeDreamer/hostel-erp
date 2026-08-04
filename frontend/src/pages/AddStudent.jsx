import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import { ArrowLeft, Save } from 'lucide-react';

const AddStudent = () => {
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    village: '',
    homeAddress: '',
    course: '',
    collegeName: '',
    joiningYear: new Date().getFullYear(),
    joiningMonth: 'August',
    mobile: '',
    parentsMobile: '',
    roomNumber: ''
  });
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userInfo.token}`
        },
      };
      await axios.post('/api/students', formData, config);
      navigate('/students');
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Error creating student');
    }
  };

  const inputClass = `w-full rounded-xl border p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${isDark ? 'bg-[#1a1c29] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`;
  const labelClass = "block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/students" className={`p-2 rounded-lg transition ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-800 dark:text-white">Register New Student</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Create a user account and student profile simultaneously.</p>
        </div>
      </div>

      <div className={`rounded-2xl border shadow-sm overflow-hidden ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          {errorMsg && (
            <div className="bg-red-100 text-red-700 border border-red-200 p-4 rounded-xl text-sm font-semibold">
              {errorMsg}
            </div>
          )}

          {/* Account Details */}
          <div>
            <h3 className="text-lg font-semibold text-indigo-500 mb-4 border-b border-gray-700/50 pb-2">1. Account Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>Full Name</label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} required className={inputClass} placeholder="Student Name" />
              </div>
              <div>
                <label className={labelClass}>Email Address</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} required className={inputClass} placeholder="student@example.com" />
              </div>
              <div>
                <label className={labelClass}>Password (Optional)</label>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className={inputClass} placeholder="Default: 1st 5 letters of email + 1993" />
              </div>
            </div>
          </div>

          {/* Academic Details */}
          <div>
            <h3 className="text-lg font-semibold text-indigo-500 mb-4 border-b border-gray-700/50 pb-2">2. Academic Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Enrolled Course</label>
                <input type="text" name="course" value={formData.course} onChange={handleChange} required className={inputClass} placeholder="e.g. BCA, B.Tech" />
              </div>
              <div>
                <label className={labelClass}>College Name</label>
                <input type="text" name="collegeName" value={formData.collegeName} onChange={handleChange} required className={inputClass} placeholder="College/Institute" />
              </div>
            </div>
          </div>

          {/* Hostel Details */}
          <div>
            <h3 className="text-lg font-semibold text-indigo-500 mb-4 border-b border-gray-700/50 pb-2">3. Hostel Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className={labelClass}>Room Number</label>
                <input type="text" name="roomNumber" value={formData.roomNumber} onChange={handleChange} required className={inputClass} placeholder="e.g. B-205" />
              </div>
              <div>
                <label className={labelClass}>Mobile Number</label>
                <input type="text" name="mobile" value={formData.mobile} onChange={handleChange} required className={inputClass} placeholder="Student's Phone" />
              </div>
              <div>
                <label className={labelClass}>Parents Mobile</label>
                <input type="text" name="parentsMobile" value={formData.parentsMobile} onChange={handleChange} required className={inputClass} placeholder="Emergency Contact" />
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div>
            <h3 className="text-lg font-semibold text-indigo-500 mb-4 border-b border-gray-700/50 pb-2">4. Address & Location</h3>
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className={labelClass}>Village / City</label>
                <input type="text" name="village" value={formData.village} onChange={handleChange} required className={inputClass} placeholder="Native place" />
              </div>
              <div>
                <label className={labelClass}>Full Home Address</label>
                <textarea name="homeAddress" value={formData.homeAddress} onChange={handleChange} required className={inputClass} rows="3" placeholder="Full residential address..."></textarea>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition flex items-center gap-2">
              <Save size={18} /> Save & Register Student
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudent;
