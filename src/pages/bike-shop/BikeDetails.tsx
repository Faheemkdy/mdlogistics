import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export const BikeDetails = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('desc');

  return (
    <div className="min-h-screen bg-[#242830] flex flex-col">
      {/* Header Image Section */}
      <div className="relative h-[55vh] w-full overflow-hidden">
        {/* Blue Diagonal Background */}
        <div className="absolute top-0 right-0 w-[80%] h-full bg-gradient-to-bl from-blue-600 to-cyan-400 transform skew-x-[-15deg] origin-top-right translate-x-20" />
        
        {/* Top Nav */}
        <div className="absolute top-0 left-0 right-0 p-6 pt-12 flex items-center justify-between z-20">
            <button 
                onClick={() => navigate(-1)}
                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg"
            >
                <ChevronLeft size={24} />
            </button>
            <h1 className="text-white font-bold text-lg tracking-wider">PEUGEOT - LR01</h1>
            <div className="w-12" /> {/* Spacer */}
        </div>

        {/* Bike Image */}
        <motion.div 
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 flex items-center justify-center z-10 p-8"
        >
            <img 
                src="https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=800" 
                alt="Bike" 
                className="w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            />
            
            {/* Pagination Dots */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2">
                <div className="w-2 h-2 rounded-full bg-white/40" />
                <div className="w-2 h-2 rounded-full bg-white" />
                <div className="w-2 h-2 rounded-full bg-white/40" />
            </div>
        </motion.div>
      </div>

      {/* Content Section */}
      <div className="flex-1 -mt-8 relative z-20 bg-[#242830] rounded-t-[3rem] px-8 pt-10 pb-8 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        
        {/* Tabs */}
        <div className="flex gap-6 mb-8">
            <button 
                onClick={() => setActiveTab('desc')}
                className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'desc' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}
            >
                Description
            </button>
            <button 
                onClick={() => setActiveTab('spec')}
                className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'spec' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500'}`}
            >
                Specification
            </button>
        </div>

        {/* Title & Desc */}
        <div className="mb-auto">
            <h2 className="text-2xl font-bold text-white mb-4">PEUGEOT - LR01</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
                The LR01 uses the same design as the most iconic bikes from PEUGEOT Cycles' 130-year history and combines it with agile, dynamic performance that's perfectly suited to navigating today's cities. As well as a lugged steel frame and iconic PEUGEOT black-and-white chequer design.
            </p>
        </div>

        {/* Footer Action */}
        <div className="mt-8 bg-[#2A2D36] rounded-[2rem] p-2 flex items-center justify-between shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.05)]">
            <div className="px-8">
                <span className="text-blue-400 font-bold text-xl">$ 1,999.99</span>
            </div>
            <button 
                onClick={() => navigate('/bike-shop/cart')}
                className="bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-bold py-4 px-10 rounded-[1.8rem] shadow-lg hover:shadow-blue-500/30 transition-shadow"
            >
                Add to Cart
            </button>
        </div>
      </div>
    </div>
  );
};
