import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KeyRound, X, Check, Copy, Eye, EyeOff, ShieldAlert, Sparkles } from 'lucide-react';
import apiClient from '../utils/apiClient';
import { capitalizeName } from '../utils/formatters';

const AdminResetPasswordModal = ({ isOpen, onClose, targetUser, onSuccess }) => {
  const [resetType, setResetType] = useState('default'); // 'default' or 'custom'
  const [customPassword, setCustomPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successInfo, setSuccessInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen || !targetUser) return null;

  const email = targetUser.email || '';
  const localPart = email.split('@')[0] || '';
  const defaultPass = `${localPart.length >= 5 ? localPart.substring(0, 5).toLowerCase() : localPart.toLowerCase()}1923`;

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessInfo(null);

    if (resetType === 'custom' && (!customPassword || customPassword.trim().length < 6)) {
      setError('Custom password must be at least 6 characters long.');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        targetUserId: targetUser.id || targetUser._id,
        resetToDefault: resetType === 'default',
        newPassword: resetType === 'custom' ? customPassword.trim() : undefined
      };

      const res = await apiClient.post('/auth/admin-reset-password', payload);
      setSuccessInfo({
        password: res.data.newPassword || (resetType === 'default' ? defaultPass : customPassword.trim()),
        message: res.data.message
      });

      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      console.error('Admin reset password error:', err);
      setError(err?.response?.data?.message || err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setResetType('default');
    setCustomPassword('');
    setError('');
    setSuccessInfo(null);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#14161f] border border-gray-800 text-gray-100 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/40">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Reset User Password</h3>
                <p className="text-xs text-gray-400">Admin Account Management</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* User Target Card */}
          <div className="my-4 p-3.5 rounded-xl bg-[#1a1c26] border border-gray-800/80 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-semibold text-sm text-white truncate">{capitalizeName(targetUser.name || 'User')}</div>
              <div className="text-xs text-gray-400 truncate">{targetUser.email}</div>
            </div>
            <span className="bg-indigo-950 text-indigo-300 border border-indigo-800/40 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0">
              {targetUser.role || 'Member'}
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <ShieldAlert size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {successInfo ? (
            /* SUCCESS STATE */
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-emerald-900/60 text-emerald-400 flex items-center justify-center">
                  <Check size={20} />
                </div>
                <h4 className="font-bold text-emerald-300 text-sm">Password Reset Successfully!</h4>
                <p className="text-xs text-gray-300">Share these updated login credentials with the user:</p>

                <div className="mt-3 p-3 rounded-xl bg-[#14161f] border border-emerald-800/50 flex items-center justify-between gap-2">
                  <span className="font-mono text-base font-bold text-emerald-400 tracking-wider">
                    {successInfo.password}
                  </span>
                  <button
                    onClick={() => handleCopy(successInfo.password)}
                    className="flex items-center gap-1 text-xs bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 px-2.5 py-1.5 rounded-lg font-semibold transition"
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full mt-2 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md"
              >
                Done
              </button>
            </div>
          ) : (
            /* FORM STATE */
            <form onSubmit={handleReset} className="space-y-4">
              {/* Option Selector */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setResetType('default')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    resetType === 'default'
                      ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-inner'
                      : 'bg-[#1a1c26] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                      <Sparkles size={13} className="text-amber-400" /> Standard Default
                    </span>
                    {resetType === 'default' && <Check size={14} className="text-indigo-400" />}
                  </div>
                  <span className="text-[11px] font-mono text-indigo-300 truncate">
                    {defaultPass}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setResetType('custom')}
                  className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                    resetType === 'custom'
                      ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-inner'
                      : 'bg-[#1a1c26] border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-bold text-white">Custom Password</span>
                    {resetType === 'custom' && <Check size={14} className="text-indigo-400" />}
                  </div>
                  <span className="text-[11px] text-gray-400">Enter custom string</span>
                </button>
              </div>

              {/* Custom Password Input */}
              {resetType === 'custom' && (
                <div className="relative">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      placeholder="Minimum 6 characters..."
                      className="w-full rounded-xl border border-gray-700 bg-[#1a1c26] px-3.5 py-2.5 pr-10 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none text-xs transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-800">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-md disabled:opacity-50"
                >
                  <KeyRound size={14} />
                  <span>{loading ? 'Resetting...' : 'Confirm Reset'}</span>
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default AdminResetPasswordModal;
