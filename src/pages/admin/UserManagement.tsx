import React, { useState, useEffect } from 'react';
import { supabase, createTempClient, getEmailFromUsername } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { UserPlus, CheckCircle, AlertCircle, Ban, Edit2, X, Check, User, KeyRound, Users, Search, Crown, CheckCircle2, Mail, Eye, EyeOff, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSupabasePagination } from '../../hooks/useSupabasePagination';

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md bg-slate-900/20"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-white/90 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white shadow-[0_20px_50px_rgba(0,0,0,0.1)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center gap-6">
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
            className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-lg ${
              isDeactivating 
                ? 'bg-rose-50 text-rose-500 shadow-rose-200/50 border border-rose-100' 
                : 'bg-emerald-50 text-emerald-500 shadow-emerald-200/50 border border-emerald-100'
            }`}
          >
            {isDeactivating ? <Ban size={44} strokeWidth={1.5} /> : <CheckCircle2 size={44} strokeWidth={1.5} />}
          </motion.div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">
              {isDeactivating ? 'Deactivate User?' : 'Activate User?'}
            </h3>
            <p className="text-slate-500 text-sm leading-relaxed font-medium">
              Are you sure you want to {isDeactivating ? 'deactivate' : 'activate'}{' '}
              <span className="text-slate-900 font-bold">"{user?.username}"</span>?
              <br />
              <span className="opacity-80">
                {isDeactivating 
                  ? 'Access will be immediately revoked.'
                  : 'Access will be restored to this account.'}
              </span>
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full py-4 rounded-2xl text-white font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg ${
                isDeactivating 
                  ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200' 
                  : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200'
              }`}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (isDeactivating ? <Ban size={18} /> : <CheckCircle2 size={18} />)}
              {isLoading ? 'Processing...' : (isDeactivating ? 'Confirm Action' : 'Activate User')}
            </button>
            <button
              onClick={onCancel}
              className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-all active:scale-95"
            >
              Go Back
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export const UserManagement = () => {
  const toast = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'user'>('user');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const {
    data: users,
    loading: fetchLoading,
    loadingMore,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore,
    totalCount,
    refetch: fetchUsers
  } = useSupabasePagination({
    table: 'profiles',
    searchFields: ['username', 'role'],
    limit: 20
  });


  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Password Reset State
  const [resetId, setResetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Deactivate Modal State
  const [actionUser, setActionUser] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Current user
  const { profile, isMasterAdmin } = useAuth();
  // removed redundant currentUserProfile state


  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
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
      setSubmitting(false);
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
    setUsername(user.username);
    setRole(user.role || 'user');
    setResetId(null);
    document.getElementById('create-user-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const saveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !editingId) return;

    if (password && password.length < 6) {
      toast.warning('Password too short', 'Must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: userError } = await supabase.from('profiles').update({ username, role }).eq('id', editingId);
      if (userError) throw userError;

      if (password) {
        const { error: passError } = await supabase.rpc('update_user_password', {
          target_user_id: editingId,
          new_password: password
        });
        if (passError) throw passError;
      }

      toast.success('Member updated!', password ? 'Username and password updated.' : 'Username updated.');
      
      setEditingId(null);
      setUsername('');
      setPassword('');
      setRole('user');
      fetchUsers();
    } catch (error: any) {
      toast.error('Update failed', error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setUsername('');
    setPassword('');
    setRole('user');
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
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('delete_user_account', { target_user_id: userId });
      if (error) throw error;
      if (!data) throw new Error("Could not delete user.");
      toast.success('User Deleted', 'The user account has been permanently removed.');
      fetchUsers();
    } catch (error: any) {
      toast.error('Deletion Failed', error.message || 'Could not delete user.');
    } finally {
      setSubmitting(false);
    }
  };


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
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2"
      >
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">User Management</h1>
          <div className="flex items-center gap-2 text-slate-500 font-semibold text-sm">
            <Users size={16} className="text-blue-500" />
            <span>Manage organization access & permissions</span>
          </div>
        </div>
          <div className="flex items-center gap-2.5 px-5 py-2.5 bg-white/60 backdrop-blur-md text-slate-700 rounded-2xl text-xs font-black border border-white shadow-sm">
            <Crown size={14} className="text-amber-500" />
            <span className="opacity-70 uppercase tracking-widest">Total Users:</span>
            <span className="text-slate-900 text-sm">{totalCount}</span>
          </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create / Edit User Form - Light Card */}
        <motion.div
          id="create-user-form"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.23, 1, 0.32, 1] }}
          className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-fit relative overflow-hidden"
        >
          {/* Decorative Background Element */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 mb-8 relative">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              {editingId ? <Edit2 size={24} strokeWidth={2.5} /> : <UserPlus size={24} strokeWidth={2.5} />}
            </div>
            <div>
              <h3 className="font-black text-xl text-slate-900 tracking-tight">
                {editingId ? 'Edit Member' : 'New Member'}
              </h3>
              <p className="text-slate-500 text-sm font-semibold">
                {editingId ? 'Update user details' : 'Onboard new staff'}
              </p>
            </div>
          </div>

          <form onSubmit={editingId ? saveEdit : handleCreateUser} className="space-y-6 relative">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Account Identity</label>
              <div className="relative group">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all font-medium"
                />
                <User size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-400 transition-colors" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Security Key</label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingId ? "New password (optional)" : "Secret Password"}
                  required={!editingId}
                  className="w-full pl-5 pr-14 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-500 transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Permission Level</label>
              <div className="relative">
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'user')}
                  className="w-full px-5 py-4 bg-slate-50/50 border border-slate-100 rounded-2xl text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all appearance-none cursor-pointer font-bold"
                >
                  <option value="user">Standard Member</option>
                  <option value="admin">Administrator</option>
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <CheckCircle size={18} />
                </div>
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-bold overflow-hidden shadow-sm ${
                    message.type === 'error'
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}
                >
                  {message.type === 'error' ? <AlertCircle size={20} className="shrink-0" /> : <CheckCircle size={20} className="shrink-0" />}
                  <span>{message.text}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex gap-3 mt-4">
              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-slate-200 tracking-tight"
              >
                {submitting ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  editingId ? <Check size={20} strokeWidth={2.5} /> : <UserPlus size={20} strokeWidth={2.5} />
                )}
                {submitting ? 'Processing...' : (editingId ? 'Update Member' : 'Register Member')}
              </motion.button>
              
              {editingId && (
                <motion.button
                  type="button"
                  onClick={cancelEdit}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-6 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                >
                  <X size={20} strokeWidth={2.5} />
                </motion.button>
              )}
            </div>
          </form>
        </motion.div>

        {/* User List */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="lg:col-span-2 bg-white/50 backdrop-blur-md rounded-[2rem] p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex flex-col"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-8 bg-blue-500 rounded-full" />
              <h3 className="font-black text-2xl text-slate-900 tracking-tight">
                Organization
                <span className="ml-2 text-sm font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                  {totalCount}
                </span>
              </h3>
            </div>
            <div className="relative group">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Find users..."
                className="pl-12 pr-4 py-3 bg-white/80 border border-slate-100 rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all sm:w-64 w-full font-medium shadow-sm"
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
              ) : users.length === 0 ? (
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
                users.map((user: any, index: number) => {
                  const isMasterUser = user.username === 'md';
                  const isDeactivated = user.is_active === false;
                  const isSelf = profile?.id === user.id;

                  return (
                     <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.4, delay: index * 0.05 }}
                      layout
                      className={`group flex flex-col rounded-3xl border transition-all overflow-hidden ${
                         isDeactivated 
                          ? 'bg-slate-50/50 border-slate-200 opacity-80' 
                          : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                          {/* User Avatar/Icon */}
                          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm flex-shrink-0 relative ${
                            isMasterUser 
                              ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-amber-200'
                              : user.role === 'admin'
                                ? 'bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-200'
                                : 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-200'
                          }`}>
                            {isMasterUser ? <Crown size={24} /> :
                             user.role === 'admin' ? <Users size={24} /> : <User size={24} />}
                            
                            {/* Active/Inactive Dot */}
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${isDeactivated ? 'bg-slate-400' : 'bg-emerald-500'}`} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <p className="font-black text-slate-900 truncate leading-tight tracking-tight">
                                  {user.username}
                                  {isSelf && <span className="ml-2 text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">You</span>}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2 items-center">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg inline-flex items-center gap-1.5 ${
                                  isMasterUser
                                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                    : user.role === 'admin'
                                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                      : 'bg-blue-50 text-blue-600 border border-blue-100'
                                }`}>
                                  {isMasterUser ? 'Master Admin' : user.role === 'admin' ? 'Administrator' : 'Standard Staff'}
                                </span>
                                {isDeactivated && (
                                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded-lg">Suspended</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 bg-slate-50/80 p-2 rounded-2xl border border-slate-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 w-full sm:w-auto justify-end sm:justify-start">
                          {isMasterUser && (
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => { setResetId(resetId === user.id ? null : user.id); setEditingId(null); }}
                              className={`p-2.5 rounded-xl transition-all ${resetId === user.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-200' : 'text-orange-500 hover:bg-orange-100'}`}
                              title="Reset Password"
                            >
                              <KeyRound size={18} />
                            </motion.button>
                          )}
                          
                          {!isMasterUser && (
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              onClick={() => startEdit(user)}
                              className="p-2.5 text-blue-500 hover:bg-blue-100 rounded-xl transition-all"
                              title="Edit Member"
                            >
                              <Edit2 size={18} />
                            </motion.button>
                          )}
                          
                          {!isMasterUser && !isSelf && (
                            <>
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => setActionUser(user)}
                                className={`p-2.5 rounded-xl transition-all ${
                                  isDeactivated 
                                    ? 'text-emerald-500 hover:bg-emerald-100'
                                    : 'text-rose-500 hover:bg-rose-100'
                                }`}
                                title={isDeactivated ? "Reactivate Account" : "Suspend Account"}
                              >
                                {isDeactivated ? <CheckCircle2 size={18} /> : <Ban size={18} />}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteUser(user.id)}
                                className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                title="Delete Permanently"
                              >
                                <Trash2 size={18} />
                              </motion.button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Expandable Password Reset (Master User Only) */}
                      <AnimatePresence>
                        {resetId === user.id && isMasterUser && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-slate-50 border-t border-slate-100"
                          >
                            <div className="p-6">
                              <div className="space-y-4">
                                <div className="flex items-center gap-3 text-orange-600 font-bold text-sm">
                                  <AlertCircle size={18} />
                                  <span>High-Security Account</span>
                                </div>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                  To reset the Master Admin password, a secure magic link will be sent to 
                                  <span className="text-slate-900 font-bold ml-1">mdcourierkdy@gmail.com</span>.
                                </p>
                                <motion.button
                                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                  onClick={sendMasterAdminOTPLink}
                                  className="w-full py-3.5 bg-orange-500 text-white font-black rounded-2xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-orange-100"
                                >
                                  <Mail size={18} strokeWidth={2.5} />
                                  Send Security Link
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
            
            {hasMore && (
              <div className="pt-4 pb-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full"
                      />
                      Loading more...
                    </>
                  ) : (
                    'Load More Users'
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
