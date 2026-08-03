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
  MapPin, Plus, Package, Building2, Hash, X, Calendar,
  ChevronDown
} from 'lucide-react';
import { clsx } from 'clsx';
import { isFuzzyMatch, sortSearchResults } from '../../utils/search';
import { formatReportDate } from '../../utils/dateUtils';

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
  const [visibleCompaniesCount, setVisibleCompaniesCount] = useState(32);
  useEffect(() => {
    setVisibleCompaniesCount(32);
  }, [searchCompanies]);

  const paginatedCompanies = React.useMemo(() => {
    return filteredCompanies.slice(0, visibleCompaniesCount);
  }, [filteredCompanies, visibleCompaniesCount]);

  const hasMoreCompanies = filteredCompanies.length > visibleCompaniesCount;
  const loadMoreCompanies = () => setVisibleCompaniesCount(prev => prev + 32);
  const loadingMoreCompanies = false;
  const totalCompanies = filteredCompanies.length;

  // Local pagination for shops
  const [visibleShopsCount, setVisibleShopsCount] = useState(40);
  useEffect(() => {
    setVisibleShopsCount(40);
  }, [searchShops]);

  const paginatedShops = React.useMemo(() => {
    return filteredShops.slice(0, visibleShopsCount);
  }, [filteredShops, visibleShopsCount]);

  const hasMoreShops = filteredShops.length > visibleShopsCount;
  const loadMoreShops = () => setVisibleShopsCount(prev => prev + 40);
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

  // Selected Shop Objects for tag chips rendering
  const selectedShopObjects = React.useMemo(() => {
    const ids = Object.keys(selections);
    return ids.map(id => shops.find(s => s.id === id)).filter((s): s is Shop => Boolean(s));
  }, [selections, shops]);

  // Helper for generating initial avatars
  const getInitials = (name: string) => {
    if (!name) return '??';
    const clean = name.replace(/[^a-zA-Z0-9\s]/g, '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return name.slice(0, 2).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-28">
      {/* ── Main Full-Width Edge-to-Edge Container ── */}
      <div className="w-full space-y-3">
        
        {/* ── Page Title Header Card ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 lg:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            {step === 2 && (
              <button
                onClick={() => {
                  setStep(1);
                  setSelections({});
                  setSearchShops('');
                }}
                className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 transition-all active:scale-95 flex-shrink-0 shadow-sm"
                title="Back to companies"
              >
                <ChevronLeft size={20} />
              </button>
            )}

            <div>
              <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                {step === 1 ? 'New Pickup' : 'Select Shops'}
              </h1>
              <p className="text-xs font-semibold text-gray-400 mt-0.5">
                {step === 1 ? (
                  'Choose a company'
                ) : (
                  <>
                    Company: <span className="text-orange-600 font-bold">{selectedCompanyName}</span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Orange PICKUP Badge */}
          <div className="self-start sm:self-center inline-flex items-center gap-1.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md shadow-orange-500/20 uppercase tracking-wider flex-shrink-0">
            <Package size={14} /> PICKUP
          </div>
        </div>

        {/* ── Full Width Controls Card: Date + Search Side by Side ── */}
        <div className="bg-white p-3.5 lg:p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            
            {/* Date Picker Card */}
            <div className="relative bg-gray-50/80 hover:bg-gray-100/80 border border-gray-200/80 rounded-xl px-3.5 py-2.5 transition-all flex items-center justify-between cursor-pointer group w-full md:w-60 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <Calendar size={17} className="text-orange-500 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-bold text-gray-800">
                  {formatReportDate(selectedDate, 'dd MMM yyyy')}
                </span>
              </div>
              <ChevronDown size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
              
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
              />
            </div>

            {/* Search Input Box */}
            {step === 1 ? (
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input
                  placeholder="Search company..."
                  value={searchCompanies}
                  onChange={e => setSearchCompanies(e.target.value)}
                  className="w-full h-10 pl-10 pr-10 bg-gray-50/80 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
                />
                {searchCompanies && (
                  <button onClick={() => setSearchCompanies('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={15} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                  <input
                    placeholder="Type shop name..."
                    value={searchShops}
                    onChange={e => setSearchShops(e.target.value)}
                    className="w-full h-10 pl-10 pr-10 bg-gray-50/80 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all"
                    autoFocus
                  />
                  {searchShops && (
                    <button onClick={() => setSearchShops('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X size={15} />
                    </button>
                  )}
                </div>

                {/* Quick Add Shop Button */}
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="h-10 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-orange-500/20 transition-all active:scale-95 flex-shrink-0"
                  title="Add new shop"
                >
                  <Plus size={16} /> <span className="hidden sm:inline">Add Shop</span>
                </button>
              </div>
            )}
          </div>

          {/* Search Helper Subtitle for Step 2 */}
          {step === 2 && (
            <p className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 pt-0.5 pl-0.5">
              {searchShops.trim() ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping inline-block" />
                  Searching shops...
                </>
              ) : (
                <>
                  <span className="text-orange-500 font-bold">⚡</span> Start typing to search shops
                </>
              )}
            </p>
          )}
        </div>

        {/* ── STEP 1: COMPANY SELECTION ── */}
        {step === 1 && (
          <div className="space-y-3 pt-1">
            {/* List Header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">All Companies</span>
              <span className="text-xs font-semibold text-gray-400">{totalCompanies} Total</span>
            </div>

            {/* Companies Loader */}
            {loadingCompanies && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-gray-400 text-xs font-medium mt-2">Loading companies...</p>
              </div>
            )}

            {/* Companies Full-Width Responsive Grid */}
            {!loadingCompanies && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginatedCompanies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setSelectedCompany(company.id);
                      setSelectedCompanyName(company.name);
                      setStep(2);
                      setSearchCompanies('');
                    }}
                    className="w-full text-left p-3.5 rounded-2xl bg-white border border-gray-100 hover:border-orange-300 hover:shadow-md hover:shadow-orange-500/5 transition-all duration-200 flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center flex-shrink-0 group-hover:bg-orange-100 transition-colors">
                        <Building2 size={18} />
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-gray-800 truncate group-hover:text-orange-600 transition-colors">
                        {company.name}
                      </span>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}

            {!loadingCompanies && filteredCompanies.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
                <Building2 size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-bold text-sm">No companies found</p>
                <p className="text-gray-400 text-xs mt-1">Try a different search term</p>
              </div>
            )}

            {hasMoreCompanies && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMoreCompanies}
                  disabled={loadingMoreCompanies}
                  className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-xs hover:bg-orange-100 transition-colors"
                >
                  {loadingMoreCompanies ? 'Loading...' : 'Load More Companies'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: SHOPS SELECTION ── */}
        {step === 2 && (
          <div className="space-y-3 pt-1">

            {/* Selected Shops Tag Chips */}
            {selectedCount > 0 && (
              <div className="bg-orange-50/60 border border-orange-100/80 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800">
                    Selected Shops ({selectedCount})
                  </span>
                  <button
                    onClick={() => setSelections({})}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                {/* Tag Chips Container */}
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar pt-0.5">
                  {selectedShopObjects.map(shop => (
                    <div
                      key={shop.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-orange-200 rounded-full text-xs font-bold text-orange-800 shadow-sm transition-all"
                    >
                      <span>{shop.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleShop(shop.id); }}
                        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-orange-100 text-orange-600 hover:text-orange-900 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold text-gray-700">
                {searchShops.trim() ? 'Search Results' : 'All Shops'}
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {searchShops.trim() ? `(${filteredShops.length} found)` : `Total ${totalShops}`}
              </span>
            </div>

            {/* Shops Loader */}
            {loadingShops && (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                <span className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin inline-block" />
                <p className="text-gray-400 text-xs font-medium mt-2">Loading shops...</p>
              </div>
            )}

            {/* Shops Full-Width Responsive Grid (3-4 columns on desktop) */}
            {!loadingShops && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {paginatedShops.map((shop) => {
                  const isSelected = selections[shop.id] !== undefined;
                  const isSearching = searchShops.trim().length > 0;

                  return (
                    <div
                      key={shop.id}
                      onClick={() => toggleShop(shop.id)}
                      className={clsx(
                        'rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden',
                        isSelected
                          ? 'bg-orange-50/70 border-orange-300 shadow-sm'
                          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      )}
                    >
                      <div className="p-3 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Initials Avatar */}
                          <div className={clsx(
                            'w-9 h-9 rounded-full font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm transition-transform',
                            isSelected
                              ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white scale-105'
                              : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white'
                          )}>
                            {getInitials(shop.name)}
                          </div>

                          {/* Shop Info */}
                          <div className="min-w-0">
                            <p className={clsx(
                              'font-bold text-xs sm:text-sm truncate transition-colors',
                              isSelected ? 'text-orange-950' : 'text-gray-900'
                            )}>
                              {shop.name}
                            </p>
                            {shop.location && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className={clsx('flex-shrink-0', isSelected ? 'text-orange-500' : 'text-gray-400')} />
                                <span className="text-[11px] text-gray-500 truncate">{shop.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Selection Button */}
                        <div className="flex-shrink-0 pl-1">
                          {isSelected ? (
                            <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/30">
                              <Check size={12} strokeWidth={3} />
                            </div>
                          ) : isSearching ? (
                            <div className="w-5 h-5 rounded-full border-2 border-orange-400 text-orange-500 flex items-center justify-center hover:bg-orange-500 hover:text-white transition-all">
                              <Plus size={12} strokeWidth={3} />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center" />
                          )}
                        </div>
                      </div>

                      {/* Optional Quantity Input when Selected */}
                      {isSelected && (
                        <div className="px-3 pb-3 pt-0" onClick={e => e.stopPropagation()}>
                          <div className="bg-white rounded-xl p-2 border border-orange-200 flex items-center gap-2 shadow-inner">
                            <Hash size={13} className="text-orange-500 flex-shrink-0" />
                            <input
                              type="text"
                              placeholder="Item count (optional)..."
                              value={selections[shop.id] || ''}
                              onChange={e => updateItemNumber(shop.id, e.target.value)}
                              className="w-full text-xs font-bold text-gray-800 placeholder-orange-300 focus:outline-none bg-transparent"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!loadingShops && filteredShops.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
                <Search size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 font-bold text-sm">No shops found</p>
                <p className="text-gray-400 text-xs mt-1 mb-4">Try searching another shop name</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  <Plus size={14} /> Add New Shop
                </button>
              </div>
            )}

            {hasMoreShops && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={loadMoreShops}
                  disabled={loadingMoreShops}
                  className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl font-bold text-xs hover:bg-orange-100 transition-colors"
                >
                  {loadingMoreShops ? 'Loading...' : 'Load More Shops'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Sleek Floating Action Bar at Bottom (Step 2) ── */}
      {step === 2 && (
        <div
          className={clsx(
            "fixed bottom-4 z-40 px-4 transition-all duration-300 pointer-events-none",
            profile?.role === 'admin'
              ? "left-0 lg:left-72 right-0"
              : "left-0 right-0"
          )}
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md border border-gray-200/90 rounded-2xl shadow-2xl p-3 flex items-center justify-between gap-4 pointer-events-auto">
            {/* Count Info */}
            <div className="flex items-center gap-3 pl-1">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600 flex-shrink-0 font-black text-sm">
                {selectedCount}
              </div>
              <div>
                <p className="text-gray-900 font-bold text-sm leading-none">
                  {selectedCount === 1 ? '1 Shop Selected' : `${selectedCount} Shops Selected`}
                </p>
                <p className="text-gray-400 text-[10px] font-semibold mt-0.5">
                  Tap to add more shops
                </p>
              </div>
            </div>

            {/* Save Pickup Button */}
            <button
              onClick={handleSave}
              disabled={selectedCount === 0 || loading}
              className={clsx(
                'flex items-center gap-2 h-10 px-5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-95 flex-shrink-0 shadow-md',
                selectedCount > 0
                  ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/25'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
              )}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  SAVE PICKUP <ChevronRight size={16} strokeWidth={3} />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Add New Shop Modal ── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Shop">
        <form onSubmit={handleQuickAddShop} className="space-y-4">
          <Input
            label="Shop Name"
            placeholder="Enter shop name"
            value={newShopName}
            onChange={e => setNewShopName(e.target.value)}
            required
            autoFocus
          />
          
          <Input
            label="Location / Area"
            placeholder="e.g. Kozhikode, Manjeri"
            list="pickup-locations-list"
            value={newShopLocation}
            onChange={e => setNewShopLocation(e.target.value)}
          />
            
          <datalist id="pickup-locations-list">
            {availableLocations.map(loc => (
              <option key={loc} value={loc} />
            ))}
          </datalist>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={addingShop}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white border-none"
            >
              Add & Select
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
