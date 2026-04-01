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
      <div className="sticky top-[calc(64px+env(safe-area-inset-top))] lg:top-0 z-30 bg-[#e0e5ec]/90 backdrop-blur-md pt-4 pb-4 -mx-4 px-4 shadow-[0_4px_10px_rgba(163,177,198,0.2)] transition-all">
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Select Shops</h1>
        
        <div className="relative mt-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
              <Input 
                placeholder="Search shops..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 !bg-white/60 backdrop-blur-sm"
              />
            </div>
            <Button 
                variant="primary" 
                onClick={() => setIsAddModalOpen(true)}
                className="!px-4 !py-0 !rounded-xl shadow-sm bg-white"
              >
                <Plus size={24} />
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
                  "p-5 rounded-2xl transition-all duration-300",
                  isSelected 
                    ? "bg-gradient-to-br from-green-50 to-[#e0e5ec] shadow-[inset_4px_4px_8px_rgba(163,177,198,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] border border-green-200" 
                    : "bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] shadow-[6px_6px_12px_rgba(163,177,198,0.5),-6px_-6px_12px_rgba(255,255,255,0.7)] border border-white/40"
                )}
              >
                <div className="flex items-center gap-4" onClick={() => toggleShop(shop.id)}>
                    <div className={clsx(
                        "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 cursor-pointer shadow-inner",
                        isSelected ? "bg-green-500 text-white scale-110" : "bg-white text-transparent"
                    )}>
                        <Check size={18} strokeWidth={3} />
                    </div>
                    
                    <div className="flex-1 cursor-pointer">
                      <p className={clsx("font-bold text-lg transition-colors", isSelected ? "text-green-700" : "text-slate-700")}>{shop.name}</p>
                      <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium mt-0.5">
                          <MapPin size={14} className={isSelected ? "text-green-400" : ""} /> {shop.location}
                      </div>
                    </div>
                </div>

                <AnimatePresence>
                  {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="pl-12"
                      >
                          <Input 
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="Item Number / Count" 
                            value={selections[shop.id]} 
                            onChange={(e) => updateItemNumber(shop.id, e.target.value)}
                            className="bg-white/80 !py-3 !text-sm shadow-inner font-bold text-green-700"
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
        className="fixed bottom-0 left-0 right-0 p-4 bg-[#e0e5ec]/90 backdrop-blur-md border-t border-white/50 z-50 flex items-center justify-between shadow-[0_-10px_20px_rgba(163,177,198,0.3)] pb-[calc(1rem+env(safe-area-inset-bottom))]"
      >
        <div className="text-sm font-black text-slate-600 bg-white/50 px-4 py-2 rounded-xl shadow-inner">
            {selectedCount} <span className="font-medium text-slate-500">selected</span>
        </div>
        <Button 
            onClick={handleDeliver} 
            isLoading={loading} 
            className="w-1/2 bg-gradient-to-r from-green-500 to-green-600 text-white hover:text-white shadow-[0_8px_16px_rgba(34,197,94,0.4)] border-none py-4 text-lg"
            disabled={selectedCount === 0}
        >
            <Truck size={20} /> Confirm
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
