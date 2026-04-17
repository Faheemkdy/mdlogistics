import React, { useState, useEffect } from 'react';
import { supabase, createTempClient, getEmailFromUsername } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { UserPlus, CheckCircle, AlertCircle, Ban, Edit2, X, Check, User, KeyRound, Users, Search, Crown, CheckCircle2, Mail, Eye, EyeOff, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(8px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.1 }}
            className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
              isDeactivating ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-emerald-500/20 border border-emerald-500/30'
            }`}
          >
            {isDeactivating ? <Ban size={36} className="text-orange-400" /> : <CheckCircle2 size={36} className="text-emerald-400" />}
          </motion.div>
          <div>
            <h3 className="text-xl font-black text-white">
              {isDeactivating ? 'Deactivate User?' : 'Activate User?'}
            </h3>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed">
              Are you sure you want to {isDeactivating ? 'deactivate' : 'activate'}{' '}
              <span className="text-white font-bold">"{user?.username}"</span>?
              <br />
              {isDeactivating 
                ? 'They will no longer be able to log in to the system.'
                : 'They will be granted access to log in again.'}
            </p>
          </div>
          <div className="flex gap-3 w-full mt-2">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white font-bold hover:bg-white/20 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 py-3 rounded-xl text-white font-bold transition-colors disabled:opacity-60 flex items-center justify-center gap-2 ${
                isDeactivating ? 'bg-orange-500 hover:bg-orange-600' : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (isDeactivating ? <Ban size={16} /> : <CheckCircle2 size={16} />)}
              {isLoading ? 'Processing...' : (isDeactivating ? 'Deactivate' : 'Activate')}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const UserManagement = () => {
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

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
  const { profile, isMasterAdmin } = useAuth();
  // removed redundant currentUserProfile state

  useEffect(() => {
    fetchUsers();
  }, []);
  
  // Redundant getCurrentUser removed

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
      toast.success('User created!', `"${username}" can now log in.`);
      setTimeout(fetchUsers, 1000);

    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
      toast.error('Create failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!actionUser) return;
    
    // Safety check - cannot deactivate 'md' master admin
    if (actionUser.username === 'md') {
      toast.warning('Protected account', "Master Admin 'md' cannot be deactivated.");
      setActionUser(null);
      return;
    }

    setActionLoading(true);
    try {
      const newStatus = actionUser.is_active === false ? true : false;
      const { error } = await supabase.from('profiles').update({ is_active: newStatus }).eq('id', actionUser.id);
      if (error) throw error;
      toast.success(
        newStatus ? 'User activated' : 'User deactivated',
        `"${actionUser.username}" has been ${newStatus ? 'granted' : 'revoked'} access.`
      );
      setActionUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error('Action failed', err.message);
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
    if (error) { toast.error('Update failed', error.message); return; }
    toast.success('Username updated!');
    setEditingId(null);
    fetchUsers();
  };

  const handlePasswordReset = async (userId: string) => {
    if (!newPassword || newPassword.length < 6) {
      toast.warning('Password too short', 'Must be at least 6 characters.');
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
      toast.success('Password updated!', 'The user can now log in with the new password.');
    } catch (error: any) {
      toast.error('Password update failed', error.message);
    }
  };
  
  const sendMasterAdminOTPLink = async () => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail('mdcourierkdy@gmail.com', {
        redirectTo: window.location.origin + '/login',
      });
      if (error) throw error;
      toast.success('Reset link sent!', 'Check mdcourierkdy@gmail.com for the reset link.');
      setResetId(null);
    } catch (err: any) {
      toast.error('Failed to send email', err.message);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this user? This cannot be undone.")) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('delete_user_account', { target_user_id: userId });
      if (error) throw error;
      if (!data) throw new Error("Could not delete user.");
      toast.success('User Deleted', 'The user account has been permanently removed.');
      fetchUsers();
    } catch (error: any) {
      toast.error('Deletion Failed', error.message || 'Could not delete user.');
    } finally {
      setLoading(false);
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
          className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 border border-white/10 shadow-2xl h-fit"
        >
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-500/20 border border-blue-400/30 text-blue-400 rounded-2xl">
              <UserPlus size={24} />
            </div>
            <div>
              <h3 className="font-bold text-xl text-white">New Staff</h3>
              <p className="text-slate-400 text-sm">Create a new account</p>
            </div>
          </div>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  required
                  className="w-full pl-4 pr-12 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Access Level</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                style={{ colorScheme: 'dark' }}
              >
                <option value="user" className="bg-slate-800 text-white">Standard User (Staff)</option>
                <option value="admin" className="bg-slate-800 text-white">Administrator</option>
              </select>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3 rounded-xl flex items-start gap-3 text-sm font-medium overflow-hidden ${
                    message.type === 'error'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : 'bg-green-500/20 text-green-300 border border-green-500/30'
                  }`}
                >
                  {message.type === 'error' ? <AlertCircle size={18} className="shrink-0 mt-0.5" /> : <CheckCircle size={18} className="shrink-0 mt-0.5" />}
                  <span>{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-500 hover:to-indigo-500 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 mt-2"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : <UserPlus size={18} />}
              {loading ? 'Creating...' : 'Create User'}
            </motion.button>
          </form>
        </motion.div>

        {/* User List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="lg:col-span-2 bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] rounded-3xl p-6 border border-white/50 shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.7)]"
        >
          <div className="flex items-center justify-between mb-6 gap-3">
            <h3 className="font-bold text-lg sm:text-xl text-slate-800 truncate">
              All Users
              <span className="ml-2 text-sm font-medium text-slate-400">({filteredUsers.length})</span>
            </h3>
            <div className="relative flex-shrink-0">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-3 py-2 bg-white/70 border border-white/80 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40 w-28"
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
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center shadow-inner">
                    <Users size={28} className="text-slate-400" />
                  </div>
                  <p className="text-slate-400 font-medium">No users found</p>
                </motion.div>
              ) : (
                filteredUsers.map((user, index) => {
                  const isMasterUser = user.username === 'md';
                  const isDeactivated = user.is_active === false;
                  
                  // Cannot act on self (deactivate/delete)
                  const isSelf = profile?.id === user.id;

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, x: -20 }}
                      transition={{ duration: 0.3, delay: index * 0.04 }}
                      layout
                      className={`flex flex-col gap-0 backdrop-blur-sm rounded-2xl border transition-all overflow-hidden ${
                         isDeactivated 
                          ? 'bg-slate-200/50 border-slate-300 opacity-70 grayscale-[0.5]' 
                          : 'bg-white/60 border-white/80 shadow-sm hover:shadow-md hover:bg-white/80'
                      }`}
                    >
                      <div className="flex items-center justify-between p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white overflow-hidden shadow-md flex-shrink-0 ${
                            isMasterUser 
                              ? 'bg-gradient-to-br from-amber-500 to-yellow-600'
                              : user.role === 'admin'
                                ? 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                : 'bg-gradient-to-br from-blue-400 to-blue-600'
                          }`}>
                            {isMasterUser ? <Crown size={20} className="text-yellow-100" /> :
                             user.role === 'admin' ? <Crown size={20} /> : <User size={20} />}
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
                                <p className="font-bold text-slate-800 truncate max-w-[140px] sm:max-w-[200px]">{user.username}</p>
                                {isDeactivated && (
                                  <span className="text-[9px] font-bold bg-slate-300 text-slate-600 px-1.5 py-0.5 rounded text-uppercase tracking-wider">Deactivated</span>
                                )}
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 inline-block ${
                                isMasterUser
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200'
                                  : user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-700 border border-purple-200'
                                    : 'bg-blue-100 text-blue-700 border border-blue-200'
                              }`}>
                                {isMasterUser ? '👑 Master Admin' : user.role === 'admin' ? '🛡️ Admin' : '👤 Staff'}
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
                              
                              {!isMasterUser && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  onClick={() => startEdit(user)}
                                  className="p-2 bg-blue-100 text-blue-500 rounded-xl hover:bg-blue-200 transition-colors"
                                  title="Edit Username"
                                >
                                  <Edit2 size={16} />
                                </motion.button>
                              )}
                              
                              {!isMasterUser && !isSelf && (
                                <>
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
                                  <motion.button
                                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-2 rounded-xl bg-red-100 text-red-500 hover:bg-red-200 transition-colors"
                                    title="Delete User"
                                  >
                                    <Trash2 size={16} />
                                  </motion.button>
                                </>
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
                            <div className="px-4 py-4 flex gap-3 flex-col sm:flex-row sm:items-center">
                              {isMasterUser ? (
                                <div className="flex-1 w-full">
                                  <p className="text-sm text-slate-600 mb-3 font-medium">
                                    Master Admin passwords cannot be changed directly here for security. Send an OTP magic link to the registered secure email (mdcourierkdy@gmail.com).
                                  </p>
                                  <motion.button
                                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                    onClick={sendMasterAdminOTPLink}
                                    className="px-4 py-2.5 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors w-full flex items-center justify-center gap-2 shadow-md shadow-orange-500/20"
                                  >
                                    <Mail size={16} /> Send Email OTP Reset Link
                                  </motion.button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-2 flex-1">
                                    <div className="relative flex-1">
                                      <input
                                        type={showResetPassword ? "text" : "password"}
                                        placeholder="New Password (min 6 chars)"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-3 py-2 pl-9 pr-10 bg-white border border-orange-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400/50"
                                      />
                                      <KeyRound size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
                                      <button
                                        type="button"
                                        onClick={() => setShowResetPassword(!showResetPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                                      >
                                        {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                      </button>
                                    </div>
                                  </div>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                    onClick={() => handlePasswordReset(user.id)}
                                    className="px-4 py-2 bg-orange-500 text-white text-sm font-bold rounded-xl hover:bg-orange-600 transition-colors whitespace-nowrap shadow-sm shadow-orange-500/20"
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
