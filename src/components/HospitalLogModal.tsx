import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { X, History, ClipboardList, Clock, AlertTriangle, Ambulance } from 'lucide-react';
import { format } from 'date-fns';

interface LogModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospital: any;
}

export default function HospitalLogModal({ isOpen, onClose, hospital }: LogModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && hospital) {
      fetchLogs();
    }
  }, [isOpen, hospital]);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        accidents (*),
        ambulances (*)
      `)
      .eq('hospital_id', hospital.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLogs(data);
    }
    setLoading(false);
  };

  const handleReleaseBeds = async (log: any) => {
    if (!confirm(`Are you sure you want to discharge ${log.accidents?.patient_count} patients and release these beds?`)) return;
    
    try {
      // 1. Update assignment status
      const { error: asgnError } = await supabase
        .from('assignments')
        .update({ status: 'completed' })
        .eq('id', log.id);
      
      if (asgnError) throw asgnError;

      // 2. Increase hospital available beds
      const { data: hospData } = await supabase
        .from('hospitals')
        .select('available_beds')
        .eq('id', log.hospital_id)
        .single();
      
      if (hospData) {
        const newBeds = hospData.available_beds + log.accidents?.patient_count;
        const { error: hospError } = await supabase
          .from('hospitals')
          .update({ available_beds: newBeds })
          .eq('id', log.hospital_id);
        
        if (hospError) throw hospError;
      }

      fetchLogs();
    } catch (err: any) {
      alert(`Operation failed: ${err.message}`);
    }
  };

  const getReservationLabel = (severity: string) => {
    switch (severity) {
      case 'critical': return 'Estimated 72h Hold (Critical Care)';
      case 'high': return 'Estimated 18h Hold (Surgical)';
      case 'medium': return 'Estimated 9h Hold (Observation)';
      default: return 'Estimated 3h Hold (ER)';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-4xl glass-card overflow-hidden h-[80vh] flex flex-col"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-600/10">
              <div className="flex items-center gap-3 text-blue-500">
                <History size={24} />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em]">Resource Allocation Log</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{hospital?.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Accessing Secure Records...</p>
                  </div>
                </div>
              ) : logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-white/5 rounded-3xl">
                  <div className="p-4 bg-white/5 rounded-full mb-6">
                    <ClipboardList size={48} className="text-slate-700" />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-widest mb-2">Null Allocation History</h4>
                  <p className="text-slate-500 text-xs max-w-xs leading-relaxed uppercase tracking-tight">No dispatch commands have been routed to this facility in the current operational cycle.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-6 bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${
                            log.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'
                          }`}>
                            <AlertTriangle size={20} />
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
                              {log.accidents?.severity} PRIORITY • {log.status}
                              <span className="w-1 h-1 bg-slate-700 rounded-full" />
                              <Clock size={12} /> {format(new Date(log.created_at), 'HH:mm:ss')}
                            </div>
                            <div className="text-white font-bold tracking-tight mb-1">{log.accidents?.description}</div>
                            <div className="text-[10px] text-slate-400 font-mono italic mb-3">{log.accidents?.address}</div>
                            
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-blue-500/80 uppercase tracking-widest bg-blue-500/5 px-2 py-1 rounded-md border border-blue-500/10">
                                {getReservationLabel(log.accidents?.severity)}
                              </span>
                              {log.status === 'confirmed' && (
                                <button 
                                  onClick={() => handleReleaseBeds(log)}
                                  className="text-[9px] font-black text-emerald-500 hover:text-white uppercase tracking-widest bg-emerald-500/10 hover:bg-emerald-600 px-3 py-1 rounded-md transition-all border border-emerald-500/20"
                                >
                                  Discharge & Free Beds
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 border-l md:border-l border-white/10 pl-6 h-full">
                          <div className="space-y-1">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Ambulance</div>
                            <div className="flex items-center gap-2 text-xs text-white font-bold">
                              <Ambulance size={14} className="text-blue-500" />
                              {log.ambulances?.plate_number}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Patients</div>
                            <div className="text-xs font-mono text-white font-bold">{log.accidents?.patient_count} UNTS</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
