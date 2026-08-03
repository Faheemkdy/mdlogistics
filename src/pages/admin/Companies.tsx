import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import {
  Building2, Search, Plus, Edit2, Trash2, Check, X,
  Briefcase, CheckCircle2, ShieldCheck, ChevronLeft, ChevronRight
} from 'lucide-react';
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
    searchQuery,
    setSearchQuery,
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
  useEffect(() => {
    localStorage.setItem('companies_draft_name', newCompany);
  }, [newCompany]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('companies').insert([{ name: newCompany.trim() }]);
    if (error) {
      toast.error('Failed to add company', error.message);
    } else { 
      toast.success('Company added!', `"${newCompany.trim()}" has been registered.`); 
      setNewCompany('');
      localStorage.removeItem('companies_draft_name');
      refetch();
    }
    setSubmitting(false);
  };

  const startEdit = (company: any) => {
    setEditingId(company.id);
    setEditName(company.name);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    const { error } = await supabase.from('companies').update({ name: editName.trim() }).eq('id', editingId);
    if (error) {
      toast.error('Update failed', error.message);
      return;
    }
    toast.success('Company updated!');
    setEditingId(null);
    refetch();
  };

  const handleDelete = async (id: string, companyName: string) => {
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      toast.error('Delete failed', error.message);
      return;
    }
    toast.success('Company removed', `"${companyName}" has been deleted.`);
    refetch();
  };

  return (
    <div className="w-full space-y-4 pb-20">
      
      {/* ── Page Header & Stats Card ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 lg:p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Building2 size={20} />
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-gray-900 tracking-tight leading-tight">
              Organization Hub
            </h1>
          </div>
          <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 pl-0.5">
            <Briefcase size={13} className="text-blue-500" />
            Manage your network of partner companies & clients
          </p>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-2.5">
          <div className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-2 shadow-inner">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total</span>
            <span className="text-base font-black text-gray-900">{totalCount}</span>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl flex items-center gap-2 shadow-md shadow-blue-500/20">
            <ShieldCheck size={16} />
            <span className="text-xs font-black uppercase tracking-wider">Verified Network</span>
          </div>
        </div>
      </div>

      {/* ── Add Company Form Card ── */}
      <div className="bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-white p-4 lg:p-5 rounded-2xl border border-blue-100 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Plus size={16} strokeWidth={3} />
          </div>
          <h3 className="font-black text-sm text-gray-900 tracking-tight">Register New Organization</h3>
        </div>

        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <input
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Enter company / organization name..."
              className="w-full h-11 pl-4 pr-10 bg-white border border-blue-200/80 rounded-xl text-xs font-semibold text-gray-800 placeholder-blue-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all shadow-sm"
            />
            {newCompany && (
              <button
                type="button"
                onClick={() => { setNewCompany(''); localStorage.removeItem('companies_draft_name'); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || !newCompany.trim()}
            className={clsx(
              'h-11 px-6 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 flex-shrink-0 shadow-md',
              newCompany.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
            )}
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 size={16} strokeWidth={2.5} />
            )}
            Add Organization
          </button>
        </form>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white p-3.5 lg:p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-10 bg-gray-50/80 border border-gray-200/80 rounded-xl text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Section Indicator */}
          <div className="flex items-center justify-between md:justify-end gap-3 text-xs font-bold text-gray-500">
            <span>{searchQuery.trim() ? 'Search Results' : 'All Organizations'}</span>
            <span className="bg-gray-100 px-2.5 py-1 rounded-lg text-[11px]">{totalCount} Total</span>
          </div>
        </div>
      </div>

      {/* ── Companies Responsive Grid List ── */}
      {loading && companies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin inline-block" />
          <p className="text-gray-400 text-xs font-medium mt-2">Loading organizations...</p>
        </div>
      ) : companies.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-6">
          <Building2 size={36} className="text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 font-bold text-sm">No organizations found</p>
          <p className="text-gray-400 text-xs mt-1">Try a different search term or add a new organization above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {companies.map((company: any) => (
              <motion.div
                key={company.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl border border-gray-100 p-3.5 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Entity Icon Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-xs flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                    <Building2 size={18} />
                  </div>

                  {/* Company Name / Edit Input */}
                  <div className="min-w-0 flex-1">
                    {editingId === company.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-blue-50 border border-blue-300 rounded-lg px-2 py-1 font-bold text-gray-900 text-xs focus:outline-none"
                        autoFocus
                      />
                    ) : (
                      <>
                        <h4 className="font-bold text-xs sm:text-sm text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {company.name}
                        </h4>
                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider block mt-0.5">
                          ID: {company.id.substring(0, 8)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Footer Row: Status & Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    <Check size={10} strokeWidth={3} /> Verified
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {editingId === company.id ? (
                      <>
                        <button
                          onClick={saveEdit}
                          className="w-7 h-7 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 flex items-center justify-center transition-colors shadow-sm"
                          title="Save"
                        >
                          <Check size={13} strokeWidth={3} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors"
                          title="Cancel"
                        >
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEdit(company)}
                          className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id, company.name)}
                          className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── Pagination Controls ── */}
      {(hasMore || currentPage > 0) && (
        <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <button 
            disabled={currentPage === 0} 
            onClick={() => goToPage(currentPage - 1)}
            className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 disabled:opacity-40 transition-colors border border-gray-200"
          >
            <ChevronLeft size={15} /> Previous
          </button>
          <span className="text-xs font-bold text-gray-500">
            Page {currentPage + 1}
          </span>
          <button 
            disabled={!hasMore} 
            onClick={() => goToPage(currentPage + 1)}
            className="flex items-center gap-1 px-4 py-2 text-xs font-bold bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 disabled:opacity-40 transition-colors border border-gray-200"
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
};
