import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Search, Check, MapPin, Truck, Plus, X, Hash } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

export const Delivery = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [shops, setShops] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopLocation, setNewShopLocation] = useState('');
  const [addingShop, setAddingShop] = useState(false);

  useEffect(() => { fetchShops(); }, []);

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
        .from('shops').insert([{ name: newShopName, location: newShopLocation }])
        .select().single();
      if (error) throw error;
      setShops(prev => [data, ...prev]);
      toggleShop(data.id);
      setNewShopName(''); setNewShopLocation('');
      setIsAddModalOpen(false); setSearch('');
      toast.success('Shop added!', `"${data.name}" selected for delivery.`);
    } catch (err: any) { toast.error('Failed to add shop', err.message); }
    finally { setAddingShop(false); }
  };

  const handleDeliver = async () => {
    const shopIds = Object.keys(selections);
    if (shopIds.length === 0 || !user) return;
    setLoading(true);
    try {
      const deliveries = shopIds.map(id => ({
        shop_id: id, user_id: user.id,
        date: new Date().toISOString().split('T')[0],
        item_number: selections[id] || null,
      }));
      const { error } = await supabase.from('deliveries').insert(deliveries);
      if (error) throw error;
      toast.success('Deliveries recorded!', `${shopIds.length} shop(s) delivered.`);
      setSelections({});
    } catch (err: any) { toast.error('Failed to save deliveries', err.message); }
    finally { setLoading(false); }
  };

  const toggleShop = (id: string) =>
    setSelections(prev => { const n = { ...prev }; if (n[id] !== undefined) delete n[id]; else n[id] = ''; return n; });

  const updateItemNumber = (id: string, val: string) =>
    setSelections(prev => ({ ...prev, [id]: val }));

  const filteredShops = shops.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.location || '').toLowerCase().includes(search.toLowerCase())
  );
  const selectedCount = Object.keys(selections).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30"
        style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.04)' }}>
        <div className="max-w-2xl mx-auto px-4 pt-4 pb-3">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">New Delivery</h1>
                <div className="flex items-center gap-1.5 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm shadow-green-200">
                  <Truck size={11} /> Delivery
                </div>
              </div>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                {selectedCount > 0 ? `${selectedCount} shop(s) selected` : 'Tap shops to mark for delivery'}
              </p>
            </div>
          </div>

          {/* Search + Add */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                placeholder="Search shops..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setIsAddModalOpen(true)}
              className="w-10 h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-sm shadow-green-200 transition-colors flex-shrink-0"
            >
              <Plus size={18} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Shop List ── */}
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-36 space-y-3">
        {/* Selected banner */}
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="flex items-center justify-between px-4 py-2.5 bg-green-50 border border-green-100 rounded-xl"
            >
              <span className="text-xs font-semibold text-green-600">{selectedCount} selected for delivery</span>
              <button onClick={() => setSelections({})} className="text-[11px] font-semibold text-green-400 hover:text-green-600 transition-colors">
                Clear all
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
          {filteredShops.length} Shops
        </p>

        <AnimatePresence>
          {filteredShops.map((shop, index) => {
            const isSelected = selections[shop.id] !== undefined;
            return (
              <motion.div
                key={shop.id} layout
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }} transition={{ delay: index * 0.015 }}
                className={clsx(
                  'bg-white rounded-2xl border-2 overflow-hidden transition-all duration-200',
                  isSelected
                    ? 'border-green-400 shadow-md shadow-green-100'
                    : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                )}
              >
                {/* Shop row */}
                <div
                  className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                  onClick={() => toggleShop(shop.id)}
                >
                  <div className={clsx(
                    'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                    isSelected ? 'bg-green-500 text-white scale-105' : 'bg-gray-100 text-transparent'
                  )}>
                    <Check size={14} strokeWidth={3} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={clsx('font-semibold text-sm truncate transition-colors', isSelected ? 'text-green-700' : 'text-gray-800')}>
                      {shop.name}
                    </p>
                    {shop.location && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className={clsx('flex-shrink-0', isSelected ? 'text-green-400' : 'text-gray-400')} />
                        <span className="text-xs text-gray-400 truncate">{shop.location}</span>
                      </div>
                    )}
                  </div>

                  {isSelected && (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                      className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Check size={11} className="text-green-600" strokeWidth={3} />
                    </motion.div>
                  )}
                </div>

                {/* Item input */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-4 pb-4" onClick={e => e.stopPropagation()}
                    >
                      <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                        <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-green-600 mb-2">
                          <Hash size={9} /> Item Count / Batch Number
                        </label>
                        <input
                          type="tel" inputMode="numeric" pattern="[0-9]*"
                          placeholder="Enter quantity..."
                          value={selections[shop.id]}
                          onChange={e => updateItemNumber(shop.id, e.target.value)}
                          autoFocus
                          className="w-full h-10 px-3 bg-white border border-green-200 rounded-lg text-sm font-semibold text-green-700 placeholder-green-300 focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredShops.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-14">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <Search size={22} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-semibold">No shops found</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">Try a different keyword</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold shadow-sm shadow-green-200"
            >
              <Plus size={15} /> Add New Shop
            </button>
          </motion.div>
        )}
      </div>

      {/* ── Bottom Action Bar ── */}
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -8px 30px rgba(0,0,0,0.06)' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Count info */}
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
              <Truck size={18} className="text-green-500" />
            </div>
            <div>
              <p className="text-gray-900 font-bold text-lg leading-none">{selectedCount}</p>
              <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                {selectedCount === 1 ? 'Shop Selected' : 'Shops Selected'}
              </p>
            </div>
          </div>

          {/* Confirm button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleDeliver}
            disabled={selectedCount === 0 || loading}
            className={clsx(
              'flex items-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm transition-all',
              selectedCount > 0
                ? 'bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-200'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <Truck size={15} strokeWidth={2.5} />}
            Confirm Delivery
          </motion.button>
        </div>
      </motion.div>

      {/* ── Add Shop Modal ── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Shop">
        <form onSubmit={handleQuickAddShop} className="space-y-4">
          <Input label="Shop Name" placeholder="Enter shop name" value={newShopName}
            onChange={e => setNewShopName(e.target.value)} required autoFocus />
          <Input label="Location / Area" placeholder="e.g. Kozhikode, Manjeri"
            value={newShopLocation} onChange={e => setNewShopLocation(e.target.value)} />
          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1">Cancel</Button>
            <Button type="submit" variant="primary" isLoading={addingShop}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white border-none">
              Add & Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
