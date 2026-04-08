import React, { useState, useEffect } from 'react';
import { supabase, createTempClient, getEmailFromUsername } from '../../lib/supabase';
import { UserPlus, AlertCircle, Ban, Edit2, X, Check, User, KeyRound, Users, Search, Crown, CheckCircle2, Mail, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeactivateModalProps {
  user: any;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const DeactivateModal: React.FC<DeactivateModalProps> = ({ user, onConfirm, onCancel, isLoading }) => {
  const isDeactivating = user.is_active !== false;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="w-full max-w-sm bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Glow */}
        <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[60px] opacity-20 pointer-events-none ${
          isDeactivating ? 'bg-orange-500' : 'bg-emerald-500'
        }`} />

        <div className="flex flex-col items-center text-center gap-6 relative z-10">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 25, delay: 0.1 }}
            className={`w-20 h-20 rounded-[2rem] flex items-center justify-center shadow-lg ${
              isDeactivating 
                ? 'bg-orange-500 text-white shadow-orange-200' 
                : 'bg-emerald-500 text-white shadow-emerald-200'
            }`}
          >
            {isDeactivating ? <Ban size={36} strokeWidth={2.5} /> : <CheckCircle2 size={36} strokeWidth={2.5} />}
          </motion.div>

          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {isDeactivating ? 'Deactivate User?' : 'Activate User?'}
            </h3>
            <p className="text-slate-500 mt-2 text-sm font-medium leading-relaxed">
              Action for <span className="text-slate-900 font-black">"{user?.username}"</span>
              <br />
              {isDeactivating 
                ? 'This user will temporarily lose all system access.'
                : 'This user will regain access to their account.'}
            </p>
          </div>

          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-black text-sm hover:bg-slate-200 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-4 rounded-2xl text-white font-black text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${
                isDeactivating 
                  ? 'bg-orange-500 hover:bg-orange-600 shadow-orange-200' 
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
              }`}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (isDeactivating ? <Ban size={18} /> : <CheckCircle2 size={18} />)}
              {isLoading ? 'Wait...' : (isDeactivating ? 'Confirm' : 'Confirm')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');

  // Password Reset State
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Deactivate Modal State
  const [actionUser, setActionUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Current user
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchUsers();
    getCurrentUser();
  }, []);
  
  const getCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      setCurrentUserProfile(data);
    }
  };

  const fetchUsers = async () => {
    setFetchLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setFetchLoading(false);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const email = getEmailFromUsername(username);
      const tempSupabase = createTempClient();

      const { error } = await tempSupabase.auth.signUp({
        email,
        password,
        options: {
          data: { role, username }
        }
      });

      if (error) throw error;

      setMessage({ type: 'success', text: `User "${username}" created successfully!` });
      setUsername('');
      setPassword('');
      setRole('user');
      setTimeout(fetchUsers, 1000);

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!actionUser) return;
    
    // Safety check - cannot deactivate 'md' master admin
    if (actionUser.username === 'md') {
      alert("Master Admin ('md') cannot be deactivated.");
      setActionUser(null);
      return;
    }

    setActionLoading(true);
    try {
      const newStatus = actionUser.is_active === false ? true : false;
      const { error } = await supabase.from('profiles').update({ is_active: newStatus }).eq('id', actionUser.id);
      if (error) throw error;
      setActionUser(null);
      fetchUsers();
    } catch (err: any) {
      alert('Error updating user status: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const startEdit = (user: any) => {
    setEditingId(user.id);
    setEditUsername(user.username);
    setResetId(null);
  };

  const saveEdit = async () => {
    if (!editUsername.trim() || !editingId) return;
    const { error } = await supabase.from('profiles').update({ username: editUsername }).eq('id', editingId);
    if (error) alert('Error: ' + error.message);
    else {
      setEditingId(null);
      fetchUsers();
    }
  };

  const handlePasswordReset = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }
    try {
      const { error } = await supabase.rpc('update_user_password', {
        target_user_id: userId,
        new_password: newPassword
      });
      if (error) throw error;
      setResetId(null);
      setNewPassword('');
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      alert('Failed to update password. It could be due to permission restrictions or missing DB functions. Original error: ' + error.message);
    }
  };
  
  const sendMasterAdminOTPLink = async () => {
    // Uses Supabase's built in magic-link / password reset flow directly to this email
    try {
      const { error } = await supabase.auth.resetPasswordForEmail('mdcourierkdy@gmail.com', {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw error;
      setMessage({ type: 'success', text: `OTP/Reset link sent to mdcourierkdy@gmail.com` });
      setResetId(null);
      setTimeout(() => setMessage(null), 5000);
    } catch (err: any) {
       alert("Failed to send reset email: " + err.message);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const adminCount = users.filter(u => u.role === 'admin').length;
  const staffCount = users.filter(u => u.role === 'user').length;

  return (
    <div className="space-y-8">
      {/* Deactivate/Activate Confirmation Modal */}
      <AnimatePresence>
        {actionUser && (
          <DeactivateModal
            user={actionUser}
            onConfirm={confirmToggleStatus}
            onCancel={() => setActionUser(null)}
            isLoading={actionLoading}
          />
        )}
      </AnimatePresence>

      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">User Management</h1>
          <p className="text-slate-500 font-medium mt-1">Manage staff access & permissions</p>
        </div>
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-bold border border-purple-200">
            <Crown size={14} />
            {adminCount} Admin{adminCount !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-bold border border-blue-200">
            <Users size={14} />
            {staffCount} Staff
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create User Form - Dark Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit overflow-hidden relative"
        >
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] -mr-16 -mt-16 pointer-events-none" />
          <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <UserPlus size={28} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-black text-2xl text-slate-800 tracking-tight">New Staff</h3>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-0.5">Registration</p>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Username</label>
              <div className="relative group">
                <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Create username..."
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
              <div className="relative group">
                <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Access Level</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                className="w-full px-4 py-4 bg-slate-100 border border-slate-200 rounded-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-400 transition-all font-bold appearance-none cursor-pointer shadow-sm"
              >
                <option value="user">👤 Standard User (Staff)</option>
                <option value="admin">🛡️ Administrator (Full Access)</option>
              </select>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-bold shadow-sm ${
                    message.type === 'error'
                      ? 'bg-red-50 text-red-600 border border-red-100'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}
                >
                  {message.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle2 size={20} className="shrink-0" />}
                  <span>{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-2xl hover:shadow-xl hover:shadow-blue-500/30 transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg shadow-blue-500/20 mt-2"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full"
                />
              ) : <UserPlus size={20} strokeWidth={2.5} />}
              {loading ? 'Processing...' : 'Register Staff Member'}
            </motion.button>
          </form>
        </div>
      </motion.div>

      {/* User List */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="lg:col-span-2 bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-xl text-slate-800">All Users
            <span className="ml-2 text-sm font-medium text-slate-400">({filteredUsers.length})</span>
          </h3>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="pl-8 pr-4 py-2 bg-white/70 border border-white/80 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 w-32 focus:w-48 transition-all"
            />
          </div>
        </div>

        <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1 pb-2">
          <AnimatePresence mode="popLayout">
            {fetchLoading ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-16 gap-3"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="w-10 h-10 border-slate-300 border-t-blue-500 rounded-full"
                  style={{ border: '3px solid', borderTopColor: '#3b82f6' }}
                />
                <p className="text-slate-400 font-medium text-sm">Loading users...</p>
              </motion.div>
            ) : filteredUsers.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-24 gap-4"
              >
                <div className="w-20 h-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center shadow-inner border border-slate-100">
                  <Users size={32} className="text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-slate-800 font-bold text-lg">No staff found</p>
                  <p className="text-slate-400 font-medium text-sm mt-1">Try a different search or add a new member</p>
                </div>
              </motion.div>
            ) : (
              filteredUsers.map((user, index) => {
                const isMasterAdmin = user.username === 'md';
                const isDeactivated = user.is_active === false;
                
                // Cannot act on self (deactivate/delete)
                const isSelf = currentUserProfile?.id === user.id;

                return (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.04 }}
                    layout
                    whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0,0,0,0.05)" }}
                    className={`flex flex-col gap-0 backdrop-blur-sm rounded-[2rem] border transition-all overflow-hidden ${
                       isDeactivated 
                        ? 'bg-slate-50 border-slate-200 opacity-70 grayscale-[0.5]' 
                        : 'bg-white/60 border-white shadow-sm hover:bg-white hover:border-slate-100'
                    }`}
                  >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center font-bold text-white overflow-hidden shadow-lg flex-shrink-0 relative group mb-0.5 ${
                            isMasterAdmin 
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600'
                              : user.role === 'admin'
                                ? 'bg-gradient-to-br from-slate-700 to-slate-900 border border-white/20'
                                : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          }`}>
                            {isMasterAdmin ? <Crown size={24} className="text-white drop-shadow-md" /> :
                             user.role === 'admin' ? <ShieldCheck size={24} className="text-white drop-shadow-md" /> : <User size={24} className="text-white drop-shadow-md" />}
                            {/* Inner glow */}
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>

                          {editingId === user.id ? (
                            <input
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              autoFocus
                              className="px-3 py-2 bg-white border border-blue-300 rounded-lg text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400/50 w-44"
                            />
                          ) : (
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-800 text-base">{user.username}</p>
                                {isDeactivated && (
                                  <span className="text-[10px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-300/50 uppercase tracking-tighter">Disabled</span>
                                )}
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-lg mt-1 inline-flex items-center gap-1.5 border ${
                                isMasterAdmin
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : user.role === 'admin'
                                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                                    : 'bg-blue-50 text-blue-600 border-blue-200'
                              }`}>
                                {isMasterAdmin ? '👑 Master' : user.role === 'admin' ? '🛡️ Admin' : '👤 Staff Member'}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          {editingId === user.id ? (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={saveEdit}
                                className="p-2 bg-green-100 text-green-600 rounded-xl hover:bg-green-200 transition-colors"
                                title="Save"
                              >
                                <Check size={16} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => setEditingId(null)}
                                className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
                                title="Cancel"
                              >
                                <X size={16} />
                              </motion.button>
                            </>
                          ) : (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => { setResetId(resetId === user.id ? null : user.id); setEditingId(null); }}
                                className={`p-2 rounded-xl transition-colors ${resetId === user.id ? 'bg-orange-500 text-white' : 'bg-orange-100 text-orange-500 hover:bg-orange-200'}`}
                                title="Change Password / Reset Options"
                              >
                                <KeyRound size={16} />
                              </motion.button>
                              
                              {!isMasterAdmin && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => startEdit(user)}
                                  className="p-2 bg-blue-100 text-blue-500 rounded-xl hover:bg-blue-200 transition-colors"
                                  title="Edit Username"
                                >
                                  <Edit2 size={16} />
                                </motion.button>
                              )}
                              
                              {!isMasterAdmin && !isSelf && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => setActionUser(user)}
                                  className={`p-2 rounded-xl transition-colors ${
                                    isDeactivated 
                                      ? 'bg-emerald-100 text-emerald-500 hover:bg-emerald-200'
                                      : 'bg-orange-100 text-orange-500 hover:bg-orange-200'
                                  }`}
                                  title={isDeactivated ? "Activate User" : "Deactivate User"}
                                >
                                  {isDeactivated ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                                </motion.button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Password Reset Expandable Section */}
                      <AnimatePresence>
                        {resetId === user.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                            className="overflow-hidden bg-orange-50/50 border-t border-slate-200/60"
                          >
                            <div className="px-5 py-5 flex gap-4 flex-col sm:flex-row sm:items-center">
                              {isMasterAdmin ? (
                                <div className="flex-1 w-full bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
                                  <div className="flex items-center gap-3 mb-3">
                                     <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500">
                                        <ShieldCheck size={18} />
                                     </div>
                                     <p className="text-sm text-slate-800 font-black">Security Policy</p>
                                  </div>
                                  <p className="text-xs text-slate-500 mb-4 font-medium leading-relaxed">
                                    Master Admin passwords cannot be changed directly for security. Send an OTP magic link to <span className="text-orange-600 font-bold">mdcourierkdy@gmail.com</span> to proceed.
                                  </p>
                                  <motion.button
                                    whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
                                    onClick={sendMasterAdminOTPLink}
                                    className="px-6 py-3 bg-orange-500 text-white text-sm font-black rounded-xl hover:bg-orange-600 transition-all w-full flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                                  >
                                    <Mail size={18} /> Send Reset Link
                                  </motion.button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-3 flex-1 relative group">
                                    <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-400" />
                                    <input
                                      type="password"
                                      placeholder="New Password (min 6 chars)"
                                      value={newPassword}
                                      onChange={(e) => setNewPassword(e.target.value)}
                                      className="w-full pl-12 pr-4 py-3 bg-white border border-orange-100 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-4 focus:ring-orange-400/10 focus:border-orange-300 transition-all placeholder:font-normal"
                                    />
                                  </div>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handlePasswordReset(user.id)}
                                    className="px-6 py-3 bg-slate-900 text-white text-sm font-black rounded-xl hover:bg-black transition-all whitespace-nowrap shadow-lg shadow-slate-200"
                                  >
                                    Update Password
                                  </motion.button>
                                </>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
