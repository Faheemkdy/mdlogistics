import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../components/ui/Toast';
import { Trash2, Plus, Edit2, Check, X, Building2, Search, Briefcase, Hash, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useSupabasePagination } from '../../hooks/useSupabasePagination';

export const Companies = () => {
  const toast = useToast();
  const [newCompany, setNewCompany] = useState(() => localStorage.getItem('companies_draft_name') || '');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const {
    data: companies,
    loading,
    loadingMore,
    searchQuery,
    setSearchQuery,
    loadMore,
    hasMore,
    totalCount,
    refetch
  } = useSupabasePagination({
    table: 'companies',
    searchFields: ['name'],
    limit: 20
  });

  // Persistence
  useEffect(() => { localStorage.setItem('companies_draft_name', newCompany); }, [newCompany]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('companies').insert([{ name: newCompany }]);
    if (error) { toast.error('Failed to add company', error.message); }
    else { 
      toast.success('Company added!', `"${newCompany}" has been registered.`); 
      setNewCompany('');
      localStorage.removeItem('companies_draft_name');
      refetch();
    }
    setSubmitting(false);
  };

  const startEdit = (company: any) => { setEditingId(company.id); setEditName(company.name); };
  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    const { error } = await supabase.from('companies').update({ name: editName }).eq('id', editingId);
    if (error) { toast.error('Update failed', error.message); return; }
    toast.success('Company updated!');
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: string, companyName: string) => {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) { toast.error('Delete failed', error.message); return; }
    toast.success('Company removed', `"${companyName}" has been deleted.`);
    refetch();
  };



  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">

      {/* ── Page Header & Stats ── */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 px-1"
      >
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Organization Hub</h1>
          <p className="text-slate-500 font-semibold text-xs sm:text-sm flex items-center gap-2">
            <Briefcase size={14} className="text-blue-500" />
            Manage your network of partner companies
          </p>
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <div className="px-4 py-2 sm:px-5 sm:py-3 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-sm flex flex-col items-center min-w-[80px] sm:min-w-[100px]">
            <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total</span>
            <span className="text-lg sm:text-xl font-black text-slate-900">{totalCount}</span>
          </div>
          <div className="px-4 py-2 sm:px-5 sm:py-3 bg-blue-500 rounded-2xl shadow-lg shadow-blue-200 flex flex-col items-center min-w-[80px] sm:min-w-[100px] text-white">
            <span className="text-[8px] sm:text-[10px] font-black text-blue-100 uppercase tracking-widest mb-0.5">Premium</span>
            <span className="text-lg sm:text-xl font-black">All</span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* ── Add Company Form ── */}
        <div className="lg:col-span-1 space-y-4 sm:space-y-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
               <Building2 size={120} />
            </div>

            <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                <Plus size={20} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="font-black text-lg text-slate-900 tracking-tight">Register Client</h3>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Entity Name</label>
                <div className="relative group">
                  <input
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full pl-5 pr-5 py-3.5 sm:py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all font-black text-sm"
                  />
                </div>
              </div>

              <motion.button 
                type="submit" 
                disabled={submitting || !newCompany.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-slate-100"
              >
                {submitting ? (
                   <motion.div
                     animate={{ rotate: 360 }}
                     transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                     className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                   />
                ) : <CheckCircle2 size={18} strokeWidth={2.5} />}
                Add Organization
              </motion.button>
            </form>
          </motion.div>

          <div className="bg-emerald-50 rounded-3xl p-5 sm:p-6 border border-emerald-100 flex items-center gap-4">
             <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Verified Partners</p>
                <p className="text-xs sm:text-sm font-bold text-slate-600">Securely managing entities</p>
             </div>
          </div>
        </div>

        {/* ── Companies List ── */}
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">
          {/* Search Bar */}
          <div className="relative group">
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 sm:pl-14 pr-6 py-3.5 sm:py-4 bg-white/80 backdrop-blur-xl border border-white rounded-[2rem] text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all font-bold shadow-sm"
            />
            <Search size={18} className="absolute left-5 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
            <AnimatePresence mode="popLayout">
              {loading && companies.length === 0 ? (
                <motion.div
                  key="loader"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                    className="w-10 h-10 border-slate-300 border-t-blue-500 rounded-full"
                    style={{ border: '3px solid', borderTopColor: '#3b82f6' }}
                  />
                  <p className="text-slate-400 font-medium text-sm">Searching...</p>
                </motion.div>
              ) : companies.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20 bg-white/30 rounded-[2.5rem] border border-dashed border-slate-200"
                >
                  <Building2 size={48} className="mx-auto mb-4 text-slate-200" />
                  <p className="font-black text-slate-400 text-lg tracking-tight">No results found</p>
                  <p className="text-slate-400 text-sm font-medium">Try a different search term</p>
                </motion.div>
              ) : (
                companies.map((company: any, index: number) => (
                  <motion.div
                    key={company.id}
                    layout
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.4, delay: index * 0.04 }}
                    className="group flex items-center gap-3 sm:gap-4 p-3.5 sm:p-5 bg-white/80 backdrop-blur-xl rounded-3xl border border-white shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:border-blue-200 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all"
                  >
                    {/* Entity Avatar */}
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner flex-shrink-0 relative group-hover:from-blue-500 group-hover:to-indigo-600 transition-all">
                      <Building2 size={24} className="text-slate-400 group-hover:text-white transition-colors" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-white" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {editingId === company.id ? (
                        <div className="relative">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 border border-blue-200 rounded-xl text-slate-900 font-black text-lg focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                            autoFocus
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                            <button onClick={saveEdit} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"><Check size={18} /></button>
                            <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"><X size={18} /></button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <h4 className="font-black text-xl text-slate-900 tracking-tight truncate group-hover:text-blue-600 transition-colors">
                            {company.name}
                          </h4>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">ID: {company.id.substring(0, 8)}</span>
                             <span className="w-1 h-1 bg-slate-200 rounded-full" />
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verified Entity</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all sm:opacity-100">
                      {editingId !== company.id && (
                        <>
                          <motion.button 
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => startEdit(company)} 
                            className="p-3 text-blue-500 hover:bg-blue-50 rounded-2xl transition-all"
                            title="Edit Entity"
                          >
                            <Edit2 size={18} />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            onClick={() => handleDelete(company.id, company.name)} 
                            className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                            title="Remove Entity"
                          >
                            <Trash2 size={18} />
                          </motion.button>
                        </>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>

            {hasMore && (
              <div className="pt-4 pb-8 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="px-6 py-3 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm flex items-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full"
                      />
                      Loading more...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
