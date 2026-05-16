import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Polyline, ScaleControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Ambulance, AlertTriangle, Building2, Navigation, Activity, Plus } from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReportAccidentModal from '../components/ReportAccidentModal';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (IconComponent: any, color: string, isBusy?: boolean, countdown?: string) => {
  const iconMarkup = renderToStaticMarkup(
    <div className="relative flex flex-col items-center">
      <div className={`relative p-2 rounded-xl shadow-2xl border-2 border-white/20 ${color} text-white`}>
        <IconComponent size={20} />
        {isBusy && <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-slate-900 animate-pulse" />}
      </div>
      {countdown && (
        <div className="mt-1 flex flex-col items-center">
          <div className="bg-slate-950/90 text-white text-[7px] font-black px-1.5 py-0.5 rounded border border-white/10 shadow-lg whitespace-nowrap uppercase tracking-widest">
            Ready in {countdown}
          </div>
          <div className="w-0.5 h-1.5 bg-white/20" />
        </div>
      )}
    </div>
  );
  return L.divIcon({
    html: iconMarkup,
    className: 'custom-leaflet-icon',
    iconSize: [48, 64],
    iconAnchor: [24, 32],
  });
};

const ambulanceAvailableIcon = createCustomIcon(Ambulance, 'bg-emerald-500');
const ambulanceBusyIcon = createCustomIcon(Ambulance, 'bg-red-500', true);
const hospitalIcon = createCustomIcon(Building2, 'bg-blue-600');

const getAccidentIcon = (status: string) => {
  const color = status === 'resolved' ? 'bg-emerald-500' : 'bg-red-600';
  return createCustomIcon(AlertTriangle, color);
};

function LocationSelector({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LiveMap() {
  const [accidents, setAccidents] = useState<any[]>([]);
  const [ambulances, setAmbulances] = useState<any[]>([]);
  const [hospitals, setHospitals] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchData();

    // Realtime subscriptions
    const accidentsSub = (supabase.channel('map-accidents') as any).on('postgres_changes', { event: '*', table: 'accidents' }, () => fetchAccidents()).subscribe();
    const ambulancesSub = (supabase.channel('map-ambulances') as any).on('postgres_changes', { event: '*', table: 'ambulances' }, () => fetchAmbulances()).subscribe();
    const hospitalsSub = (supabase.channel('map-hospitals') as any).on('postgres_changes', { event: '*', table: 'hospitals' }, () => fetchHospitals()).subscribe();
    const assignmentsSub = (supabase.channel('map-assignments') as any).on('postgres_changes', { event: '*', table: 'assignments' }, () => fetchAssignments()).subscribe();

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      accidentsSub.unsubscribe();
      ambulancesSub.unsubscribe();
      hospitalsSub.unsubscribe();
      assignmentsSub.unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const getRemainingTime = (busyUntil: string) => {
    if (!busyUntil) return null;
    const busyDate = new Date(busyUntil);
    const diff = busyDate.getTime() - currentTime.getTime();
    if (diff <= 0) return 'AVAILABLE';
    
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const fetchData = () => {
    fetchAccidents();
    fetchAmbulances();
    fetchHospitals();
    fetchAssignments();
  };

  const fetchAssignments = async () => {
    const { data } = await supabase.from('assignments').select('*').eq('status', 'confirmed');
    if (data) setAssignments(data);
  };

  const fetchAccidents = async () => {
    const { data } = await supabase.from('accidents').select('*');
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

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedCoords({ lat, lng });
    // In a real app we'd open a context menu or modal here
    // For now, let's just make it easy to report
  };

  return (
    <div className="h-[calc(100vh-14rem)] w-full glass-card overflow-hidden relative border border-white/5 shadow-2xl">
      <div className="absolute top-6 left-6 z-[1000] space-y-4">
        <div className="bg-slate-950/80 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-2xl min-w-[280px]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] mb-6 flex items-center gap-3 text-slate-400">
            <Navigation size={14} className="text-red-500" /> Operational Matrix
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between group cursor-help">
              <span className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest text-slate-300">
                <div className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-[0_0_12px_#dc2626]"></div> Emergency Nodes
              </span>
              <span className="font-mono text-xs text-white bg-white/5 px-2 py-1 rounded-md">{accidents.length}</span>
            </div>
            <div className="flex items-center justify-between group cursor-help">
              <span className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest text-slate-300">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_12px_#10b981]"></div> Active Response
              </span>
              <span className="font-mono text-xs text-white bg-white/5 px-2 py-1 rounded-md">{ambulances.filter(a => a.status === 'busy').length}</span>
            </div>
            <div className="flex items-center justify-between group cursor-help">
              <span className="flex items-center gap-3 text-[10px] uppercase font-black tracking-widest text-slate-300">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-[0_0_12px_#2563eb]"></div> Medical Centers
              </span>
              <span className="font-mono text-xs text-white bg-white/5 px-2 py-1 rounded-md">{hospitals.length}</span>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
            <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em]">System Status</p>
            <div className="flex items-center gap-3 text-[11px] font-bold text-emerald-400 italic">
               <Activity size={14} className="animate-pulse" />
               <span className="uppercase tracking-widest">Real-time Sync Active</span>
            </div>
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full bg-red-600 hover:bg-red-500 text-white p-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-xl shadow-red-900/20 active:scale-95 flex items-center justify-center gap-3 border border-red-500/30"
        >
          <Plus size={16} /> Mark New Incident
        </button>
      </div>

      <MapContainer 
        center={[33.6844, 73.0479]} // Islamabad, Pakistan
        zoom={12} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="z-0 bg-[#080a0f]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          referrerPolicy="no-referrer"
        />
        
        <ScaleControl position="bottomright" />
        <LocationSelector onMapClick={handleMapClick} />

        {/* Strategic Dispatch Routes */}
        {assignments.map(asgn => {
          const amb = ambulances.find(a => a.id === asgn.ambulance_id);
          const acc = accidents.find(a => a.id === asgn.accident_id);
          const hosp = hospitals.find(h => h.id === asgn.hospital_id);

          if (!amb || !acc) return null;

          return (
            <React.Fragment key={`route-${asgn.id}`}>
              {/* Primary Insertion Path: Ambulance to Incident */}
              <Polyline 
                positions={[[amb.current_latitude, amb.current_longitude], [acc.latitude, acc.longitude]]}
                pathOptions={{ 
                  color: '#3b82f6', 
                  weight: 5, 
                  opacity: 0.8, 
                  lineCap: 'round', 
                  dashArray: '10, 15',
                  className: 'animate-pulse'
                }}
              />
              
              {/* Evacuation Path: Incident to Medical Center */}
              {hosp && (
                <Polyline 
                  positions={[[acc.latitude, acc.longitude], [hosp.latitude, hosp.longitude]]}
                  pathOptions={{ 
                    color: '#10b981', 
                    weight: 3, 
                    opacity: 0.6, 
                    dashArray: '5, 20', 
                    lineCap: 'round',
                    className: 'animate-pulse'
                  }}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Accidents */}
        {accidents.filter(acc => acc.status !== 'resolved').map(acc => (
          <Marker 
            key={acc.id} 
            position={[acc.latitude, acc.longitude]} 
            icon={getAccidentIcon(acc.status)}
          >
            <Popup className="emergency-popup">
              <div className="p-4 bg-slate-900 text-white rounded-xl min-w-[200px]">
                <div className="flex items-center justify-between mb-3">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${
                    acc.status === 'resolved' ? 'bg-emerald-600' : 
                    acc.severity === 'Critical' ? 'bg-red-600' : 'bg-amber-500 text-black'
                  }`}>
                    {acc.status === 'resolved' ? 'Resolved' : `${acc.severity} Priority`}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">#{acc.id.slice(0, 6)}</span>
                </div>
                <p className="text-xs font-bold mb-2 uppercase tracking-tight">{acc.description}</p>
                <div className="flex items-center gap-2 text-[9px] text-slate-400">
                  <Activity size={10} /> Status: {acc.status}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Ambulances */}
        {ambulances.map(amb => {
          const countdown = amb.status === 'busy' ? getRemainingTime(amb.busy_until) : null;
          const icon = amb.status === 'available' 
            ? ambulanceAvailableIcon 
            : createCustomIcon(Ambulance, 'bg-red-500', true, countdown || 'BUSY');

          return (
            <Marker 
              key={amb.id} 
              position={[amb.current_latitude, amb.current_longitude]} 
              icon={icon}
            >
              <Popup>
                <div className="p-4 bg-slate-900 text-white rounded-xl border border-white/5 min-w-[150px]">
                  <h4 className="text-sm font-black font-mono mb-1">{amb.plate_number}</h4>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-3 italic">{amb.type} UNIT</p>
                  
                  {amb.status === 'busy' && (
                    <div className="mb-4 p-2 bg-red-600/10 border border-red-500/20 rounded-lg">
                      <p className="text-[8px] font-black text-red-500 uppercase tracking-widest mb-1">Time to Availability</p>
                      <p className="text-xl font-mono font-black text-red-500 animate-pulse">{countdown}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                     <div className={`w-2 h-2 rounded-full animate-pulse ${amb.status === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`} />
                     <span className="text-[10px] font-bold uppercase tracking-widest">{amb.status}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Hospitals */}
        {hospitals.map(hosp => (
          <Marker 
            key={hosp.id} 
            position={[hosp.latitude, hosp.longitude]} 
            icon={hospitalIcon}
          >
            <Popup>
              <div className="p-4 bg-slate-900 text-white rounded-xl min-w-[180px]">
                <h4 className="text-xs font-black uppercase tracking-tight mb-2">{hosp.name}</h4>
                <div className="space-y-1">
                   <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest">
                     <span className="text-slate-500">Beds</span>
                     <span className="text-emerald-400 font-mono">{hosp.available_beds}/{hosp.total_beds}</span>
                   </div>
                   <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${hosp.total_beds > 0 ? Math.min(100, Math.max(0, (hosp.available_beds / hosp.total_beds) * 100)) : 0}%` }} />
                   </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {isModalOpen && (
        <ReportAccidentModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}
