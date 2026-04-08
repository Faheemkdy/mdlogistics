import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Search, Check, ChevronLeft, ChevronRight, Save, MapPin, Plus } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const Pickup = () => {
  const { user } = useAuth();
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
    } catch (error: any) {
      alert('Error adding shop: ' + error.message);
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

      alert('Pickup saved successfully!');
      navigate('/');
    } catch (error: any) {
      alert('Error saving pickup: ' + error.message);
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
      <div className="sticky top-[calc(56px+env(safe-area-inset-top))] lg:top-0 z-30 bg-white/80 backdrop-blur-xl pt-4 pb-4 -mx-4 px-4 border-b border-slate-200 transition-all">
         <div className="flex flex-col gap-1">
             <div className="flex items-center gap-3">
                 {step === 2 && (
                     <motion.button 
                        whileTap={{ scale: 0.9 }}
                        className="w-10 h-10 flex items-center justify-center bg-white rounded-2xl shadow-sm text-slate-600 hover:text-blue-600 transition-colors" 
                        onClick={() => setStep(1)}
                     >
                         <ChevronLeft size={22} strokeWidth={3} />
                     </motion.button>
                 )}
                 <div>
                   <h1 className="text-3xl font-black text-slate-800 tracking-tight truncate">
                      {step === 1 ? 'Select Company' : 'Select Shops'}
                   </h1>
                   <p className="text-slate-500 font-medium text-sm">
                     {step === 1 ? 'Choose the logistics company for pickup' : 'Tap to select shops and add items'}
                   </p>
                 </div>
             </div>
         </div>

         <AnimatePresence>
           {step === 2 && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="relative mt-4 flex gap-2"
              >
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
                    className="!w-14 !h-14 !p-0 flex items-center justify-center !rounded-2xl shadow-lg shadow-blue-500/30 bg-gradient-to-br from-blue-500 to-indigo-600 border-none"
                  >
                    <Plus size={24} className="text-white" />
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
                onClick={() => { setSelectedCompany(company.id); setStep(2); }}
                className="group p-5 rounded-3xl cursor-pointer bg-white border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl font-black text-slate-300 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                    {company.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-bold text-xl text-slate-800">{company.name}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-sm">
                  <ChevronRight size={20} strokeWidth={3} />
                </div>
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
                      "p-5 rounded-3xl cursor-pointer transition-all duration-300 border backdrop-blur-lg relative overflow-hidden",
                      isSelected 
                        ? "bg-blue-50/80 border-blue-200 shadow-[0_8px_30px_rgba(59,130,246,0.15)] ring-2 ring-blue-500/20" 
                        : "bg-white/80 border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:bg-white"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
                    )}
                    
                    <div className="flex items-center gap-4 relative z-10" onClick={() => toggleShop(shop.id)}>
                        <div className={clsx(
                            "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm border-2",
                            isSelected ? "bg-gradient-to-br from-blue-500 to-indigo-600 border-transparent text-white shadow-blue-500/40 scale-110" : "bg-white border-slate-300 text-transparent hover:border-blue-300"
                        )}>
                            <Check size={18} strokeWidth={4} />
                        </div>
                        
                        <div className="flex-1">
                          <p className={clsx("font-black text-xl tracking-tight transition-colors", isSelected ? "text-blue-900" : "text-slate-800")}>{shop.name}</p>
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm font-medium mt-1">
                              <MapPin size={14} className={isSelected ? "text-blue-500" : ""} /> {shop.location}
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
                            <label className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-2 block">Item Number / Count</label>
                            <Input 
                              type="tel"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              placeholder="e.g. 5" 
                              value={selections[shop.id]} 
                              onChange={(e) => updateItemNumber(shop.id, e.target.value)}
                              className="!bg-white border-blue-200 !py-4 font-black text-2xl text-blue-900 shadow-sm focus:ring-4 focus:ring-blue-500/20"
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
              className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-2xl border-t border-slate-200 z-30 flex items-center justify-between shadow-[0_-20px_40px_rgba(0,0,0,0.05)] pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selected</span>
                <span className="text-2xl font-black text-slate-800 leading-none">{selectedCount}</span>
              </div>
              <Button 
                onClick={handleSave} 
                isLoading={loading} 
                className="w-2/3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/30 border-none py-4 rounded-2xl text-lg font-black hover:scale-[1.02]"
                disabled={selectedCount === 0}
              >
                <Save size={22} /> Confirm Pickup
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
