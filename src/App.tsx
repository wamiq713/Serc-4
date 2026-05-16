import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Map as MapIcon, Activity, Ambulance, Building2, Bell, Settings, LogOut, Menu, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { startSimulationEngine } from './services/simulationService';
import Dashboard from './pages/Dashboard';
import LiveMap from './pages/LiveMap';
import Ambulances from './pages/Ambulances';
import Hospitals from './pages/Hospitals';
import Analytics from './pages/Analytics';
import Auth from './pages/Auth';

function Navbar({ userRole, profile }: { userRole?: string, profile?: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Live Map', path: '/map', icon: MapIcon },
    { name: 'Ambulances', path: '/ambulances', icon: Ambulance },
    { name: 'Hospitals', path: '/hospitals', icon: Building2 },
    { name: 'Analytics', path: '/analytics', icon: Activity },
  ];

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`fixed inset-y-0 left-0 z-40 w-64 glass-sidebar transform transition-transform lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6">
            <div className="flex items-center gap-3 text-red-600 font-bold text-xl mb-10">
              <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40">
                <Activity size={24} className="text-white" />
              </div>
              <span className="tracking-tighter">SERS CORE</span>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    location.pathname === item.path 
                      ? 'bg-white/10 text-white shadow-xl border border-white/10' 
                      : 'text-slate-500 hover:text-slate-200 hover:bg-white/5'
                  }`}
                >
                  <item.icon size={20} className={location.pathname === item.path ? 'text-red-500' : ''} />
                  <span className="font-semibold text-sm uppercase tracking-wider">{item.name}</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-auto p-6 border-t border-white/5 space-y-2">
            <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:text-red-400 transition-all hover:bg-white/5"
            >
              <LogOut size={20} />
              <span className="font-semibold text-sm uppercase tracking-wider">Logout</span>
            </button>
            <div className="w-full h-14 bg-white/5 rounded-xl flex items-center gap-3 px-4 border border-white/5 mt-4 group">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xs font-black text-white uppercase shadow-lg transition-all ${
                profile?.role === 'admin' ? 'bg-blue-600/20 border-blue-600 shadow-blue-900/20' : 'bg-red-600/20 border-red-600 shadow-red-900/20'
              }`}>
                {profile?.username?.[0] || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-white truncate uppercase tracking-widest">{profile?.username || 'Operator'}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${profile?.role === 'admin' ? 'bg-blue-500' : 'bg-red-500'}`} />
                  <p className={`text-[8px] font-black uppercase tracking-widest ${profile?.role === 'admin' ? 'text-blue-500' : 'text-red-500'}`}>{profile?.role || 'Dispatcher'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="lg:ml-64 min-h-screen bg-transparent text-slate-200 relative z-10"
    >
      <div className="max-w-7xl mx-auto p-4 lg:p-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Control Hub</h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">SERS Tactical Infrastructure <span className="text-red-500 italic ml-2">Secure Link Active</span></p>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex bg-red-600/10 border border-red-600/20 px-6 py-3 rounded-2xl items-center gap-4">
              <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse shadow-[0_0_15px_#ef4444]"></div>
              <span className="text-red-500 text-[9px] font-black uppercase tracking-widest italic">Node 01: Core Monitoring Active</span>
            </div>
          </div>
        </header>
        {children}
      </div>
    </motion.main>
  );
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Session fetching logic
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    }).catch(err => {
      console.error("Auth session error:", err);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Fallback timer: skip loading screen if it takes too long (likely connection error)
    const timer = setTimeout(() => {
      setLoading(p => {
        if (p) console.warn("Loading timed out. Proceeding regardless of session state.");
        return false;
      });
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (session) {
      const stopSimulation = startSimulationEngine();
      return () => stopSimulation();
    }
  }, [session]);

  const fetchProfile = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error) setProfile(data);
    } catch (err) {
      console.error("Profile fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-10">
        <div className="flex flex-col items-center gap-8 max-w-sm text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-red-600/20 blur-[40px] rounded-full animate-pulse"></div>
            <Activity size={80} className="text-red-600 relative z-10 animate-bounce" />
          </div>
          <div className="space-y-4">
            <p className="text-[12px] font-black text-white uppercase tracking-[0.6em] italic animate-pulse">Establishing Tactical Link...</p>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
              Contacting SERS Core Infrastructure. If this persists, verify your <span className="text-red-500">VITE_SUPABASE_*</span> Environment Variables on Vercel.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <div className="bg-[#080a0f] min-h-screen font-sans relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-red-900/10 blur-[150px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full"></div>
        </div>
        
        <Navbar userRole={profile?.role} profile={profile} />
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<PageWrapper><Dashboard role={profile?.role} profile={profile} /></PageWrapper>} />
            <Route path="/map" element={<PageWrapper><LiveMap /></PageWrapper>} />
            <Route path="/ambulances" element={<PageWrapper><Ambulances role={profile?.role} /></PageWrapper>} />
            <Route path="/hospitals" element={<PageWrapper><Hospitals role={profile?.role} /></PageWrapper>} />
            <Route path="/analytics" element={<PageWrapper><Analytics /></PageWrapper>} />
            <Route path="*" element={<PageWrapper><Dashboard role={profile?.role} profile={profile} /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </div>
    </BrowserRouter>
  );
}
