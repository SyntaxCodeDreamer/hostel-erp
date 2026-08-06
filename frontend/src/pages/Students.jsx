import React, { useEffect, useState, useContext } from 'react';
import apiClient from '../utils/apiClient';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Eye, X, Phone, MapPin, GraduationCap, Edit3, Save, CheckCircle, ExternalLink, Link as LinkIcon, TrendingUp, Plus, Trash2, Award, FileText, Sparkles } from 'lucide-react';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveSuccess, setSaveSuccess] = useState('');
  const [studentLeaveCount, setStudentLeaveCount] = useState(0);
  const [leavesList, setLeavesList] = useState([]);
  const { user } = useContext(AuthContext);

  const [showProgressForm, setShowProgressForm] = useState(false);
  const [progressError, setProgressError] = useState('');
  const [progressData, setProgressData] = useState({
    category: 'Academic',
    title: '',
    description: '',
    remarks: '',
    proofLink: '',
    other: ''
  });
  const [progressSaving, setProgressSaving] = useState(false);

  const isStudent = (user?.role || '').toLowerCase() === 'student';

  const handleAddProgress = async (e) => {
    e.preventDefault();
    setProgressError('');

    if (!progressData.title.trim()) {
      setProgressError('Title is required for progress record.');
      return;
    }

    const targetId = selectedStudent?._id || selectedStudent?.id || (isStudent ? 'me' : null);
    if (!targetId) {
      setProgressError('No target student profile identified.');
      return;
    }

    try {
      setProgressSaving(true);
      const { data: updatedStudent } = await apiClient.post(
        `/students/${targetId}/progress`,
        progressData
      );

      setSelectedStudent(updatedStudent);
      setShowProgressForm(false);
      setProgressData({
        category: 'Academic',
        title: '',
        description: '',
        remarks: '',
        proofLink: '',
        other: ''
      });
      fetchStudents();
    } catch (err) {
      console.error('Error adding progress record:', err);
      setProgressError(err.message || 'Error saving progress record');
    } finally {
      setProgressSaving(false);
    }
  };

  const handleDeleteProgress = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this progress record?')) return;
    const targetId = selectedStudent?._id || selectedStudent?.id || (isStudent ? 'me' : null);
    if (!targetId) return;

    try {
      const { data: updatedStudent } = await apiClient.delete(
        `/students/${targetId}/progress/${itemId}`
      );
      setSelectedStudent(updatedStudent);
      fetchStudents();
    } catch (err) {
      console.error('Error deleting progress record:', err);
    }
  };

  const calculateStudentTotalLeaveDays = (student) => {
    if (!student) return 0;
    const studentId = (student._id || student.id || '').toString();
    const approved = (Array.isArray(leavesList) ? leavesList : []).filter(l => {
      const sId = l.studentId?._id ? l.studentId._id.toString() : (l.studentId || '').toString();
      const statusLower = (l.status || '').toLowerCase();
      return sId === studentId && statusLower === 'approved';
    });

    let totalDays = 0;
    approved.forEach(l => {
      if (l.fromDate && l.toDate) {
        const from = new Date(l.fromDate);
        const to = new Date(l.toDate);
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          const diffTime = Math.abs(to - from);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          totalDays += diffDays;
        }
      }
    });
    return totalDays;
  };

  const handleDeleteStudent = async (studentId) => {
    if (!studentId) return;
    if (!window.confirm('Are you sure you want to permanently delete this student record and their login account?')) return;
    try {
      await apiClient.delete(`/students/${studentId}`);
      setSaveSuccess('Student record deleted successfully');
      setSelectedStudent(null);
      fetchStudents();
      setTimeout(() => setSaveSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting student:', err);
      alert(err.message || 'Failed to delete student');
    }
  };

  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case 'Academic':
        return 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60';
      case 'Extracurricular':
        return 'bg-sky-950/80 text-sky-300 border-sky-700/60';
      case 'Internship/Project':
        return 'bg-purple-950/80 text-purple-300 border-purple-700/60';
      case 'Certificate':
        return 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60';
      case 'Sports':
        return 'bg-amber-950/80 text-amber-300 border-amber-700/60';
      default:
        return 'bg-rose-950/80 text-rose-300 border-rose-700/60';
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data } = await apiClient.get('/students');
      const studentArr = Array.isArray(data) ? data : [];
      setStudents(studentArr);

      const { data: leavesData } = await apiClient.get('/leaves').catch(() => ({ data: [] }));
      if (Array.isArray(leavesData)) {
        setLeavesList(leavesData);
      }

      // If user is a Student, automatically select their profile
      if (isStudent && studentArr.length > 0) {
        handleViewProfile(studentArr[0]);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = async (student) => {
    setSelectedStudent(student);
    setIsEditing(false);
    setSaveSuccess('');
    setEditForm({
      mobile: student.mobile || student.mobileNumber || '',
      parentsMobile: student.parentsMobile || student.parentsMobileNumber || '',
      village: student.village || '',
      homeAddress: student.homeAddress || '',
      course: student.course || '',
      collegeName: student.collegeName || '',
      otherCourseOrJob: student.otherCourseOrJob || '',
      drivingLicense: !!student.drivingLicense,
      resultDriveLink: student.resultDriveLink || student.resultUrl || '',
      resultUrl: student.resultUrl || '',
      resultUrls: student.resultUrls || (student.resultUrl ? [student.resultUrl] : [])
    });

    try {
      const { data: fullStudent } = await apiClient.get(`/students/${student._id}`).catch(() => ({ data: student }));
      if (fullStudent && fullStudent._id) {
        setSelectedStudent(fullStudent);
      }

      const { data: leaves } = await apiClient.get('/leaves').catch(() => ({ data: [] }));
      const leaveArr = Array.isArray(leaves) ? leaves : [];
      setLeavesList(leaveArr);
      const approvedCount = leaveArr.filter(
        (l) => (l.studentId?._id === student._id || l.studentId === student._id) && (l.status === 'Approved' || l.status === 'approved')
      ).length;
      setStudentLeaveCount(approvedCount);
    } catch (err) {
      console.error('Error fetching student leave stats:', err);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveSuccess('');
    try {
      const url = isStudent ? '/students/me' : `/students/${selectedStudent._id}`;
      const { data: updated } = await apiClient.put(url, editForm);

      setSelectedStudent({ ...selectedStudent, ...updated });
      setIsEditing(false);
      setSaveSuccess('Profile updated successfully!');
      fetchStudents();

      setTimeout(() => setSaveSuccess(''), 4000);
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('results', files[i]);
    }
    setUploading(true);

    try {
      const { data } = await apiClient.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setEditForm(prev => ({ 
        ...prev, 
        resultUrls: [...(prev.resultUrls || []), ...data] 
      }));
      setUploading(false);
    } catch (error) {
      console.error(error);
      setUploading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedStudent) return;
    try {
      await apiClient.put(`/students/${selectedStudent._id}`, { status: newStatus });
      setSelectedStudent({ ...selectedStudent, status: newStatus });
      fetchStudents();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const getStudentName = (student) => {
    return student.fullName || student.name || student.userId?.name || student.userId?.email || 'Student Resident';
  };

  const getStudentEmail = (student) => {
    return student.userId?.email || student.email || 'No email provided';
  };

  const getStudentStatus = (student) => {
    const raw = student.status || 'active';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  };

  return (
    <div className="p-2 sm:p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isStudent ? 'My Student Profile' : 'Student Directory'}</h1>
          <p className="text-sm opacity-70">{isStudent ? 'View and update your personal hostel details' : 'Manage and track student resident records.'}</p>
        </div>
        {(user?.role || '').toLowerCase() === 'admin' && (
          <Link 
            to="/students/add" 
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
          >
            + Add Student
          </Link>
        )}
      </div>

      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle size={18} />
          {saveSuccess}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : isStudent ? (
        /* INLINE STUDENT PROFILE VIEW FOR STUDENTS */
        selectedStudent ? (
          <div className="bg-[#14161f] text-gray-100 rounded-2xl shadow-xl border border-gray-800/80 overflow-hidden">
            {/* Header Banner */}
            <div className="relative bg-gradient-to-r from-indigo-700 via-purple-700 to-indigo-900 text-white p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-2xl font-bold">
                  {getStudentName(selectedStudent).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{getStudentName(selectedStudent)}</h2>
                  <p className="text-indigo-200 text-sm">{getStudentEmail(selectedStudent)}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="bg-white/20 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Room {selectedStudent.roomNumber || 'N/A'}
                    </span>
                    <span className="bg-white/20 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Status: {getStudentStatus(selectedStudent)}
                    </span>
                  </div>
                </div>
              </div>

              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Edit3 size={15} />
                  Edit My Profile
                </button>
              )}
            </div>

            {/* Profile Body */}
            <div className="p-6 space-y-6">
              {/* EDIT FORM */}
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 size={16} /> Edit My Personal Details
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1a1c26] p-4 rounded-xl border border-gray-800">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Student Mobile</label>
                      <input
                        type="text"
                        value={editForm.mobile}
                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Mobile number..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Parents / Emergency Mobile</label>
                      <input
                        type="text"
                        value={editForm.parentsMobile}
                        onChange={(e) => setEditForm({ ...editForm, parentsMobile: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Emergency contact..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Native Village / Town</label>
                      <input
                        type="text"
                        value={editForm.village}
                        onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Village name..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Driving License</label>
                      <select
                        value={editForm.drivingLicense ? 'yes' : 'no'}
                        onChange={(e) => setEditForm({ ...editForm, drivingLicense: e.target.value === 'yes' })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes (Available)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Home Address</label>
                      <textarea
                        rows="2"
                        value={editForm.homeAddress}
                        onChange={(e) => setEditForm({ ...editForm, homeAddress: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Full street address..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5 text-indigo-400">
                        <LinkIcon size={14} /> Exam Results Drive Link
                      </label>
                      <input
                        type="url"
                        value={editForm.resultDriveLink || editForm.resultUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, resultDriveLink: e.target.value, resultUrl: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="https://drive.google.com/file/d/... or Google Drive folder URL"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Paste your Google Drive link or document URL for your exam results.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Enrolled Course</label>
                      <input
                        type="text"
                        value={editForm.course}
                        onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. B.Tech Computer Science..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">College Name</label>
                      <input
                        type="text"
                        value={editForm.collegeName}
                        onChange={(e) => setEditForm({ ...editForm, collegeName: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="College / Institute name..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Other Course / Job Details</label>
                      <input
                        type="text"
                        value={editForm.otherCourseOrJob}
                        onChange={(e) => setEditForm({ ...editForm, otherCourseOrJob: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Part-time job or certificate details..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                    >
                      <Save size={14} />
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                /* READ ONLY PROFILE VIEW */
                <>
                  {/* Grid 1: Academic & Course */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <GraduationCap size={16} className="text-indigo-400" /> Academic Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1a1c26] p-4 rounded-xl border border-gray-800">
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Enrolled Course</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.course || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">College / Institute</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.collegeName || 'N/A'}</p>
                      </div>
                      {(selectedStudent.otherCourseOrJob || selectedStudent.otherCourseOrJobPlace) && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-gray-400 font-medium">Other Course / Job Details</p>
                          <p className="text-sm font-semibold text-white">{selectedStudent.otherCourseOrJob || selectedStudent.otherCourseOrJobPlace}</p>
                        </div>
                      )}
                      {(selectedStudent.resultDriveLink || selectedStudent.resultUrl || (selectedStudent.resultUrls && selectedStudent.resultUrls.length > 0)) && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                            <LinkIcon size={14} className="text-indigo-400" /> Exam Results Drive Link
                          </p>
                          <a 
                            href={selectedStudent.resultDriveLink || selectedStudent.resultUrl || selectedStudent.resultUrls?.[0]} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-xs font-bold transition"
                          >
                            <ExternalLink size={16} /> Open Results in Google Drive
                          </a>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Joining Date</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.joiningMonth || 'August'} {selectedStudent.joiningYear || 2024}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Total Approved Leave Days</p>
                        <p className="text-sm font-semibold text-indigo-400">
                          {calculateStudentTotalLeaveDays(selectedStudent)} Days
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Contact Information */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Phone size={16} className="text-indigo-400" /> Contact Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1a1c26] p-4 rounded-xl border border-gray-800">
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Student Mobile Number</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.mobile || selectedStudent.mobileNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Parents / Emergency Mobile</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.parentsMobile || selectedStudent.parentsMobileNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 3: Address & Location */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <MapPin size={16} className="text-indigo-400" /> Address & Location
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1a1c26] p-4 rounded-xl border border-gray-800">
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Native Village / Town</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.village || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Driving License</p>
                        <p className="text-sm font-semibold text-white">
                          {selectedStudent.drivingLicense ? 'Yes (Available)' : 'No'}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-400 font-medium">Full Home Address</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.homeAddress || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 4: Custom Yearly Progress & Accomplishments Section */}
                  <div className="pt-2 border-t border-gray-800/80 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Award size={16} className="text-indigo-400" /> Yearly Overall Progress & Accomplishments
                      </h3>
                      <button
                        onClick={() => setShowProgressForm(!showProgressForm)}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Plus size={14} /> {showProgressForm ? 'Close Form' : 'Add Progress Record'}
                      </button>
                    </div>

                    {/* Progress Creation Form */}
                    {showProgressForm && (
                      <form onSubmit={handleAddProgress} className="bg-[#141622] p-4 rounded-xl border border-indigo-500/30 mb-4 space-y-4 shadow-lg">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1">
                          <Sparkles size={14} /> Add New Progress Record
                        </h4>

                        {progressError && (
                          <div className="p-2 rounded-lg bg-red-900/40 border border-red-700/60 text-red-300 text-xs font-medium">
                            {progressError}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Category *</label>
                            <select
                              value={progressData.category}
                              onChange={(e) => setProgressData({ ...progressData, category: e.target.value })}
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="Academic">Academic 📚</option>
                              <option value="Extracurricular">Extracurricular 🎨</option>
                              <option value="Internship/Project">Internship / Project 💻</option>
                              <option value="Certificate">Certificate 📜</option>
                              <option value="Sports">Sports 🏆</option>
                              <option value="Other">Other 🌟</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title *</label>
                            <input
                              type="text"
                              required
                              value={progressData.title}
                              onChange={(e) => setProgressData({ ...progressData, title: e.target.value })}
                              placeholder="e.g. 1st Rank in Semester 4 / AWS Certified"
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                          <textarea
                            rows="2"
                            value={progressData.description}
                            onChange={(e) => setProgressData({ ...progressData, description: e.target.value })}
                            placeholder="Detailed description of achievement or overall progress during the year..."
                            className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Remarks</label>
                            <input
                              type="text"
                              value={progressData.remarks}
                              onChange={(e) => setProgressData({ ...progressData, remarks: e.target.value })}
                              placeholder="Special remarks or feedback"
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Proof / Drive Link</label>
                            <input
                              type="url"
                              value={progressData.proofLink}
                              onChange={(e) => setProgressData({ ...progressData, proofLink: e.target.value })}
                              placeholder="https://drive.google.com/..."
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Other Details</label>
                            <input
                              type="text"
                              value={progressData.other}
                              onChange={(e) => setProgressData({ ...progressData, other: e.target.value })}
                              placeholder="Additional custom notes"
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowProgressForm(false)}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={progressSaving}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md transition"
                          >
                            {progressSaving ? 'Saving...' : 'Create Progress Record'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Progress Card Grid */}
                    {selectedStudent.progressItems && selectedStudent.progressItems.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedStudent.progressItems.map((item) => (
                          <div
                            key={item._id}
                            className="bg-[#1a1c26] border border-gray-800 rounded-xl p-4 flex flex-col justify-between relative group hover:border-indigo-500/50 transition shadow-sm"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(item.category)}`}>
                                  {item.category}
                                </span>
                                <button
                                  onClick={() => handleDeleteProgress(item._id)}
                                  className="text-gray-500 hover:text-red-400 p-1 rounded-md transition"
                                  title="Delete Progress Record"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>

                              {item.description && (
                                <p className="text-xs text-gray-300 mb-2 leading-relaxed">{item.description}</p>
                              )}

                              {item.remarks && (
                                <div className="bg-[#141620] p-2 rounded-lg border border-gray-800 text-[11px] text-gray-400 mb-2">
                                  <span className="font-semibold text-indigo-400">Remarks: </span>{item.remarks}
                                </div>
                              )}

                              {item.other && (
                                <div className="text-[11px] text-gray-400 mb-2">
                                  <span className="font-semibold text-gray-300">Other: </span>{item.other}
                                </div>
                              )}
                            </div>

                            {item.proofLink && (
                              <div className="pt-2 border-t border-gray-800/80 mt-2">
                                <a
                                  href={item.proofLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                                >
                                  <ExternalLink size={13} /> View Proof / Link
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#1a1c26] border border-gray-800 rounded-xl p-6 text-center text-xs text-gray-500">
                        No progress records added yet. Click "Add Progress Record" above to add overall achievements.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-[#14161f] border border-gray-800 rounded-2xl text-gray-400">
            <Sparkles className="mx-auto mb-2 text-indigo-400" size={24} />
            <p className="text-sm font-medium">Setting up your student profile...</p>
          </div>
        )
      ) : (
        /* ADMIN / LEADER DIRECTORY TABLE */
        <div className="rounded-2xl border border-gray-800/80 bg-[#14161f] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead className="bg-[#1a1c26]">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Student Info</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Course & College</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {students.map((student) => {
                  const sName = getStudentName(student);
                  const sEmail = getStudentEmail(student);
                  const sStatus = getStudentStatus(student);
                  const sMobile = student.mobile || student.mobileNumber || 'N/A';

                  return (
                    <tr key={student._id} onClick={() => handleViewProfile(student)} className="hover:bg-gray-800/40 transition cursor-pointer">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 flex items-center justify-center font-bold text-base">
                            {sName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-semibold text-white">{sName}</div>
                            <div className="text-xs text-gray-400">{sEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-200">{student.course || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{student.collegeName || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">
                        {student.roomNumber ? `Room ${student.roomNumber}` : 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{sMobile}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                          sStatus === 'Active' 
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' 
                            : sStatus === 'On Leave' || sStatus === 'On leave'
                            ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50'
                            : 'bg-rose-950/80 text-rose-400 border border-rose-800/50'
                        }`}>
                          {sStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewProfile(student)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 text-indigo-300 border border-indigo-800/50 hover:bg-indigo-900/80 text-xs font-semibold transition"
                          >
                            <Eye size={14} />
                            View Profile
                          </button>
                          {!isStudent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteStudent(student._id);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800/50 hover:bg-rose-900/80 text-xs font-semibold transition"
                              title="Delete Student"
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {students.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                      No student records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FULL STUDENT PROFILE MODAL FOR ADMIN / LEADER */}
      {!isStudent && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[#14161f] text-gray-100 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-800 animate-in fade-in zoom-in duration-150">
            
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-indigo-700 to-purple-800 text-white p-6 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-2xl font-bold">
                  {getStudentName(selectedStudent).charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{getStudentName(selectedStudent)}</h2>
                  <p className="text-indigo-200 text-sm">{getStudentEmail(selectedStudent)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-white/20 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Room {selectedStudent.roomNumber || 'N/A'}
                    </span>
                    <span className="bg-white/20 text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Status: {getStudentStatus(selectedStudent)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                  >
                    <Edit3 size={14} />
                    Edit Profile
                  </button>
                )}
                {!isStudent && (
                  <button
                    onClick={() => handleDeleteStudent(selectedStudent._id)}
                    className="bg-rose-500/30 hover:bg-rose-500/50 text-white border border-rose-400/40 px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5"
                    title="Delete Student"
                  >
                    <Trash2 size={14} />
                    Delete Student
                  </button>
                )}
                <button
                  onClick={() => { setSelectedStudent(null); setIsEditing(false); }}
                  className="text-white/80 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition ml-2"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">

              {/* Status Update Banner for Admin */}
              {!isStudent && !isEditing && (
                <div className="bg-[#1a1c26] border border-gray-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-gray-400 tracking-wider">Quick Status Update</h4>
                    <p className="text-sm text-gray-300 font-medium">Current Status: <span className="font-semibold text-indigo-400">{getStudentStatus(selectedStudent)}</span></p>
                  </div>
                  <div className="flex gap-2">
                    {['Active', 'On Leave', 'Left'].map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          handleStatusChange(st);
                          setSaveSuccess(`Status updated to ${st}`);
                          setTimeout(() => setSaveSuccess(''), 3000);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                          getStudentStatus(selectedStudent) === st
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-[#222533] border border-gray-700 text-gray-300 hover:bg-gray-800'
                        }`}
                      >
                        Set {st}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* EDIT FORM */}
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 size={16} /> Edit My Personal Details
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1a1c26] p-4 rounded-xl border border-gray-800">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Student Mobile</label>
                      <input
                        type="text"
                        value={editForm.mobile}
                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Mobile number..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Parents / Emergency Mobile</label>
                      <input
                        type="text"
                        value={editForm.parentsMobile}
                        onChange={(e) => setEditForm({ ...editForm, parentsMobile: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Emergency contact..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Native Village / Town</label>
                      <input
                        type="text"
                        value={editForm.village}
                        onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Village name..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Driving License</label>
                      <select
                        value={editForm.drivingLicense ? 'yes' : 'no'}
                        onChange={(e) => setEditForm({ ...editForm, drivingLicense: e.target.value === 'yes' })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes (Available)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Full Home Address</label>
                      <textarea
                        rows="2"
                        value={editForm.homeAddress}
                        onChange={(e) => setEditForm({ ...editForm, homeAddress: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Full street address..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1.5 text-indigo-400">
                        <LinkIcon size={14} /> Exam Results Drive Link
                      </label>
                      <input
                        type="url"
                        value={editForm.resultDriveLink || editForm.resultUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, resultDriveLink: e.target.value, resultUrl: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="https://drive.google.com/file/d/... or Google Drive folder URL"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Paste your Google Drive link or document URL for your exam results.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Enrolled Course</label>
                      <input
                        type="text"
                        value={editForm.course}
                        onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. B.Tech Computer Science..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">College Name</label>
                      <input
                        type="text"
                        value={editForm.collegeName}
                        onChange={(e) => setEditForm({ ...editForm, collegeName: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="College / Institute name..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Other Course / Job Details</label>
                      <input
                        type="text"
                        value={editForm.otherCourseOrJob}
                        onChange={(e) => setEditForm({ ...editForm, otherCourseOrJob: e.target.value })}
                        className="w-full bg-[#14161f] border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                        placeholder="Part-time job or certificate details..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-xl transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                    >
                      <Save size={14} />
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                /* READ ONLY PROFILE VIEW */
                <>
                  {/* Grid 1: Academic & Course */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <GraduationCap size={16} className="text-indigo-400" /> Academic Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1a1c26] p-4 rounded-xl border border-gray-800">
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Enrolled Course</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.course || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">College / Institute</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.collegeName || 'N/A'}</p>
                      </div>
                      {(selectedStudent.otherCourseOrJob || selectedStudent.otherCourseOrJobPlace) && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-gray-400 font-medium">Other Course / Job Details</p>
                          <p className="text-sm font-semibold text-white">{selectedStudent.otherCourseOrJob || selectedStudent.otherCourseOrJobPlace}</p>
                        </div>
                      )}
                      {(selectedStudent.resultDriveLink || selectedStudent.resultUrl || (selectedStudent.resultUrls && selectedStudent.resultUrls.length > 0)) && (
                        <div className="sm:col-span-2">
                          <p className="text-xs text-gray-400 font-medium mb-2 flex items-center gap-1.5">
                            <LinkIcon size={14} className="text-indigo-400" /> Exam Results Drive Link
                          </p>
                          <a 
                            href={selectedStudent.resultDriveLink || selectedStudent.resultUrl || selectedStudent.resultUrls?.[0]} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-xs font-bold transition"
                          >
                            <ExternalLink size={16} /> Open Results in Google Drive
                          </a>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Joining Date</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.joiningMonth || 'August'} {selectedStudent.joiningYear || 2024}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Total Approved Leave Days</p>
                        <p className="text-sm font-semibold text-indigo-400">
                          {calculateStudentTotalLeaveDays(selectedStudent)} Days
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Contact Information */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Phone size={16} className="text-indigo-400" /> Contact Details
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1a1c26] p-4 rounded-xl border border-gray-800">
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Student Mobile Number</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.mobile || selectedStudent.mobileNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Parents / Emergency Mobile</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.parentsMobile || selectedStudent.parentsMobileNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 3: Address & Location */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <MapPin size={16} className="text-indigo-400" /> Address & Location
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#1a1c26] p-4 rounded-xl border border-gray-800">
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Native Village / Town</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.village || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 font-medium">Driving License</p>
                        <p className="text-sm font-semibold text-white">
                          {selectedStudent.drivingLicense ? 'Yes (Available)' : 'No'}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className="text-xs text-gray-400 font-medium">Full Home Address</p>
                        <p className="text-sm font-semibold text-white">{selectedStudent.homeAddress || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 4: Custom Yearly Progress & Accomplishments Section */}
                  <div className="pt-2 border-t border-gray-800/80 mt-2">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Award size={16} className="text-indigo-400" /> Yearly Overall Progress & Accomplishments
                      </h3>
                      <button
                        onClick={() => setShowProgressForm(!showProgressForm)}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Plus size={14} /> {showProgressForm ? 'Close Form' : 'Add Progress Record'}
                      </button>
                    </div>

                    {/* Progress Creation Form */}
                    {showProgressForm && (
                      <form onSubmit={handleAddProgress} className="bg-[#141622] p-4 rounded-xl border border-indigo-500/30 mb-4 space-y-4 shadow-lg">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1">
                          <Sparkles size={14} /> Add New Progress Record
                        </h4>

                        {progressError && (
                          <div className="p-2 rounded-lg bg-red-900/40 border border-red-700/60 text-red-300 text-xs font-medium">
                            {progressError}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Category *</label>
                            <select
                              value={progressData.category}
                              onChange={(e) => setProgressData({ ...progressData, category: e.target.value })}
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            >
                              <option value="Academic">Academic 📚</option>
                              <option value="Extracurricular">Extracurricular 🎨</option>
                              <option value="Internship/Project">Internship / Project 💻</option>
                              <option value="Certificate">Certificate 📜</option>
                              <option value="Sports">Sports 🏆</option>
                              <option value="Other">Other 🌟</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Title *</label>
                            <input
                              type="text"
                              required
                              value={progressData.title}
                              onChange={(e) => setProgressData({ ...progressData, title: e.target.value })}
                              placeholder="e.g. 1st Rank in Semester 4 / AWS Certified"
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Description</label>
                          <textarea
                            rows="2"
                            value={progressData.description}
                            onChange={(e) => setProgressData({ ...progressData, description: e.target.value })}
                            placeholder="Detailed description of achievement or overall progress during the year..."
                            className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Remarks</label>
                            <input
                              type="text"
                              value={progressData.remarks}
                              onChange={(e) => setProgressData({ ...progressData, remarks: e.target.value })}
                              placeholder="Special remarks or feedback"
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Proof / Drive Link</label>
                            <input
                              type="url"
                              value={progressData.proofLink}
                              onChange={(e) => setProgressData({ ...progressData, proofLink: e.target.value })}
                              placeholder="https://drive.google.com/..."
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Other Details</label>
                            <input
                              type="text"
                              value={progressData.other}
                              onChange={(e) => setProgressData({ ...progressData, other: e.target.value })}
                              placeholder="Additional custom notes"
                              className="w-full bg-[#1a1c26] border border-gray-700 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowProgressForm(false)}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={progressSaving}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-md transition"
                          >
                            {progressSaving ? 'Saving...' : 'Create Progress Record'}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Progress Card Grid */}
                    {selectedStudent.progressItems && selectedStudent.progressItems.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedStudent.progressItems.map((item) => (
                          <div
                            key={item._id}
                            className="bg-[#1a1c26] border border-gray-800 rounded-xl p-4 flex flex-col justify-between relative group hover:border-indigo-500/50 transition shadow-sm"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(item.category)}`}>
                                  {item.category}
                                </span>
                                <button
                                  onClick={() => handleDeleteProgress(item._id)}
                                  className="text-gray-500 hover:text-red-400 p-1 rounded-md transition"
                                  title="Delete Progress Record"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>

                              {item.description && (
                                <p className="text-xs text-gray-300 mb-2 leading-relaxed">{item.description}</p>
                              )}

                              {item.remarks && (
                                <div className="bg-[#141620] p-2 rounded-lg border border-gray-800 text-[11px] text-gray-400 mb-2">
                                  <span className="font-semibold text-indigo-400">Remarks: </span>{item.remarks}
                                </div>
                              )}

                              {item.other && (
                                <div className="text-[11px] text-gray-400 mb-2">
                                  <span className="font-semibold text-gray-300">Other: </span>{item.other}
                                </div>
                              )}
                            </div>

                            {item.proofLink && (
                              <div className="pt-2 border-t border-gray-800/80 mt-2">
                                <a
                                  href={item.proofLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                                >
                                  <ExternalLink size={13} /> View Proof / Link
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-[#1a1c26] border border-gray-800 rounded-xl p-6 text-center text-xs text-gray-500">
                        No progress records added yet. Click "Add Progress Record" above to add overall achievements.
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-[#1a1c26] p-4 border-t border-gray-800 flex justify-end rounded-b-2xl">
              <button
                onClick={() => { setSelectedStudent(null); setIsEditing(false); }}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-xs"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
