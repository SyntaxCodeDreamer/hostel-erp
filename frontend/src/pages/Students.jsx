import React, { useEffect, useState, useContext, useMemo, useRef } from 'react';
import apiClient from '../utils/apiClient';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Eye, X, Phone, MapPin, GraduationCap, Edit3, Save, CheckCircle, ExternalLink, Link as LinkIcon, TrendingUp, Plus, Trash2, Award, FileText, Search, ShieldCheck, CheckCircle2, FileSpreadsheet, Upload, User, KeyRound, Calendar, Clock, AlertTriangle, UserCheck } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import AdminResetPasswordModal from '../components/AdminResetPasswordModal';
import * as XLSX from 'xlsx';

const Students = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saveSuccess, setSaveSuccess] = useState('');
  const [studentLeaveCount, setStudentLeaveCount] = useState(0);
  const [leavesList, setLeavesList] = useState([]);
  const [resetModalUser, setResetModalUser] = useState(null);
  const [leadersList, setLeadersList] = useState([]);
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';
  const location = useLocation();
  const navigate = useNavigate();
  const fetchedStudentIdRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
  const [suspendModal, setSuspendModal] = useState({
    isOpen: false,
    student: null,
    suspendedFrom: '',
    suspendedUntil: '',
    suspensionReason: '',
    loading: false,
    error: ''
  });

  const isStudent = (user?.role || '').toLowerCase() === 'student';
  const isAdmin = (user?.role || '').toLowerCase() === 'admin';
  const isLeader = (user?.role || '').toLowerCase() === 'leader';
  const isTrustMember = ['trust member', 'trustee'].includes((user?.role || '').toLowerCase());
  const canManageProgress = !isTrustMember;

  const isOwnProfile = !selectedStudent || !user || 
    (selectedStudent.userId?._id ? selectedStudent.userId._id.toString() === (user._id || user.id).toString() : (selectedStudent.userId?.toString() === (user._id || user.id).toString()));

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
    const studentIdStr = (student._id || student.id || '').toString();

    const studentLeaves = (Array.isArray(leavesList) ? leavesList : []).filter(l => {
      const lStudentId = (l.studentId?._id || l.studentId || '').toString();
      return lStudentId === studentIdStr && (l.status === 'Approved' || l.status === 'approved');
    });

    let sumDays = 0;
    studentLeaves.forEach(l => {
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

    // Check if there were legacy pre-ERP prior leave days entered on the student's earliest leave request
    let initialPriorDays = 0;
    if (studentLeaves.length > 0) {
      const sorted = [...studentLeaves].sort((a, b) => new Date(a.createdAt || a.fromDate) - new Date(b.createdAt || b.fromDate));
      initialPriorDays = Number(sorted[0].previousLeaveDays || 0);
    } else if (student.previousLeaveDays) {
      initialPriorDays = Number(student.previousLeaveDays || 0);
    }

    return sumDays + initialPriorDays;
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

  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  const handleOpenMyProfile = async () => {
    try {
      setLoading(true);
      const { data: myProfile } = await apiClient.get('/students/me');
      if (myProfile) {
        handleViewProfile(myProfile);
      }
    } catch (err) {
      console.error('Error fetching own student profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppointAsLeader = async (student) => {
    if (!student) return;
    const sName = getStudentName(student);
    const confirmAppoint = window.confirm(`Appoint ${sName} as a Hostel Leader?`);
    if (!confirmAppoint) return;
    try {
      await apiClient.post('/trust/leaders', {
        studentId: student._id,
        name: sName,
        email: getStudentEmail(student),
        contactNumber: student.mobile || '',
        role: 'Leader'
      });
      alert(`${sName} has been appointed as Hostel Leader!`);
      if (student.userId && typeof student.userId === 'object') {
        student.userId.role = 'Leader';
      }
      setSelectedStudent(prev => ({
        ...prev,
        userId: typeof prev.userId === 'object' ? { ...prev.userId, role: 'Leader' } : { role: 'Leader' }
      }));
      fetchStudents();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to appoint student as leader');
    }
  };

  const handleCloseProfile = () => {
    fetchedStudentIdRef.current = null;
    setSelectedStudent(null);
    setIsEditing(false);
    if (location.search.includes('studentId') || location.search.includes('view=')) {
      navigate('/students', { replace: true });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedStudent) {
        handleCloseProfile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStudent, location.search]);

  useEffect(() => {
    fetchStudents(currentPage, searchQuery);
    if (isLeader && location.search.includes('view=me')) {
      handleOpenMyProfile();
    }
    const params = new URLSearchParams(location.search);
    const sId = params.get('studentId');
    if (sId && sId !== fetchedStudentIdRef.current) {
      fetchedStudentIdRef.current = sId;
      apiClient.get(`/students/${sId}`).then(res => {
        if (res.data) handleViewProfile(res.data);
      }).catch(console.error);
    } else if (!sId) {
      fetchedStudentIdRef.current = null;
    }
    const qSearch = params.get('search');
    if (qSearch && qSearch !== searchQuery) {
      setSearchQuery(qSearch);
    }

    // Fetch leaders list for quick viewing of leader profiles
    apiClient.get('/trust/leaders').then(res => {
      setLeadersList(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {});
  }, [currentPage, searchQuery, location.search]);

  const fetchStudents = async (page = currentPage, search = searchQuery) => {
    try {
      const [{ data: studentRes }, { data: leavesData }] = await Promise.all([
        apiClient.get('/students', { params: { page, limit: itemsPerPage, search } }),
        apiClient.get('/leaves').catch(() => ({ data: [] }))
      ]);

      let studentArr = [];
      if (studentRes && Array.isArray(studentRes.students)) {
        studentArr = studentRes.students;
        setStudents(studentArr);
        setTotalStudentsCount(studentRes.total || studentArr.length);
      } else if (Array.isArray(studentRes)) {
        studentArr = studentRes;
        setStudents(studentArr);
        setTotalStudentsCount(studentArr.length);
      } else {
        setStudents([]);
        setTotalStudentsCount(0);
      }

      if (Array.isArray(leavesData)) {
        setLeavesList(leavesData);
      }

      // If user is a Student, automatically select their profile only if not viewing a specific student profile
      const params = new URLSearchParams(window.location.search);
      const urlSId = params.get('studentId');
      if (isStudent && studentArr.length > 0 && !urlSId) {
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
      const currentLeaves = leavesList.length > 0 ? leavesList : (await apiClient.get('/leaves').catch(() => ({ data: [] }))).data || [];
      if (Array.isArray(currentLeaves) && leavesList.length === 0) {
        setLeavesList(currentLeaves);
      }
      const approvedCount = (Array.isArray(currentLeaves) ? currentLeaves : []).filter(
        (l) => (l.studentId?._id === student._id || l.studentId === student._id) && (l.status === 'Approved' || l.status === 'approved')
      ).length;
      setStudentLeaveCount(approvedCount);
    } catch (err) {
      console.error('Error calculating student leave stats:', err);
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

  const formatSuspensionRange = (from, until) => {
    if (!until && !from) return 'Indefinitely';
    const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    if (from && until) {
      return `From ${fmt(from)} till ${fmt(until)}`;
    }
    if (until) {
      return `Until ${fmt(until)}`;
    }
    return `From ${fmt(from)}`;
  };

  const openSuspendModal = (student) => {
    if (!student) return;
    const isCurrentlySuspended = (student.status || '').toLowerCase() === 'suspended' || !!student.suspendedUntil;
    if (isCurrentlySuspended && !isAdmin) {
      alert('This student is suspended and cannot be modified.');
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    let defaultFrom = today;
    let defaultUntil = '';

    if (student.suspendedFrom) {
      try {
        defaultFrom = new Date(student.suspendedFrom).toISOString().split('T')[0];
      } catch (e) {
        defaultFrom = today;
      }
    }

    if (student.suspendedUntil) {
      try {
        defaultUntil = new Date(student.suspendedUntil).toISOString().split('T')[0];
      } catch (e) {
        defaultUntil = '';
      }
    } else {
      const defaultUntilDate = new Date();
      defaultUntilDate.setDate(defaultUntilDate.getDate() + 3);
      defaultUntil = defaultUntilDate.toISOString().split('T')[0];
    }

    setSuspendModal({
      isOpen: true,
      student,
      suspendedFrom: defaultFrom,
      suspendedUntil: defaultUntil,
      suspensionReason: student.suspensionReason || '',
      loading: false,
      error: ''
    });
  };

  const handleConfirmSuspend = async (e) => {
    e?.preventDefault();
    if (!suspendModal.student) return;
    const isCurrentlySuspended = (suspendModal.student.status || '').toLowerCase() === 'suspended' || !!suspendModal.student.suspendedUntil;
    if (isCurrentlySuspended && !isAdmin) {
      alert('This student is suspended and cannot be modified.');
      return;
    }
    if (!suspendModal.suspendedFrom) {
      setSuspendModal(prev => ({ ...prev, error: 'Please choose the start date (From Date).' }));
      return;
    }
    if (!suspendModal.suspendedUntil) {
      setSuspendModal(prev => ({ ...prev, error: 'Please choose the end date (Till Date).' }));
      return;
    }
    if (new Date(suspendModal.suspendedUntil) < new Date(suspendModal.suspendedFrom)) {
      setSuspendModal(prev => ({ ...prev, error: 'Till Date cannot be earlier than From Date.' }));
      return;
    }

    setSuspendModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await apiClient.put(`/students/${suspendModal.student._id}`, {
        status: 'Suspended',
        isManualStatus: true,
        suspendedFrom: suspendModal.suspendedFrom,
        suspendedUntil: suspendModal.suspendedUntil,
        suspensionReason: suspendModal.suspensionReason || ''
      });

      const updated = res.data;
      if (selectedStudent && (selectedStudent._id === suspendModal.student._id)) {
        setSelectedStudent(updated);
      }
      setSuspendModal({ isOpen: false, student: null, suspendedFrom: '', suspendedUntil: '', suspensionReason: '', loading: false, error: '' });
      fetchStudents();
    } catch (err) {
      console.error('Error suspending student:', err);
      setSuspendModal(prev => ({ 
        ...prev, 
        loading: false, 
        error: err.response?.data?.message || 'Failed to suspend student. Please try again.' 
      }));
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedStudent) return;
    const isCurrentlySuspended = (selectedStudent.status || '').toLowerCase() === 'suspended' || !!selectedStudent.suspendedUntil;
    if (isCurrentlySuspended && !isAdmin) {
      alert('This student is suspended and cannot be modified.');
      return;
    }
    if (newStatus === 'Suspended') {
      openSuspendModal(selectedStudent);
      return;
    }
    try {
      const isManual = newStatus === 'On Leave';
      const res = await apiClient.put(`/students/${selectedStudent._id}`, { 
        status: newStatus,
        isManualStatus: isManual,
        suspendedFrom: null,
        suspendedUntil: null,
        suspensionReason: ''
      });
      setSelectedStudent(res.data);
      fetchStudents();
    } catch (err) {
      console.error('Error updating status:', err);
      alert(err.response?.data?.message || 'Error updating status');
    }
  };

  const getStudentName = (student) => {
    return student.fullName || student.name || student.userId?.name || student.userId?.email || 'Student Resident';
  };

  const getStudentEmail = (student) => {
    return student.userId?.email || student.email || 'No email provided';
  };

  const parseLeaveStartDateTime = (fromDate, fromTime) => {
    if (!fromDate) return null;
    const d = new Date(fromDate);
    if (isNaN(d.getTime())) return null;

    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();

    let hours = 0;
    let minutes = 0;

    if (fromTime && typeof fromTime === 'string' && fromTime.trim()) {
      const raw = fromTime.trim();
      const isPM = /pm/i.test(raw);
      const isAM = /am/i.test(raw);
      const parts = raw.replace(/[^\d:]/g, '').split(':');
      if (parts.length >= 1) {
        let h = parseInt(parts[0], 10);
        let m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
        if (!isNaN(h)) {
          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;
          hours = h;
        }
        if (!isNaN(m)) minutes = m;
      }
    }

    return new Date(year, month, day, hours, minutes, 0, 0);
  };

  const parseLeaveEndDateTime = (toDate, toTime) => {
    if (!toDate) return null;
    const d = new Date(toDate);
    if (isNaN(d.getTime())) return null;

    const year = d.getUTCFullYear();
    const month = d.getUTCMonth();
    const day = d.getUTCDate();

    let hours = 23;
    let minutes = 59;
    let seconds = 59;

    if (toTime && typeof toTime === 'string' && toTime.trim()) {
      const raw = toTime.trim();
      const isPM = /pm/i.test(raw);
      const isAM = /am/i.test(raw);
      const parts = raw.replace(/[^\d:]/g, '').split(':');
      if (parts.length >= 1) {
        let h = parseInt(parts[0], 10);
        let m = parts.length >= 2 ? parseInt(parts[1], 10) : 0;
        if (!isNaN(h)) {
          if (isPM && h < 12) h += 12;
          if (isAM && h === 12) h = 0;
          hours = h;
          seconds = 0;
        }
        if (!isNaN(m)) minutes = m;
      }
    }

    return new Date(year, month, day, hours, minutes, seconds, 999);
  };

  const isStudentOnActiveLeave = (student) => {
    if (!student) return false;
    const studentIdStr = (student._id || student.id || '').toString();
    if (!studentIdStr || !Array.isArray(leavesList) || leavesList.length === 0) {
      return (student.status || '').toLowerCase() === 'on leave';
    }

    const now = new Date();
    const approvedLeaves = leavesList.filter(l => {
      const lStudentId = (l.studentId?._id || l.studentId || '').toString();
      return lStudentId === studentIdStr && (l.status === 'Approved' || l.status === 'approved');
    });

    if (approvedLeaves.length === 0) return false;

    return approvedLeaves.some(l => {
      const start = parseLeaveStartDateTime(l.fromDate, l.fromTime);
      const end = parseLeaveEndDateTime(l.toDate, l.toTime);
      return start && end && now >= start && now <= end;
    });
  };

  const getStudentStatus = (student) => {
    const raw = (student?.status || 'Available').toString();
    if (raw.toLowerCase() === 'suspended') return 'Suspended';
    if (raw.toLowerCase() === 'in-active' || raw.toLowerCase() === 'inactive' || raw.toLowerCase() === 'left') return 'In-Active';
    // Respect explicit/manual 'On Leave' status
    if (raw.toLowerCase() === 'on leave' || raw.toLowerCase() === 'onleave') return 'On Leave';
    
    // Check real-time active status against leaving time
    if (isStudentOnActiveLeave(student)) {
      return 'On Leave';
    }
    
    return 'Available';
  };

  const formatDateTimeDisplay = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    const dateStr = dateObj.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const timeStr = dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    return `${dateStr} at ${timeStr}`;
  };

  const getStudentLeaveSchedule = (student) => {
    if (!student) return null;
    const studentIdStr = (student._id || student.id || '').toString();
    const studentLeaves = (Array.isArray(leavesList) ? leavesList : []).filter((l) => {
      const lStudentId = (l.studentId?._id || l.studentId || '').toString();
      return lStudentId === studentIdStr;
    });

    const now = new Date();
    const approved = studentLeaves.filter((l) => (l.status || '').toLowerCase() === 'approved');

    // 1. Currently active approved leave
    const active = approved.find((l) => {
      const start = parseLeaveStartDateTime(l.fromDate, l.fromTime);
      const end = parseLeaveEndDateTime(l.toDate, l.toTime);
      return start && end && now >= start && now <= end;
    });

    if (active) {
      const start = parseLeaveStartDateTime(active.fromDate, active.fromTime);
      const end = parseLeaveEndDateTime(active.toDate, active.toTime);
      return {
        type: 'active',
        badge: 'Currently On Leave',
        title: 'Active Leave',
        departureText: formatDateTimeDisplay(start),
        returnText: formatDateTimeDisplay(end),
        departureDateAndTime: `Departed: ${formatDateTimeDisplay(start)}`,
        returnDateAndTime: `Expected Return: ${formatDateTimeDisplay(end)}`,
        reason: active.reason || '',
        destination: active.destination || '',
        emergencyContact: active.emergencyContact || ''
      };
    }

    // 2. Upcoming approved leave
    const upcomingList = approved
      .map((l) => ({
        leave: l,
        start: parseLeaveStartDateTime(l.fromDate, l.fromTime),
        end: parseLeaveEndDateTime(l.toDate, l.toTime)
      }))
      .filter((item) => item.start && item.start > now)
      .sort((a, b) => a.start - b.start);

    if (upcomingList.length > 0) {
      const up = upcomingList[0];
      return {
        type: 'upcoming',
        badge: 'Upcoming Leave',
        title: 'Upcoming Leave Scheduled',
        departureText: formatDateTimeDisplay(up.start),
        returnText: formatDateTimeDisplay(up.end),
        departureDateAndTime: `Leaves on: ${formatDateTimeDisplay(up.start)}`,
        returnDateAndTime: `Expected Return: ${formatDateTimeDisplay(up.end)}`,
        reason: up.leave.reason || '',
        destination: up.leave.destination || '',
        emergencyContact: up.leave.emergencyContact || ''
      };
    }

    // 3. Pending leave request
    const pendingList = studentLeaves
      .filter((l) => (l.status || '').toLowerCase() === 'pending')
      .map((l) => ({
        leave: l,
        start: parseLeaveStartDateTime(l.fromDate, l.fromTime),
        end: parseLeaveEndDateTime(l.toDate, l.toTime)
      }))
      .sort((a, b) => (a.start || 0) - (b.start || 0));

    if (pendingList.length > 0) {
      const pen = pendingList[0];
      return {
        type: 'pending',
        badge: 'Pending Request',
        title: 'Leave Request Pending Review',
        departureText: formatDateTimeDisplay(pen.start),
        returnText: formatDateTimeDisplay(pen.end),
        departureDateAndTime: `Requested Departure: ${formatDateTimeDisplay(pen.start)}`,
        returnDateAndTime: `Requested Return: ${formatDateTimeDisplay(pen.end)}`,
        reason: pen.leave.reason || '',
        destination: pen.leave.destination || '',
        emergencyContact: pen.leave.emergencyContact || ''
      };
    }

    return null;
  };



  const filteredStudents = students;
  const totalPages = Math.ceil(totalStudentsCount / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedStudents = students;

  const exportStudentsToExcel = async () => {
    try {
      const { data: fullRes } = await apiClient.get('/students');
      const allStudents = Array.isArray(fullRes) ? fullRes : (fullRes.students || []);
      if (!allStudents || allStudents.length === 0) return;

      const data = allStudents.map((s, idx) => ({
        '#': idx + 1,
        'Name': getStudentName(s),
        'Email': getStudentEmail(s),
        'Status': getStudentStatus(s),
        'Mobile': s.mobile || s.mobileNumber || '',
        'Parents Mobile': s.parentsMobile || s.parentMobile || '',
        'Room Number': s.roomNumber || 'Unassigned',
        'Course': s.course || '',
        'College Name': s.collegeName || '',
        'Village / Town': s.village || '',
        'Driving License': s.drivingLicense ? 'Yes' : 'No',
        'Home Address': s.homeAddress || '',
        'Other Course / Job': s.otherCourseOrJob || ''
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students Directory');
      XLSX.writeFile(wb, `Hostel_Students_Directory_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      console.error('Error exporting students:', err);
    }
  };

  const handleImportExcel = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          alert('No records found in uploaded Excel sheet.');
          return;
        }

        let importedCount = 0;
        for (const row of rawData) {
          const payload = {
            fullName: row.Name || row['Full Name'] || row.FullName || row['Student Name'] || 'Student',
            email: row.Email || row['Email Address'] || `student_${Date.now()}_${Math.floor(Math.random()*1000)}@hostel.com`,
            mobile: String(row.Mobile || row['Mobile Number'] || row['Phone'] || ''),
            parentsMobile: String(row['Parents Mobile'] || row['Emergency Contact'] || ''),
            roomNumber: String(row['Room Number'] || row['Room'] || ''),
            course: String(row.Course || ''),
            collegeName: String(row['College Name'] || row.College || ''),
            village: String(row['Village / Town'] || row.Village || ''),
            drivingLicense: String(row['Driving License'] || '').toLowerCase() === 'yes',
            homeAddress: String(row['Home Address'] || row.Address || ''),
            status: String(row.Status || 'active').toLowerCase()
          };

          try {
            await apiClient.post('/students', payload);
            importedCount++;
          } catch (err) {
            console.error('Error importing row:', row, err);
          }
        }

        setSaveSuccess(`Successfully imported ${importedCount} students from Excel!`);
        fetchStudents();
        setTimeout(() => setSaveSuccess(''), 4000);
      } catch (err) {
        console.error('Excel parse error:', err);
        alert('Failed to parse Excel sheet. Please ensure it is a valid .xlsx or .csv file.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-2 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{isStudent ? (isOwnProfile ? 'My Student Profile' : 'Hostel Leader Profile') : 'Students'}</h1>
          <p className="text-sm opacity-70">{isStudent ? (isOwnProfile ? 'View and update your personal hostel details' : 'Residency details and records of appointed hostel leader.') : 'Manage and track student resident records.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isStudent && !isOwnProfile && (
            <button
              onClick={handleOpenMyProfile}
              className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <User size={15} />
              Back to My Profile
            </button>
          )}
          {isLeader && (
            <button
              onClick={handleOpenMyProfile}
              className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
            >
              <User size={15} />
              My Student Profile
            </button>
          )}
          {isAdmin && (
            <Link 
              to="/students/add" 
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition shadow-sm"
            >
              + Add Student
            </Link>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <CheckCircle size={18} />
          {saveSuccess}
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Loading Student Records..." />
      ) : isStudent ? (
        /* INLINE STUDENT PROFILE VIEW FOR STUDENTS */
        <div className="space-y-6">
          {leadersList.length > 0 && (
            <div className={`p-4 rounded-2xl border ${
              isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200 shadow-xs'
            }`}>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-500" />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Appointed Hostel Leaders
                  </h3>
                </div>
                <span className="text-[11px] text-gray-500 font-medium">
                  Click any leader to view their student profile
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {leadersList.map((ldr) => {
                  const lStudent = ldr.student || (typeof ldr.studentId === 'object' ? ldr.studentId : null);
                  const lName = ldr.name || ldr.userId?.name || lStudent?.fullName || 'Leader';
                  const isSelected = selectedStudent && lStudent && selectedStudent._id === lStudent._id;
                  return (
                    <div
                      key={ldr._id}
                      onClick={() => {
                        if (lStudent) {
                          handleViewProfile(lStudent);
                        } else if (ldr.studentId) {
                          apiClient.get(`/students/${ldr.studentId}`).then(res => {
                            if (res.data) handleViewProfile(res.data);
                          }).catch(console.error);
                        }
                      }}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected
                          ? 'border-amber-500/60 bg-amber-500/10 shadow-xs'
                          : isDark
                          ? 'bg-[#1a1c26] border-gray-800 hover:border-indigo-500/50 hover:bg-gray-800/50'
                          : 'bg-gray-50 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          {lName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{lName}</p>
                          <p className="text-[11px] text-amber-500 font-semibold">{ldr.role || 'Hostel Leader'}</p>
                          {lStudent?.roomNumber && (
                            <p className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Room {lStudent.roomNumber}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                        View Profile
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {selectedStudent ? (
            <div className={`rounded-2xl shadow-xl border overflow-hidden transition ${isDark ? 'bg-[#14161f] text-gray-100 border-gray-800/80' : 'bg-white text-gray-900 border-gray-200'}`}>
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
                      {(selectedStudent.userId?.role || '').toLowerCase() === 'leader' && (
                        <span className="bg-amber-400 text-amber-950 font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                          <ShieldCheck size={12} /> Appointed Leader
                        </span>
                      )}
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1 ${
                        getStudentStatus(selectedStudent) === 'Suspended'
                          ? 'bg-rose-600 text-white border border-rose-400 shadow-sm'
                          : getStudentStatus(selectedStudent) === 'On Leave'
                          ? 'bg-amber-600 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}>
                        {getStudentStatus(selectedStudent) === 'Suspended' && <AlertTriangle size={12} />}
                        Status: {getStudentStatus(selectedStudent)}
                      </span>
                    </div>
                  </div>
                </div>

                {!isEditing && isOwnProfile && (
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
              {/* Suspended Alert Banner for Student Profile */}
              {(getStudentStatus(selectedStudent) === 'Suspended' || selectedStudent.status === 'Suspended' || selectedStudent.suspendedFrom || selectedStudent.suspendedUntil) && (
                <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start gap-4 transition shadow-md ${
                  isDark 
                    ? 'bg-rose-950/50 border-rose-700/60 text-rose-200' 
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-500 shrink-0 mt-0.5 border border-rose-500/30">
                    <AlertTriangle size={26} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-rose-600 text-white">
                        Account Suspended
                      </span>
                    </div>
                    <h3 className={`text-base sm:text-lg font-extrabold mt-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Your student residency account is currently suspended
                    </h3>
                    <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>
                      Suspension Period: <span className="font-extrabold underline text-rose-400 dark:text-rose-200">{formatSuspensionRange(selectedStudent.suspendedFrom, selectedStudent.suspendedUntil)}</span>
                    </p>
                    {selectedStudent.suspensionReason && (
                      <div className={`mt-2.5 p-3 rounded-xl border text-xs italic ${
                        isDark ? 'bg-rose-950/80 border-rose-800/60 text-rose-200' : 'bg-white border-rose-200 text-rose-900'
                      }`}>
                        <span className="font-bold not-italic text-rose-500">Reason / Notes: </span>
                        "{selectedStudent.suspensionReason}"
                      </div>
                    )}
                    <p className={`text-xs mt-2.5 opacity-85 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      Notice: During suspension, leave submissions are disabled. Please contact your hostel warden or administration office for assistance.
                    </p>
                  </div>
                </div>
              )}
              {/* EDIT FORM */}
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 size={16} /> Edit My Personal Details
                  </h3>
                  
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Student Mobile</label>
                      <input
                        type="text"
                        value={editForm.mobile}
                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="Mobile number..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Parents / Emergency Mobile</label>
                      <input
                        type="text"
                        value={editForm.parentsMobile}
                        onChange={(e) => setEditForm({ ...editForm, parentsMobile: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="Emergency contact..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Native Village / Town</label>
                      <input
                        type="text"
                        value={editForm.village}
                        onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="Village name..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Driving License</label>
                      <select
                        value={editForm.drivingLicense ? 'yes' : 'no'}
                        onChange={(e) => setEditForm({ ...editForm, drivingLicense: e.target.value === 'yes' })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes (Available)</option>
                      </select>
                    </div>
                    {editForm.drivingLicense && (
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold uppercase mb-1 flex items-center gap-1.5 text-indigo-400">
                          <LinkIcon size={14} /> Driving License Proof (Google Drive Link)
                        </label>
                        <input
                          type="url"
                          value={editForm.drivingLicenseProofUrl || ''}
                          onChange={(e) => setEditForm({ ...editForm, drivingLicenseProofUrl: e.target.value })}
                          className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                          placeholder="https://drive.google.com/file/d/... or document URL"
                        />
                        <p className="text-[11px] text-gray-500 mt-1">Paste the Google Drive link or document URL for your Driving License proof.</p>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Full Home Address</label>
                      <textarea
                        rows="2"
                        value={editForm.homeAddress}
                        onChange={(e) => setEditForm({ ...editForm, homeAddress: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="Full street address..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase mb-1 flex items-center gap-1.5 text-indigo-500">
                        <LinkIcon size={14} /> Exam Results Drive Link
                      </label>
                      <input
                        type="url"
                        value={editForm.resultDriveLink || editForm.resultUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, resultDriveLink: e.target.value, resultUrl: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="https://drive.google.com/file/d/... or Google Drive folder URL"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Paste your Google Drive link or document URL for your exam results.</p>
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Enrolled Course</label>
                      <input
                        type="text"
                        value={editForm.course}
                        onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="e.g. B.Tech Computer Science..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>College Name</label>
                      <input
                        type="text"
                        value={editForm.collegeName}
                        onChange={(e) => setEditForm({ ...editForm, collegeName: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                        placeholder="College / Institute name..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Other Course / Job Details</label>
                      <input
                        type="text"
                        value={editForm.otherCourseOrJob}
                        onChange={(e) => setEditForm({ ...editForm, otherCourseOrJob: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
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
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-900'}`}>
                      <GraduationCap size={16} className={isDark ? "text-indigo-400" : "text-indigo-600"} /> Academic Information
                    </h3>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${
                      isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-slate-100/80 border-slate-300 shadow-xs'
                    }`}>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Enrolled Course</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.course || 'N/A'}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>College / Institute</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.collegeName || 'N/A'}</p>
                      </div>
                      {(selectedStudent.otherCourseOrJob || selectedStudent.otherCourseOrJobPlace) && (
                        <div className="sm:col-span-2">
                          <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Other Course / Job Details</p>
                          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.otherCourseOrJob || selectedStudent.otherCourseOrJobPlace}</p>
                        </div>
                      )}
                      {(selectedStudent.resultDriveLink || selectedStudent.resultUrl || (selectedStudent.resultUrls && selectedStudent.resultUrls.length > 0)) && (
                        <div className="sm:col-span-2">
                          <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>
                            <LinkIcon size={14} className={isDark ? "text-indigo-400" : "text-indigo-600"} /> Exam Results Drive Link
                          </p>
                          <a 
                            href={selectedStudent.resultDriveLink || selectedStudent.resultUrl || selectedStudent.resultUrls?.[0]} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                              isDark ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-300'
                            }`}
                          >
                            <ExternalLink size={16} /> Open Results in Google Drive
                          </a>
                        </div>
                      )}
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Joining Date</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.joiningMonth || 'August'} {selectedStudent.joiningYear || 2024}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Total Approved Leave Days</p>
                        <p className={`text-sm font-extrabold ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                          {calculateStudentTotalLeaveDays(selectedStudent)} Days
                        </p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Residency Status</p>
                        <span className={`mt-1 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${
                          getStudentStatus(selectedStudent) === 'Suspended'
                            ? 'bg-rose-950/90 text-rose-400 border-rose-800/70'
                            : getStudentStatus(selectedStudent) === 'On Leave'
                            ? 'bg-amber-950/90 text-amber-400 border-amber-800/70'
                            : 'bg-emerald-950/90 text-emerald-400 border-emerald-800/70'
                        }`}>
                          {getStudentStatus(selectedStudent) === 'Suspended' && <AlertTriangle size={12} />}
                          {getStudentStatus(selectedStudent)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Contact Information */}
                  <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-900'}`}>
                      <Phone size={16} className={isDark ? "text-indigo-400" : "text-indigo-600"} /> Contact Details
                    </h3>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${
                      isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-slate-100/80 border-slate-300 shadow-xs'
                    }`}>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Student Mobile Number</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.mobile || selectedStudent.mobileNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Parents / Emergency Mobile</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.parentsMobile || selectedStudent.parentsMobileNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 3: Address & Location */}
                  <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-900'}`}>
                      <MapPin size={16} className={isDark ? "text-indigo-400" : "text-indigo-600"} /> Address & Location
                    </h3>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${
                      isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-slate-100/80 border-slate-300 shadow-xs'
                    }`}>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Native Village / Town</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.village || 'N/A'}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Driving License</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {selectedStudent.drivingLicense ? 'Yes (Available)' : 'No'}
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Full Home Address</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.homeAddress || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 4: Custom Yearly Progress & Accomplishments Section */}
                  <div className={`pt-2 border-t mt-2 ${isDark ? 'border-gray-800/80' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Award size={16} className="text-indigo-400" /> Yearly Overall Progress & Accomplishments
                      </h3>
                      {isOwnProfile && (
                        <button
                          onClick={() => setShowProgressForm(!showProgressForm)}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                        >
                          <Plus size={14} /> {showProgressForm ? 'Close Form' : 'Add Progress Record'}
                        </button>
                      )}
                    </div>

                    {/* Progress Creation Form */}
                    {showProgressForm && (
                      <form onSubmit={handleAddProgress} className={`p-4 rounded-xl border mb-4 space-y-4 shadow-lg ${
                        isDark ? 'bg-[#141622] border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'
                      }`}>
                        <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1">
                          <TrendingUp size={14} /> Add New Progress Record
                        </h4>

                        {progressError && (
                          <div className="p-2 rounded-lg bg-red-900/40 border border-red-700/60 text-red-300 text-xs font-medium">
                            {progressError}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Category *</label>
                            <select
                              value={progressData.category}
                              onChange={(e) => setProgressData({ ...progressData, category: e.target.value })}
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
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
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Title *</label>
                            <input
                              type="text"
                              required
                              value={progressData.title}
                              onChange={(e) => setProgressData({ ...progressData, title: e.target.value })}
                              placeholder="e.g. 1st Rank in Semester 4 / AWS Certified"
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
                          <textarea
                            rows="2"
                            value={progressData.description}
                            onChange={(e) => setProgressData({ ...progressData, description: e.target.value })}
                            placeholder="Detailed description of achievement or overall progress during the year..."
                            className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                              isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Remarks</label>
                            <input
                              type="text"
                              value={progressData.remarks}
                              onChange={(e) => setProgressData({ ...progressData, remarks: e.target.value })}
                              placeholder="Special remarks or feedback"
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Proof / Drive Link</label>
                            <input
                              type="url"
                              value={progressData.proofLink}
                              onChange={(e) => setProgressData({ ...progressData, proofLink: e.target.value })}
                              placeholder="https://drive.google.com/..."
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Other Details</label>
                            <input
                              type="text"
                              value={progressData.other}
                              onChange={(e) => setProgressData({ ...progressData, other: e.target.value })}
                              placeholder="Additional custom notes"
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowProgressForm(false)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                              isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={progressSaving}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-md transition flex items-center gap-1.5"
                          >
                            {progressSaving ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Saving...
                              </>
                            ) : (
                              'Create Progress Record'
                            )}
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
                            className={`border rounded-xl p-4 flex flex-col justify-between relative group transition shadow-sm ${
                              isDark ? 'bg-[#1a1c26] border-gray-800 hover:border-indigo-500/50' : 'bg-gray-50 border-gray-200 hover:border-indigo-400'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(item.category)}`}>
                                  {item.category}
                                </span>
                                {isOwnProfile && (
                                  <button
                                    onClick={() => handleDeleteProgress(item._id)}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-md transition"
                                    title="Delete Progress Record"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>

                              <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h4>

                              {item.description && (
                                <p className={`text-xs mb-2 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.description}</p>
                              )}

                              {item.remarks && (
                                <div className={`p-2 rounded-lg border text-[11px] mb-2 ${
                                  isDark ? 'bg-[#141620] border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-600'
                                }`}>
                                  <span className="font-semibold text-indigo-500">Remarks: </span>{item.remarks}
                                </div>
                              )}

                              {item.other && (
                                <div className={`text-[11px] mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Other: </span>{item.other}
                                </div>
                              )}
                            </div>

                            {item.proofLink && (
                              <div className={`pt-2 border-t mt-2 ${isDark ? 'border-gray-800/80' : 'border-gray-200'}`}>
                                <a
                                  href={item.proofLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 font-semibold transition"
                                >
                                  <ExternalLink size={13} /> View Proof / Link
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`border rounded-xl p-6 text-center text-xs ${
                        isDark ? 'bg-[#1a1c26] border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}>
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
            <GraduationCap className="mx-auto mb-2 text-indigo-400" size={24} />
            <p className="text-sm font-medium">Select a student or leader to view profile</p>
          </div>
        )}
        </div>
      ) : (
        /* ADMIN / LEADER / TRUST MEMBER DIRECTORY TABLE */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className={`absolute left-3.5 top-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by student name, course, or room..."
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:border-indigo-500 transition ${
                  isDark 
                    ? 'bg-[#14161f] border-gray-800 text-white placeholder-gray-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 shadow-xs'
                }`}
              />
            </div>
            <div className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className={`rounded-2xl border overflow-hidden shadow-sm transition ${
            isDark ? 'bg-[#14161f] border-gray-800/80' : 'bg-white border-gray-200'
          }`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800/60">
                <thead className={isDark ? 'bg-[#1a1c26]' : 'bg-gray-50/90'}>
                  <tr>
                    <th className={`px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Student Info</th>
                    <th className={`px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Course & College</th>
                    <th className={`px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Room</th>
                    <th className={`px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Mobile</th>
                    <th className={`px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Status</th>
                    <th className={`px-6 py-3.5 text-center text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-gray-800/60' : 'divide-gray-200'}`}>
                  {paginatedStudents.map((student) => {
                    const sName = getStudentName(student);
                    const sEmail = getStudentEmail(student);
                    const sStatus = getStudentStatus(student);
                    const sMobile = student.mobile || student.mobileNumber || 'N/A';

                    return (
                      <tr key={student._id} onClick={() => handleViewProfile(student)} className={`transition cursor-pointer ${isDark ? 'hover:bg-gray-800/40' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`h-10 w-10 flex-shrink-0 rounded-full border flex items-center justify-center font-bold text-base ${
                              isDark ? 'bg-indigo-900/60 text-indigo-300 border-indigo-700/50' : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                            }`}>
                              {sName.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className={`text-sm font-semibold flex items-center gap-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <span>{sName}</span>
                                {(student.userId?.role || '').toLowerCase() === 'leader' && (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-500 dark:text-amber-400 border border-amber-500/30">Leader</span>
                                )}
                              </div>
                              <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{sEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{student.course || 'N/A'}</div>
                          <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{student.collegeName || 'N/A'}</div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          {student.roomNumber ? `Room ${student.roomNumber}` : 'Unassigned'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{sMobile}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            const leaveSched = getStudentLeaveSchedule(student);
                            return (
                              <div className="flex flex-col items-start gap-1">
                                <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full ${
                                  sStatus === 'Available' || sStatus === 'Active' 
                                    ? isDark ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : sStatus === 'On Leave' || sStatus === 'On leave'
                                    ? isDark ? 'bg-amber-950/80 text-amber-400 border border-amber-800/50' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : sStatus === 'Suspended'
                                    ? isDark ? 'bg-rose-950 text-rose-400 border border-rose-800/60 font-bold' : 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                                    : isDark ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-700 border border-gray-300'
                                }`}>
                                  {sStatus}
                                </span>

                                {sStatus === 'Suspended' && (student.suspendedFrom || student.suspendedUntil) && (
                                  <div className="mt-0.5 max-w-[240px]">
                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 dark:text-rose-400" title={`Suspended: ${formatSuspensionRange(student.suspendedFrom, student.suspendedUntil)}`}>
                                      <Calendar size={11} className="shrink-0 text-rose-500" />
                                      <span className="truncate">{formatSuspensionRange(student.suspendedFrom, student.suspendedUntil)}</span>
                                    </div>
                                  </div>
                                )}

                                {leaveSched && leaveSched.type === 'upcoming' && (
                                  <div className="mt-0.5 max-w-[210px]">
                                    <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-500 dark:text-amber-400" title={`Leaves on: ${leaveSched.departureText} (Return: ${leaveSched.returnText})`}>
                                      <Calendar size={12} className="shrink-0 text-amber-500" />
                                      <span className="truncate">Leaves: {leaveSched.departureText}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleViewProfile(student)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                isDark ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800/50 hover:bg-indigo-900/80' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                              }`}
                            >
                              <Eye size={14} />
                              View Profile
                            </button>
                            {isAdmin && (student.status || '').toLowerCase() === 'suspended' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSuspendModal(student);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                  isDark ? 'bg-rose-900/50 text-rose-300 border-rose-700/60 hover:bg-rose-900/80' : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                                }`}
                                title="Edit Suspension Dates"
                              >
                                <AlertTriangle size={13} />
                                Edit Suspension
                              </button>
                            )}
                            {(isAdmin || isLeader) && (student.status || '').toLowerCase() !== 'suspended' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSuspendModal(student);
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                  isDark ? 'bg-rose-950/40 text-rose-300 border-rose-800/40 hover:bg-rose-900/50' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                }`}
                                title="Suspend Student"
                              >
                                <AlertTriangle size={13} />
                                Suspend
                              </button>
                            )}
                            {isAdmin && (
                              <>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const targetUserId = student.userId?._id || student.userId || student._id;
                                    setResetModalUser({
                                      id: targetUserId,
                                      name: getStudentName(student),
                                      email: getStudentEmail(student),
                                      role: student.userId?.role || 'Student'
                                    });
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                    isDark ? 'bg-amber-950/60 text-amber-300 border-amber-800/50 hover:bg-amber-900/80' : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                  }`}
                                  title="Reset Password"
                                >
                                  <KeyRound size={14} />
                                  Reset Pass
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStudent(student._id);
                                  }}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${
                                    isDark ? 'bg-rose-950/60 text-rose-300 border-rose-800/50 hover:bg-rose-900/80' : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  }`}
                                  title="Delete Student"
                                >
                                  <Trash2 size={14} />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan="6" className={`px-6 py-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        No student records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            {filteredStudents.length > 0 && (
              <div className={`px-4 py-3 sm:px-6 sm:py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
                isDark ? 'bg-[#14161f] border-gray-800 text-gray-400' : 'bg-gray-50/90 border-gray-200 text-gray-600'
              }`}>
                <div className="text-center sm:text-left">
                  Showing <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalStudentsCount === 0 ? 0 : startIndex + 1}</span> to{' '}
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{Math.min(startIndex + itemsPerPage, totalStudentsCount)}</span> of{' '}
                  <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{totalStudentsCount}</span> students
                </div>

                <div className="flex items-center justify-center gap-1.5 w-full sm:w-auto max-w-full overflow-x-auto py-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg border transition font-medium shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDark ? 'border-gray-700 bg-[#1a1c26] text-white hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
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
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg border transition font-medium shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDark ? 'border-gray-700 bg-[#1a1c26] text-white hover:bg-gray-800' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* FULL STUDENT PROFILE MODAL FOR ADMIN / LEADER */}
      {!isStudent && selectedStudent && (
        <div 
          onClick={handleCloseProfile}
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-xs cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border animate-in fade-in zoom-in duration-150 cursor-default ${
            isDark ? 'bg-[#14161f] text-gray-100 border-gray-800' : 'bg-white text-gray-900 border-gray-200'
          }`}>
            
            {/* Modal Header */}
            <div className="relative bg-gradient-to-r from-indigo-700 to-purple-800 text-white p-4 sm:p-6 rounded-t-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                <div className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 rounded-full bg-white/20 border-2 border-white flex items-center justify-center text-xl sm:text-2xl font-bold">
                  {getStudentName(selectedStudent).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 break-words">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold truncate">{getStudentName(selectedStudent)}</h2>
                    {(selectedStudent.userId?.role || '').toLowerCase() === 'leader' && (
                      <span className="bg-amber-400 text-amber-950 font-extrabold text-[10px] sm:text-[11px] px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                        <ShieldCheck size={12} /> Appointed Leader
                      </span>
                    )}
                  </div>
                  <p className="text-indigo-200 text-xs sm:text-sm truncate">{getStudentEmail(selectedStudent)}</p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5">
                    <span className="bg-white/20 text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Room {selectedStudent.roomNumber || 'N/A'}
                    </span>
                    <span className="bg-white/20 text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full font-medium">
                      Status: {getStudentStatus(selectedStudent)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {isAdmin && (selectedStudent.userId?.role || '').toLowerCase() !== 'leader' && (
                  <button
                    type="button"
                    onClick={() => handleAppointAsLeader(selectedStudent)}
                    className="bg-indigo-500/30 hover:bg-indigo-500/40 text-white border border-indigo-300/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-xs"
                    title="Appoint as Hostel Leader"
                  >
                    <UserCheck size={14} />
                    Appoint Leader
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => {
                      const targetUserId = selectedStudent.userId?._id || selectedStudent.userId || selectedStudent._id;
                      setResetModalUser({
                        id: targetUserId,
                        name: getStudentName(selectedStudent),
                        email: getStudentEmail(selectedStudent),
                        role: selectedStudent.userId?.role || 'Student'
                      });
                    }}
                    className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 shadow-xs"
                    title="Reset Password"
                  >
                    <KeyRound size={14} />
                    Reset Password
                  </button>
                )}
                {!isEditing && (isAdmin || isLeader) && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                  >
                    <Edit3 size={14} />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCloseProfile();
                  }}
                  className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition cursor-pointer"
                  title="Close Profile"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-6">
              {saveSuccess && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <CheckCircle2 size={16} />
                  {saveSuccess}
                </div>
              )}

              {/* Status Selector Bar for Admin & Leader */}
              {(isAdmin || (isLeader && getStudentStatus(selectedStudent) !== 'Suspended')) && !isEditing && (
                <div className={`p-3.5 sm:p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-indigo-400 shrink-0" />
                    <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Quick Status Action:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {[{ key: 'Active', label: 'Available' }, 
                      { key: 'On Leave', label: 'On Leave' }, 
                      { key: 'In-Active', label: 'In-Active' },
                      { key: 'Suspended', label: 'Suspended' }
                    ].map((st) => (
                      <button
                        key={st.key}
                        onClick={() => handleStatusChange(st.key)}
                        className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-semibold rounded-lg transition text-center ${
                          getStudentStatus(selectedStudent) === st.label
                            ? st.key === 'Suspended'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-indigo-600 text-white shadow-xs'
                            : isDark
                            ? 'bg-[#222533] border border-gray-700 text-gray-300 hover:bg-gray-800'
                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {st.key === 'Suspended' 
                          ? getStudentStatus(selectedStudent) === 'Suspended' ? 'Suspended (Edit Dates)' : 'Suspend Student'
                          : `Set ${st.label}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suspended Alert Banner */}
              {getStudentStatus(selectedStudent) === 'Suspended' && (
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  isDark ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
                      <AlertTriangle size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Student Account Suspended</span>
                      </div>
                      <p className="text-sm font-bold mt-1">
                        Suspended: <span className="underline">{formatSuspensionRange(selectedStudent.suspendedFrom, selectedStudent.suspendedUntil)}</span>
                      </p>
                      {selectedStudent.suspensionReason && (
                        <p className="text-xs opacity-90 mt-1 italic">
                          Reason: "{selectedStudent.suspensionReason}"
                        </p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => openSuspendModal(selectedStudent)}
                      className={`px-3.5 py-2 text-xs font-bold rounded-xl border transition shrink-0 ${
                        isDark 
                          ? 'bg-rose-900/40 hover:bg-rose-900/60 border-rose-700/50 text-rose-200' 
                          : 'bg-white hover:bg-rose-100 border-rose-300 text-rose-800 shadow-xs'
                      }`}
                    >
                      Change Dates
                    </button>
                  )}
                </div>
              )}

              {/* EDIT FORM */}
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Edit3 size={16} /> Edit Student Profile
                  </h3>
                  
                  <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${
                    isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Student Mobile</label>
                      <input
                        type="text"
                        value={editForm.mobile}
                        onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Mobile number..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Parents / Emergency Mobile</label>
                      <input
                        type="text"
                        value={editForm.parentsMobile}
                        onChange={(e) => setEditForm({ ...editForm, parentsMobile: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Emergency contact..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Native Village / Town</label>
                      <input
                        type="text"
                        value={editForm.village}
                        onChange={(e) => setEditForm({ ...editForm, village: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Village name..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Driving License</label>
                      <select
                        value={editForm.drivingLicense ? 'yes' : 'no'}
                        onChange={(e) => setEditForm({ ...editForm, drivingLicense: e.target.value === 'yes' })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes (Available)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Full Home Address</label>
                      <textarea
                        rows="2"
                        value={editForm.homeAddress}
                        onChange={(e) => setEditForm({ ...editForm, homeAddress: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="Full street address..."
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase mb-1 flex items-center gap-1.5 text-indigo-500">
                        <LinkIcon size={14} /> Exam Results Drive Link
                      </label>
                      <input
                        type="url"
                        value={editForm.resultDriveLink || editForm.resultUrl || ''}
                        onChange={(e) => setEditForm({ ...editForm, resultDriveLink: e.target.value, resultUrl: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="https://drive.google.com/file/d/... or Google Drive folder URL"
                      />
                      <p className="text-[11px] text-gray-500 mt-1">Paste your Google Drive link or document URL for your exam results.</p>
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Enrolled Course</label>
                      <input
                        type="text"
                        value={editForm.course}
                        onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
                        placeholder="e.g. B.Tech Computer Science..."
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>College Name</label>
                      <input
                        type="text"
                        value={editForm.collegeName}
                        onChange={(e) => setEditForm({ ...editForm, collegeName: e.target.value })}
                        className={`w-full border rounded-xl p-2.5 text-sm focus:outline-none focus:border-indigo-500 ${
                          isDark ? 'bg-[#14161f] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                        }`}
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
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-900'}`}>
                      <GraduationCap size={16} className={isDark ? "text-indigo-400" : "text-indigo-600"} /> Academic Information
                    </h3>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${
                      isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-slate-100/80 border-slate-300 shadow-xs'
                    }`}>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Enrolled Course</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.course || 'N/A'}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>College / Institute</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.collegeName || 'N/A'}</p>
                      </div>
                      {(selectedStudent.otherCourseOrJob || selectedStudent.otherCourseOrJobPlace) && (
                        <div className="sm:col-span-2">
                          <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Other Course / Job Details</p>
                          <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.otherCourseOrJob || selectedStudent.otherCourseOrJobPlace}</p>
                        </div>
                      )}
                      {(selectedStudent.resultDriveLink || selectedStudent.resultUrl || (selectedStudent.resultUrls && selectedStudent.resultUrls.length > 0)) && (
                        <div className="sm:col-span-2">
                          <p className={`text-xs font-semibold mb-2 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>
                            <LinkIcon size={14} className={isDark ? "text-indigo-400" : "text-indigo-600"} /> Exam Results Drive Link
                          </p>
                          <a 
                            href={selectedStudent.resultDriveLink || selectedStudent.resultUrl || selectedStudent.resultUrls?.[0]} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition border ${
                              isDark ? 'bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border-indigo-500/30' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-300'
                            }`}
                          >
                            <ExternalLink size={16} /> Open Results in Google Drive
                          </a>
                        </div>
                      )}
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Joining Date</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.joiningMonth || 'August'} {selectedStudent.joiningYear || 2024}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Total Approved Leave Days</p>
                        <p className={`text-sm font-extrabold ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                          {calculateStudentTotalLeaveDays(selectedStudent)} Days
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Contact Information */}
                  <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-900'}`}>
                      <Phone size={16} className={isDark ? "text-indigo-400" : "text-indigo-600"} /> Contact Details
                    </h3>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${
                      isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-slate-100/80 border-slate-300 shadow-xs'
                    }`}>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Student Mobile Number</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.mobile || selectedStudent.mobileNumber || 'N/A'}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Parents / Emergency Mobile</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.parentsMobile || selectedStudent.parentsMobileNumber || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 3: Address & Location */}
                  <div>
                    <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-slate-900'}`}>
                      <MapPin size={16} className={isDark ? "text-indigo-400" : "text-indigo-600"} /> Address & Location
                    </h3>
                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border ${
                      isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-slate-100/80 border-slate-300 shadow-xs'
                    }`}>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Native Village / Town</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.village || 'N/A'}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Driving License</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                          {selectedStudent.drivingLicense ? 'Yes (Available)' : 'No'}
                        </p>
                        {selectedStudent.drivingLicense && selectedStudent.drivingLicenseProofUrl && (
                          <a
                            href={selectedStudent.drivingLicenseProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold mt-1 transition"
                          >
                            <ExternalLink size={13} /> View License Proof (Drive Link)
                          </a>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <p className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-slate-700'}`}>Full Home Address</p>
                        <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{selectedStudent.homeAddress || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Grid 4: Custom Yearly Progress & Accomplishments Section */}
                  <div className={`pt-2 border-t mt-2 ${isDark ? 'border-gray-800/80' : 'border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <Award size={16} className="text-indigo-400" /> Yearly Overall Progress & Accomplishments
                      </h3>
                      {canManageProgress && (
                        <button
                          onClick={() => setShowProgressForm(!showProgressForm)}
                          className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                        >
                          <Plus size={14} /> {showProgressForm ? 'Close Form' : 'Add Progress Record'}
                        </button>
                      )}
                    </div>

                    {/* Progress Creation Form */}
                    {showProgressForm && (
                      <form onSubmit={handleAddProgress} className={`p-4 rounded-xl border mb-4 space-y-4 shadow-lg ${
                        isDark ? 'bg-[#141622] border-indigo-500/30' : 'bg-indigo-50/50 border-indigo-200'
                      }`}>
                        <h4 className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1">
                          <TrendingUp size={14} /> Add New Progress Record
                        </h4>

                        {progressError && (
                          <div className="p-2 rounded-lg bg-red-900/40 border border-red-700/60 text-red-300 text-xs font-medium">
                            {progressError}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Category *</label>
                            <select
                              value={progressData.category}
                              onChange={(e) => setProgressData({ ...progressData, category: e.target.value })}
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
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
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Title *</label>
                            <input
                              type="text"
                              required
                              value={progressData.title}
                              onChange={(e) => setProgressData({ ...progressData, title: e.target.value })}
                              placeholder="e.g. 1st Rank in Semester 4 / AWS Certified"
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
                          <textarea
                            rows="2"
                            value={progressData.description}
                            onChange={(e) => setProgressData({ ...progressData, description: e.target.value })}
                            placeholder="Detailed description of achievement or overall progress during the year..."
                            className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                              isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Remarks</label>
                            <input
                              type="text"
                              value={progressData.remarks}
                              onChange={(e) => setProgressData({ ...progressData, remarks: e.target.value })}
                              placeholder="Special remarks or feedback"
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Proof / Drive Link</label>
                            <input
                              type="url"
                              value={progressData.proofLink}
                              onChange={(e) => setProgressData({ ...progressData, proofLink: e.target.value })}
                              placeholder="https://drive.google.com/..."
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                          <div>
                            <label className={`block text-xs font-bold uppercase mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Other Details</label>
                            <input
                              type="text"
                              value={progressData.other}
                              onChange={(e) => setProgressData({ ...progressData, other: e.target.value })}
                              placeholder="Additional custom notes"
                              className={`w-full border rounded-xl p-2 text-xs focus:outline-none focus:border-indigo-500 ${
                                isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                              }`}
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowProgressForm(false)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                              isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                            }`}
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
                            className={`border rounded-xl p-4 flex flex-col justify-between relative group transition shadow-sm ${
                              isDark ? 'bg-[#1a1c26] border-gray-800 hover:border-indigo-500/50' : 'bg-gray-50 border-gray-200 hover:border-indigo-400'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getCategoryBadgeClass(item.category)}`}>
                                  {item.category}
                                </span>
                                {canManageProgress && (
                                  <button
                                    onClick={() => handleDeleteProgress(item._id)}
                                    className="text-gray-400 hover:text-red-500 p-1 rounded-md transition"
                                    title="Delete Progress Record"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>

                              <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{item.title}</h4>

                              {item.description && (
                                <p className={`text-xs mb-2 leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{item.description}</p>
                              )}

                              {item.remarks && (
                                <div className={`p-2 rounded-lg border text-[11px] mb-2 ${
                                  isDark ? 'bg-[#141620] border-gray-800 text-gray-400' : 'bg-white border-gray-200 text-gray-600'
                                }`}>
                                  <span className="font-semibold text-indigo-500">Remarks: </span>{item.remarks}
                                </div>
                              )}

                              {item.other && (
                                <div className={`text-[11px] mb-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Other: </span>{item.other}
                                </div>
                              )}
                            </div>

                            {item.proofLink && (
                              <div className={`pt-2 border-t mt-2 ${isDark ? 'border-gray-800/80' : 'border-gray-200'}`}>
                                <a
                                  href={item.proofLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-600 font-semibold transition"
                                >
                                  <ExternalLink size={13} /> View Proof / Link
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`border rounded-xl p-6 text-center text-xs ${
                        isDark ? 'bg-[#1a1c26] border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'
                      }`}>
                        No progress records added yet. Click "Add Progress Record" above to add overall achievements.
                      </div>
                    )}
                  </div>
                </>
              )}

            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex justify-end rounded-b-2xl ${
              isDark ? 'bg-[#1a1c26] border-gray-800' : 'bg-gray-50 border-gray-200'
            }`}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCloseProfile();
                }}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition shadow-xs cursor-pointer"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      <AdminResetPasswordModal
        isOpen={!!resetModalUser}
        onClose={() => setResetModalUser(null)}
        targetUser={resetModalUser}
      />

      {/* Suspend Student Modal */}
      {suspendModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden transition-all ${
            isDark ? 'bg-[#181a26] border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'
          }`}>
            {/* Header */}
            <div className={`px-6 py-4 border-b flex items-center justify-between ${
              isDark ? 'bg-[#141620] border-gray-800' : 'bg-rose-50/70 border-rose-100'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
                  <AlertTriangle size={18} />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-rose-500">Suspend Student</h3>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Choose suspension duration for this resident
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSuspendModal({ isOpen: false, student: null, suspendedUntil: '', suspensionReason: '', loading: false, error: '' })}
                className={`p-1.5 rounded-lg transition ${
                  isDark ? 'text-gray-400 hover:text-white hover:bg-gray-800' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleConfirmSuspend} className="p-6 space-y-4">
              {suspendModal.error && (
                <div className="p-3 text-xs rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 font-medium">
                  {suspendModal.error}
                </div>
              )}

              <div className={`p-3 rounded-xl border ${isDark ? 'bg-[#141620] border-gray-800' : 'bg-gray-50 border-gray-200'}`}>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Student</p>
                <p className="text-sm font-bold mt-0.5">{getStudentName(suspendModal.student)}</p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                  Room: {suspendModal.student?.roomNumber || 'Unassigned'} • Course: {suspendModal.student?.course || 'N/A'}
                </p>
              </div>

              {/* Date Inputs - From Date & Till Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Suspended From <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={suspendModal.suspendedFrom}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      setSuspendModal(prev => ({
                        ...prev,
                        suspendedFrom: newFrom,
                        suspendedUntil: (prev.suspendedUntil && prev.suspendedUntil < newFrom) ? newFrom : prev.suspendedUntil,
                        error: ''
                      }));
                    }}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${
                      isDark 
                        ? 'bg-[#141620] border-gray-700 text-white focus:border-rose-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-rose-500'
                    }`}
                  />
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Start date of suspension
                  </p>
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Suspended Till <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={suspendModal.suspendedFrom || new Date().toISOString().split('T')[0]}
                    value={suspendModal.suspendedUntil}
                    onChange={(e) => setSuspendModal({ ...suspendModal, suspendedUntil: e.target.value, error: '' })}
                    className={`w-full border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${
                      isDark 
                        ? 'bg-[#141620] border-gray-700 text-white focus:border-rose-500' 
                        : 'bg-white border-gray-300 text-gray-900 focus:border-rose-500'
                    }`}
                  />
                  <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    End date (inclusive)
                  </p>
                </div>
              </div>

              {/* Reason Input - Optional */}
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Reason / Remarks <span className="text-xs font-normal text-gray-500">(Optional)</span>
                </label>
                <textarea
                  rows="3"
                  value={suspendModal.suspensionReason}
                  onChange={(e) => setSuspendModal({ ...suspendModal, suspensionReason: e.target.value })}
                  placeholder="e.g. Violation of hostel curfew, disciplinary action..."
                  className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 ${
                    isDark 
                      ? 'bg-[#141620] border-gray-700 text-white placeholder-gray-500 focus:border-rose-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-rose-500'
                  }`}
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setSuspendModal({ isOpen: false, student: null, suspendedFrom: '', suspendedUntil: '', suspensionReason: '', loading: false, error: '' })}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition ${
                    isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={suspendModal.loading || !suspendModal.suspendedFrom || !suspendModal.suspendedUntil}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
                >
                  {suspendModal.loading ? 'Saving...' : 'Confirm Suspension'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
