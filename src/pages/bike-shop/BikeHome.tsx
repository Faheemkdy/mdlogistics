import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bike, Mountain, Heart } from 'lucide-react';
import { motion } from 'framer-motion';

const categories = [
  { id: 'all', label: 'All', icon: null },
  { id: 'road', label: 'Road', icon: Bike },
  { id: 'mountain', label: 'Mountain', icon: Mountain },
  { id: 'helmet', label: 'Helmet', icon: null },
];

const products = [
  {
    id: 1,
    name: 'PEUGEOT - LR01',
    category: 'Road Bike',
    price: '1,999.99',
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&q=80&w=600',
    isBike: true
  },
  {
    id: 2,
    name: 'SMITH - Trade',
    category: 'Road Helmet',
    price: '120',
    image: 'https://images.unsplash.com/photo-1557803175-298c8603ef56?auto=format&fit=crop&q=80&w=400',
    isBike: false
  }
];

export const BikeHome = () => {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = React.useState('all');

  return (
    <div className="p-6 max-w-md mx-auto pt-12">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
            <h1 className="text-slate-400 text-lg font-medium">Choose Your</h1>
            <h2 className="text-3xl font-bold text-white">Awesome Bike</h2>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-[#2A2D36] flex items-center justify-center shadow-[5px_5px_10px_rgba(0,0,0,0.3),-5px_-5px_10px_rgba(255,255,255,0.05)]">
            <Search className="text-white" size={20} />
        </div>
      </div>

      {/* Categories */}
      <div className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id)}
            className={`
              relative flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300
              ${activeCat === cat.id 
                ? 'bg-gradient-to-tr from-blue-600 to-cyan-400 text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)]' 
                : 'bg-[#2A2D36] text-slate-400 shadow-[5px_5px_10px_rgba(0,0,0,0.3),-5px_-5px_10px_rgba(255,255,255,0.05)]'
              }
            `}
          >
            {cat.icon ? <cat.icon size={24} /> : <span className="text-xs font-bold">{cat.label}</span>}
          </button>
        ))}
      </div>

      {/* Product List */}
      <div className="space-y-8">
        {products.map((product) => (
          <motion.div
            key={product.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/bike-shop/product/${product.id}`)}
            className="relative bg-[#2A2D36] rounded-[2.5rem] p-5 shadow-[10px_10px_20px_rgba(0,0,0,0.4),-10px_-10px_20px_rgba(255,255,255,0.05)] cursor-pointer"
          >
            {/* Favorite Icon */}
            <button className="absolute top-6 right-6 z-10 text-slate-400 hover:text-red-500">
                <Heart size={24} />
            </button>

            {/* Image Area */}
            <div className="relative h-48 mb-4 flex items-center justify-center">
                {/* Background Decoration */}
                <div className="absolute inset-4 bg-gradient-to-br from-white/5 to-transparent rounded-3xl blur-xl" />
                <img 
                    src={product.image} 
                    alt={product.name} 
                    className={`relative z-10 object-contain drop-shadow-2xl ${product.isBike ? 'w-full h-full scale-125 -rotate-6' : 'h-32'}`}
                />
            </div>

            {/* Info */}
            <div className="space-y-1">
                <p className="text-slate-400 text-sm font-medium">{product.category}</p>
                <h3 className="text-white text-xl font-bold">{product.name}</h3>
                <p className="text-slate-500 text-sm font-bold mt-2">$ {product.price}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
