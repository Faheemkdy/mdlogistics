import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import {
  Search, Check, ChevronLeft, ChevronRight,
  MapPin, Plus, Package, Building2, Hash, X
} from 'lucide-react';
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
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopLocation, setNewShopLocation] = useState('');
  const [addingShop, setAddingShop] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const [{ data: cData }, { data: sData }] = await Promise.all([
      supabase.from('companies').select('*').order('name'),
      supabase.from('shops').select('*').order('name'),
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
        .from('shops').insert([{ name: newShopName, location: newShopLocation }])
        .select().single();
      if (error) throw error;
      setShops(prev => [data, ...prev]);
      toggleShop(data.id);
      setNewShopName(''); setNewShopLocation('');
      setIsAddModalOpen(false); setSearch('');
      toast.success('Shop added & selected!');
    } catch (err: any) { toast.error('Failed to add shop', err.message); }
    finally { setAddingShop(false); }
  };

  const handleSave = async () => {
    const shopIds = Object.keys(selections);
    if (!selectedCompany || shopIds.length === 0 || !user) return;
    setLoading(true);
    try {
      const { data: pickup, error: pe } = await supabase
        .from('pickups')
        .insert([{ company_id: selectedCompany, user_id: user.id, date: new Date().toISOString().split('T')[0] }])
        .select().single();
      if (pe) throw pe;
      const items = shopIds.map(id => ({ pickup_id: pickup.id, shop_id: id, item_number: selections[id] || null }));
      const { error: ie } = await supabase.from('pickup_items').insert(items);
      if (ie) throw ie;
      toast.success('Pickup saved!', `${shopIds.length} shop(s) recorded.`);
      setTimeout(() => navigate('/'), 900);
    } catch (err: any) { toast.error('Failed to save pickup', err.message); }
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
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4">
          {/* Top bar */}
          <div className="flex items-center gap-3 py-4">
            <AnimatePresence>
              {step === 2 && (
                <motion.button
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setStep(1); setSelections({}); setSearch(''); }}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors flex-shrink-0"
                >
                  <ChevronLeft size={20} />
                </motion.button>
              )}
            </AnimatePresence>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-gray-900">
                  {step === 1 ? 'New Pickup' : 'Select Shops'}
                </h1>
                <AnimatePresence>
                  {step === 2 && selectedCompanyName && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-50 text-orange-600 rounded-full text-xs font-semibold border border-orange-100"
                    >
                      <Building2 size={10} /> {selectedCompanyName}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                {step === 1 ? 'Choose a company to proceed' : selectedCount > 0 ? `${selectedCount} shop(s) selected` : 'Tap shops to select'}
              </p>
            </div>

            {/* Orange pill badge */}
            <div className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm shadow-orange-200 flex-shrink-0">
              <Package size={12} /> Pickup
            </div>
          </div>

          {/* Step progress dots */}
          <div className="flex items-center gap-1.5 pb-3">
            {[1, 2].map(s => (
              <div key={s} className={clsx(
                'rounded-full transition-all duration-400',
                s === step ? 'w-6 h-2 bg-orange-500' : s < step ? 'w-2 h-2 bg-orange-300' : 'w-2 h-2 bg-gray-200'
              )} />
            ))}
          </div>

          {/* Step 2 search row */}
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex gap-2 pb-3 overflow-hidden"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    placeholder="Search shops..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-10 pl-9 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 transition-all"
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
                  className="w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-sm shadow-orange-200 transition-colors flex-shrink-0"
                >
                  <Plus size={18} />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-2xl mx-auto px-4 pb-36 pt-4">
        <AnimatePresence mode="wait">

          {/* STEP 1 — Companies */}
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                {companies.length} Companies
              </p>
              {companies.map((c, i) => (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedCompany(c.id); setSelectedCompanyName(c.name); setStep(2); }}
                  className="w-full flex items-center gap-4 p-4 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 hover:shadow-md hover:shadow-orange-50 transition-all text-left group"
                >
                  <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                    <Building2 size={20} className="text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-base truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Tap to continue →</p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-orange-50 flex items-center justify-center transition-colors">
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                  </div>
                </motion.button>
              ))}

              {companies.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Building2 size={24} className="text-gray-300" />
                  </div>
                  <p className="text-gray-500 font-medium">No companies yet</p>
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 2 — Shops */}
          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              {/* Selected summary banner */}
              <AnimatePresence>
                {selectedCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl"
                  >
                    <span className="text-xs font-semibold text-orange-600">{selectedCount} selected</span>
                    <button onClick={() => setSelections({})} className="text-[11px] font-semibold text-orange-400 hover:text-orange-600 transition-colors">
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
                          ? 'border-orange-400 shadow-md shadow-orange-100'
                          : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      )}
                    >
                      {/* Shop tap row */}
                      <div
                        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer"
                        onClick={() => toggleShop(shop.id)}
                      >
                        {/* Checkbox */}
                        <div className={clsx(
                          'w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200',
                          isSelected
                            ? 'bg-orange-500 text-white scale-105'
                            : 'bg-gray-100 text-transparent'
                        )}>
                          <Check size={14} strokeWidth={3} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={clsx('font-semibold text-sm truncate transition-colors', isSelected ? 'text-orange-700' : 'text-gray-800')}>
                            {shop.name}
                          </p>
                          {shop.location && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin size={10} className={clsx('flex-shrink-0', isSelected ? 'text-orange-400' : 'text-gray-400')} />
                              <span className="text-xs text-gray-400 truncate">{shop.location}</span>
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                            <Check size={11} className="text-orange-500" strokeWidth={3} />
                          </motion.div>
                        )}
                      </div>

                      {/* Item input — slides in */}
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 pb-4" onClick={e => e.stopPropagation()}
                          >
                            <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                              <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-2">
                                <Hash size={9} /> Item Count / Batch Number
                              </label>
                              <input
                                type="tel" inputMode="numeric" pattern="[0-9]*"
                                placeholder="Enter quantity..."
                                value={selections[shop.id]}
                                onChange={e => updateItemNumber(shop.id, e.target.value)}
                                autoFocus
                                className="w-full h-10 px-3 bg-white border border-orange-200 rounded-lg text-sm font-semibold text-orange-700 placeholder-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold shadow-sm shadow-orange-200"
                  >
                    <Plus size={15} /> Add New Shop
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom Action Bar (Step 2) ── */}
      <AnimatePresence>
        {step === 2 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -8px 30px rgba(0,0,0,0.06)' }}
          >
            <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
              {/* Count info */}
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0">
                  <Package size={18} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-gray-900 font-bold text-lg leading-none">{selectedCount}</p>
                  <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mt-0.5">
                    {selectedCount === 1 ? 'Shop Selected' : 'Shops Selected'}
                  </p>
                </div>
              </div>

              {/* Save button */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleSave}
                disabled={selectedCount === 0 || loading}
                className={clsx(
                  'flex items-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm transition-all',
                  selectedCount > 0
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {loading
                  ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Check size={16} strokeWidth={2.5} />}
                Save Pickup
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-none">
              Add & Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
