import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Search, Check, MapPin, Truck, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const Delivery = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shops, setShops] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [selections, setSelections] = useState<Record<string, string>>({});

  // Quick Add Shop State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopLocation, setNewShopLocation] = useState('');
  const [addingShop, setAddingShop] = useState(false);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    const { data } = await supabase.from('shops').select('*').order('name');
    setShops(data || []);
  };

  const handleQuickAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;
    
    setAddingShop(true);
    try {
      const { data, error } = await supabase
        .from('shops')
        .insert([{ name: newShopName, location: newShopLocation }])
        .select()
        .single();

      if (error) throw error;

      // Add to local state and select it
      setShops(prev => [data, ...prev]);
      toggleShop(data.id);
      
      // Reset and close
      setNewShopName('');
      setNewShopLocation('');
      setIsAddModalOpen(false);
      setSearch(''); // Clear search to show the new shop
    } catch (error: any) {
      alert('Error adding shop: ' + error.message);
    } finally {
      setAddingShop(false);
    }
  };

  const handleDeliver = async () => {
    const shopIds = Object.keys(selections);
    if (shopIds.length === 0 || !user) return;
    
    setLoading(true);

    try {
      const deliveries = shopIds.map(shopId => ({
        shop_id: shopId,
        user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        item_number: selections[shopId] || null
      }));

      const { error } = await supabase.from('deliveries').insert(deliveries);

      if (error) throw error;
      alert('Deliveries recorded successfully!');
      navigate('/');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleShop = (id: string) => {
    setSelections(prev => {
      const newSelections = { ...prev };
      if (newSelections[id] !== undefined) delete newSelections[id];
      else newSelections[id] = '';
      return newSelections;
    });
  };

  const updateItemNumber = (id: string, val: string) => {
    setSelections(prev => ({ ...prev, [id]: val }));
  };

  const filteredShops = shops.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const selectedCount = Object.keys(selections).length;

  return (
    <div className="max-w-2xl mx-auto pb-24 relative min-h-[80vh]">
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] lg:top-0 z-30 bg-white/80 backdrop-blur-xl pt-4 pb-4 -mx-4 px-4 border-b border-slate-200 transition-all">
        <div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight truncate">Select Shops</h1>
           <p className="text-slate-500 font-medium text-sm">Tap to select shops for delivery</p>
        </div>
        
        <div className="relative mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <Input 
                placeholder="Search shops..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 !bg-white/80 border-0 shadow-sm rounded-2xl h-14 font-medium"
              />
            </div>
            <Button 
                variant="primary" 
                onClick={() => setIsAddModalOpen(true)}
                className="!w-14 !h-14 !p-0 flex items-center justify-center !rounded-2xl shadow-lg shadow-green-500/30 bg-gradient-to-br from-green-500 to-emerald-600 border-none"
              >
                <Plus size={24} className="text-white" />
            </Button>
        </div>
      </div>

      <div className="space-y-4 mt-6">
        <AnimatePresence>
          {filteredShops.map((shop, index) => {
            const isSelected = selections[shop.id] !== undefined;
            return (
              <motion.div 
                key={shop.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={clsx(
                  "p-5 rounded-3xl cursor-pointer transition-all duration-300 border backdrop-blur-lg relative overflow-hidden",
                  isSelected 
                    ? "bg-emerald-50/80 border-emerald-200 shadow-[0_8px_30px_rgba(16,185,129,0.15)] ring-2 ring-emerald-500/20" 
                    : "bg-white/80 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white"
                )}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
                )}

                <div className="flex items-center gap-4 relative z-10" onClick={() => toggleShop(shop.id)}>
                    <div className={clsx(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm border-2",
                        isSelected ? "bg-gradient-to-br from-green-500 to-emerald-600 border-transparent text-white shadow-emerald-500/40 scale-110" : "bg-white border-slate-300 text-transparent hover:border-emerald-300"
                    )}>
                        <Check size={18} strokeWidth={4} />
                    </div>
                    
                    <div className="flex-1">
                      <p className={clsx("font-black text-xl tracking-tight transition-colors", isSelected ? "text-emerald-900" : "text-slate-800")}>{shop.name}</p>
                      <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium mt-1">
                          <MapPin size={14} className={isSelected ? "text-emerald-500" : ""} /> {shop.location}
                      </div>
                    </div>
                </div>

                <AnimatePresence>
                  {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, height: 'auto', marginTop: 20 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="relative z-10"
                      >
                        <label className="text-xs font-bold uppercase tracking-wider text-emerald-600 mb-2 block">Item Number / Count</label>
                        <Input 
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="e.g. 5" 
                          value={selections[shop.id]} 
                          onChange={(e) => updateItemNumber(shop.id, e.target.value)}
                          className="!bg-white border-emerald-200 !py-4 font-black text-2xl text-emerald-900 shadow-sm focus:ring-4 focus:ring-emerald-500/20"
                          autoFocus
                        />
                      </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredShops.length === 0 && (
          <div className="text-center py-12 px-6">
            <p className="text-slate-500 font-medium mb-6">Shop not found? Add it now.</p>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              variant="primary"
              className="mx-auto"
            >
              <Plus size={20} /> Add New Shop
            </Button>
          </div>
        )}
      </div>

      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-2xl border-t border-slate-200 z-30 flex items-center justify-between shadow-[0_-20px_40px_rgba(0,0,0,0.05)] pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected</span>
          <span className="text-2xl font-black text-slate-800 leading-none">{selectedCount}</span>
        </div>
        <Button 
            onClick={handleDeliver} 
            isLoading={loading} 
            className="w-2/3 bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-xl shadow-emerald-500/30 border-none py-4 rounded-2xl text-lg font-black hover:scale-[1.02]"
            disabled={selectedCount === 0}
        >
            <Truck size={22} /> Confirm Delivery
        </Button>
      </motion.div>

      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Shop"
      >
        <form onSubmit={handleQuickAddShop} className="space-y-6">
          <Input 
            label="Shop Name"
            placeholder="Enter shop name"
            value={newShopName}
            onChange={(e) => setNewShopName(e.target.value)}
            required
            autoFocus
          />
          <Input 
            label="Location / Area"
            placeholder="e.g. Kozhikode, Manjeri"
            value={newShopLocation}
            onChange={(e) => setNewShopLocation(e.target.value)}
          />
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              isLoading={addingShop}
              className="flex-1 bg-green-600 text-white hover:bg-green-700 border-none"
            >
              Add & Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
