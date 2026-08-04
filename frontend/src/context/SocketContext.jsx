import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { AuthContext } from './AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';

export const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);

  // Helper to add an in-app toast
  const addToast = (notification) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, ...notification }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    let newSocket;
    if (user) {
      const socketUrl = window.location.origin;
      newSocket = io(socketUrl);
      
      newSocket.on('connect', () => {
        console.log('Connected to socket server');
        newSocket.emit('register', user._id || user.id);
      });

      newSocket.on('new_notification', (data) => {
        console.log('New notification received:', data);
        
        // Show browser push notification if permitted
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title, {
            body: data.message,
            icon: '/vite.svg',
          });
        }
        
        // ALWAYS show in-app toast (crucial for mobile devices where push is disabled)
        addToast(data);
      });

      setSocket(newSocket);
    }

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
      
      {/* In-App Toasts UI Layer */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-[#1a1c26] border border-gray-800 shadow-2xl rounded-xl p-4 w-72 sm:w-80 pointer-events-auto relative overflow-hidden"
            >
              {/* Left Color Bar indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
              
              <div className="flex items-start gap-3 pl-2">
                <div className="p-2 bg-indigo-900/40 text-indigo-400 rounded-lg shrink-0 mt-1">
                  <Bell size={18} />
                </div>
                <div className="flex-1 pr-6">
                  <h4 className="text-white font-bold text-sm mb-1">{toast.title}</h4>
                  <p className="text-gray-400 text-xs leading-relaxed">{toast.message}</p>
                </div>
                <button 
                  onClick={() => removeToast(toast.id)}
                  className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-white rounded-md transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </SocketContext.Provider>
  );
};
