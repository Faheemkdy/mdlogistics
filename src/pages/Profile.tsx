import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, User, KeyRound, CheckCircle2, XCircle, ShieldCheck, Eye, EyeOff, LogOut, Calendar, BadgeCheck, Fingerprint } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

export const Profile = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(profile?.username || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isAdmin = profile?.role === 'admin';
  const isMaster = profile?.username === 'md';
  const initial = (profile?.username || '?').charAt(0).toUpperCase();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
       setMessage({ text: 'Standard users cannot change profile details directly.', type: 'error' });
       return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', profile?.id);
      if (profileError) throw profileError;

      if (password) {
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
      }

      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setPassword('');
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-24">
      {/* ── Page Header ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"
      >
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-surface-900 dark:text-white tracking-tight">Account Profile</h1>
          <p className="text-surface-500 dark:text-surface-400 font-semibold text-sm flex items-center gap-2">
            <Fingerprint size={16} className="text-primary-500" />
            Control your digital identity and security
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* ── Sidebar / Hero ── */}
        <div className="md:col-span-2 space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-xl rounded-[2.5rem] p-8 border border-surface-200 dark:border-surface-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col items-center text-center"
          >
            {/* Decorative mesh */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-primary-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Avatar */}
            <div className="relative group mb-6">
              <div className={clsx(
                "w-28 h-28 rounded-[2rem] flex items-center justify-center text-4xl font-black text-white shadow-xl relative z-10",
                isMaster ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                isAdmin ? "bg-gradient-to-br from-primary-500 to-primary-600" :
                "bg-gradient-to-br from-primary-400 to-primary-600"
              )}>
                {initial}
              </div>
              <div className="absolute inset-0 bg-primary-500/20 blur-2xl rounded-full opacity-50 group-hover:opacity-80 transition-opacity" />
            </div>

            <div className="space-y-2 relative z-10">
              <h2 className="text-2xl font-black text-surface-900 dark:text-white tracking-tight truncate max-w-full px-2">
                {profile?.username}
              </h2>
              <div className="flex flex-col items-center gap-2">
                <span className={clsx(
                  "px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border",
                  isMaster ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                  isAdmin ? "bg-primary-500/10 text-primary-500 border-primary-500/20" :
                  "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400 border-surface-200 dark:border-surface-700"
                )}>
                  {isMaster ? 'Master Administrator' : isAdmin ? 'Organization Admin' : 'Standard Member'}
                </span>
                
                {profile?.created_at && (
                  <p className="text-[10px] text-surface-400 dark:text-surface-500 font-bold uppercase tracking-widest flex items-center gap-1.5 mt-2">
                    <Calendar size={12} />
                    Member since {format(new Date(profile.created_at), 'MMMM yyyy')}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full h-px bg-surface-200 dark:bg-surface-800 my-8" />

            <div className="w-full space-y-3">
              <div className="flex items-center justify-between px-4 py-3 bg-surface-100/50 dark:bg-surface-800/50 rounded-2xl border border-surface-250/50 dark:border-surface-700/50">
                <span className="text-[10px] font-black text-surface-400 dark:text-surface-500 uppercase tracking-widest">Status</span>
                <span className="flex items-center gap-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                  <BadgeCheck size={14} /> Active
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full py-4 bg-rose-500/10 text-rose-500 font-black rounded-2xl hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3 active:scale-95 border border-rose-500/20"
              >
                <LogOut size={18} strokeWidth={2.5} />
                Sign Out
              </button>
            </div>
          </motion.div>
        </div>

        {/* ── Main Form Area ── */}
        <div className="md:col-span-3 space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-surface-50/50 dark:bg-surface-900/50 backdrop-blur-md rounded-[2.5rem] p-8 border border-surface-200 dark:border-surface-800 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
          >
            <form onSubmit={handleUpdateProfile} className="space-y-8">
              {/* Identity Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary-500 rounded-full" />
                  <h3 className="font-black text-lg text-surface-900 dark:text-white tracking-tight uppercase tracking-[0.1em] text-sm">Identity Details</h3>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-surface-400 dark:text-surface-500 uppercase tracking-[0.2em] ml-1">Username Handle</label>
                  <div className="relative group">
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      readOnly={!isAdmin}
                      placeholder="Your handle"
                      className={clsx(
                        "w-full px-5 py-4 bg-surface-150/70 dark:bg-surface-850/70 border border-surface-200/60 dark:border-surface-700/60 text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/30 transition-all font-black",
                        !isAdmin && 'opacity-60 cursor-not-allowed bg-surface-100/50 dark:bg-surface-800/50'
                      )}
                    />
                    <User size={18} className={clsx("absolute right-4 top-1/2 -translate-y-1/2 transition-colors", !isAdmin ? "text-surface-300" : "text-surface-400 dark:text-surface-500 group-focus-within:text-primary-500")} />
                  </div>
                  {!isAdmin && (
                    <p className="text-[10px] text-slate-400 font-bold italic ml-1 flex items-center gap-1.5">
                      <Lock size={10} /> Locked by organization administrator
                    </p>
                  )}
                </div>
              </div>

              {/* Security Section — Admin only */}
              {isAdmin && (
                <div className="space-y-4 pt-4 border-t border-surface-200 dark:border-surface-800">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-primary-500 rounded-full" />
                    <h3 className="font-black text-lg text-surface-900 dark:text-white tracking-tight uppercase tracking-[0.1em] text-sm">Access Control</h3>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-surface-400 dark:text-surface-500 uppercase tracking-[0.2em] ml-1">Update Password</label>
                    <div className="relative group">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="w-full pl-5 pr-14 py-4 bg-surface-150/70 dark:bg-surface-850/70 border border-surface-200 dark:border-surface-700 rounded-2xl text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500/30 transition-all font-black"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 hover:text-primary-500 transition-colors p-1"
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                      <KeyRound size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-transparent group-focus-within:text-transparent transition-colors" />
                    </div>
                    <p className="text-[10px] text-surface-400 dark:text-surface-500 font-bold ml-1 uppercase tracking-widest">At least 6 high-security characters</p>
                  </div>
                </div>
              )}

              {/* Status Message */}
              <AnimatePresence>
                {message && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={clsx(
                      'flex items-center gap-3 p-5 rounded-2xl text-sm font-black border shadow-sm',
                      message.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border-rose-500/20'
                    )}
                  >
                    {message.type === 'success'
                      ? <CheckCircle2 size={22} className="flex-shrink-0 text-emerald-500" />
                      : <XCircle size={22} className="flex-shrink-0 text-rose-500" />
                    }
                    {message.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              {isAdmin && (
                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-primary-500/10 tracking-tight"
                >
                  {loading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : <BadgeCheck size={20} strokeWidth={2.5} />}
                  {loading ? 'Securing Profile...' : 'Save Profile Details'}
                </motion.button>
              )}
            </form>
          </motion.div>
          
          <div className="flex items-center justify-center gap-4 text-surface-400 dark:text-surface-500">
             <div className="h-px flex-1 bg-surface-200 dark:bg-surface-800" />
             <ShieldCheck size={14} />
             <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encryption Enabled</span>
             <div className="h-px flex-1 bg-surface-200 dark:bg-surface-800" />
          </div>
        </div>
      </div>
    </div>
  );
};
