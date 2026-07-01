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
    refetch,
    currentPage,
    goToPage
  } = useSupabasePagination({
    table: 'companies',
    searchFields: ['name'],
    limit: 30,
    mode: 'page'
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

      <div className="flex flex-col gap-6 lg:gap-8">
        {/* ── Add Company Form ── */}
        <div className="w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col md:flex-row gap-6 items-center"
          >
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
               <Building2 size={120} />
            </div>

            <div className="flex items-center gap-3 relative z-10 whitespace-nowrap">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
                <Plus size={20} className="text-white" strokeWidth={3} />
              </div>
              <h3 className="font-black text-lg text-slate-900 tracking-tight">Register Client</h3>
            </div>

            <form onSubmit={handleAdd} className="flex-1 flex flex-col sm:flex-row gap-4 relative z-10 w-full items-end">
              <div className="flex-1 w-full space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Entity Name</label>
                <div className="relative group">
                  <input
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    className="w-full pl-5 pr-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500/30 transition-all font-black text-sm"
                  />
                </div>
              </div>

              <motion.button 
                type="submit" 
                disabled={submitting || !newCompany.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full sm:w-auto px-8 py-3.5 bg-slate-900 text-white font-black rounded-2xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl shadow-slate-100"
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
        </div>

        {/* ── Companies List ── */}
        <div className="w-full space-y-6">
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

          <div className="overflow-x-auto rounded-3xl border border-white/60 bg-white/40 backdrop-blur-xl shadow-glass">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-white/50 text-[11px] uppercase text-slate-500 font-bold border-b border-white/60">
                <tr>
                  <th className="px-4 py-4 w-12 text-center">Entity</th>
                  <th className="px-4 py-4">Organization Name</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/40">
                <AnimatePresence mode="popLayout">
                  {loading && companies.length === 0 ? (
                    <motion.tr
                      key="loader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td colSpan={4} className="py-16 text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                          className="w-8 h-8 border-slate-300 border-t-blue-500 rounded-full mx-auto mb-3"
                          style={{ border: '3px solid', borderTopColor: '#3b82f6' }}
                        />
                        <p className="text-slate-400 font-medium text-sm">Searching...</p>
                      </td>
                    </motion.tr>
                  ) : companies.length === 0 ? (
                    <motion.tr
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <td colSpan={4} className="text-center py-20">
                        <Building2 size={48} className="mx-auto mb-3 text-slate-300" />
                        <p className="font-black text-slate-400 text-lg tracking-tight">No results found</p>
                      </td>
                    </motion.tr>
                  ) : (
                    companies.map((company: any, index: number) => (
                      <motion.tr
                        key={company.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="hover:bg-white/50 transition-colors group"
                      >
                        <td className="px-4 py-3 text-center">
                          <div className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner relative group-hover:from-blue-500 group-hover:to-indigo-600 transition-all">
                            <Building2 size={16} className="text-slate-400 group-hover:text-white transition-colors" />
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
                          </div>
                        </td>
                        
                        <td className="px-4 py-3 font-bold text-slate-800">
                          {editingId === company.id ? (
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full bg-white/80 border-none rounded-lg px-2 py-1 font-bold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                              autoFocus
                            />
                          ) : (
                            <div className="flex flex-col">
                              <span>{company.name}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ID: {company.id.substring(0, 8)}</span>
                            </div>
                          )}
                        </td>
                        
                        <td className="px-4 py-3 text-center">
                          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">Verified</span>
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex justify-end gap-1.5">
                            {editingId === company.id ? (
                              <>
                                <button onClick={saveEdit} className="p-2 rounded-lg bg-emerald-500 text-white hover:scale-105 transition-transform" title="Save"><Check size={14} /></button>
                                <button onClick={() => setEditingId(null)} className="p-2 rounded-lg bg-slate-200 text-slate-600 hover:scale-105 transition-transform" title="Cancel"><X size={14} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(company)} className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors" title="Edit"><Edit2 size={14} /></button>
                                <button onClick={() => handleDelete(company.id, company.name)} className="p-2 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors" title="Delete"><Trash2 size={14} /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
            
          {(hasMore || currentPage > 0) && (
            <div className="flex justify-between items-center bg-white/40 backdrop-blur-xl p-3 rounded-2xl border border-white/60 shadow-glass">
              <button 
                disabled={currentPage === 0} 
                onClick={() => goToPage(currentPage - 1)}
                className="px-4 py-2 text-xs font-bold bg-white text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-slate-500">
                Page {currentPage + 1}
              </span>
              <button 
                disabled={!hasMore} 
                onClick={() => goToPage(currentPage + 1)}
                className="px-4 py-2 text-xs font-bold bg-white text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
