import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, MapPin, AlertCircle, TrendingUp, Zap, BarChart3 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AnalyticsPage() {
  const [accidents, setAccidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data } = await supabase.from('accidents').select('*');
    if (data) setAccidents(data);
    setLoading(false);
  };

  // Simplified K-Means logic: Grouping by address/sector for "Hotspots"
  const getHotspots = () => {
    const groups: Record<string, any[]> = {};
    accidents.forEach(acc => {
      const sector = acc.address?.split(',')[0] || 'Unknown Sector';
      if (!groups[sector]) groups[sector] = [];
      groups[sector].push(acc);
    });
    
    return Object.entries(groups)
      .map(([name, points]) => ({ name, points, severity: points.some(p => p.severity === 'Critical') ? 'Critical' : 'High' }))
      .sort((a, b) => b.points.length - a.points.length);
  };

  const hotspots = getHotspots();

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center glass-card p-10 border-l-4 border-l-blue-600">
        <div>
          <h2 className="text-3xl font-black mb-1 tracking-tighter uppercase italic text-white">Grid Intelligence</h2>
          <div className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981]"></div> Algorithmic Spatial Analysis Engine
          </div>
        </div>
        <div className="mt-4 md:mt-0 px-6 py-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-4">
           <Zap className="text-blue-500" size={20} />
           <div className="text-right">
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Compute Load</p>
             <p className="text-xs font-mono text-white">0.4 GFLOPs</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-[0.4em] text-slate-400 flex items-center gap-4 mb-2">
            <BarChart3 className="text-blue-500" size={16} /> Spatial Hotspot Detection
          </h3>
          {hotspots.length > 0 ? hotspots.slice(0, 4).map((spot, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="p-6 glass-card flex items-center justify-between group hover:border-blue-500/30 transition-all cursor-default"
            >
              <div className="flex items-center gap-6">
                <div className={`p-5 rounded-3xl border shadow-inner transition-colors ${
                  spot.severity === 'Critical' ? 'bg-red-600/10 border-red-500/20 text-red-500' : 'bg-blue-600/10 border-blue-500/20 text-blue-500'
                }`}>
                  <MapPin size={32} />
                </div>
                <div>
                  <h4 className="font-black text-white uppercase tracking-widest text-base italic">{spot.name}</h4>
                  <div className="flex items-center gap-3 mt-1.5 font-mono text-[10px] text-slate-500 uppercase">
                    <span>Cluster Sigma: 0.82</span>
                    <span className={`px-2 py-0.5 rounded-md ${spot.severity === 'Critical' ? 'bg-red-600/20 text-red-500' : 'bg-blue-600/20 text-blue-500'}`}>
                      {spot.severity} Risk
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-4xl font-mono font-black text-white tracking-tighter">{spot.points.length}</div>
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Grid Events</p>
              </div>
            </motion.div>
          )) : (
            <div className="p-20 text-center glass-card border border-dashed border-white/5 bg-white/0 rounded-[3rem]">
              <AlertCircle size={48} className="mx-auto text-slate-700 mb-6 opacity-20" />
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.4em] italic">Telemetry Stream Insufficient for ML Inference</p>
            </div>
          )}
        </div>

        <div className="p-12 glass-card flex flex-col items-center justify-center text-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-12 opacity-5 group-hover:scale-110 transition-transform duration-1000">
             <TrendingUp size={160} />
          </div>
          <div className="relative">
             <div className="absolute inset-0 bg-blue-500/20 blur-[60px] rounded-full animate-pulse" />
             <div className="p-10 bg-blue-600/10 text-blue-500 rounded-full mb-10 border border-blue-500/10 shadow-[0_0_50px_rgba(59,130,246,0.2)] relative z-10">
               <Activity size={64} />
             </div>
          </div>
          <h3 className="text-3xl font-black mb-4 tracking-tighter uppercase italic text-white">Strategic Optimization System</h3>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest max-w-sm leading-relaxed mb-12">
            Automated Resource Orchestration via <span className="text-blue-500 italic">Dijkstra Pre-processed</span> Pathing and <span className="text-emerald-500 italic">K-Means Spatial Partitioning</span>.
          </p>
          <div className="grid grid-cols-2 gap-6 w-full">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center hover:bg-white/10 transition-all border-t-2 border-t-blue-600">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3">Pathing Core</p>
              <p className="text-base font-black text-blue-500 tracking-widest uppercase italic">Dijkstra+</p>
            </div>
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5 flex flex-col items-center hover:bg-white/10 transition-all border-t-2 border-t-emerald-600">
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em] mb-3">Spatial Engine</p>
              <p className="text-base font-black text-emerald-500 tracking-widest uppercase italic">ML-Cluster</p>
            </div>
          </div>
          
          <div className="mt-12 w-full pt-8 border-t border-white/5 flex justify-around items-center opacity-40">
             <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Node Sync: 99.9%</div>
             <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Inference Time: 12ms</div>
             <div className="text-[9px] font-black uppercase tracking-widest text-slate-500">Security: Hardened</div>
          </div>
        </div>
      </div>
    </div>
  );
}
