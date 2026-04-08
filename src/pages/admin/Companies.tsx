import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Trash2, Plus, Edit2, Check, X, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Companies = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => { fetchCompanies(); }, []);

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('*').order('created_at', { ascending: false });
    setCompanies(data || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.trim()) return;
    setLoading(true);
    await supabase.from('companies').insert([{ name: newCompany }]);
    setNewCompany('');
    fetchCompanies();
    setLoading(false);
  };

  const startEdit = (company: any) => { setEditingId(company.id); setEditName(company.name); };
  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    await supabase.from('companies').update({ name: editName }).eq('id', editingId);
    setEditingId(null);
    fetchCompanies();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this company? All associated pickup history will also be removed.')) {
      await supabase.from('companies').delete().eq('id', id);
      fetchCompanies();
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Companies</h1>
        <p className="text-slate-500 font-medium mt-1">{companies.length} client{companies.length !== 1 ? 's' : ''} registered</p>
      </motion.div>

      {/* Add Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg">
            <Building2 size={18} className="text-white" />
          </div>
          <h3 className="font-black text-lg text-slate-800">Add New Company</h3>
        </div>
        <form onSubmit={handleAdd} className="flex gap-3">
          <div className="flex-1">
            <Input
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
              placeholder="Enter company name..."
            />
          </div>
          <Button type="submit" isLoading={loading} className="px-6 flex-shrink-0">
            <Plus size={20} />
          </Button>
        </form>
      </motion.div>

      {/* Companies List */}
      <div className="space-y-3">
        <AnimatePresence>
          {companies.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: -20 }}
              transition={{ duration: 0.3, delay: index * 0.04 }}
              className="flex items-center gap-4 p-4 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-white"
            >
              {/* Company Icon */}
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md flex-shrink-0">
                <span className="text-white font-black text-lg">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {editingId === company.id ? (
                <div className="flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="!py-2"
                    autoFocus
                  />
                </div>
              ) : (
                <span className="flex-1 font-bold text-lg text-slate-800">{company.name}</span>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {editingId === company.id ? (
                  <>
                    <Button onClick={saveEdit} className="!p-2.5 text-green-600 !rounded-xl"><Check size={17} /></Button>
                    <Button onClick={() => setEditingId(null)} className="!p-2.5 text-slate-500 !rounded-xl"><X size={17} /></Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => startEdit(company)} className="!p-2.5 text-blue-500 !rounded-xl"><Edit2 size={17} /></Button>
                    <Button onClick={() => handleDelete(company.id)} className="!p-2.5 text-red-500 !rounded-xl" variant="danger"><Trash2 size={17} /></Button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {companies.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 text-slate-400"
          >
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-bold text-lg">No companies yet</p>
            <p className="text-sm mt-1">Add your first client above</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
