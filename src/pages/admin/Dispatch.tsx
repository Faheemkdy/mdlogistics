import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Search, Check, MapPin, Send, Package } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const Dispatch = () => {
  const toast = useToast();
  const [shops, setShops] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    const { data } = await supabase.from('shops').select('*').eq('is_active', true).order('name');
    setShops(data || []);
  };

  const handleDispatch = async () => {
    const shopIds = Object.keys(selections).filter(id => selections[id].trim() !== '');
    if (shopIds.length === 0) {
      toast.error('No items', 'Please enter item counts for at least one shop.');
      return;
    }
    
    setLoading(true);

    try {
      const dispatchRecords = shopIds.map(shopId => ({
        shop_id: shopId,
        date: date,
        item_number: selections[shopId]
      }));

      const { error } = await supabase.from('dispatches').insert(dispatchRecords);

      if (error) throw error;
      toast.success('Dispatches recorded!', `${shopIds.length} shop dispatches saved successfully.`);
      setSelections({});
    } catch (error: any) {
      toast.error('Failed to save dispatches', error.message);
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
    <div className="max-w-4xl mx-auto pb-32 px-4 sm:px-6 relative min-h-[80vh]">
      <div className="sticky top-0 z-30 bg-[#f8fafc]/95 backdrop-blur-md pt-4 pb-6 px-4 -mx-4 sm:-mx-6 shadow-sm border-b border-slate-200/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Record Dispatch</h1>
                <p className="text-slate-500 text-xs sm:text-sm font-medium">Record items sent to shops from hub</p>
            </div>
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl shadow-inner border border-slate-200 w-full sm:w-auto">
                <span className="pl-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</span>
                <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-transparent border-none focus:ring-0 text-slate-700 font-bold p-2 text-sm flex-1 sm:flex-none"
                />
            </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            placeholder="Search shops..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 sm:h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-xl text-sm sm:text-base text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <AnimatePresence>
          {filteredShops.map((shop, index) => {
            const isSelected = selections[shop.id] !== undefined;
            return (
              <motion.div 
                key={shop.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                className={clsx(
                  "p-4 sm:p-5 rounded-2xl transition-all duration-300 border-2 cursor-pointer",
                  isSelected 
                    ? "bg-blue-50 border-blue-200 shadow-md" 
                    : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                )}
                onClick={() => !isSelected && toggleShop(shop.id)}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                    <div className={clsx(
                        "w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0 shadow-sm",
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                    )} onClick={(e) => { e.stopPropagation(); toggleShop(shop.id); }}>
                        <Check size={18} strokeWidth={3} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className={clsx("font-bold text-base sm:text-lg truncate", isSelected ? "text-blue-900" : "text-slate-700")}>{shop.name}</p>
                      <div className="flex items-center gap-1.5 text-slate-500 text-xs sm:text-sm font-medium mt-0.5">
                          <MapPin size={12} className="flex-shrink-0" /> <span className="truncate">{shop.location}</span>
                      </div>
                    </div>
                </div>

                <AnimatePresence>
                  {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-4 border-t border-blue-100"
                        onClick={(e) => e.stopPropagation()}
                      >
                          <label className="block text-[10px] font-black uppercase tracking-wider text-blue-600 mb-1.5">Item Count / Batch</label>
                          <Input 
                            type="tel"
                            inputMode="numeric"
                            placeholder="Enter count (e.g. 10)" 
                            value={selections[shop.id]} 
                            onChange={(e) => updateItemNumber(shop.id, e.target.value)}
                            className="bg-white !py-2.5 sm:!py-3 !text-base sm:!text-lg font-black text-blue-700 border-blue-200 focus:border-blue-500 focus:ring-blue-500"
                            autoFocus
                          />
                      </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md p-3 sm:p-4 bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl z-30 flex items-center justify-between shadow-2xl border border-white/10 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4"
      >
        <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Package size={18} />
            </div>
            <div>
                <p className="text-white font-bold text-base sm:text-lg leading-tight">{selectedCount}</p>
                <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Selected</p>
            </div>
        </div>
        <Button 
            onClick={handleDispatch} 
            isLoading={loading} 
            className="bg-blue-600 text-white hover:bg-blue-700 border-none px-6 sm:px-8 h-11 sm:h-12 rounded-xl sm:rounded-2xl shadow-lg shadow-blue-500/30 text-sm sm:text-base font-bold"
            disabled={selectedCount === 0}
        >
            <Send size={16} className="mr-2" /> Confirm Dispatch
        </Button>
      </motion.div>
    </div>
  );
};
