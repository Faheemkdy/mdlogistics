import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Search, Check, MapPin, Send, Package, X, Hash, ClipboardList } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const Dispatch = () => {
  const toast = useToast();
  const [shops, setShops] = useState<any[]>([]);
  const [search, setSearch] = useState(() => {
    const saved = localStorage.getItem('dispatch_draft_search');
    const timestamp = localStorage.getItem('dispatch_draft_timestamp');
    const now = Date.now();
    if (timestamp && now - parseInt(timestamp) > 5 * 60 * 60 * 1000) {
      localStorage.removeItem('dispatch_draft_search');
      localStorage.removeItem('dispatch_draft_selections');
      localStorage.removeItem('dispatch_draft_timestamp');
      return '';
    }
    return saved || '';
  });
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('dispatch_draft_selections');
    const timestamp = localStorage.getItem('dispatch_draft_timestamp');
    const now = Date.now();
    if (timestamp && now - parseInt(timestamp) > 5 * 60 * 60 * 1000) return {};
    return saved ? JSON.parse(saved) : {};
  });
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isScrolled, setIsScrolled] = useState(false);

  // Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 150);
    return () => clearTimeout(timer);
  }, [search]);

  // Persistence Effects
  useEffect(() => { 
    localStorage.setItem('dispatch_draft_search', search); 
    localStorage.setItem('dispatch_draft_timestamp', Date.now().toString());
  }, [search]);
  useEffect(() => { 
    localStorage.setItem('dispatch_draft_selections', JSON.stringify(selections)); 
    localStorage.setItem('dispatch_draft_timestamp', Date.now().toString());
  }, [selections]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (Object.keys(selections).length > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [selections]);

  useEffect(() => {
    fetchShops();
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
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
        shop_id: shopId, date, item_number: selections[shopId]
      }));
      const { error } = await supabase.from('dispatches').insert(dispatchRecords);
      if (error) throw error;
      toast.success('Dispatches recorded!', `${shopIds.length} shop dispatches saved successfully.`);
      setSelections({});
      localStorage.removeItem('dispatch_draft_selections');
      localStorage.removeItem('dispatch_draft_search');
      localStorage.removeItem('dispatch_draft_timestamp');
    } catch (error: any) {
      toast.error('Failed to save dispatches', error.message);
    } finally { setLoading(false); }
  };

  const toggleShop = (id: string) =>
    setSelections(prev => { const n = { ...prev }; if (n[id] !== undefined) delete n[id]; else n[id] = ''; return n; });

  const filteredShops = React.useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return shops.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.location || '').toLowerCase().includes(q)
    );
  }, [shops, debouncedSearch]);

  const selectedCount = Object.keys(selections).length;
  const filledCount = Object.keys(selections).filter(id => selections[id].trim() !== '').length;

  return (
    <div className="max-w-4xl lg:max-w-6xl mx-auto pb-32 px-4">

      {/* ── Sticky Header ── */}
      <div
        className={clsx(
          "sticky top-0 z-30 -mx-4 px-4 pt-4 pb-5 transition-all duration-300 ease-in-out",
          isScrolled 
            ? "bg-[#e0e5ec]/95 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)]" 
            : "bg-transparent backdrop-blur-sm"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-tight">
                Record Dispatch
              </h1>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-600 rounded-full shadow-lg shadow-blue-600/30">
                <ClipboardList size={12} className="text-white" />
                <span className="text-[10px] font-bold text-white uppercase tracking-wider">Hub → Shops</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              {selectedCount > 0 ? `${filledCount} of ${selectedCount} shop(s) ready` : 'Select shops and enter item counts'}
            </p>
          </div>

          {/* Date picker */}
          <div className="flex items-center gap-2 bg-white/40 border border-white/60 px-4 py-2 rounded-2xl shadow-[4px_4px_10px_rgba(163,177,198,0.3),-4px_-4px_10px_rgba(255,255,255,0.8)] self-start sm:self-auto">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Date</span>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="bg-transparent border-none outline-none text-slate-700 font-bold text-sm"
            />
          </div>
        </div>

        {/* Search */}
        <div className="relative group">
          <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
          <input
            placeholder="Search shops by name or area..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-12 pl-12 pr-12 bg-white/80 border border-white rounded-2xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-[6px_6px_12px_rgba(163,177,198,0.3),-6px_-6px_12px_rgba(255,255,255,0.8)]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-all">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ── Shop Grid ── */}
      <div className="mt-5">
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-between px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl mb-3"
          >
            <span className="text-xs font-bold text-blue-700">{selectedCount} selected · {filledCount} with count entered</span>
            <button onClick={() => setSelections({})} className="text-[11px] text-blue-600 font-bold hover:underline">Clear all</button>
          </motion.div>
        )}

        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-3">
          {filteredShops.length} Active Shop{filteredShops.length !== 1 ? 's' : ''}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {filteredShops.map((shop, index) => {
              const isSelected = selections[shop.id] !== undefined;
              const hasCount = isSelected && selections[shop.id].trim() !== '';
              return (
                <motion.div
                  key={shop.id}
                  initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15, delay: Math.min(index * 0.015, 0.2) }}
                  className={clsx(
                    "bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200 will-change-[transform,opacity]",
                    isSelected ? 'border-2 border-blue-300' : 'border border-white/60'
                  )}
                  style={isSelected
                    ? { background: 'linear-gradient(135deg, #eff6ff, #bfdbfe20)', boxShadow: 'inset 3px 3px 8px rgba(59,130,246,0.1), inset -3px -3px 8px rgba(255,255,255,0.6)' }
                    : { background: 'linear-gradient(135deg, #eef2f7, #d8dfe8)', boxShadow: '6px 6px 14px rgba(163,177,198,0.45), -6px -6px 14px rgba(255,255,255,0.75)' }
                  }
                >
                  {/* Shop row */}
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => toggleShop(shop.id)}
                  >
                    <div className={clsx(
                      'w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 flex-shrink-0',
                      hasCount
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105'
                        : isSelected
                        ? 'bg-blue-200 text-blue-600'
                        : 'bg-white/80 text-transparent shadow-[inset_2px_2px_5px_rgba(163,177,198,0.3)]'
                    )}>
                      <Check size={16} strokeWidth={3} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={clsx('font-bold text-base leading-tight truncate transition-colors', isSelected ? 'text-blue-800' : 'text-slate-700')}>
                        {shop.name}
                      </p>
                      {shop.location && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className={clsx('flex-shrink-0', isSelected ? 'text-blue-400' : 'text-slate-400')} />
                          <span className="text-xs text-slate-500 font-medium truncate">{shop.location}</span>
                        </div>
                      )}
                    </div>

                    {hasCount && (
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="flex-shrink-0 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full"
                      >
                        ×{selections[shop.id]}
                      </motion.div>
                    )}
                  </div>

                  {/* Item count input */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 pb-4"
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="bg-white/70 rounded-xl p-3 border border-blue-100">
                          <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-blue-600 mb-2">
                            <Hash size={10} /> Item Count / Batch
                          </label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            placeholder="Enter count (e.g. 10)"
                            value={selections[shop.id]}
                            onChange={e => updateItemNumber(shop.id, e.target.value)}
                            autoFocus
                            className="w-full h-10 px-3 bg-white border border-blue-200 rounded-lg text-base font-bold text-blue-700 placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400 transition-all"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredShops.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-14 px-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Search size={26} className="text-slate-300" />
            </div>
            <p className="text-slate-600 font-bold text-base">No shops found</p>
            <p className="text-slate-400 text-sm mt-1">Try a different search term.</p>
          </motion.div>
        )}
      </div>

      {/* ── Bottom Action Bar ── */}
      <motion.div
        initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-0 left-0 lg:left-72 right-0 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="mx-auto max-w-4xl lg:max-w-6xl px-4 pb-4">
          <div
            className="p-3 rounded-2xl flex items-center gap-3"
            style={{ background: 'rgba(15,23,42,0.94)', backdropFilter: 'blur(16px)', boxShadow: '0 -4px 30px rgba(0,0,0,0.15), 0 20px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* Count pill */}
            <div className="flex items-center gap-3 pl-3 flex-1">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white font-black text-lg leading-none">{filledCount}</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                  Ready to Dispatch
                </p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleDispatch}
              disabled={filledCount === 0 || loading}
              className={clsx(
                'flex items-center gap-2 px-7 h-12 rounded-xl font-bold text-sm transition-all',
                filledCount > 0
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/40 hover:bg-blue-700'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              )}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Confirm Dispatch
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
