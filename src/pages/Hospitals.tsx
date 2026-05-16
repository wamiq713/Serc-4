import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Bed, HeartPulse, Phone, MapPin, Plus, Trash2, Edit3, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import HospitalModal from '../components/HospitalModal';
import HospitalLogModal from '../components/HospitalLogModal';

interface HospitalsPageProps {
  role?: string;
}

export default function HospitalsPage({ role }: HospitalsPageProps) {
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<any>(null);
  const [selectedHospital, setSelectedHospital] = useState<any>(null);

  useEffect(() => {
    fetchHospitals();

    const sub = (supabase.channel('hospitals-refetch') as any)
      .on('postgres_changes', { event: '*', table: 'hospitals' }, () => fetchHospitals())
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, []);

  const fetchHospitals = async () => {
    const { data } = await supabase.from('hospitals').select('*').order('name');
    if (data) setHospitals(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const hosp = hospitals.find(h => h.id === id);
    if (!hosp) return;

    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }

    setDeletingId(id);
    try {
      // 1. Delete all assignments first
      const { error: asgnError } = await supabase
        .from('assignments')
        .delete()
        .eq('hospital_id', id);
      
      if (asgnError) throw new Error(`Log Erasure Error: ${asgnError.message}`);

      // 2. Delete the hospital itself
      const { error: hospError } = await supabase
        .from('hospitals')
        .delete()
        .eq('id', id);
      
      if (hospError) {
        if (hospError.code === '42501') {
          throw new Error('Permission Denied: Only administrators can remove medical centers.');
        }
        throw new Error(`Network Removal Error: ${hospError.message}`);
      }

      // Optimistic Update
      setHospitals(prev => prev.filter(h => h.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message || 'Unknown operational failure');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-blue-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center glass-card p-8 border-l-4 border-l-blue-600">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">Medical Infrastructure</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Hospital capacity and specialized emergency resources</p>
        </div>
        {role === 'admin' && (
          <button 
            onClick={() => { setEditingHospital(null); setIsModalOpen(true); }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 shadow-xl shadow-blue-900/20 active:scale-95"
          >
            <Plus size={18} /> Register Facility
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hospitals.map((hosp, i) => (
          <motion.div
            key={hosp.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-8 glass-card border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all flex flex-col md:flex-row gap-8"
          >
            <div className="p-6 bg-blue-600/10 text-blue-500 rounded-3xl h-fit border border-blue-500/10 shadow-lg group-hover:scale-110 transition-transform">
              <Building2 size={40} />
            </div>
            
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-2xl font-black text-white tracking-tighter group-hover:text-blue-400 transition-colors uppercase italic">{hosp.name}</h3>
                <div className="flex gap-2">
                  {role === 'admin' && (
                    <>
                      <button onClick={() => { setEditingHospital(hosp); setIsModalOpen(true); }} className="p-2 bg-white/5 hover:bg-emerald-600/20 rounded-lg text-slate-500 hover:text-emerald-500 transition-all"><Edit3 size={14} /></button>
                      <button 
                        onClick={() => handleDelete(hosp.id)} 
                        disabled={deletingId === hosp.id}
                        className={`p-2 rounded-lg transition-all ${
                          confirmDeleteId === hosp.id
                            ? 'bg-red-600 text-white animate-pulse'
                            : 'bg-white/5 text-slate-500 hover:bg-red-600/20 hover:text-red-500'
                        }`}
                        title={confirmDeleteId === hosp.id ? 'Click again to confirm removal' : 'Remove Facility'}
                      >
                        {deletingId === hosp.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><MapPin size={12} className="text-red-500" /> {hosp.address || 'Central Sector'}</p>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Phone size={12} className="text-blue-500" /> {hosp.phone || '911'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-[9px] uppercase font-bold tracking-widest flex items-center gap-2">
                      <Bed size={12} /> Occupancy
                    </span>
                    <span className="text-[9px] font-mono text-white">{hosp.total_beds > 0 ? Math.round((hosp.available_beds / hosp.total_beds) * 100) : 0}% Avail.</span>
                  </div>
                  <div className="text-3xl font-mono font-black text-white tracking-tighter">{hosp.available_beds}<span className="text-xs text-slate-600 ml-1">/{hosp.total_beds}</span></div>
                  <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500" 
                      style={{ width: `${hosp.total_beds > 0 ? Math.min(100, Math.max(0, (hosp.available_beds / hosp.total_beds) * 100)) : 0}%` }} 
                    />
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-2 text-slate-500 text-[9px] uppercase font-bold tracking-widest mb-1">
                    <HeartPulse size={12} /> Capability
                  </div>
                  <div className="text-sm font-black text-blue-500 uppercase tracking-widest">{hosp.emergency_support ? 'Level 1 Trauma' : 'General Care'}</div>
                </div>
              </div>

              <button 
                onClick={() => { setSelectedHospital(hosp); setIsLogOpen(true); }}
                className="mt-8 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-lg group-hover:border-blue-500/50"
              >
                Resource Allocation Log
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <HospitalModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        hospital={editingHospital}
      />

      <HospitalLogModal 
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        hospital={selectedHospital}
      />
    </div>
  );
}
