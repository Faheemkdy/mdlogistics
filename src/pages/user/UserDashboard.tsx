import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Package, Truck, User, LogOut, AlertCircle, Clock, Users, Zap, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { clsx } from 'clsx';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

export const UserDashboard = () => {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalShipments: 0,
    activeDrivers: 0,
    pendingToday: 0,
    inTransit: 0,
    recentShipments: [] as any[],
    weeklyData: [] as any[]
  });

  const handleSignOut = async () => {
    setShowLogoutConfirm(false);
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');

      // 1. Fetch Total Shipments (Total Dispatches)
      const { count: totalShipments } = await supabase
        .from('dispatches')
        .select('*', { count: 'exact', head: true });

      // 2. Fetch Active Drivers (Profiles with role 'user')
      const { count: activeDrivers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user');

      // 3. Fetch Pending Today (Dispatches for today)
      const { count: pendingToday } = await supabase
        .from('dispatches')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // 4. Fetch In Transit (Sum of dispatches - Sum of deliveries) - Simplified for dashboard
      // For now, let's just get the count of deliveries today
      const { count: inTransit } = await supabase
        .from('deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('date', today);

      // 5. Fetch Recent Shipments (Latest Deliveries)
      const { data: recentDeliveries } = await supabase
        .from('deliveries')
        .select('id, item_number, shop_id, date, shops(name, location)')
        .order('created_at', { ascending: false })
        .limit(5);

      const formattedRecent = (recentDeliveries || []).map((d: any) => ({
        id: `#MDL-${d.id.substring(0, 4).toUpperCase()}`,
        location: d.shops?.name || 'Unknown',
        status: 'Delivered',
        color: 'bg-emerald-500'
      }));

      // 6. Fetch Weekly Data
      const { data: weeklyDeliveries } = await supabase
        .from('deliveries')
        .select('date')
        .gte('date', sevenDaysAgo)
        .lte('date', today);

      const days = eachDayOfInterval({
        start: subDays(new Date(), 6),
        end: new Date()
      });

      const weeklyFormatted = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const count = (weeklyDeliveries || []).filter(d => d.date === dayStr).length;
        return {
          day: format(day, 'EEE'),
          value: count,
          highlight: dayStr === today
        };
      });

      setStatsData({
        totalShipments: totalShipments || 0,
        activeDrivers: activeDrivers || 0,
        pendingToday: pendingToday || 0,
        inTransit: inTransit || 0,
        recentShipments: formattedRecent,
        weeklyData: weeklyFormatted
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { label: 'Total Shipments', value: statsData.totalShipments.toLocaleString(), trend: 'Overall', icon: Package, color: 'text-blue-600', trendUp: null },
    { label: "Today's Pickups", value: statsData.pendingToday.toString(), trend: 'Live', icon: Clock, color: 'text-teal-600', trendUp: true },
    { label: "Today's Deliveries", value: statsData.inTransit.toString(), trend: 'Live', icon: Truck, color: 'text-indigo-600', trendUp: true },
    { label: 'Active Drivers', value: statsData.activeDrivers.toString(), trend: 'Stable', icon: Users, color: 'text-amber-600', trendUp: null },
  ];

  // Removed full-screen loading to make navigation faster as requested by user


  return (
    <div className="min-h-screen bg-surface-100 dark:bg-surface-950 text-surface-900 dark:text-white font-sans selection:bg-primary-100 selection:text-primary-900 overflow-x-hidden transition-colors duration-300">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary-100/20 dark:bg-primary-950/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary-200/10 dark:bg-primary-900/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-3 lg:px-8 py-8 lg:py-12">
        {/* Top Header Section */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-surface-50/55 dark:bg-surface-900/55 backdrop-blur-md p-6 rounded-[2.5rem] border border-surface-200/40 dark:border-surface-800/40">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 text-white font-black text-xl">
              MD
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                MD <span className="text-primary-600 dark:text-primary-400">Logistics</span>
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-widest">Active Now: {profile?.username}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end mr-2 text-right">
              <p className="text-xs font-bold text-surface-400 dark:text-surface-500 uppercase tracking-wider">Welcome back</p>
              <p className="text-sm font-black text-surface-800 dark:text-white">{profile?.username}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-surface-200 dark:bg-surface-800 flex items-center justify-center text-surface-600 dark:text-surface-300 font-black border-2 border-surface-50 shadow-sm overflow-hidden">
               {profile?.username?.charAt(0).toUpperCase()}
            </div>
            <button 
              onClick={() => navigate('/profile')}
              className="px-4 py-2 bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-xs font-bold text-surface-600 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 transition-all shadow-sm"
            >
              Profile
            </button>
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="px-4 py-2 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-all shadow-md shadow-rose-500/10"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Hero Banner Section */}
        <div className="text-center mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 rounded-full text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest mb-6"
          >
            <Zap size={14} className="fill-primary-600 dark:fill-primary-400" />
            Operations Dashboard
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-5xl lg:text-7xl font-black tracking-tighter text-surface-900 dark:text-white mb-6"
          >
            MD <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-600">Logistics</span>
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-surface-500 dark:text-surface-400 font-medium text-lg max-w-2xl mx-auto"
          >
            Manage your courier operations with precision and speed.
          </motion.p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-12">
          {stats.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx }}
              className="bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/40 dark:border-surface-800/40 p-6 rounded-[2rem] shadow-premium"
            >
              <div className="flex flex-col items-center text-center">
                <p className="text-3xl font-black text-surface-900 dark:text-white mb-1">{stat.value}</p>
                <p className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-widest mb-3">{stat.label}</p>
                {stat.trend && (
                  <div className={clsx(
                    "px-3 py-1 rounded-full text-[10px] font-black",
                    stat.trendUp === true ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : 
                    stat.trendUp === false ? "bg-red-500/10 text-red-600 dark:text-red-400" : "bg-surface-100 dark:bg-surface-800 text-surface-500 dark:text-surface-400"
                  )}>
                    {stat.trend}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Main Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16 max-w-5xl mx-auto">
          {/* New Pickup Card */}
          <motion.div
            whileHover={{ y: -8 }}
            onClick={() => navigate('/pickup')}
            className="group cursor-pointer bg-surface-50/40 dark:bg-surface-900/40 backdrop-blur-xl border border-surface-200/50 dark:border-surface-800/50 p-8 rounded-[3rem] shadow-premium hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-500 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Package size={160} strokeWidth={0.5} className="text-surface-800 dark:text-surface-200" />
            </div>
            
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/20 mb-8 transform group-hover:rotate-6 transition-transform">
                <Package size={40} />
              </div>
              <p className="text-[10px] font-black text-primary-500 uppercase tracking-[0.3em] mb-2">Inventory Management</p>
              <h3 className="text-3xl font-black text-surface-900 dark:text-white mb-4">New Pickup</h3>
              <p className="text-surface-500 dark:text-surface-400 font-medium text-sm max-w-xs mb-8">
                Schedule package collections from sender locations across your network.
              </p>
              
              <div className="flex items-center justify-between w-full mt-4">
                <div className="text-left">
                  <p className="text-2xl font-black text-surface-900 dark:text-white">{statsData.pendingToday}</p>
                  <p className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-widest">Pending Today</p>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-surface-200 dark:border-surface-800 flex items-center justify-center text-surface-400 dark:text-surface-500 group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-all">
                  <ChevronRight size={24} />
                </div>
              </div>
            </div>
          </motion.div>

          {/* New Delivery Card */}
          <motion.div
            whileHover={{ y: -8 }}
            onClick={() => navigate('/delivery')}
            className="group cursor-pointer bg-surface-50/40 dark:bg-surface-900/40 backdrop-blur-xl border border-surface-200/50 dark:border-surface-800/50 p-8 rounded-[3rem] shadow-premium hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-500 overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
               <Truck size={160} strokeWidth={0.5} className="text-surface-800 dark:text-surface-200" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-[1.5rem] bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white shadow-xl shadow-primary-500/20 mb-8 transform group-hover:-rotate-6 transition-transform">
                <Truck size={40} />
              </div>
              <p className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-[0.3em] mb-2">Client Fulfillment</p>
              <h3 className="text-3xl font-black text-surface-900 dark:text-white mb-4">New Delivery</h3>
              <p className="text-surface-500 dark:text-surface-400 font-medium text-sm max-w-xs mb-8">
                Dispatch and track outbound deliveries to their final destinations.
              </p>
              
              <div className="flex items-center justify-between w-full mt-4">
                <div className="text-left">
                  <p className="text-2xl font-black text-surface-900 dark:text-white">{statsData.inTransit}</p>
                  <p className="text-[10px] font-bold text-surface-400 dark:text-surface-500 uppercase tracking-widest">In Transit</p>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-surface-200 dark:border-surface-800 flex items-center justify-center text-surface-400 dark:text-surface-500 group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-all">
                  <ChevronRight size={24} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Data Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Shipments */}
          <div className="bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/40 dark:border-surface-800/40 p-8 rounded-[3rem] shadow-premium">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black text-surface-900 dark:text-white">Recent Shipments</h3>
              <button onClick={() => navigate('/today-activity')} className="text-[10px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest hover:underline">View All</button>
            </div>
            
            <div className="space-y-6">
              {statsData.recentShipments.length > 0 ? statsData.recentShipments.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm", item.color)}>
                      <Package size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-surface-900 dark:text-white">{item.id}</p>
                      <p className="text-[10px] font-medium text-surface-400 dark:text-surface-500">→ {item.location}</p>
                    </div>
                  </div>
                  <div className={clsx(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider",
                    item.status === 'Delivered' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    item.status === 'In Transit' ? "bg-primary-500/10 text-primary-600 dark:text-primary-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}>
                    {item.status}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <p className="text-surface-450 dark:text-surface-400 text-sm font-medium">No recent shipments found.</p>
                </div>
              )}
            </div>
          </div>

          {/* Weekly Deliveries Chart */}
          <div className="bg-surface-50/80 dark:bg-surface-900/80 backdrop-blur-xl border border-surface-200/40 dark:border-surface-800/40 p-8 rounded-[3rem] shadow-premium">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-surface-900 dark:text-white">Weekly Deliveries</h3>
              <div className="text-[10px] font-black text-surface-400 dark:text-surface-500 uppercase tracking-widest">This Week</div>
            </div>
            
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-surface-900 dark:text-white">
                  {statsData.weeklyData.reduce((acc, curr) => acc + curr.value, 0)}
                </span>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Updated Live</span>
              </div>
              <p className="text-[10px] font-bold text-surface-400 dark:text-surface-500 tracking-widest uppercase">Total Last 7 Days</p>
            </div>
            
            <div className="flex items-end justify-between gap-2 h-40 pt-4">
              {statsData.weeklyData.map((data, idx) => {
                const maxVal = Math.max(...statsData.weeklyData.map(d => d.value), 1);
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(data.value / maxVal) * 100}%` }}
                      transition={{ delay: 0.1 * idx, duration: 1, ease: "easeOut" }}
                      className={clsx(
                        "w-full rounded-t-lg transition-all duration-500",
                        data.highlight ? "bg-gradient-to-t from-primary-500 to-primary-400" : "bg-surface-200 dark:bg-surface-800"
                      )}
                    />
                    <span className={clsx(
                       "text-[9px] font-bold uppercase tracking-tighter",
                       data.highlight ? "text-primary-600 dark:text-primary-400" : "text-surface-400 dark:text-surface-500"
                    )}>
                      {data.day}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-surface-400 dark:text-surface-500">
           <div className="inline-flex items-center gap-2 px-4 py-2 bg-surface-50/50 dark:bg-surface-900/50 border border-surface-200/50 dark:border-surface-800/50 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
             <CheckCircle2 size={12} className="text-emerald-500" />
             MD Logistics System Status: Operational
           </div>
        </footer>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)}
        title="Confirm Logout"
      >
        <div className="text-center space-y-6 p-4">
          <div className="w-20 h-20 bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto text-rose-500 shadow-inner">
            <AlertCircle size={40} />
          </div>
          <div>
            <h3 className="text-xl font-black text-surface-900 dark:text-white">Are you sure?</h3>
            <p className="text-surface-500 dark:text-surface-400 font-medium mt-1">You will need to login again to access your account.</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 py-4 font-black rounded-2xl animate-pulse"
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleSignOut}
              className="flex-1 py-4 font-black bg-rose-500 text-white shadow-lg shadow-rose-500/30 rounded-2xl"
            >
              Logout
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
