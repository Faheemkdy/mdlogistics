import { useNavigate } from 'react-router-dom';
import { Package, Truck } from 'lucide-react';
import { motion } from 'framer-motion';

export const UserDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard</h1>
        <p className="text-slate-500 font-medium mt-1">Select an action to proceed</p>
      </div>

      <div className="grid grid-cols-1 gap-6 mt-4">
        <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <div 
            onClick={() => navigate('/pickup')}
            className="flex items-center gap-6 p-6 bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all group"
          >
             <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-blue-500/30 flex-shrink-0 group-hover:scale-105 transition-transform">
               <Package size={40} strokeWidth={2.5} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pickup</h2>
               <p className="text-slate-500 font-medium text-sm mt-1">Collect parcels from companies</p>
             </div>
          </div>
        </motion.div>

        <motion.div whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
          <div 
            onClick={() => navigate('/delivery')}
            className="flex items-center gap-6 p-6 bg-white/80 backdrop-blur-xl rounded-[2rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] cursor-pointer hover:shadow-[0_12px_40px_rgb(0,0,0,0.08)] transition-all group"
          >
             <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 flex-shrink-0 group-hover:scale-105 transition-transform">
               <Truck size={40} strokeWidth={2.5} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">Delivery</h2>
               <p className="text-slate-500 font-medium text-sm mt-1">Deliver items directly to shops</p>
             </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
