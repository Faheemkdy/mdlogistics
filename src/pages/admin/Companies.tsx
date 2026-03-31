import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const Companies = () => {
  const [companies, setCompanies] = useState<any[]>([]);
  const [newCompany, setNewCompany] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    fetchCompanies();
  }, []);

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

  const startEdit = (company: any) => {
    setEditingId(company.id);
    setEditName(company.name);
  };

  const saveEdit = async () => {
    if (!editName.trim() || !editingId) return;
    await supabase.from('companies').update({ name: editName }).eq('id', editingId);
    setEditingId(null);
    fetchCompanies();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure? This will delete all pickup history associated with this company.')) {
      await supabase.from('companies').delete().eq('id', id);
      fetchCompanies();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Companies</h1>
      </div>

      <Card delay={0.1}>
        <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4 items-end mb-8">
          <div className="flex-1 w-full">
            <Input 
              label="New Company Name" 
              value={newCompany} 
              onChange={(e) => setNewCompany(e.target.value)} 
              placeholder="Enter company name"
            />
          </div>
          <Button type="submit" isLoading={loading} className="w-full sm:w-auto mb-0.5">
            <Plus size={20} /> Add
          </Button>
        </form>

        <div className="space-y-4">
          <AnimatePresence>
            {companies.map((company, index) => (
              <motion.div 
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="flex items-center justify-between p-4 bg-[#e0e5ec] rounded-2xl shadow-[inset_4px_4px_8px_rgb(163,177,198,0.4),inset_-4px_-4px_8px_rgba(255,255,255,0.6)] border border-white/30"
              >
                {editingId === company.id ? (
                  <Input 
                    value={editName} 
                    onChange={(e) => setEditName(e.target.value)} 
                    className="mr-4 !py-2"
                  />
                ) : (
                  <span className="font-bold text-lg text-slate-700 pl-2">{company.name}</span>
                )}
                
                <div className="flex items-center gap-2">
                  {editingId === company.id ? (
                    <>
                      <Button onClick={saveEdit} className="!p-2 text-green-600 !rounded-lg"><Check size={18} /></Button>
                      <Button onClick={() => setEditingId(null)} className="!p-2 text-slate-500 !rounded-lg"><X size={18} /></Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => startEdit(company)} className="!p-2 text-blue-500 !rounded-lg"><Edit2 size={18} /></Button>
                      <Button onClick={() => handleDelete(company.id)} className="!p-2 text-red-500 !rounded-lg" variant="danger"><Trash2 size={18} /></Button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {companies.length === 0 && (
            <p className="text-center text-slate-400 py-8 font-medium">No companies added yet.</p>
          )}
        </div>
      </Card>
    </div>
  );
};
