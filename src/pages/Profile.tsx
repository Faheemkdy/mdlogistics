import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, User, KeyRound, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export const Profile = () => {
  const { profile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isAdmin = profile?.role === 'admin';
  const initial = (profile?.username || '?').charAt(0).toUpperCase();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

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

  return (
    <div className="max-w-lg mx-auto space-y-6 pb-20">

      {/* ── Page Title ── */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">My Profile</h1>
        <p className="text-slate-500 font-medium mt-1">Manage your account details</p>
      </motion.div>

      {/* ── Avatar / Info Hero Card ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="relative bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 overflow-hidden shadow-xl shadow-indigo-500/30"
      >
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
        <div className="absolute -right-2 top-10 w-20 h-20 bg-white/10 rounded-full pointer-events-none" />

        <div className="relative flex items-center gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-3xl font-black text-white shadow-inner flex-shrink-0 backdrop-blur-sm">
            {initial}
          </div>
          <div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-0.5">Logged in as</p>
            <h2 className="text-2xl font-black text-white tracking-tight">{profile?.username}</h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className={clsx(
                'px-3 py-0.5 rounded-full text-xs font-bold',
                isAdmin
                  ? 'bg-yellow-400/20 text-yellow-200 border border-yellow-300/30'
                  : 'bg-white/10 text-white/70 border border-white/20'
              )}>
                {isAdmin ? '★ Admin' : 'Staff'}
              </span>
              {isAdmin && (
                <span className="flex items-center gap-1 text-white/60 text-xs font-medium">
                  <ShieldCheck size={12} /> Full Access
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Form Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] rounded-3xl p-6 shadow-[10px_10px_24px_rgba(163,177,198,0.5),-10px_-10px_24px_rgba(255,255,255,0.8)] border border-white/50"
      >
        <form onSubmit={handleUpdateProfile} className="space-y-6">

          {/* Username field */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <User size={16} className="text-blue-600" />
              </div>
              <h3 className="font-black text-slate-700">Username</h3>
              {!isAdmin && (
                <span className="ml-auto flex items-center gap-1 text-xs text-slate-400 font-medium">
                  <Lock size={11} /> Locked
                </span>
              )}
            </div>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              readOnly={!isAdmin}
              placeholder="Your username"
              className={clsx(!isAdmin && 'opacity-60 cursor-not-allowed')}
            />
          </div>

          {/* Password section — admin only */}
          {isAdmin && (
            <div className="pt-4 border-t border-white/40">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <KeyRound size={16} className="text-indigo-600" />
                </div>
                <h3 className="font-black text-slate-700">Change Password</h3>
              </div>
              <Input
                type="password"
                label="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current"
              />
              <p className="text-xs text-slate-400 font-medium mt-2 ml-1">Minimum 6 characters</p>
            </div>
          )}

          {/* Message */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                className={clsx(
                  'flex items-center gap-3 p-4 rounded-2xl text-sm font-bold border',
                  message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-700 border-red-200'
                )}
              >
                {message.type === 'success'
                  ? <CheckCircle2 size={20} className="flex-shrink-0 text-emerald-500" />
                  : <XCircle size={20} className="flex-shrink-0 text-red-500" />
                }
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Save Button — Admin only */}
          {isAdmin ? (
            <Button
              type="submit"
              isLoading={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold text-base shadow-lg shadow-indigo-500/30 border-none"
            >
              Save Changes
            </Button>
          ) : (
            <p className="text-center text-xs text-slate-400 font-medium pt-2">
              Only Admins can modify account details.
            </p>
          )}
        </form>
      </motion.div>
    </div>
  );
};
