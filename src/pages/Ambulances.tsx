import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Ambulance, Activity, CheckCircle2, AlertCircle, MapPin, Gauge, Plus, Trash2, Edit3, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AmbulanceModal from '../components/AmbulanceModal';

interface AmbulancesPageProps {
  role?: string;
}

export default function AmbulancesPage({ role }: AmbulancesPageProps) {
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAmbulance, setEditingAmbulance] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchAmbulances();

    const sub = (supabase.channel('ambulances-refetch') as any)
      .on('postgres_changes', { event: '*', table: 'ambulances' }, () => fetchAmbulances())
      .on('postgres_changes', { event: '*', table: 'assignments' }, () => fetchAmbulances())
      .subscribe();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => { 
      sub.unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const fetchAmbulances = async () => {
    // Fetch ambulances with their latest active assignment
    const { data, error } = await supabase
      .from('ambulances')
      .select(`
        *,
        assignments (
          id,
          status,
          hospital_id,
          hospitals (name)
        )
      `)
      .order('plate_number');
    
    if (error) console.error('Error fetching ambulances:', error);
    if (data) setAmbulances(data);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const amb = ambulances.find(a => a.id === id);
    if (!amb) return;
    
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
        .eq('ambulance_id', id);
      
      if (asgnError) throw new Error(`History Wipe Error: ${asgnError.message}`);

      // 2. Delete the ambulance itself
      const { error: ambError } = await supabase
        .from('ambulances')
        .delete()
        .eq('id', id);
      
      if (ambError) {
        if (ambError.code === '42501') {
          throw new Error('Permission Denied: Only administrators can de-list units.');
        }
        throw new Error(`Registry Deletion Error: ${ambError.message}`);
      }

      // Optimistic Update
      setAmbulances(prev => prev.filter(a => a.id !== id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(err.message || 'Unknown operational failure');
    } finally {
      setDeletingId(null);
    }
  };

  const getRemainingTime = (busyUntil: string) => {
    if (!busyUntil) return null;
    const busyDate = new Date(busyUntil);
    const diff = busyDate.getTime() - currentTime.getTime();
    if (diff <= 0) return 'AVAILABLE SOON';
    
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="text-red-500 animate-spin" size={48} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center glass-card p-8 border-l-4 border-l-emerald-600">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">Fleet Command</h2>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Real-time status monitoring and unit lifecycle management</p>
        </div>
        {role === 'admin' && (
          <button 
            onClick={() => { setEditingAmbulance(null); setIsModalOpen(true); }}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center gap-3 shadow-xl shadow-emerald-900/20 active:scale-95"
          >
            <Plus size={18} /> Commission New Unit
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ambulances.map((amb, i) => (
          <motion.div
            key={amb.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="p-8 glass-card border border-white/5 relative overflow-hidden group hover:border-white/20 transition-all"
          >
            <div className="flex justify-between items-start mb-8">
              <div className={`p-4 rounded-2xl ${
                amb.status === 'available' ? 'bg-emerald-600/20 text-emerald-500' : 
                amb.status === 'busy' ? 'bg-red-600/20 text-red-500' : 'bg-slate-600/20 text-slate-500'
              } shadow-lg transition-transform group-hover:scale-110`}>
                <Ambulance size={28} className={amb.status === 'busy' ? 'animate-pulse' : ''} />
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] ${
                  amb.status === 'available' ? 'bg-emerald-600/20 text-emerald-500' : 
                  amb.status === 'busy' ? 'bg-red-600/20 text-red-500' : 'bg-slate-600/20 text-slate-500'
                }`}>
                  {amb.status}
                </span>
                {amb.busy_until && (
                  <div className="flex flex-col items-end mt-2 animate-pulse">
                    <span className="text-[9px] font-black text-red-500 uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded">Tactical Operation</span>
                    <div className="text-[10px] font-mono text-white mt-1">
                      {(() => {
                        const activeAsgn = amb.assignments?.find((a: any) => a.status === 'confirmed');
                        const hospName = activeAsgn?.hospitals?.name || 'FACILITY';
                        const time = getRemainingTime(amb.busy_until);
                        return (
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] text-slate-500 font-bold uppercase">{hospName}</span>
                            <span className="text-red-500">{time}</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-3xl font-mono font-black text-white tracking-tighter">{amb.plate_number}</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">{amb.type} Configuration</p>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span className="flex items-center gap-2"><MapPin size={14} className="text-emerald-500" /> Current Sector</span>
                  <span className="text-white font-mono">{amb.current_latitude?.toFixed(2)}, {amb.current_longitude?.toFixed(2)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-2"><Gauge size={14} className="text-blue-500" /> Fuel Reserve</span>
                    <span className="text-white">{amb.fuel_level}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, amb.fuel_level || 0))}%` }}
                      className={`h-full ${amb.fuel_level < 20 ? 'bg-red-500' : 'bg-blue-500'} shadow-[0_0_8px_currentColor]`}
                    />
                  </div>
                </div>
              </div>

              {role === 'admin' && (
                <div className="pt-6 flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => { setEditingAmbulance(amb); setIsModalOpen(true); }}
                    className="flex-1 py-3 bg-white/5 hover:bg-emerald-600/20 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Edit3 size={12} /> Sync
                  </button>
                  <button 
                    onClick={() => handleDelete(amb.id)}
                    disabled={deletingId === amb.id}
                    className={`flex-1 py-3 border rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                      confirmDeleteId === amb.id 
                        ? 'bg-red-600 border-red-500 text-white animate-pulse' 
                        : 'bg-white/5 hover:bg-red-600/20 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {deletingId === amb.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <Trash2 size={12} /> 
                        {confirmDeleteId === amb.id ? 'Confirm Scrape' : 'Scrape'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AmbulanceModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ambulance={editingAmbulance}
      />
    </div>
  );
}
