import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { Activity, Mail, Lock, User, Shield, Zap } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'admin' | 'dispatcher'>('dispatcher');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, role }
          }
        });
        if (error) throw error;
        
        if (data.user) {
          // Create profile
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([{ id: data.user.id, username, role }]);
          if (profileError) throw profileError;
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#080a0f] relative overflow-hidden">
      {/* Ornaments */}
      <div className="bg-ornament-red"></div>
      <div className="bg-ornament-blue"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-card p-8 relative z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-900/40 mb-4">
            <Activity size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter">SERS CORE</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 italic">Urban Emergency Network</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Callsign (Username)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500 transition-all font-mono text-sm"
                    placeholder="W. ABDULLAH"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Assigned Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('dispatcher')}
                    className={`py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      role === 'dispatcher' 
                        ? 'bg-red-600/20 border-red-600 text-red-500' 
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    <Zap size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Dispatcher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                      role === 'admin' 
                        ? 'bg-blue-600/20 border-blue-600 text-blue-500' 
                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                    }`}
                  >
                    <Shield size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Admin</span>
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">System Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500 transition-all font-mono text-sm"
                placeholder="ops@sers-core.gov"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Security Credential</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-red-500 transition-all font-mono text-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-[10px] font-bold uppercase tracking-widest text-center animate-shake">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-red-900/20 disabled:opacity-50 active:scale-[0.98] mt-4"
          >
            {loading ? 'Processing...' : isLogin ? 'Authenticate Access' : 'Register Operator'}
          </button>

          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-[10px] font-bold text-slate-500 transition-colors uppercase tracking-widest mt-4"
          >
            {isLogin ? "Request New Operator Credentials" : "Return to Log-In Terminal"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
