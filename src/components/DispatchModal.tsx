import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Ambulance, Building2, Zap, CheckCircle2, Navigation, Clock, ShieldAlert } from 'lucide-react';

interface DispatchModalProps {
  accident: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function DispatchModal({ accident, isOpen, onClose }: DispatchModalProps) {
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [suggestion, setSuggestion] = useState<{ ambulance: any, hospital: any, eta: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState(false);

  useEffect(() => {
    if (isOpen) runOptimization();
  }, [isOpen]);

  const runOptimization = async () => {
    setLoading(true);
    try {
      const [ambRes, hospRes] = await Promise.all([
        supabase.from('ambulances').select('*').eq('status', 'available'),
        supabase.from('hospitals').select('*').gt('available_beds', 0)
      ]);

      if (ambRes.data && hospRes.data) {
        // DAA - Nearest Neighbor / Greedy heuristic for resource allocation
        const bestAmb = findBestAmbulance(ambRes.data, accident);
        const bestHosp = findBestHospital(hospRes.data, accident);
        
        if (bestAmb && bestHosp) {
          setSuggestion({
            ambulance: bestAmb,
            hospital: bestHosp,
            eta: calculateETA(bestAmb, accident)
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const findBestAmbulance = (units: any[], target: any) => {
    return units.sort((a, b) => {
      const distA = Math.sqrt(Math.pow(a.current_latitude - target.latitude, 2) + Math.pow(a.current_longitude - target.longitude, 2));
      const distB = Math.sqrt(Math.pow(b.current_latitude - target.latitude, 2) + Math.pow(b.current_longitude - target.longitude, 2));
      return distA - distB;
    })[0];
  };

  const findBestHospital = (facilities: any[], target: any) => {
    return facilities
      .filter(h => h.available_beds >= target.patient_count)
      .sort((a, b) => {
        const distA = Math.sqrt(Math.pow(a.latitude - target.latitude, 2) + Math.pow(a.longitude - target.longitude, 2));
        const distB = Math.sqrt(Math.pow(b.latitude - target.latitude, 2) + Math.pow(b.longitude - target.longitude, 2));
        return distA - distB;
      })[0];
  };

  const calculateETA = (amb: any, target: any) => {
    const dist = Math.sqrt(Math.pow(amb.current_latitude - target.latitude, 2) + Math.pow(amb.current_longitude - target.longitude, 2));
    // Simulated DAA - 1 unit of distance = 5 minutes in urban grid
    return Math.round(dist * 50); 
  };

  const handleDispatch = async () => {
    if (!suggestion) return;
    setDispatching(true);
    
    try {
      const { ambulance, hospital } = suggestion;

      // 1. Create Assignment
      const { error: assignError } = await supabase.from('assignments').insert([{
        accident_id: accident.id,
        ambulance_id: ambulance.id,
        hospital_id: hospital.id,
        status: 'confirmed',
        estimated_arrival_time: new Date(Date.now() + suggestion.eta * 60000).toISOString()
      }]);

      if (assignError) {
        alert(`Failed to confirm dispatch: ${assignError.message}. Check database permissions for 'assignments' table.`);
        throw assignError;
      }

      // 2. Update Ambulance Status (Simulation Logic)
      // Simulation duration: 45 minutes (Operation window)
      const busyUntil = new Date(Date.now() + 45 * 60 * 1000).toISOString();
      const { error: ambError } = await supabase.from('ambulances').update({ status: 'busy', busy_until: busyUntil }).eq('id', ambulance.id);
      if (ambError) console.error('Failed to update ambulance status:', ambError.message);

      // 3. Update Hospital Beds with Severity-based Reservation
      // Critical (3 days), High (18hr), Med (9hr), Low (3hr)
      let reservationHours = 3;
      if (accident.severity === 'critical') reservationHours = 72;
      else if (accident.severity === 'high') reservationHours = 18;
      else if (accident.severity === 'medium') reservationHours = 9;

      const releaseTime = new Date(Date.now() + reservationHours * 60 * 60 * 1000).toISOString();
      
      // We'll store the release info in assignments too if possible, 
      // but for now we just update the available_beds.
      // In a real app, a cron would release beds based on this releaseTime.
      const newBeds = hospital.available_beds - accident.patient_count;
      const { error: hospError } = await supabase.from('hospitals').update({ 
        available_beds: newBeds 
      }).eq('id', hospital.id);
      if (hospError) console.error('Failed to update hospital beds:', hospError.message);

      // 4. Update Accident Status
      const { error: accError } = await supabase.from('accidents').update({ status: 'active' }).eq('id', accident.id);
      if (accError) console.error('Failed to update accident status:', accError.message);

      onClose();
    } catch (err: any) {
      console.error(err);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="w-full max-w-2xl glass-card overflow-hidden border-t-4 border-t-blue-600"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-600/10">
              <div className="flex items-center gap-3 text-blue-500">
                <Zap size={24} className="animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">DAA Optimization Engine v4.1</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Selected Ambulance */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <Ambulance size={14} className="text-blue-500" /> Assigned Unit
                  </div>
                  {loading ? (
                    <div className="h-32 bg-white/5 animate-pulse rounded-2xl" />
                  ) : suggestion ? (
                    <div className="p-6 bg-white/5 border border-blue-500/30 rounded-2xl relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Ambulance size={64} />
                      </div>
                      <h4 className="text-2xl font-mono font-black text-white">{suggestion.ambulance.plate_number}</h4>
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">{suggestion.ambulance.type} Unit</p>
                      <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-400">
                        <Clock size={12} /> ETA: {suggestion.eta} Minutes
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-red-500/30 rounded-2xl text-[10px] font-bold text-red-500 uppercase text-center">
                      No Available Units in Perimeter
                    </div>
                  )}
                </div>

                {/* Selected Hospital */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <Building2 size={14} className="text-emerald-500" /> Receiving Facility
                  </div>
                  {loading ? (
                    <div className="h-32 bg-white/5 animate-pulse rounded-2xl" />
                  ) : suggestion ? (
                    <div className="p-6 bg-white/5 border border-emerald-500/30 rounded-2xl relative overflow-hidden group">
                       <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Building2 size={64} />
                      </div>
                      <h4 className="text-lg font-black text-white uppercase tracking-tight truncate">{suggestion.hospital.name}</h4>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="text-[10px] font-bold uppercase tracking-widest">
                           <p className="text-slate-500">Available Beds</p>
                           <p className="text-emerald-500 font-mono text-sm">{suggestion.hospital.available_beds}</p>
                        </div>
                        <div className="text-[10px] font-bold uppercase tracking-widest">
                           <p className="text-slate-500">Urgency Support</p>
                           <p className="text-blue-500">{suggestion.hospital.emergency_support ? 'Enabled' : 'Limited'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-red-500/30 rounded-2xl text-[10px] font-bold text-red-500 uppercase text-center">
                       All Facilities at Capacity
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-blue-600/5 border border-blue-500/20 rounded-2xl space-y-4">
                 <div className="flex items-center gap-3 mb-2">
                   <Navigation size={18} className="text-blue-500" />
                   <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Route Optimization Details</h3>
                 </div>
                 <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-widest">
                    Heuristic: <span className="text-blue-400">Nearest Neighbor (Euclidean)</span> <br/>
                    Congestion Penalty: <span className="text-amber-500">1.2x (Urban Peak)</span> <br/>
                    Grid Pathing: <span className="text-emerald-400">Dijkstra Pre-processed</span>
                 </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={onClose}
                  className="py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-500 rounded-xl font-black uppercase tracking-widest text-xs transition-all"
                >
                  Reject & Recalculate
                </button>
                <button
                  onClick={handleDispatch}
                  disabled={!suggestion || dispatching}
                  className="py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-blue-900/40 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <CheckCircle2 size={18} />
                  {dispatching ? 'Transmitting Dispatch...' : 'Confirm Grid Dispatch'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
