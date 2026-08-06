import React, { useContext, useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { SocketContext } from '../context/SocketContext';
import { usePush } from '../context/PushContext';
import { Bell, Sun, Moon, Menu, X, BellRing, Smartphone, Send, Check, AlertCircle, RefreshCw } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { motion, AnimatePresence } from 'framer-motion';

const DashboardLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { socket } = useContext(SocketContext);
  const { isSupported, isSubscribed, permission, loading: pushLoading, message: pushMsg, subscribe: subscribePush, unsubscribe: unsubscribePush, sendTestPush } = usePush();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  // Automatically close sidebar on mobile when navigating between pages
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  // Adjust sidebar open state when window resizes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  const isDark = theme === 'dark';

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  useEffect(() => {
    if (socket) {
      const handleNewNotification = (data) => {
        setNotifications((prev) => [data, ...prev]);
      };

      socket.on('new_notification', handleNewNotification);

      return () => {
        socket.off('new_notification', handleNewNotification);
      };
    }
  }, [socket]);

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications');
      setNotifications(res.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await apiClient.put(`/notifications/${id}/read`, {});
      fetchNotifications();
    } catch (error) {
      console.error('Error marking notification read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Optimistically remove clicked notification from menu list immediately
    setNotifications((prev) => prev.filter((item) => item._id !== notification._id));
    setShowNotifications(false);

    try {
      if (!notification.isRead) {
        await markAsRead(notification._id);
      }
    } catch (err) {
      console.error('Error handling notification click:', err);
    }

    let targetRoute = notification.url || notification.link;

    if (!targetRoute) {
      const titleLower = (notification.title || '').toLowerCase();
      const typeLower = (notification.type || '').toLowerCase();
      const messageLower = (notification.message || '').toLowerCase();

      if (typeLower === 'leave' || titleLower.includes('leave') || messageLower.includes('leave')) {
        targetRoute = '/leaves';
      } else if (typeLower === 'announcement' || typeLower === 'circular' || titleLower.includes('announcement') || titleLower.includes('circular') || messageLower.includes('announcement') || messageLower.includes('circular')) {
        targetRoute = '/announcements';
      } else if (typeLower === 'task' || typeLower === 'chore' || titleLower.includes('task') || titleLower.includes('chore') || messageLower.includes('task') || messageLower.includes('chore')) {
        targetRoute = '/tasks';
      } else if (typeLower === 'expense' || titleLower.includes('expense') || messageLower.includes('expense')) {
        targetRoute = '/expenses';
      } else if (typeLower === 'student' || titleLower.includes('student') || messageLower.includes('student')) {
        targetRoute = '/students';
      } else {
        targetRoute = '/dashboard';
      }
    }

    navigate(targetRoute);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    try {
      await apiClient.put('/auth/change-password', passwordData);
      setPasswordMsg({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordMsg({ type: '', text: '' });
        setPasswordData({ currentPassword: '', newPassword: '' });
      }, 2000);
    } catch (error) {
      setPasswordMsg({ type: 'error', text: error.message || 'Failed to change password' });
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className={`flex h-screen font-sans transition-colors duration-200 ${isDark ? 'bg-[#090a0f] text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
      
      {/* Sidebar (Dynamic Theme Colors & Mobile Responsive Drawer) */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <>
            {/* Mobile Backdrop Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs"
              onClick={() => setIsSidebarOpen(false)}
            />

            <motion.aside 
              initial={{ width: 0, opacity: 0, x: -50 }}
              animate={{ width: 256, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: -50 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className={`fixed inset-y-0 left-0 z-50 md:relative md:z-auto h-full flex flex-col shadow-xl border-r transition-colors duration-200 overflow-hidden whitespace-nowrap shrink-0 ${
                isDark 
                  ? 'bg-[#0f111a] border-gray-800/80 text-gray-300' 
                  : 'bg-white border-gray-200 text-gray-700'
              }`}
            >
              <div className="w-64 h-full flex flex-col">
          
          {/* Sidebar Header */}
          <div className={`p-6 border-b flex items-center justify-between transition-colors ${
            isDark ? 'border-gray-800/80' : 'border-gray-100'
          }`}>
            <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Hostel ERP</h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className={`md:hidden p-1.5 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
              title="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          {/* Sidebar Navigation Menu */}
          <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
            {[
              { path: '/', label: 'Dashboard' },
              { path: '/students', label: 'Students' },
              { path: '/leaves', label: 'Leaves' },
              { path: '/tasks', label: 'Tasks' },
              { path: '/announcements', label: 'Announcements' },
            ].map((item) => (
              <Link 
                key={item.path}
                to={item.path} 
                className={`block py-2.5 px-4 rounded-xl font-medium transition ${
                  location.pathname === item.path 
                    ? 'bg-indigo-600 text-white shadow-sm font-semibold' 
                    : isDark 
                    ? 'text-gray-400 hover:bg-[#1a1c29] hover:text-white' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.label}
              </Link>
            ))}

            {['admin', 'leader', 'trustee', 'trust member'].includes((user?.role || '').toLowerCase()) && (
              <>
                <Link 
                  to="/expenses" 
                  className={`block py-2.5 px-4 rounded-xl font-medium transition ${
                    location.pathname === '/expenses' 
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold' 
                      : isDark 
                      ? 'text-gray-400 hover:bg-[#1a1c29] hover:text-white' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  Expenses
                </Link>
                <Link 
                  to="/trust-members" 
                  className={`block py-2.5 px-4 rounded-xl font-medium transition ${
                    location.pathname === '/trust-members' 
                      ? 'bg-indigo-600 text-white shadow-sm font-semibold' 
                      : isDark 
                      ? 'text-gray-400 hover:bg-[#1a1c29] hover:text-white' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  Trust & Leaders
                </Link>
              </>
            )}
          </nav>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Navbar */}
        <header className={`px-6 py-4 flex justify-between items-center z-20 border-b transition-colors duration-200 ${
          isDark 
            ? 'bg-[#12141e] border-gray-800/80 text-white' 
            : 'bg-white border-gray-200 text-gray-800 shadow-xs'
        }`}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold">
              {location.pathname === '/' ? 'Dashboard' : location.pathname.substring(1).charAt(0).toUpperCase() + location.pathname.slice(2).replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center space-x-4 sm:space-x-6">
            
            {/* Web Push Notification Control Button */}
            {isSupported && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={pushLoading}
                onClick={() => {
                  if (isSubscribed) {
                    sendTestPush();
                  } else {
                    subscribePush();
                  }
                }}
                className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-xs font-semibold ${
                  isSubscribed
                    ? isDark
                      ? 'bg-emerald-950/40 border-emerald-700/60 text-emerald-400 hover:bg-emerald-900/60'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                    : isDark
                    ? 'bg-indigo-950/40 border-indigo-700/60 text-indigo-400 hover:bg-indigo-900/60'
                    : 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                }`}
                title={isSubscribed ? 'Web Push Active - Click to send test push' : 'Click to enable Web Push Notifications'}
              >
                {pushLoading ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : isSubscribed ? (
                  <>
                    <BellRing size={18} className="text-emerald-500 animate-pulse" />
                    <span className="hidden md:inline font-medium">Push Active</span>
                  </>
                ) : (
                  <>
                    <Smartphone size={18} className="text-indigo-500" />
                    <span className="hidden md:inline font-medium">Enable Push</span>
                  </>
                )}
              </motion.button>
            )}

            {/* Theme Toggle Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition flex items-center gap-2 text-xs font-semibold ${
                isDark
                  ? 'bg-[#1c1e2d] border-gray-700 text-amber-400 hover:bg-gray-800'
                  : 'bg-gray-100 border-gray-200 text-indigo-600 hover:bg-gray-200'
              }`}
              title="Toggle Light / Dark Theme"
            >
              {isDark ? (
                <>
                  <Sun size={18} className="text-amber-400" />
                  <span className="hidden sm:inline text-gray-200">Light Mode</span>
                </>
              ) : (
                <>
                  <Moon size={18} className="text-indigo-600" />
                  <span className="hidden sm:inline text-gray-700">Dark Mode</span>
                </>
              )}
            </motion.button>

            {/* Notification Bell */}
            <div className="relative">
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-full transition ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-1 right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"
                  ></motion.span>
                )}
              </motion.button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-xl shadow-2xl border py-2 max-h-[28rem] overflow-y-auto z-50 ${isDark ? 'bg-[#181a26] border-gray-800 text-gray-200' : 'bg-white border-gray-100 text-gray-800'}`}
                  >
                    <div className="px-4 py-2 border-b border-gray-700/50 flex justify-between items-center">
                      <h3 className="font-bold text-sm">Notifications</h3>
                      <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">{unreadCount} New</span>
                    </div>

                    {/* Web Push Notification Quick Card Banner */}
                    <div className={`m-3 p-3 rounded-lg border text-xs flex flex-col gap-2 ${
                      isDark ? 'bg-indigo-950/30 border-indigo-800/50' : 'bg-indigo-50 border-indigo-200'
                    }`}>
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5 text-indigo-400">
                          <Smartphone size={14} /> Web Push Device Status
                        </span>
                        {isSubscribed ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Check size={12} /> Active
                          </span>
                        ) : (
                          <span className="text-amber-400 font-bold flex items-center gap-1">
                            <AlertCircle size={12} /> Not Enabled
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-[11px]">
                        {isSubscribed 
                          ? 'Device notifications are active even when browser is closed.'
                          : 'Get app-style push notifications directly on your device screen.'}
                      </p>

                      {pushMsg && (
                        <div className={`p-1.5 rounded text-[11px] font-medium ${
                          pushMsg.type === 'error' ? 'bg-red-900/40 text-red-300' : 'bg-emerald-900/40 text-emerald-300'
                        }`}>
                          {pushMsg.text}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        {!isSubscribed ? (
                          <button
                            onClick={subscribePush}
                            disabled={pushLoading}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-md transition flex items-center justify-center gap-1 shadow"
                          >
                            {pushLoading ? <RefreshCw size={12} className="animate-spin" /> : <BellRing size={12} />} Enable Device Push
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={sendTestPush}
                              disabled={pushLoading}
                              className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-md transition flex items-center justify-center gap-1 shadow"
                            >
                              <Send size={12} /> Test Push
                            </button>
                            <button
                              onClick={unsubscribePush}
                              disabled={pushLoading}
                              className="py-1.5 px-3 bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold rounded-md transition"
                            >
                              Disable
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {notifications.length > 0 ? (
                      notifications.map(n => (
                        <div 
                          key={n._id} 
                          onClick={() => handleNotificationClick(n)}
                          className={`px-4 py-3 border-b border-gray-800/40 cursor-pointer transition ${!n.isRead ? 'bg-indigo-900/20' : 'hover:bg-gray-800/40'}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-sm ${!n.isRead ? 'font-semibold text-white' : 'text-gray-300'}`}>{n.title}</p>
                            {!n.isRead && (
                              <span className="h-2 w-2 rounded-full bg-indigo-500 flex-shrink-0" title="Unread"></span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{n.message}</p>
                          <p className="text-xs text-gray-500 mt-2">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-sm text-gray-400">No notifications</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-3 border-l pl-4 sm:pl-6 border-gray-700/50 relative">
              <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-lg hover:bg-indigo-700 transition shadow-md border-2 border-indigo-200 dark:border-indigo-900"
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </button>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute top-12 right-0 w-48 rounded-xl shadow-2xl border py-2 z-50 ${isDark ? 'bg-[#181a26] border-gray-800 text-gray-200' : 'bg-white border-gray-100 text-gray-800'}`}
                  >
                    <div className="px-4 py-3 border-b border-gray-700/50">
                      <p className="text-sm font-bold truncate">{user?.name}</p>
                      <p className="text-xs text-indigo-500 font-semibold truncate">{user?.role}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowPasswordModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium transition ${isDark ? 'hover:bg-gray-800 text-gray-300' : 'hover:bg-gray-50 text-gray-700'}`}
                    >
                      Change Password
                    </button>
                    <button 
                      onClick={handleLogout}
                      className={`w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 transition ${isDark ? 'hover:bg-gray-800' : 'hover:bg-gray-50'}`}
                    >
                      Logout
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Change Password Modal */}
        <AnimatePresence>
          {showPasswordModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className={`w-full max-w-md p-6 rounded-2xl shadow-2xl border ${isDark ? 'bg-[#14161f] border-gray-800 text-white' : 'bg-white border-gray-100 text-gray-900'}`}
              >
                <h3 className="text-xl font-bold mb-4">Change Password</h3>
                {passwordMsg.text && (
                  <div className={`p-3 rounded-lg mb-4 text-sm font-semibold ${passwordMsg.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {passwordMsg.text}
                  </div>
                )}
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Password</label>
                    <input 
                      type="password" 
                      required 
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c29] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">New Password</label>
                    <input 
                      type="password" 
                      required 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className={`w-full px-4 py-2 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c29] border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-6">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowPasswordModal(false);
                        setPasswordMsg({ type: '', text: '' });
                      }}
                      className={`px-4 py-2 rounded-xl font-medium transition ${isDark ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 rounded-xl font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Content Container */}
        <main className={`flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-8 transition-colors duration-200 ${isDark ? 'bg-[#0b0c10]' : 'bg-gray-50'}`}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
