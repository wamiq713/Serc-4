import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Ambulance as AmbIcon, MapPin, Gauge, Search, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';

// Fix for default marker icon in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface AmbulanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  ambulance?: any;
}

function LocationMarker({ position, setPosition }: { position: [number, number], setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 15);
  }, [center, map]);
  return null;
}

export default function AmbulanceModal({ isOpen, onClose, ambulance }: AmbulanceModalProps) {
  const [plateNumber, setPlateNumber] = useState('');
  const [type, setType] = useState('ALS');
  const [status, setStatus] = useState('available');
  const [fuelLevel, setFuelLevel] = useState(100);
  const [position, setPosition] = useState<[number, number]>([33.6844, 73.0479]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [geocoding, setGeocoding] = useState(false);

  const handleGeocode = async () => {
    if (!searchQuery) return;
    setGeocoding(true);
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      if (response.data && response.data.length > 0) {
        const { lat, lon } = response.data[0];
        setPosition([parseFloat(lat), parseFloat(lon)]);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
    } finally {
      setGeocoding(false);
    }
  };

  useEffect(() => {
    if (ambulance) {
      setPlateNumber(ambulance.plate_number);
      setType(ambulance.type);
      setStatus(ambulance.status);
      setFuelLevel(ambulance.fuel_level ?? 100);
      setPosition([ambulance.current_latitude ?? 33.6844, ambulance.current_longitude ?? 73.0479]);
      setSearchQuery('');
    } else {
      setPlateNumber('');
      setType('ALS');
      setStatus('available');
      setFuelLevel(100);
      setPosition([33.6844, 73.0479]);
      setSearchQuery('');
    }
  }, [ambulance, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      plate_number: plateNumber,
      type,
      status,
      fuel_level: fuelLevel,
      current_latitude: position[0],
      current_longitude: position[1]
    };

    try {
      if (ambulance) {
        const { error } = await supabase.from('ambulances').update(payload).eq('id', ambulance.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ambulances').insert([payload]);
        if (error) throw error;
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error updating ambulance. Check RLS policies.');
    } finally {
      setLoading(false);
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
            className="w-full max-w-2xl glass-card overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-emerald-600/10">
              <div className="flex items-center gap-3 text-emerald-500">
                <AmbIcon size={24} />
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">{ambulance ? 'Fleet Mod' : 'Universal Commissioning'}</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[85vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Plate Identifier</label>
                    <input
                      type="text"
                      required
                      value={plateNumber}
                      onChange={(e) => setPlateNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                      placeholder="ICT-294"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Configuration Type</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm appearance-none"
                    >
                      <option value="ALS" className="bg-slate-900">Advanced Life Support (ALS)</option>
                      <option value="BLS" className="bg-slate-900">Basic Life Support (BLS)</option>
                      <option value="NEO" className="bg-slate-900">Neonatal Intensive Care</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Fuel Reserve (%)</label>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={fuelLevel || ''}
                        onChange={(e) => setFuelLevel(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Current Grid Position</label>
                  
                  <div className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleGeocode())}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-emerald-500 transition-all font-mono text-sm"
                        placeholder="Search sector or street..."
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGeocode}
                      disabled={geocoding}
                      className="p-3 bg-emerald-600/20 text-emerald-500 border border-emerald-500/20 rounded-xl hover:bg-emerald-600/30 transition-all disabled:opacity-50"
                    >
                      {geocoding ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    </button>
                  </div>

                  <div className="h-64 rounded-2xl overflow-hidden border border-white/10 relative">
                    <MapContainer center={position} zoom={13} className="h-full w-full">
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationMarker position={position} setPosition={setPosition} />
                      <ChangeView center={position} />
                    </MapContainer>
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-slate-500 uppercase tracking-widest px-2">
                    <span>Lat: {position[0].toFixed(4)}</span>
                    <span>Lng: {position[1].toFixed(4)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Deployment Status</label>
                <div className="grid grid-cols-3 gap-3">
                  {['available', 'busy', 'maintenance'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatus(s)}
                      className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                        status === s 
                          ? 'bg-emerald-600/20 border-emerald-600 text-emerald-500' 
                          : 'bg-white/5 border-white/10 text-slate-500'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-emerald-900/40 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <Save size={18} />
                  {loading ? 'Transmitting...' : (ambulance ? 'Update Fleet Record' : 'Initiate Unit Deployment')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
