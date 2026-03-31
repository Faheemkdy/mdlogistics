import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, AlertTriangle } from 'lucide-react';

export const Profile = () => {
  const { profile } = useAuth();
  const [username, setUsername] = useState(profile?.username || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' | 'warning' } | null>(null);

  const isAdmin = profile?.role === 'admin';

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return; // Double check

    setLoading(true);
    setMessage(null);

    try {
      // 1. Update Username
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', profile?.id);

      if (profileError) throw profileError;

      // 2. Update Password (if provided)
      if (password) {
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
      }

      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setPassword('');
      
    } catch (error: any) {
      setMessage({ text: 'Error: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
      
      <Card>
        <div className="flex flex-col items-center gap-4 mb-8">
            <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-lg overflow-hidden flex items-center justify-center text-3xl font-bold text-slate-500">
                {username.charAt(0).toUpperCase()}
            </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div className="space-y-4">
                <div className="relative">
                    <Input 
                        label="Username" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        readOnly={!isAdmin}
                        className={!isAdmin ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}
                    />
                    {!isAdmin && <Lock size={16} className="absolute right-3 top-9 text-slate-400" />}
                </div>
                
                {isAdmin && (
                    <div className="pt-4 border-t border-slate-100">
                        <h3 className="font-bold text-slate-700 mb-2">Change Password</h3>
                        <Input 
                            type="password" 
                            label="New Password (Optional)" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                        />
                    </div>
                )}
            </div>

            {message && (
                <div className={`text-sm p-4 rounded-lg flex items-start gap-3 ${
                    message.type === 'error' ? 'bg-red-50 text-red-600' : 
                    message.type === 'warning' ? 'bg-orange-50 text-orange-700' :
                    'bg-green-50 text-green-600'
                }`}>
                    {message.type === 'warning' && <AlertTriangle size={20} className="shrink-0" />}
                    <span>{message.text}</span>
                </div>
            )}

            {isAdmin && (
                <Button type="submit" isLoading={loading} className="w-full">
                    Save Changes
                </Button>
            )}
            
            {!isAdmin && (
                <p className="text-center text-xs text-slate-400">
                    Only Admins can modify account details.
                </p>
            )}
        </form>
      </Card>
    </div>
  );
};
