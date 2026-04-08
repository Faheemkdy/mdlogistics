import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, ArrowUpRight, Clock, ChevronRight, Activity, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

export const UserDashboard = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pickups: 0, deliveries: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Today's Stats
      const [{ count: pCount }, { count: dCount }] = await Promise.all([
        supabase.from('pickups').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('date', today),
        supabase.from('deliveries').select('*', { count: 'exact', head: true }).eq('user_id', user?.id).eq('date', today)
      ]);

      setStats({ pickups: pCount || 0, deliveries: dCount || 0 });

      // 2. Fetch Recent Activity (Mix of pickups and deliveries)
      const [{ data: pRecent }, { data: dRecent }] = await Promise.all([
        supabase.from('pickups')
          .select('id, created_at, companies(name)')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('deliveries')
          .select('id, created_at, shops(name)')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
          .limit(3)
      ]);

      const activities = [
        ...(pRecent || []).map(p => ({ ...p, type: 'pickup', title: (p.companies as any)?.name })),
        ...(dRecent || []).map(d => ({ ...d, type: 'delivery', title: (d.shops as any)?.name }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

      setRecentActivity(activities);

    } catch (error) {
      console.error('Dashboard Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Welcome Area ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">
            {getGreeting()}, <span className="text-indigo-600">{profile?.username || 'Staff'}</span>!
          </h1>
          <p className="text-slate-500 font-bold text-sm flex items-center gap-1.5 mt-1">
            <Calendar size={14} className="text-indigo-400" />
            {format(new Date(), 'EEEE, dd MMMM')} 
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
          <Activity size={20} strokeWidth={2.5} />
        </div>
      </motion.div>

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: 'Pickups Today', count: stats.pickups, icon: Package, color: 'blue' },
          { label: 'Deliveries Today', count: stats.deliveries, icon: Truck, color: 'emerald' }
        ].map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + idx * 0.1 }}
            className={`p-5 rounded-[2rem] bg-white border border-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex flex-col gap-3`}
          >
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600`}>
              <stat.icon size={20} strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 leading-none">{stat.count}</p>
              <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 mt-2">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ── Main Actions ── */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4">
          <motion.div 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/pickup')}
            className="group relative cursor-pointer"
          >
            <div className="absolute inset-0 bg-blue-600/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-5 p-5 bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:border-blue-200 transition-all">
               <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                 <Package size={30} strokeWidth={2.5} />
               </div>
               <div className="flex-1">
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">Pickup</h3>
                 <p className="text-slate-500 font-bold text-xs">Collect items from companies</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                 <ArrowUpRight size={18} strokeWidth={2.5} />
               </div>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/delivery')}
            className="group relative cursor-pointer"
          >
            <div className="absolute inset-0 bg-emerald-600/5 rounded-[2rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center gap-5 p-5 bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] group-hover:border-emerald-200 transition-all">
               <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                 <Truck size={30} strokeWidth={2.5} />
               </div>
               <div className="flex-1">
                 <h3 className="text-xl font-black text-slate-800 tracking-tight">Delivery</h3>
                 <p className="text-slate-500 font-bold text-xs">Deliver to shops directly</p>
               </div>
               <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                 <ArrowUpRight size={18} strokeWidth={2.5} />
               </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Recent Activity</h2>
           <motion.button onClick={fetchDashboardData} whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }}>
             <Clock size={14} className="text-slate-400" />
           </motion.button>
        </div>
        
        <div className="bg-white/50 backdrop-blur-xl rounded-[2rem] border border-white p-2">
          {loading ? (
             <div className="py-10 text-center space-y-3">
               <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Checking Logs...</p>
             </div>
          ) : recentActivity.length === 0 ? (
             <div className="py-10 text-center">
               <p className="text-sm font-bold text-slate-400 italic">No actions recorded yet today</p>
             </div>
          ) : (
             <div className="divide-y divide-slate-100/50">
               {recentActivity.map((activity, idx) => (
                 <motion.div
                   key={`${activity.id}-${idx}`}
                   initial={{ opacity: 0, x: -10 }}
                   animate={{ opacity: 1, x: 0 }}
                   transition={{ delay: idx * 0.05 }}
                   className="flex items-center gap-4 p-4 hover:bg-white rounded-2xl transition-all group"
                 >
                    <div className={statMatch(activity.type)}>
                       {activity.type === 'pickup' ? <Package size={14} /> : <Truck size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                       <p className="text-sm font-black text-slate-800 truncate">{activity.title || 'Unknown Entity'}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                         {activity.type} · {format(new Date(activity.created_at), 'hh:mm a')}
                       </p>
                    </div>
                    <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500" />
                 </motion.div>
               ))}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

const statMatch = (type: string) => {
  if (type === 'pickup') return "w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center shrink-0 shadow-sm";
  return "w-8 h-8 rounded-lg bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0 shadow-sm";
};
