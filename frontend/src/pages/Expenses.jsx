import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { Wallet, Plus, Trash2 } from 'lucide-react';

const Expenses = () => {
  const { user } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);
  const isDark = theme === 'dark';

  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ date: '', category: 'Food', description: '', amount: '' });

  const isAdminOrLeader = user?.role === 'Admin' || user?.role === 'Leader' || user?.role === 'admin' || user?.role === 'leader';

  const getAuthToken = () => {
    const userInfo = JSON.parse(localStorage.getItem('userInfo'));
    return userInfo?.token || localStorage.getItem('token');
  };

  useEffect(() => {
    fetchExpenses();
    fetchSummary();
  }, []);

  const fetchExpenses = async () => {
    try {
      const token = getAuthToken();
      const res = await axios.get('/api/expenses', { headers: { Authorization: `Bearer ${token}` } });
      setExpenses(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = getAuthToken();
      const res = await axios.get('/api/expenses/summary/monthly', { headers: { Authorization: `Bearer ${token}` } });
      setSummary(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = getAuthToken();
      await axios.post('/api/expenses', formData, { headers: { Authorization: `Bearer ${token}` } });
      setShowForm(false);
      setFormData({ date: '', category: 'Food', description: '', amount: '' });
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      console.error('Error creating expense:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const token = getAuthToken();
      await axios.delete(`/api/expenses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      fetchExpenses();
      fetchSummary();
    } catch (error) {
      console.error('Error deleting expense:', error);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString();
  };

  const groupedSummary = summary.reduce((acc, curr) => {
    if (!curr._id || !curr._id.year) return acc;
    const key = `${curr._id.year}-${String(curr._id.month).padStart(2, '0')}`;
    if (!acc[key]) acc[key] = { total: 0, categories: [] };
    acc[key].total += curr.totalAmount || 0;
    acc[key].categories.push({ name: curr._id.category || 'Misc', amount: curr.totalAmount || 0 });
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Accounting & Expense Ledger</h1>
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Record mess supply catering invoices and utility receipts.</p>
        </div>
        {isAdminOrLeader && (
          <button 
            onClick={() => setShowForm(!showForm)} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm hover:bg-indigo-700 transition flex items-center gap-1.5"
          >
            <Plus size={16} />
            {showForm ? 'Cancel' : 'Add Receipt'}
          </button>
        )}
      </div>

      {showForm && isAdminOrLeader && (
        <form onSubmit={handleSubmit} className={`p-6 rounded-2xl border space-y-4 shadow-sm ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Date</label>
              <input 
                type="date" required 
                value={formData.date} 
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              />
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Category</label>
              <select 
                value={formData.category} 
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
              >
                {['Food', 'Vegetables', 'Milk', 'Grocery', 'Electricity', 'Water', 'Gas', 'Maintenance', 'Miscellaneous'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Amount (₹)</label>
              <input 
                type="number" required min="0" step="0.01"
                value={formData.amount} 
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="w-full bg-indigo-600 text-white font-bold p-3 rounded-xl hover:bg-indigo-700 transition">Save Entry</button>
            </div>
            <div className="md:col-span-4">
              <label className={`block text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</label>
              <input 
                type="text" required 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className={`w-full border rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-[#1a1c26] border-gray-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                placeholder="Invoice details or receipt notes..."
              />
            </div>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Expense Table */}
        <div className={`lg:col-span-2 rounded-2xl border overflow-hidden shadow-sm ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
          <div className={`p-4 border-b font-bold text-sm flex items-center gap-2 ${isDark ? 'border-gray-800/60 text-white' : 'border-gray-100 text-gray-900'}`}>
            <Wallet size={16} className="text-rose-500" />
            Receipts Ledger
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left divide-y text-sm">
              <thead className={isDark ? 'bg-[#1a1c26] divide-gray-800' : 'bg-gray-50 divide-gray-200 border-b border-gray-200'}>
                <tr>
                  <th className={`p-4 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Date</th>
                  <th className={`p-4 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Category</th>
                  <th className={`p-4 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Description</th>
                  <th className={`p-4 font-semibold text-xs uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Amount</th>
                  {isAdminOrLeader && <th className={`p-4 font-semibold text-xs uppercase tracking-wider text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Action</th>}
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-gray-800/40' : 'divide-gray-100'}`}>
                {expenses.map((expense) => (
                  <tr key={expense._id} className={`transition ${isDark ? 'hover:bg-gray-800/30' : 'hover:bg-gray-50'}`}>
                    <td className={`p-4 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{formatDate(expense.date || expense.createdAt)}</td>
                    <td className="p-4">
                      <span className="bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 dark:border dark:border-rose-800/40 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                        {expense.category || 'Misc'}
                      </span>
                    </td>
                    <td className={`p-4 text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-800'}`}>{expense.description || 'No description'}</td>
                    <td className="p-4 font-bold text-rose-600 dark:text-rose-400 text-sm">₹{Number(expense.amount || 0).toFixed(2)}</td>
                    {isAdminOrLeader && (
                      <td className="p-4 text-center">
                        <button onClick={() => handleDelete(expense._id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition p-1" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={isAdminOrLeader ? 5 : 4} className={`p-8 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      No expense receipts recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="space-y-4">
          <div className={`p-5 rounded-2xl border shadow-sm ${isDark ? 'bg-[#14161f] border-gray-800' : 'bg-white border-gray-200'}`}>
            <h2 className={`font-bold text-sm tracking-wide mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Monthly Expense Summary</h2>
            <div className="space-y-3">
              {Object.keys(groupedSummary).length > 0 ? Object.entries(groupedSummary).map(([monthYear, data]) => (
                <div key={monthYear} className={`border rounded-xl p-3.5 ${isDark ? 'border-gray-800/80 bg-[#1a1c26]' : 'border-gray-200 bg-gray-50'}`}>
                  <div className="flex justify-between items-center mb-2 text-sm">
                    <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{monthYear}</span>
                    <span className="font-extrabold text-rose-600 dark:text-rose-400">₹{data.total.toFixed(2)}</span>
                  </div>
                  <div className={`space-y-1.5 mt-2 border-t pt-2 text-xs ${isDark ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'}`}>
                    {data.categories.map((cat, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{cat.name}</span>
                        <span className={`font-semibold ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>₹{cat.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className={`text-xs text-center py-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No summary records.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Expenses;
