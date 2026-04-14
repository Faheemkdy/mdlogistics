import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 landscape:gap-4">
        <motion.div whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.97 }} className="landscape:h-44">
          <Card 
            onClick={() => navigate('/pickup')}
            className="h-72 landscape:h-44 flex flex-col landscape:flex-row items-center justify-center gap-6 landscape:gap-4 cursor-pointer !bg-gradient-to-br !from-blue-50 !to-[#e0e5ec] hover:!border-blue-300 transition-all"
          >
            <div className="p-8 landscape:p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full text-white shadow-[0_10px_20px_rgba(59,130,246,0.4)] border-4 border-white">
              <Package size={56} className="landscape:w-8 landscape:h-8" strokeWidth={2} />
            </div>
            <div className="text-center landscape:text-left">
              <h2 className="text-3xl landscape:text-xl font-black text-slate-800">Pickup</h2>
              <p className="text-slate-500 font-medium mt-2 landscape:mt-0 landscape:text-xs">Record items from companies</p>
            </div>
          </Card>
        </motion.div>

        <motion.div whileHover={{ scale: 1.03, y: -5 }} whileTap={{ scale: 0.97 }} className="landscape:h-44">
          <Card 
            onClick={() => navigate('/delivery')}
            className="h-72 landscape:h-44 flex flex-col landscape:flex-row items-center justify-center gap-6 landscape:gap-4 cursor-pointer !bg-gradient-to-br !from-green-50 !to-[#e0e5ec] hover:!border-green-300 transition-all"
          >
            <div className="p-8 landscape:p-4 bg-gradient-to-br from-green-400 to-green-600 rounded-full text-white shadow-[0_10px_20px_rgba(34,197,94,0.4)] border-4 border-white">
              <Truck size={56} className="landscape:w-8 landscape:h-8" strokeWidth={2} />
            </div>
            <div className="text-center landscape:text-left">
              <h2 className="text-3xl landscape:text-xl font-black text-slate-800">Delivery</h2>
              <p className="text-slate-500 font-medium mt-2 landscape:mt-0 landscape:text-xs">Record delivery to shops</p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
