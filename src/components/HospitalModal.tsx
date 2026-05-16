import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Building2, MapPin, Search, Loader2 } from 'lucide-react';
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

interface HospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospital?: any;
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

export default function HospitalModal({ isOpen, onClose, hospital }: HospitalModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [totalBeds, setTotalBeds] = useState(50);
  const [availableBeds, setAvailableBeds] = useState(50);
  const [emergencySupport, setEmergencySupport] = useState(true);
  const [position, setPosition] = useState<[number, number]>([33.6844, 73.0479]);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  const handleGeocode = async () => {
    if (!address) return;
    setGeocoding(true);
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
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
    if (hospital) {
      setName(hospital.name);
      setAddress(hospital.address || '');
      setPhone(hospital.phone || '');
      setTotalBeds(hospital.total_beds);
      setAvailableBeds(hospital.available_beds);
      setEmergencySupport(hospital.emergency_support);
      setPosition([hospital.latitude || 33.6844, hospital.longitude || 73.0479]);
    } else {
      setName('');
      setAddress('');
      setPhone('');
      setTotalBeds(50);
      setAvailableBeds(50);
      setEmergencySupport(true);
      setPosition([33.6844, 73.0479]);
    }
  }, [hospital, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      name,
      address,
      phone,
      total_beds: totalBeds,
      available_beds: availableBeds,
      emergency_support: emergencySupport,
      latitude: position[0],
      longitude: position[1]
    };

    try {
      if (hospital) {
        const { error } = await supabase.from('hospitals').update(payload).eq('id', hospital.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('hospitals').insert([payload]);
        if (error) throw error;
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(`Operation failed: ${err.message}`);
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
            className="w-full max-w-4xl glass-card overflow-hidden h-[90vh] flex flex-col"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-blue-600/10">
              <div className="flex items-center gap-3 text-blue-500">
                <Building2 size={24} />
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">{hospital ? 'Facility Audit' : 'Infrastructure Registration'}</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Facility Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                      placeholder="PIMS Emergency Ward"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Physical Address</label>
                    <div className="flex gap-2">
                       <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                          placeholder="Street 12, Sector G-8, Islamabad"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleGeocode}
                        disabled={geocoding}
                        className="p-3 bg-blue-600/20 text-blue-500 border border-blue-500/20 rounded-xl hover:bg-blue-600/30 transition-all disabled:opacity-50"
                        title="Locate Facility"
                      >
                        {geocoding ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Support Contact</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                      placeholder="+92 51 9261170"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Total Static Beds</label>
                      <input
                        type="number"
                        required
                        value={totalBeds || ''}
                        onChange={(e) => setTotalBeds(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Available Ready</label>
                      <input
                        type="number"
                        required
                        value={availableBeds || ''}
                        onChange={(e) => setAvailableBeds(parseInt(e.target.value) || 0)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div>
                     <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Trauma Configuration</label>
                     <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setEmergencySupport(true)}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                            emergencySupport 
                              ? 'bg-blue-600/20 border-blue-600 text-blue-500' 
                              : 'bg-white/5 border-white/10 text-slate-500'
                          }`}
                        >
                          Level 1 Trauma
                        </button>
                        <button
                          type="button"
                          onClick={() => setEmergencySupport(false)}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                            !emergencySupport 
                              ? 'bg-slate-600/20 border-slate-600 text-slate-400' 
                              : 'bg-white/5 border-white/10 text-slate-500'
                          }`}
                        >
                          General Clinic
                        </button>
                     </div>
                  </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block flex items-center gap-2">
                     <MapPin size={14} className="text-blue-500" />
                     Strategic Grid Location
                   </label>
                   <div className="h-[400px] rounded-2xl overflow-hidden border border-white/10 relative">
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

              <div className="pt-6 border-t border-white/5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-blue-900/40 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <Save size={18} />
                  {loading ? 'Archiving...' : (hospital ? 'Update Facility Parameters' : 'Finalize Infrastructure Deployment')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
