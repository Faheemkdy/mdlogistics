import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Search, Check, ChevronLeft, Save, MapPin, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const Pickup = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [companies, setCompanies] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Quick Add Shop State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopLocation, setNewShopLocation] = useState('');
  const [addingShop, setAddingShop] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [{ data: cData }, { data: sData }] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('shops').select('*').order('name')
    ]);
    setCompanies(cData || []);
    setShops(sData || []);
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
      toast.success('Shop added & selected!');
    } catch (error: any) {
      toast.error('Failed to add shop', error.message);
    } finally {
      setAddingShop(false);
    }
  };

  const handleSave = async () => {
    const shopIds = Object.keys(selections);
    if (!selectedCompany || shopIds.length === 0 || !user) return;
    setLoading(true);

    try {
      const { data: pickup, error: pickupError } = await supabase
        .from('pickups')
        .insert([{ company_id: selectedCompany, user_id: user.id, date: new Date().toISOString().split('T')[0] }])
        .select()
        .single();

      if (pickupError) throw pickupError;

      const items = shopIds.map(shopId => ({
        pickup_id: pickup.id,
        shop_id: shopId,
        item_number: selections[shopId] || null
      }));

      const { error: itemsError } = await supabase.from('pickup_items').insert(items);
      if (itemsError) throw itemsError;

      toast.success('Pickup saved!', `${shopIds.length} shop${shopIds.length > 1 ? 's' : ''} recorded successfully.`);
      setTimeout(() => navigate('/'), 1000);
    } catch (error: any) {
      toast.error('Failed to save pickup', error.message);
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
    <div className="max-w-2xl mx-auto pb-24">
      <div className="sticky top-0 z-30 bg-[#e0e5ec]/90 backdrop-blur-md pt-2 pb-4 -mx-4 px-4 shadow-[0_4px_10px_rgba(163,177,198,0.2)] transition-all">
         <div className="flex items-center gap-3">
             {step === 2 && (
                 <motion.button 
                    whileTap={{ scale: 0.9 }}
                    className="p-2 bg-white rounded-xl shadow-sm text-slate-600 shrink-0 -ml-1 mt-1" 
                    onClick={() => setStep(1)}
                 >
                     <ChevronLeft size={24} />
                 </motion.button>
             )}
             <h1 className="text-2xl font-black text-slate-800 tracking-tight truncate mt-1">
                {step === 1 ? 'Select Company' : 'Select Shops'}
             </h1>
         </div>

         <AnimatePresence>
           {step === 2 && (
               <motion.div 
                 initial={{ opacity: 0, height: 0 }}
                 animate={{ opacity: 1, height: 'auto' }}
                 exit={{ opacity: 0, height: 0 }}
                 className="flex gap-2 w-full mt-4"
               >
                   <div className="relative flex-1">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                     <input 
                       placeholder="Search shops..." 
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       className="w-full h-[46px] pl-12 pr-4 bg-white/60 backdrop-blur-sm border border-transparent rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white/80 focus:shadow-md focus:border-white transition-all shadow-[inset_2px_2px_5px_rgba(163,177,198,0.3),inset_-2px_-2px_5px_rgba(255,255,255,0.6)]"
                     />
                   </div>
                   <Button 
                     variant="primary" 
                     onClick={() => setIsAddModalOpen(true)}
                     className="!px-4 !py-0 !rounded-xl shadow-sm bg-white h-[46px] flex-shrink-0"
                   >
                     <Plus size={24} />
                   </Button>
               </motion.div>
           )}
         </AnimatePresence>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-4 mt-6"
          >
            {companies.map((company, index) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                key={company.id}
              >
                <Card 
                  onClick={() => { setSelectedCompany(company.id); setStep(2); }}
                  hoverEffect
                  className="flex items-center justify-between p-6 active:scale-[0.98] transition-transform"
                >
                  <span className="font-bold text-xl text-slate-700">{company.name}</span>
                  <div className="w-10 h-10 rounded-full shadow-[inset_3px_3px_6px_rgb(163,177,198,0.4),inset_-3px_-3px_6px_rgba(255,255,255,0.5)] flex items-center justify-center bg-white/30">
                    <span className="text-blue-500 font-bold">→</span>
                  </div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4 mt-6"
          >
            <div className="space-y-4">
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
                        ? "bg-gradient-to-br from-blue-50 to-[#e0e5ec] shadow-[inset_4px_4px_8px_rgba(163,177,198,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.8)] border border-blue-200" 
                        : "bg-gradient-to-br from-[#eef2f7] to-[#d3d8df] shadow-[6px_6px_12px_rgba(163,177,198,0.5),-6px_-6px_12px_rgba(255,255,255,0.7)] border border-white/40"
                    )}
                  >
                    <div className="flex items-center gap-4" onClick={() => toggleShop(shop.id)}>
                        <div className={clsx(
                            "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 cursor-pointer shadow-inner",
                            isSelected ? "bg-blue-500 text-white scale-110" : "bg-white text-transparent"
                        )}>
                            <Check size={18} strokeWidth={3} />
                        </div>
                        
                        <div className="flex-1 cursor-pointer">
                          <p className={clsx("font-bold text-lg transition-colors", isSelected ? "text-blue-700" : "text-slate-700")}>{shop.name}</p>
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium mt-0.5">
                              <MapPin size={14} className={isSelected ? "text-blue-400" : ""} /> {shop.location}
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
                                className="bg-white/80 !py-3 !text-sm shadow-inner font-bold text-blue-700"
                                autoFocus
                              />
                          </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

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
              className="fixed bottom-0 left-0 right-0 p-4 bg-[#e0e5ec]/90 backdrop-blur-md border-t border-white/50 z-30 flex items-center justify-between shadow-[0_-10px_20px_rgba(163,177,198,0.3)] pb-[calc(1rem+env(safe-area-inset-bottom))]"
            >
              <div className="text-sm font-black text-slate-600 bg-white/50 px-4 py-2 rounded-xl shadow-inner">
                  {selectedCount} <span className="font-medium text-slate-500">selected</span>
              </div>
              <Button 
                onClick={handleSave} 
                isLoading={loading} 
                className="w-1/2 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:text-white shadow-[0_8px_16px_rgba(59,130,246,0.4)] border-none py-4 text-lg"
                disabled={selectedCount === 0}
              >
                <Save size={20} /> Save
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
            >
              Add & Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
