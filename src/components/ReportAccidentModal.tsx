import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MapPin, AlertCircle, Search, Loader2 } from 'lucide-react';
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

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function ReportAccidentModal({ isOpen, onClose }: ReportModalProps) {
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [patientCount, setPatientCount] = useState(1);
  const [emergencyLevel, setEmergencyLevel] = useState(1);
  const [address, setAddress] = useState('');
  const [position, setPosition] = useState<[number, number]>([33.6844, 73.0479]);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAIAnalyze = async () => {
    if (!description) {
      alert("Please provide a description first for AI analysis.");
      return;
    }
    setAnalyzing(true);
    try {
      // Calling our secure server-side API proxy
      const response = await axios.post('/api/ai/analyze-accident', { description });
      if (response.data.analysis) {
        const analysis = response.data.analysis;
        alert(`AI Analysis: ${analysis}`);
        
        // Simple heuristic to set severity based on AI text if possible
        if (analysis.toLowerCase().includes('high') || analysis.toLowerCase().includes('critical')) setSeverity('Critical');
        else if (analysis.toLowerCase().includes('medium')) setSeverity('High');
        else if (analysis.toLowerCase().includes('low')) setSeverity('Low');
      }
    } catch (err: any) {
      console.error('AI Analysis error:', err);
      alert("AI Analysis failed. Make sure GEMINI_API_KEY is configured in your Environment Variables.");
    } finally {
      setAnalyzing(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from('accidents').insert([{
        description,
        severity,
        patient_count: patientCount,
        emergency_level: emergencyLevel,
        address,
        latitude: position[0],
        longitude: position[1],
        reported_by: user?.id,
        status: 'reported'
      }]);

      if (error) {
        alert(`Error reporting incident: ${error.message}. This might be a database permission issue.`);
        throw error;
      }
      onClose();
    } catch (err: any) {
      console.error(err);
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
            className="w-full max-w-xl glass-card overflow-hidden"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-red-600/10">
              <div className="flex items-center gap-3 text-red-500">
                <AlertCircle size={24} className="animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">Incident Telemetry Input</h3>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 block">Event Description</label>
                      <button 
                        type="button" 
                        onClick={handleAIAnalyze}
                        disabled={analyzing}
                        className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-blue-400 transition-colors flex items-center gap-2 group"
                      >
                        {analyzing ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:animate-ping" />
                        )}
                        AI Assist
                      </button>
                    </div>
                    <textarea
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-red-500 transition-all font-mono text-sm h-24 resize-none"
                      placeholder="Multiple vehicle collision at sector G-11..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Incident Address / Sector</label>
                    <div className="flex gap-2">
                       <div className="relative flex-1">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500 transition-all font-mono text-sm"
                          placeholder="Street 12, G-11/3, Islamabad"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleGeocode}
                        disabled={geocoding}
                        className="p-3 bg-red-600/20 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-600/30 transition-all disabled:opacity-50"
                        title="Locate Address"
                      >
                        {geocoding ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="h-48 rounded-xl overflow-hidden border border-white/10 relative">
                    <MapContainer center={position} zoom={13} className="h-full w-full">
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      />
                      <LocationMarker position={position} setPosition={setPosition} />
                      <ChangeView center={position} />
                    </MapContainer>
                    <div className="absolute bottom-2 left-2 z-[1000] bg-slate-900/80 backdrop-blur-md px-2 py-1 rounded text-[8px] font-mono text-white pointer-events-none">
                      LAT: {position[0].toFixed(4)} LNG: {position[1].toFixed(4)}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Severity Protocol</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['Low', 'Medium', 'High', 'Critical'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSeverity(s)}
                          className={`py-2 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all ${
                            severity === s 
                              ? 'bg-red-600/20 border-red-600 text-red-500' 
                              : 'bg-white/5 border-white/10 text-slate-500'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Casualties</label>
                      <input
                        type="number"
                        min="1"
                        value={patientCount}
                        onChange={(e) => setPatientCount(parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-red-500 transition-all font-mono text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">E-Level (1-5)</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={emergencyLevel}
                        onChange={(e) => setEmergencyLevel(parseInt(e.target.value))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-red-500 transition-all font-mono text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/5">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-red-900/40 disabled:opacity-50 flex items-center justify-center gap-3"
                >
                  <Send size={18} />
                  {loading ? 'Transmitting Data...' : 'Broadcast Emergency Signal'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
