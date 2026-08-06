import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, User as UserIcon, GraduationCap, Sparkles, BellRing, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { subscribeUserToPush } from '../utils/pushManager';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [role, setRole] = useState('Trust Member');
  const [loading, setLoading] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setError('');
  };

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
            <Sparkles size={28} />
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            Hostel ERP Login
          </h2>
          <p className="text-gray-400 mt-1 text-xs">Select your account role to log in</p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-3">
          <button 
            type="button"
            onClick={() => handleRoleSelect('Trust Member')}
            className={`flex flex-col items-center p-3 rounded-xl border transition text-center ${role === 'Trust Member' ? 'border-indigo-500 bg-indigo-950/70 text-white shadow-sm' : 'border-gray-800 bg-[#1a1c26] text-gray-400 hover:border-gray-700 hover:text-white'}`}
          >
            <ShieldAlert size={20} className="mb-1 text-indigo-400" />
            <span className="text-xs font-bold">Trust Member</span>
          </button>

          <button 
            type="button"
            onClick={() => handleRoleSelect('Captain')}
            className={`flex flex-col items-center p-3 rounded-xl border transition text-center ${role === 'Captain' ? 'border-indigo-500 bg-indigo-950/70 text-white shadow-sm' : 'border-gray-800 bg-[#1a1c26] text-gray-400 hover:border-gray-700 hover:text-white'}`}
          >
            <UserIcon size={20} className="mb-1 text-amber-400" />
            <span className="text-xs font-bold">Leader</span>
          </button>

          <button 
            type="button"
            onClick={() => handleRoleSelect('Student')}
            className={`flex flex-col items-center p-3 rounded-xl border transition text-center ${role === 'Student' ? 'border-indigo-500 bg-indigo-950/70 text-white shadow-sm' : 'border-gray-800 bg-[#1a1c26] text-gray-400 hover:border-gray-700 hover:text-white'}`}
          >
            <GraduationCap size={20} className="mb-1 text-emerald-400" />
            <span className="text-xs font-bold">Student</span>
          </button>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Password</label>
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
            className="w-full flex justify-center rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-lg disabled:opacity-50 mt-2"
          >
            {loading && !showPermissionModal ? 'Signing In...' : `Sign In as ${role}`}
          </button>
        </motion.form>
      </motion.div>

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
