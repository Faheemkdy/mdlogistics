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
  MapPin, Plus, Package, Building2, Hash, X, Calendar
} from 'lucide-react';
import { clsx } from 'clsx';
import { isFuzzyMatch, sortSearchResults } from '../../utils/search';

export const Pickup = () => {
  const { user, profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(() => {
    const saved = localStorage.getItem('pickup_draft_step');
    const timestamp = localStorage.getItem('pickup_draft_timestamp');
    const now = Date.now();
    const fiveHours = 5 * 60 * 60 * 1000;
    
    if (timestamp && now - parseInt(timestamp) > fiveHours) {
      ['pickup_draft_step', 'pickup_draft_company_id', 'pickup_draft_company_name', 'pickup_draft_selections', 'pickup_draft_search', 'pickup_draft_date', 'pickup_draft_timestamp'].forEach(k => localStorage.removeItem(k));
      return 1;
    }
    return saved ? (parseInt(saved) as 1 | 2) : 1;
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const saved = localStorage.getItem('pickup_draft_date');
    const timestamp = localStorage.getItem('pickup_draft_timestamp');
    const now = Date.now();
    const fiveHours = 5 * 60 * 60 * 1000;
    
    if (timestamp && now - parseInt(timestamp) > fiveHours) {
      return new Date().toISOString().split('T')[0];
    }
    return saved || new Date().toISOString().split('T')[0];
  });
  
  interface Company {
    id: string;
    name: string;
  }

  interface Shop {
    id: string;
    name: string;
    location: string | null;
  }

  const [companies, setCompanies] = useState<Company[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [loadingShops, setLoadingShops] = useState(true);

  const [searchCompanies, setSearchCompanies] = useState('');
  const [searchShops, setSearchShops] = useState('');

  // Fetch all companies and shops on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        setLoadingCompanies(true);
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (error) throw error;
        setCompanies(data || []);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to load companies', err.message);
      } finally {
        setLoadingCompanies(false);
      }
    };

    const fetchShops = async () => {
      try {
        setLoadingShops(true);
        const { data, error } = await supabase
          .from('shops')
          .select('id, name, location')
          .eq('is_active', true)
          .order('name', { ascending: true });
        if (error) throw error;
        setShops(data || []);
      } catch (err: any) {
        console.error(err);
        toast.error('Failed to load shops', err.message);
      } finally {
        setLoadingShops(false);
      }
    };

    fetchCompanies();
    fetchShops();
  }, []);

  const filteredCompanies = React.useMemo(() => {
    if (!searchCompanies.trim()) return companies;
    const filtered = companies.filter(c => isFuzzyMatch(c.name, searchCompanies));
    return sortSearchResults(filtered, searchCompanies, c => c.name);
  }, [companies, searchCompanies]);

  const filteredShops = React.useMemo(() => {
    if (!searchShops.trim()) return shops;
    const filtered = shops.filter(s => 
      isFuzzyMatch(s.name, searchShops) || 
      (s.location && isFuzzyMatch(s.location, searchShops))
    );
    return sortSearchResults(filtered, searchShops, s => s.name);
  }, [shops, searchShops]);

  // Local pagination for companies
  const [visibleCompaniesCount, setVisibleCompaniesCount] = useState(20);
  useEffect(() => {
    setVisibleCompaniesCount(20);
  }, [searchCompanies]);

  const paginatedCompanies = React.useMemo(() => {
    return filteredCompanies.slice(0, visibleCompaniesCount);
  }, [filteredCompanies, visibleCompaniesCount]);

  const hasMoreCompanies = filteredCompanies.length > visibleCompaniesCount;
  const loadMoreCompanies = () => setVisibleCompaniesCount(prev => prev + 20);
  const loadingMoreCompanies = false;
  const totalCompanies = filteredCompanies.length;

  // Local pagination for shops
  const [visibleShopsCount, setVisibleShopsCount] = useState(20);
  useEffect(() => {
    setVisibleShopsCount(20);
  }, [searchShops]);

  const paginatedShops = React.useMemo(() => {
    return filteredShops.slice(0, visibleShopsCount);
  }, [filteredShops, visibleShopsCount]);

  const hasMoreShops = filteredShops.length > visibleShopsCount;
  const loadMoreShops = () => setVisibleShopsCount(prev => prev + 20);
  const loadingMoreShops = false;
  const totalShops = filteredShops.length;

  const [selectedCompany, setSelectedCompany] = useState<string | null>(() => {
    const timestamp = localStorage.getItem('pickup_draft_timestamp');
    const now = Date.now();
    if (timestamp && now - parseInt(timestamp) > 5 * 60 * 60 * 1000) return null;
    return localStorage.getItem('pickup_draft_company_id');
  });
  const [selectedCompanyName, setSelectedCompanyName] = useState(() => {
    const timestamp = localStorage.getItem('pickup_draft_timestamp');
    const now = Date.now();
    if (timestamp && now - parseInt(timestamp) > 5 * 60 * 60 * 1000) return '';
    return localStorage.getItem('pickup_draft_company_name') || '';
  });
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('pickup_draft_selections');
    const timestamp = localStorage.getItem('pickup_draft_timestamp');
    const now = Date.now();
    if (timestamp && now - parseInt(timestamp) > 5 * 60 * 60 * 1000) return {};
    if (!saved) return {};
    try {
      return JSON.parse(saved);
    } catch {
      return {};
    }
  });

  const [initialSearch] = useState(() => {
    const saved = localStorage.getItem('pickup_draft_search');
    const timestamp = localStorage.getItem('pickup_draft_timestamp');
    const now = Date.now();
    if (timestamp && now - parseInt(timestamp) > 5 * 60 * 60 * 1000) return '';
    return saved || '';
  });
  useEffect(() => {
    if (initialSearch) {
      if (step === 1) setSearchCompanies(initialSearch);
      else setSearchShops(initialSearch);
    }
  }, []);

  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newShopName, setNewShopName] = useState('');
  const [newShopLocation, setNewShopLocation] = useState('');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);

  useEffect(() => {
    const fetchLocs = async () => {
      const { data } = await supabase.from('route_locations').select('location_name');
      const routeLocs = data ? data.map(d => d.location_name) : [];
      const shopLocs = shops.map(s => s.location);
      const combined = Array.from(new Set([...routeLocs, ...shopLocs].map(l => (l||'').trim()).filter(Boolean)));
      setAvailableLocations(combined.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })));
    };
    if (shops.length > 0) fetchLocs();
  }, [shops]);
  const [addingShop, setAddingShop] = useState(false);


  // Persistence Effects
  useEffect(() => { 
    localStorage.setItem('pickup_draft_step', String(step)); 
    localStorage.setItem('pickup_draft_timestamp', Date.now().toString());
  }, [step]);
  useEffect(() => { 
    if (selectedCompany) localStorage.setItem('pickup_draft_company_id', selectedCompany); 
    else localStorage.removeItem('pickup_draft_company_id'); 
    localStorage.setItem('pickup_draft_timestamp', Date.now().toString());
  }, [selectedCompany]);
  useEffect(() => { 
    localStorage.setItem('pickup_draft_company_name', selectedCompanyName); 
    localStorage.setItem('pickup_draft_timestamp', Date.now().toString());
  }, [selectedCompanyName]);
  useEffect(() => { 
    localStorage.setItem('pickup_draft_selections', JSON.stringify(selections)); 
    localStorage.setItem('pickup_draft_timestamp', Date.now().toString());
  }, [selections]);
  useEffect(() => { 
    localStorage.setItem('pickup_draft_search', step === 1 ? searchCompanies : searchShops); 
    localStorage.setItem('pickup_draft_timestamp', Date.now().toString());
  }, [searchCompanies, searchShops, step]);
  useEffect(() => { 
    localStorage.setItem('pickup_draft_date', selectedDate); 
    localStorage.setItem('pickup_draft_timestamp', Date.now().toString());
  }, [selectedDate]);

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


  const handleQuickAddShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShopName.trim()) return;
    setAddingShop(true);
    try {
      // Check for duplicates
      const { data: existingShops } = await supabase
        .from('shops')
        .select('id, location')
        .ilike('name', newShopName.trim());
        
      const duplicate = existingShops?.find(s => (s.location || '').toLowerCase() === newShopLocation.trim().toLowerCase());
      
      if (duplicate) {
        toast.error('Shop already exists', 'This shop is already in the system.');
        return;
      }

      const { data, error } = await supabase
        .from('shops').insert([{ name: newShopName.trim(), location: newShopLocation.trim() }])
        .select().single();
      if (error) throw error;
      
      setShops(prev => [data, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      toggleShop(data.id);
      setSearchShops(newShopName.trim());
      setNewShopName(''); setNewShopLocation('');
      setIsAddModalOpen(false);
      toast.success('Shop added & selected!');
    } catch (err: any) { toast.error('Failed to add shop', err.message); }
    finally { setAddingShop(false); }
  };

  const handleSave = async () => {
    const shopIds = Object.keys(selections);
    if (!selectedCompany || shopIds.length === 0 || !user) return;
    setLoading(true);

    const pickupData = {
      pickup: { 
        company_id: selectedCompany, 
        user_id: user.id, 
        date: selectedDate || new Date().toISOString().split('T')[0] 
      },
      items: shopIds.map(id => ({ 
        shop_id: id, 
        item_number: selections[id] || null 
      }))
    };

    try {
      if (navigator.onLine) {
        const { data: pickup, error: pe } = await supabase
          .from('pickups')
          .insert([pickupData.pickup])
          .select().single();
        if (pe) throw pe;

        const itemsWithId = pickupData.items.map(i => ({ ...i, pickup_id: pickup.id }));
        const { error: ie } = await supabase.from('pickup_items').insert(itemsWithId);
        if (ie) throw ie;

        toast.success('Pickup saved!', `${shopIds.length} shop(s) recorded.`);
      } else {
        const { offlineSync } = await import('../../lib/offlineSync');
        await offlineSync.addItem('pickup', pickupData);
        toast.success('Saved to offline queue', 'Will sync when connection is restored.');
      }
      
      // Clear persistence and reset form
      ['pickup_draft_step', 'pickup_draft_company_id', 'pickup_draft_company_name', 'pickup_draft_selections', 'pickup_draft_search', 'pickup_draft_date', 'pickup_draft_timestamp'].forEach(k => localStorage.removeItem(k));
      setSelectedDate(new Date().toISOString().split('T')[0]);
      setStep(1);
      setSelectedCompany(null);
      setSelectedCompanyName('');
      setSelections({});
      setSearchCompanies('');
      setSearchShops('');

    } catch (err: any) {
      if (!navigator.onLine || err.message === 'Failed to fetch' || err.name === 'TypeError') {
        const { offlineSync } = await import('../../lib/offlineSync');
        await offlineSync.addItem('pickup', pickupData);
        toast.success('Saved to offline queue', 'Network error detected. Data will sync later.');
        
        setSelections({});
        ['pickup_draft_step', 'pickup_draft_company_id', 'pickup_draft_selections', 'pickup_draft_date'].forEach(k => localStorage.removeItem(k));
        setSelectedDate(new Date().toISOString().split('T')[0]);
      } else {
        toast.error('Failed to save pickup', err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleShop = (id: string) =>
    setSelections(prev => { const n = { ...prev }; if (n[id] !== undefined) delete n[id]; else n[id] = ''; return n; });

  const updateItemNumber = (id: string, val: string) =>
    setSelections(prev => ({ ...prev, [id]: val }));


  const selectedCount = Object.keys(selections).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Page Header ── */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-30 transition-all duration-300">
        <div className="max-w-4xl lg:max-w-6xl mx-auto px-3 lg:px-4">
          {/* Top bar */}
          <div className="flex items-center gap-3 py-2 lg:py-4">
            {step === 2 && (
              <button
                onClick={() => { setStep(1); setSelections({}); setSearchShops(''); }}
                className="w-9 h-9 rounded-2xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors flex-shrink-0 active:scale-95"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg lg:text-xl font-black text-gray-900 tracking-tight">
                  {step === 1 ? 'New Pickup' : 'Select Shops'}
                </h1>
                {step === 2 && selectedCompanyName && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-50 text-orange-600 rounded-full text-[10px] font-bold border border-orange-100"
                  >
                    <Building2 size={10} /> {selectedCompanyName}
                  </span>
                )}
              </div>
              <p className="text-[10px] lg:text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                {step === 1 ? 'Choose a company' : selectedCount > 0 ? `${selectedCount} selected` : 'Tap to select'}
              </p>
            </div>

            {/* Orange pill badge */}
            <div className="flex items-center gap-1.5 bg-orange-500 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg shadow-orange-500/20 flex-shrink-0 uppercase tracking-widest">
              <Package size={12} /> Pickup
            </div>
          </div>

          {/* Step progress dots */}
          <div className="flex items-center gap-1.5 pb-1 lg:pb-3">
            {[1, 2].map(s => (
              <div key={s} className={clsx(
                'rounded-full transition-all duration-500',
                s === step ? 'w-8 h-1.5 bg-orange-500' : s < step ? 'w-2 h-1.5 bg-orange-300' : 'w-2 h-1.5 bg-gray-200'
              )} />
            ))}
          </div>

          {/* Step 2 search row */}
          {step === 2 && (
            <div
              className="flex gap-2 pb-2 overflow-hidden"
            >
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  placeholder="Search shops..."
                  value={searchShops}
                  onChange={e => setSearchShops(e.target.value)}
                  className="w-full h-11 pl-10 pr-10 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-inner"
                />
                {searchShops && (
                  <button onClick={() => setSearchShops('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-11 h-11 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center shadow-lg shadow-orange-500/25 transition-colors flex-shrink-0 active:scale-95"
              >
                <Plus size={20} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-4xl lg:max-w-6xl mx-auto px-2 lg:px-4 pb-36 pt-0">

        {/* STEP 1 — Companies */}
        {step === 1 && (
          <div className="space-y-3">
            <div className="bg-white p-4 rounded-3xl border-2 border-gray-100 flex flex-col gap-2 shadow-sm">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={14} className="text-orange-500" /> Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-inner"
              />
            </div>

            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              {totalCompanies} Companies
            </p>
            
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                placeholder="Search companies..."
                value={searchCompanies}
                onChange={e => setSearchCompanies(e.target.value)}
                className="w-full h-11 pl-10 pr-10 mb-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-inner"
              />
            </div>

            {loadingCompanies && (
              <div className="text-center py-16">
                <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-gray-400 text-sm mt-2">Loading companies...</p>
              </div>
            )}

            {!loadingCompanies && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {paginatedCompanies.map((company, index) => (
                  <button
                    key={company.id}
                    onClick={() => { setSelectedCompany(company.id); setSelectedCompanyName(company.name); setStep(2); setSearchCompanies(''); }}
                    className="w-full text-left p-4 lg:p-5 rounded-3xl bg-white border-2 border-gray-100 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                        <Building2 size={20} className="text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-base truncate">{company.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Tap to continue →</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-orange-50 flex items-center justify-center transition-colors">
                        <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!loadingCompanies && filteredCompanies.length === 0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Building2 size={24} className="text-gray-300" />
                </div>
                <p className="text-gray-500 font-medium">No companies found</p>
              </div>
            )}
              {hasMoreCompanies && (
                <div className="flex justify-center pt-4">
                  <button onClick={loadMoreCompanies} disabled={loadingMoreCompanies} className="px-5 py-2.5 bg-orange-50 text-orange-600 rounded-xl font-bold text-sm hover:bg-orange-100 transition-colors">
                    {loadingMoreCompanies ? 'Loading...' : 'Load More Companies'}
                  </button>
                </div>
              )}
            </div>
          )}

        {/* STEP 2 — Shops */}
        {step === 2 && (
          <div className="space-y-2">
            {/* Selected summary banner */}
            {selectedCount > 0 && (
              <div
                className="flex items-center justify-between px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-xl"
              >
                <span className="text-xs font-semibold text-orange-600">{selectedCount} selected</span>
                <button onClick={() => setSelections({})} className="text-[11px] font-semibold text-orange-400 hover:text-orange-600 transition-colors">
                  Clear all
                </button>
              </div>
            )}

            <div className="bg-white p-4 rounded-3xl border-2 border-gray-100 flex flex-col gap-2 shadow-sm mb-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                <Calendar size={14} className="text-orange-500" /> Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="w-full h-11 px-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-500/5 transition-all shadow-inner"
              />
            </div>

            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
              {totalShops} Shops
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {paginatedShops.map((shop, index) => {
                const isSelected = selections[shop.id] !== undefined;
                return (
                  <div
                    key={shop.id}
                    className={clsx(
                      'bg-white rounded-3xl border-2 overflow-hidden transition-all duration-200',
                      isSelected
                        ? 'border-orange-400 shadow-md shadow-orange-100'
                        : 'border-gray-100 hover:border-gray-200 hover:shadow-sm'
                    )}
                  >
                    {/* Shop tap row */}
                    <div
                      className="flex items-center gap-3 px-3 py-3 lg:px-4 lg:py-3.5 cursor-pointer"
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
                        <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                          <Check size={11} className="text-orange-500" strokeWidth={3} />
                        </div>
                      )}
                    </div>

                    {/* Item input */}
                    {isSelected && (
                      <div className="px-4 pb-4" onClick={e => e.stopPropagation()}>
                        <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                          <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-2">
                            <Hash size={9} /> Item Count / Batch Number
                          </label>
                          <input
                            type="tel" inputMode="numeric" pattern="[0-9]*"
                            placeholder="Enter quantity..."
                            value={selections[shop.id]}
                            onChange={e => updateItemNumber(shop.id, e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-orange-200 rounded-lg text-sm font-semibold text-orange-700 placeholder-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {loadingShops && (
              <div className="text-center py-14">
                <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-gray-400 text-sm mt-2">Loading shops...</p>
              </div>
            )}

            {!loadingShops && filteredShops.length === 0 && (
              <div className="text-center py-14">
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
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom Action Bar (Step 2) ── */}
      {step === 2 && (
        <div
          className={clsx(
            "fixed bottom-0 right-0 z-40 bg-white border-t border-gray-100",
            profile?.role === 'admin' ? "left-0 lg:left-72" : "left-0"
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -8px 30px rgba(0,0,0,0.06)' }}
        >
          <div className="max-w-4xl lg:max-w-6xl mx-auto px-3 lg:px-4 py-3 flex items-center gap-3">
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
            <button
              onClick={handleSave}
              disabled={selectedCount === 0 || loading}
              className={clsx(
                'flex items-center gap-2 h-11 px-6 rounded-xl font-semibold text-sm transition-all active:scale-98',
                selectedCount > 0
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-md shadow-orange-200'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Check size={16} strokeWidth={2.5} />}
              Save Pickup
            </button>
          </div>
        </div>
      )}

      {/* ── Add Shop Modal ── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Shop">
        <form onSubmit={handleQuickAddShop} className="space-y-4">
          <Input label="Shop Name" placeholder="Enter shop name" value={newShopName}
            onChange={e => setNewShopName(e.target.value)} required autoFocus />
          
          <Input label="Location / Area" placeholder="e.g. Kozhikode, Manjeri" list="pickup-locations-list"
            value={newShopLocation} onChange={e => setNewShopLocation(e.target.value)} />
            
          <datalist id="pickup-locations-list">
            {availableLocations.map(loc => (
              <option key={loc} value={loc} />
            ))}
          </datalist>

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
