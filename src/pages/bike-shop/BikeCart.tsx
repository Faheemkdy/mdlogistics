import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

const cartItems = [
  {
    id: 1,
    name: 'PEUGEOT - LR01',
    price: 1999.99,
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=200',
    qty: 1
  },
  {
    id: 2,
    name: 'PILOT - CHROMOLY 520',
    price: 3999.99,
    image: 'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&q=80&w=200',
    qty: 1
  },
  {
    id: 3,
    name: 'SMITH - Trade',
    price: 120,
    image: 'https://images.unsplash.com/photo-1557803175-298c8603ef56?auto=format&fit=crop&q=80&w=200',
    qty: 1
  }
];

export const BikeCart = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#242830] p-6 pt-12 flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white shadow-lg"
        >
            <ChevronLeft size={20} />
        </button>
        <h1 className="text-white font-bold text-xl flex-1 text-center pr-10">My Shopping Cart</h1>
      </div>

      {/* Cart Items */}
      <div className="space-y-6 mb-8">
        {cartItems.map((item, idx) => (
            <motion.div 
                key={item.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="flex items-center gap-4"
            >
                {/* Image Box */}
                <div className="w-24 h-24 rounded-2xl bg-[#2A2D36] p-2 flex items-center justify-center shadow-[5px_5px_10px_rgba(0,0,0,0.3),-5px_-5px_10px_rgba(255,255,255,0.05)]">
                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                </div>

                {/* Info */}
                <div className="flex-1">
                    <h3 className="text-white font-bold text-sm mb-1">{item.name}</h3>
                    <p className="text-blue-400 font-bold text-sm">$ {item.price.toLocaleString()}</p>
                </div>

                {/* Qty Controls */}
                <div className="flex flex-col gap-2">
                    <button className="w-8 h-8 rounded-lg bg-[#2A2D36] flex items-center justify-center text-white shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] active:shadow-inner">
                        <Plus size={14} />
                    </button>
                    <span className="text-center text-slate-400 text-xs font-bold">{item.qty}</span>
                    <button className="w-8 h-8 rounded-lg bg-[#2A2D36] flex items-center justify-center text-slate-400 shadow-[3px_3px_6px_rgba(0,0,0,0.3),-3px_-3px_6px_rgba(255,255,255,0.05)] active:shadow-inner">
                        <Minus size={14} />
                    </button>
                </div>
            </motion.div>
        ))}
      </div>

      {/* Promo Code */}
      <div className="mb-8">
        <p className="text-slate-400 text-xs mb-2 text-center">Your cart qualifies for free shipping</p>
        <div className="relative">
            <input 
                type="text" 
                placeholder="Bike30"
                className="w-full bg-[#2A2D36] text-white rounded-2xl py-4 pl-6 pr-24 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.05)] outline-none"
            />
            <button className="absolute right-2 top-2 bottom-2 bg-gradient-to-r from-blue-600 to-cyan-400 text-white font-bold px-6 rounded-xl text-sm">
                Apply
            </button>
        </div>
      </div>

      {/* Summary */}
      <div className="mt-auto space-y-3 text-sm">
        <div className="flex justify-between text-slate-400">
            <span>Subtotal:</span>
            <span>$6,119.99</span>
        </div>
        <div className="flex justify-between text-slate-400">
            <span>Delivery Fee:</span>
            <span>$0</span>
        </div>
        <div className="flex justify-between text-slate-400">
            <span>Discount:</span>
            <span>30%</span>
        </div>
        <div className="flex justify-between text-blue-400 font-bold text-xl pt-2">
            <span>Total:</span>
            <span>$4,283.99</span>
        </div>

        {/* Checkout Button */}
        <button className="w-full mt-6 bg-[#2A2D36] rounded-[2rem] p-2 flex items-center justify-between shadow-[5px_5px_10px_rgba(0,0,0,0.3),-5px_-5px_10px_rgba(255,255,255,0.05)] active:scale-[0.99] transition-transform">
            <span className="pl-8 text-slate-400 font-bold">Checkout</span>
            <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg">
                <ChevronRight size={24} />
            </div>
        </button>
      </div>
    </div>
  );
};
