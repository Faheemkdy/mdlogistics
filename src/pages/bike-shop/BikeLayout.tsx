import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, Map, ShoppingCart, User, FileText } from 'lucide-react';
import { clsx } from 'clsx';

export const BikeLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const NavItem = ({ icon: Icon, path }: { icon: any, path: string }) => {
    const isActive = location.pathname === path;
    return (
      <button 
        onClick={() => navigate(path)}
        className={clsx(
          "relative p-4 rounded-3xl transition-all duration-300",
          isActive 
            ? "text-blue-400 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.5),inset_-4px_-4px_8px_rgba(255,255,255,0.05)]" 
            : "text-slate-500 hover:text-slate-300"
        )}
      >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        {isActive && (
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-[#242830] text-white overflow-hidden font-sans">
      {/* Main Content Area */}
      <div className="h-full overflow-y-auto pb-24 scrollbar-hide">
        <Outlet />
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#242830]/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)] pt-2 px-6">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <NavItem icon={Home} path="/bike-shop" />
          <NavItem icon={Map} path="/bike-shop/map" />
          <div className="relative -top-6">
            <button 
                onClick={() => navigate('/bike-shop/cart')}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] border-4 border-[#242830]"
            >
                <ShoppingCart size={24} fill="white" />
            </button>
          </div>
          <NavItem icon={User} path="/bike-shop/profile" />
          <NavItem icon={FileText} path="/bike-shop/docs" />
        </div>
      </div>
    </div>
  );
};
