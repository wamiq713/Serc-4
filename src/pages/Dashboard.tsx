import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, AlertTriangle, Ambulance, Building2, TrendingUp, Clock, MapPin, Plus, UserCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import ReportAccidentModal from '../components/ReportAccidentModal';
import DispatchModal from '../components/DispatchModal';

interface DashboardProps {
  role?: string;
  profile?: any;
}

export default function Dashboard({ role, profile }: DashboardProps) {
  const [accidents, setAccidents] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<any>(null);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    fetchInitialData();
    
    // Set up Realtime subscriptions
    const accidentsSub = (supabase.channel('accidents-all') as any)
      .on('postgres_changes', { event: '*', table: 'accidents' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          setAccidents(prev => [payload.new, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setAccidents(prev => prev.map(a => a.id === payload.new.id ? payload.new : a));
        } else if (payload.eventType === 'DELETE') {
          setAccidents(prev => prev.filter(a => a.id !== payload.old.id));
        }
      })
      .subscribe();

    const ambulancesSub = (supabase.channel('ambulances-all') as any)
      .on('postgres_changes', { event: '*', table: 'ambulances' }, () => fetchAmbulances())
      .subscribe();

    const hospitalsSub = (supabase.channel('hospitals-all') as any)
      .on('postgres_changes', { event: '*', table: 'hospitals' }, () => fetchHospitals())
      .subscribe();

    return () => {
      accidentsSub.unsubscribe();
      ambulancesSub.unsubscribe();
      hospitalsSub.unsubscribe();
    };
  }, []);

  const fetchInitialData = () => {
    fetchAccidents();
    fetchAmbulances();
    fetchHospitals();
  };

  const fetchAccidents = async () => {
    const { data } = await supabase
      .from('accidents')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false });
    if (data) setAccidents(data);
  };

  const fetchAmbulances = async () => {
    const { data } = await supabase.from('ambulances').select('*');
    if (data) setAmbulances(data);
  };

  const fetchHospitals = async () => {
    const { data } = await supabase.from('hospitals').select('*');
    if (data) setHospitals(data);
  };

  const clearHistory = async () => {
    const resolvedIncidents = accidents.filter(a => a.status === 'resolved');
    if (resolvedIncidents.length === 0) {
      alert('NO PURGEABLE RECORDS IDENTIFIED: The database contains zero incidents with status "resolved".');
      return;
    }

    setIsClearing(true);
    try {
      // With ON DELETE CASCADE enabled in schema.sql, we only need to delete the accidents.
      // This will automatically clear linked assignments.
      const { error } = await supabase
        .from('accidents')
        .delete()
        .eq('status', 'resolved');
      
      if (error) throw error;

      setIsPurgeModalOpen(false);
      // Realtime subscription will handle state updates, but a manual fetch ensures consistency
      await fetchAccidents(); 
    } catch (err: any) {
      console.error('Purge error:', err);
      alert(`OPERATIONAL FAILURE: ${err.message}. If this persists, verify your Admin permissions.`);
    } finally {
      setIsClearing(false);
    }
  };

  const activeEmergencies = accidents.filter(a => a.status !== 'resolved').length;
  const availableAmbulances = ambulances.filter(a => a.status === 'available').length;
  const totalBeds = hospitals.reduce((acc, h) => acc + (Number(h.total_beds) || 0), 0);
  const availBeds = hospitals.reduce((acc, h) => acc + (Number(h.available_beds) || 0), 0);
  const bedCapacity = totalBeds > 0 ? Math.round((availBeds / totalBeds) * 100) : 0;

  const stats = [
    { label: 'Active Incidents', value: activeEmergencies.toString(), icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Units Standby', value: availableAmbulances.toString(), icon: Ambulance, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Est. Bed Cap.', value: `${bedCapacity}%`, icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Response Time', value: '3.8m', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center glass-card p-8 border-l-4 border-l-red-600">
        <div>
          <h2 className="text-2xl font-black tracking-tighter text-white uppercase italic">
            {role === 'admin' ? 'Strategic Oversight Terminal' : 'Tactical Dispatch Terminal'}
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Operator: <span className="text-slate-300">{profile?.username || 'System'}</span> | Sector: Pakistan Central
          </p>
        </div>
        
        {role === 'dispatcher' && (
          <button 
            onClick={() => setIsReportModalOpen(true)}
            className="mt-4 md:mt-0 bg-red-600 hover:bg-red-500 text-white px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-red-900/20 active:scale-95 flex items-center gap-3"
          >
            <Plus size={18} /> Log New Incident
          </button>
        )}

        {role === 'admin' && (
          <button 
            onClick={() => setIsPurgeModalOpen(true)}
            className="mt-4 md:mt-0 bg-white/5 hover:bg-red-950/30 text-slate-300 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all border border-white/5 active:scale-95 flex items-center gap-3 group shadow-xl"
          >
            <Activity size={16} className="text-slate-500 group-hover:text-red-500 transition-colors" /> Clear incident History
          </button>
        )}
      </div>

      {isPurgeModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card max-w-md w-full p-8 border-t-4 border-red-600 space-y-6"
          >
            <div className="space-y-2">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-white flex items-center gap-3">
                <AlertTriangle className="text-red-500" /> Administrative Purge Required
              </h3>
              <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wider">
                You are about to permanently erase <span className="text-red-500">{accidents.filter(a => a.status === 'resolved').length} resolved records</span> from the centralized tactical database. This action is irreversible.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                disabled={isClearing}
                onClick={clearHistory}
                className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-3"
              >
                {isClearing ? 'Purging Intelligence...' : 'Authorize Permanent Deletion'}
              </button>
              <button
                disabled={isClearing}
                onClick={() => setIsPurgeModalOpen(false)}
                className="w-full bg-white/5 hover:bg-white/10 text-slate-400 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all"
              >
                Abort Protocol
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isReportModalOpen && (
        <ReportAccidentModal 
          isOpen={isReportModalOpen} 
          onClose={() => setIsReportModalOpen(false)} 
        />
      )}

      {selectedAccident && (
        <DispatchModal
          accident={selectedAccident}
          isOpen={!!selectedAccident}
          onClose={() => setSelectedAccident(null)}
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 glass-card group hover:border-white/20 transition-all"
          >
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] transition-colors group-hover:text-slate-300">{stat.label}</span>
            <div className="flex items-end justify-between mt-2">
              <h3 className="text-5xl font-mono text-white tracking-tighter font-black">
                {stat.value.includes('%') ? (
                  <>
                    {stat.value.replace('%', '')}
                    <span className="text-lg text-slate-500 ml-1 opacity-50">%</span>
                  </>
                ) : stat.value}
              </h3>
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color} shadow-lg`}>
                <stat.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incident Queue */}
        <div className="lg:col-span-2 p-8 glass-card border-t border-t-white/10">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-3">
              <Activity className="text-red-500" size={16} /> Live Operation Feed
            </h3>
            <div className="flex gap-4 text-[9px] font-black uppercase tracking-widest">
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div> Active</div>
              <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div> Dispatching</div>
            </div>
          </div>
          
          <div className="space-y-4">
            {accidents.length === 0 ? (
              <div className="p-20 text-center border border-dashed border-white/5 rounded-3xl">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">No active incidents detected in perimeter</p>
              </div>
            ) : (
              accidents.slice(0, 5).map((acc) => (
                <div key={acc.id} className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-red-500/30 transition-all group flex flex-col md:flex-row gap-6 md:items-center">
                  <div className={`p-4 rounded-2xl ${acc.severity === 'Critical' ? 'bg-red-600/20 text-red-500' : 'bg-amber-600/20 text-amber-500'} group-hover:scale-110 transition-transform`}>
                    <AlertTriangle size={24} className={acc.severity === 'Critical' ? 'animate-pulse' : ''} />
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-black text-sm uppercase tracking-tight text-white">{acc.description}</h4>
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                        acc.severity === 'Critical' ? 'bg-red-600 text-white' : 'bg-amber-500 text-black'
                      }`}>
                        {acc.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><MapPin size={12} /> Sector: {acc.address?.split(',')[0] || 'Unknown'}</span>
                      <span className="flex items-center gap-1"><UserCheck size={12} /> {acc.patient_count} Patients</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Operator</p>
                      <p className="text-[10px] font-mono text-white">{acc.profiles?.username || 'AUTO'}</p>
                    </div>
                    {acc.status === 'reported' && role === 'dispatcher' ? (
                      <button 
                        onClick={() => setSelectedAccident(acc)}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-blue-900/20"
                      >
                        Initiate Logic
                      </button>
                    ) : (
                      <span className={`px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-lg border flex items-center gap-2 ${
                        acc.status === 'resolved' 
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' 
                          : 'bg-white/5 border-white/5 text-slate-400'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${acc.status === 'resolved' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                        {acc.status}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="p-8 glass-card border-t border-t-blue-500/50">
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 mb-6 underline decoration-blue-500 underline-offset-8 decoration-2">Resource Cluster</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Ambulance Readiness</span>
                  <span className="text-xs font-mono text-blue-500">{availableAmbulances}/{ambulances.length}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 shadow-[0_0_15px_#3b82f6] transition-all" 
                    style={{ width: `${ambulances.length > 0 ? Math.min(100, Math.max(0, (availableAmbulances / ambulances.length) * 100)) : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[9px] font-black text-white uppercase tracking-[0.2em]">Hospital Bed Availability</span>
                  <span className="text-xs font-mono text-emerald-500">{availBeds}/{totalBeds}</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 shadow-[0_0_15px_#10b981] transition-all" 
                    style={{ width: `${Math.min(100, Math.max(0, bedCapacity))}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="mt-10 pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Network Latency</span>
                <span className="text-[10px] font-mono text-emerald-400">14ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Encryption</span>
                <span className="text-[10px] font-mono text-blue-400">AES-256</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
