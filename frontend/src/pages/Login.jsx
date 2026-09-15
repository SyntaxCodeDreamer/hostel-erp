import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Building2, BellRing, X, KeyRound, Mail, Lock, CheckCircle2, Eye, EyeOff, Sparkles, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { subscribeUserToPush } from '../utils/pushManager';
import apiClient from '../utils/apiClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  // Password Recovery Modal State (Zero Email Dispatch)
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [calcEmail, setCalcEmail] = useState('');
  const [resetType, setResetType] = useState('default'); // 'default' or 'custom'
  const [customResetPassword, setCustomResetPassword] = useState('');
  const [showCustomPass, setShowCustomPass] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetModalError, setResetModalError] = useState('');
  const [resetModalSuccess, setResetModalSuccess] = useState('');


  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const submitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Check notification permissions FIRST
      if ('Notification' in window) {
        // Insecure contexts (like testing on mobile over local network HTTP) 
        // automatically deny permissions. We should bypass the hard block for these cases.
        if (window.isSecureContext === false) {
          console.warn("Insecure context detected. Bypassing mandatory notification check for mobile testing.");
        } else {
          let permission = Notification.permission;
          
          if (permission === 'default') {
            // Show our custom soft prompt dialog instead of immediate browser prompt
            setShowPermissionModal(true);
            setLoading(false);
            return;
          }

          if (permission !== 'granted') {
            setError('Notifications are blocked by your browser! Click the lock icon (🔒) next to the URL bar, allow notifications, and try again.');
            setLoading(false);
            return;
          }
        }
      }

      // Proceed with actual login only if granted or unsupported
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.response?.data?.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    try {
      setLoading(true);
      const permission = await Notification.requestPermission();
      setShowPermissionModal(false);

      if (permission === 'granted') {
        try {
          await subscribeUserToPush();
        } catch (pushErr) {
          console.warn('Push subscription notice:', pushErr);
        }
        await login(email, password);
        navigate('/');
      } else {
        setError('Notification permission is mandatory. Please enable it in your browser settings to login.');
      }
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForgot = () => {
    setCalcEmail(email || '');
    setResetType('default');
    setCustomResetPassword('');
    setResetModalError('');
    setResetModalSuccess('');
    setShowForgotModal(true);
  };

  const calculateDefaultPass = (inputEmail) => {
    if (!inputEmail || !inputEmail.trim()) return '';
    const clean = inputEmail.trim().toLowerCase();
    const localPart = clean.split('@')[0];
    const firstFive = localPart.length >= 5 ? localPart.substring(0, 5) : localPart;
    return `${firstFive}1923`;
  };

  const handleExecutePasswordReset = async (e) => {
    if (e) e.preventDefault();
    setResetModalError('');
    setResetModalSuccess('');

    if (!calcEmail || !calcEmail.trim()) {
      setResetModalError('Please enter your registered email address');
      return;
    }

    if (resetType === 'custom' && (!customResetPassword || customResetPassword.trim().length < 6)) {
      setResetModalError('Custom password must be at least 6 characters long');
      return;
    }

    try {
      setResettingPassword(true);
      const res = await apiClient.post('/auth/forgot-password', {
        email: calcEmail.trim(),
        resetToDefault: resetType === 'default',
        newPassword: resetType === 'custom' ? customResetPassword.trim() : undefined
      });

      const updatedPassword = res.data.password;
      setEmail(calcEmail.trim());
      setPassword(updatedPassword);
      navigator.clipboard.writeText(updatedPassword);
      setResetModalSuccess(`Password successfully updated to "${updatedPassword}" in database! Auto-filled into login.`);

      setTimeout(() => {
        setShowForgotModal(false);
        setResetModalSuccess('');
      }, 1500);
    } catch (err) {
      console.error('Password reset error:', err);
      setResetModalError(err?.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setResettingPassword(false);
    }
  };


  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#090a0f] text-gray-100 font-sans p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6 rounded-2xl bg-[#14161f] p-8 sm:p-10 shadow-2xl border border-gray-800"
      >
        
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-400 mb-3 shadow-inner">
            <Building2 size={28} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Hostel ERP Login
          </h2>
          <p className="text-gray-400 mt-1 text-xs">Enter your credentials to access your account</p>
        </div>

        {/* Login Form */}
        <motion.form 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="space-y-4" 
          onSubmit={submitHandler}
        >
          {error && (
            <div className="text-rose-400 text-xs text-center font-semibold bg-rose-950/60 border border-rose-800/50 p-2.5 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Email Address</label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                className="w-full rounded-xl border border-gray-700 bg-[#1a1c26] px-3.5 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                placeholder="Enter email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400">Password</label>
                <button
                  type="button"
                  onClick={handleOpenForgot}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition"
                >
                  Forgot Password?
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-xl border border-gray-700 bg-[#1a1c26] px-3.5 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm transition"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading && !showPermissionModal ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </motion.form>
      </motion.div>

      {/* Password Reset Modal (Zero Email Sending) */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#14161f] border border-gray-800 rounded-2xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-gray-100 space-y-4"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
              >
                <X size={20} />
              </button>

              {/* Title Header */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/40">
                  <KeyRound size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Reset Account Password</h3>
                  <p className="text-xs text-gray-400">Direct System Password Update (No Emails)</p>
                </div>
              </div>

              {/* Status Notifications */}
              {resetModalError && (
                <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold">
                  {resetModalError}
                </div>
              )}

              {resetModalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
                  <span>{resetModalSuccess}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleExecutePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      required
                      value={calcEmail}
                      onChange={(e) => setCalcEmail(e.target.value)}
                      placeholder="Enter your registered email..."
                      className="w-full rounded-xl border border-gray-700 bg-[#1a1c26] pl-10 pr-3.5 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none text-xs transition"
                    />
                  </div>
                </div>

                {/* Option Selector */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResetType('default')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      resetType === 'default'
                        ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-inner'
                        : 'bg-[#1a1c26] border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <Sparkles size={12} className="text-amber-400" /> Standard Default
                    </span>
                    <span className="text-[11px] font-mono text-indigo-300 truncate mt-1">
                      {calcEmail ? calculateDefaultPass(calcEmail) : '[first5]1923'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setResetType('custom')}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                      resetType === 'custom'
                        ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-inner'
                        : 'bg-[#1a1c26] border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-white">Custom Password</span>
                    <span className="text-[11px] text-gray-400 truncate mt-1">Type custom string</span>
                  </button>
                </div>

                {/* Custom Password Input */}
                {resetType === 'custom' && (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                      New Password
                    </label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                      <input
                        type={showCustomPass ? 'text' : 'password'}
                        required
                        value={customResetPassword}
                        onChange={(e) => setCustomResetPassword(e.target.value)}
                        placeholder="Minimum 6 characters..."
                        className="w-full rounded-xl border border-gray-700 bg-[#1a1c26] pl-10 pr-10 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none text-xs transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCustomPass(!showCustomPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                      >
                        {showCustomPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={resettingPassword}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-4 text-xs tracking-wider uppercase transition shadow-lg disabled:opacity-50"
                  >
                    {resettingPassword ? (
                      'Updating Database...'
                    ) : (
                      <>
                        <KeyRound size={14} />
                        <span>Update Password in Database & Sign In</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Note */}
              <p className="text-[11px] text-gray-500 text-center leading-relaxed">
                This updates your login credentials directly in the database without dispatching any emails.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Permission Request Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#14161f] border border-gray-800 rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl relative"
          >
            <button 
              onClick={() => setShowPermissionModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-indigo-900/30 text-indigo-400 rounded-full flex items-center justify-center mb-4">
                <BellRing size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Enable Notifications</h3>
              <p className="text-sm text-gray-400 mb-6">
                Hostel ERP needs notification permissions to alert you instantly about leaves, tasks, and important announcements. This is mandatory to log in.
              </p>
              <button 
                onClick={handleRequestPermission}
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition"
              >
                {loading ? 'Requesting...' : 'Allow Notifications'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Login;
