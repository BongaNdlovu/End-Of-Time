import React, { useEffect, useRef, useState } from 'react';
import { BookOpen, Award, LayoutDashboard, LogOut, PlusCircle, User, Cpu, Feather, Home, Trophy } from 'lucide-react';
import { View, User as UserType } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: View;
  setView: (view: View) => void;
  user: UserType;
  onSignOut?: () => void;
}

const getRankColorClasses = (rank: string) => {
  switch (rank) {
    case 'Initiate': return { text: 'text-stone-400', bg: 'bg-stone-500', shadow: 'shadow-[0_0_15px_rgba(120,113,108,0.5)]', hex: '#78716c' };
    case 'Novice': return { text: 'text-amber-500', bg: 'bg-amber-600', shadow: 'shadow-[0_0_15px_rgba(217,119,6,0.5)]', hex: '#b45309' };
    case 'Acolyte': return { text: 'text-gold-500', bg: 'bg-gold-500', shadow: 'shadow-[0_0_15px_rgba(217,119,6,0.6)]', hex: '#d97706' };
    case 'Operative': return { text: 'text-emerald-500', bg: 'bg-emerald-500', shadow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', hex: '#10b981' };
    case 'Scholar': return { text: 'text-blue-500', bg: 'bg-blue-600', shadow: 'shadow-[0_0_15px_rgba(37,99,235,0.5)]', hex: '#2563eb' };
    case 'Theologian': return { text: 'text-indigo-500', bg: 'bg-indigo-600', shadow: 'shadow-[0_0_15px_rgba(79,70,229,0.5)]', hex: '#4f46e5' };
    case 'Apologist': return { text: 'text-rose-500', bg: 'bg-rose-600', shadow: 'shadow-[0_0_15px_rgba(225,29,72,0.5)]', hex: '#e11d48' };
    case 'Dogmatician': return { text: 'text-fuchsia-500', bg: 'bg-fuchsia-600', shadow: 'shadow-[0_0_15px_rgba(192,38,211,0.5)]', hex: '#c026d3' };
    case 'Grandmaster': return { text: 'text-white', bg: 'bg-white', shadow: 'shadow-[0_0_20px_rgba(255,255,255,0.8)]', hex: '#ffffff' };
    default: return { text: 'text-gold-500', bg: 'bg-gold-500', shadow: 'shadow-[0_0_15px_rgba(217,119,6,0.6)]', hex: '#d97706' };
  }
};

const NavItem = ({ icon: Icon, label, active, onClick, rankColor }: { icon: any, label: string, active: boolean, onClick: () => void, rankColor: string }) => (
  <button
    onClick={onClick}
    className={`group relative w-full flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-500 overflow-hidden ${
      active 
        ? 'bg-white/10 text-white shadow-[0_0_25px_rgba(255,255,255,0.08)]' 
        : 'text-stone-500 hover:text-stone-200 hover:bg-white/5'
    }`}
  >
    {active && (
      <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 ${rankColor} rounded-full z-20 transition-all duration-700`}></div>
    )}
    
    <div className="flex items-center gap-3 z-10 pl-2">
      <Icon size={18} className={`transition-all duration-300 ${active ? 'text-white scale-110' : 'group-hover:text-stone-300 text-stone-500 group-hover:scale-105'}`} />
      <span className={`font-sans text-sm font-medium tracking-wide transition-all ${active ? 'font-bold' : ''}`}>{label}</span>
    </div>

    {/* Hover Aura */}
    <div className={`absolute inset-0 transition-colors duration-500 ${active ? 'opacity-10' : 'opacity-0'} ${rankColor}`}></div>
  </button>
);

const ParticleBackground = ({ color }: { color: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles: {x: number, y: number, vx: number, vy: number, size: number, alpha: number}[] = [];
    const particleCount = 50;
    let rafId = 0;
    let isActive = true;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.1,
        vy: (Math.random() - 0.5) * 0.1,
        size: Math.random() * 1.8,
        alpha: Math.random() * 0.3
      });
    }

    const animate = () => {
      if (!isActive) return;
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color.replace(')', `, ${p.alpha})`).replace('rgb', 'rgba');
        // Fallback if hex
        if (color.startsWith('#')) {
           const r = parseInt(color.slice(1, 3), 16);
           const g = parseInt(color.slice(3, 5), 16);
           const b = parseInt(color.slice(5, 7), 16);
           ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
        }
        ctx.fill();
      });
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);
    
    return () => {
      isActive = false;
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [color]);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[2] opacity-40 transition-all duration-1000" />;
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, user, onSignOut }) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [timeState, setTimeState] = useState<'dawn' | 'day' | 'dusk' | 'night'>('day');
  const rafRef = useRef<number | null>(null);
  const pendingPosRef = useRef<{ x: number; y: number } | null>(null);
  const coarsePointerRef = useRef(false);
  
  const xpForNextLevel = Math.max(1, user.level) * 1000; 
  const xpProgress = Math.min(100, (user.xp / xpForNextLevel) * 100);
  const rankStyles = getRankColorClasses(user.rank);
  const menuHref = '/menu.html';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 9) setTimeState('dawn');
    else if (hour >= 9 && hour < 18) setTimeState('day');
    else if (hour >= 18 && hour < 21) setTimeState('dusk');
    else setTimeState('night');
  }, []);

  useEffect(() => {
    coarsePointerRef.current = window.matchMedia?.('(pointer: coarse)')?.matches ?? false;
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (coarsePointerRef.current) return;
    pendingPosRef.current = { x: e.clientX, y: e.clientY };
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingPosRef.current) setMousePos(pendingPosRef.current);
    });
  };

  const getTemporalStyles = () => {
    switch(timeState) {
      case 'dawn': return { primary: 'bg-indigo-900', secondary: 'bg-rose-950', accent: 'bg-amber-900' };
      case 'dusk': return { primary: 'bg-stone-900', secondary: 'bg-orange-950', accent: 'bg-red-950' };
      case 'night': return { primary: 'bg-black', secondary: 'bg-blue-950', accent: 'bg-purple-950' };
      default: return { primary: 'bg-gold-700', secondary: 'bg-stone-800', accent: 'bg-stone-900' };
    }
  };

  const styles = getTemporalStyles();

  // Parallax calculations
  const p1 = { x: (mousePos.x - window.innerWidth / 2) * -0.05, y: (mousePos.y - window.innerHeight / 2) * -0.05 };
  const p2 = { x: (mousePos.x - window.innerWidth / 2) * 0.03, y: (mousePos.y - window.innerHeight / 2) * 0.03 };
  const p3 = { x: (mousePos.x - window.innerWidth / 2) * -0.02, y: (mousePos.y - window.innerHeight / 2) * 0.08 };

  return (
    <div 
      className="flex h-[100dvh] w-full overflow-hidden flex-col md:flex-row relative bg-obsidian transition-colors duration-[3000ms]"
      onPointerMove={handlePointerMove}
    >
      
      {/* Background Environment */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
         {/* Base Temporal Layer */}
         <div className={`absolute inset-0 transition-colors duration-[5000ms] opacity-[0.05] ${styles.primary.replace('bg-', 'bg-opacity-5 bg-')}`}></div>

         {/* Orb 1: Primary - Parallax Responsive */}
         <div 
            className={`absolute top-[-20%] right-[-10%] w-[80vw] h-[80vw] rounded-full blur-[180px] animate-blob opacity-[0.12] mix-blend-screen transition-all duration-[4000ms] ${styles.primary}`}
            style={{ transform: `translate(${p1.x}px, ${p1.y}px)` }}
         ></div>
         
         {/* Orb 2: Secondary */}
         <div 
            className={`absolute bottom-[-10%] left-[-15%] w-[70vw] h-[70vw] rounded-full blur-[150px] animate-blob animation-delay-4000 opacity-[0.1] mix-blend-screen transition-all duration-[4000ms] ${styles.secondary}`}
            style={{ transform: `translate(${p2.x}px, ${p2.y}px)` }}
         ></div>
         
         {/* Orb 3: Accent */}
         <div 
            className={`absolute top-[25%] left-[15%] w-[50vw] h-[50vw] rounded-full blur-[130px] animate-blob animation-delay-7000 opacity-[0.08] mix-blend-screen transition-all duration-[4000ms] ${styles.accent}`}
            style={{ transform: `translate(${p3.x}px, ${p3.y}px)` }}
         ></div>

         {/* Interactive Lumen Spotlight */}
         <div 
           className="absolute inset-0 z-10 pointer-events-none"
           style={{
             background: `radial-gradient(circle 800px at ${mousePos.x}px ${mousePos.y}px, rgba(217, 119, 6, 0.06), transparent 70%)`,
           }}
         ></div>
      </div>

      <ParticleBackground color={rankStyles.hex} />

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-72 bg-obsidian/40 backdrop-blur-3xl flex-shrink-0 flex-col border-r border-white/5 relative z-20 transition-all duration-300 group/sidebar">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-8 transition-all duration-500 group-hover/sidebar:translate-x-1">
            <div className="w-10 h-10 rounded-sm bg-white flex items-center justify-center text-obsidian shadow-[0_0_20px_rgba(255,255,255,0.25)]">
              <Feather size={20} className="stroke-2" />
            </div>
            <div>
              <span className="font-display font-bold text-xl text-white tracking-wide block">END OF TIME</span>
              <span className="text-[10px] font-sans font-medium text-gold-500 tracking-widest uppercase block animate-pulse">Academy</span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-white/5 border border-white/5 shadow-inner backdrop-blur-md transition-all duration-500 hover:bg-white/[0.08] hover:border-white/10 group/usercard">
             <div className="flex justify-between items-center mb-3">
                 <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-stone-800 flex items-center justify-center border border-white/5 overflow-hidden transition-transform duration-500 group-hover/usercard:scale-105">
                        <User size={16} className={`transition-colors duration-700 ${rankStyles.text}`} />
                    </div>
                    <div>
                        <div className={`text-xs font-bold uppercase tracking-wide transition-colors duration-700 ${rankStyles.text}`}>{user.rank}</div>
                        <div className="text-[10px] text-stone-400">Level {user.level}</div>
                    </div>
                 </div>
             </div>
             <div className="w-full bg-black/40 h-1 rounded-full overflow-hidden">
                 <div 
                    className={`${rankStyles.bg} ${rankStyles.shadow} h-full transition-all duration-1000 ease-out`} 
                    style={{ width: `${xpProgress}%` }}
                 ></div>
             </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="px-4 py-2 text-[10px] font-bold text-stone-500 uppercase tracking-widest font-sans opacity-40">Library</div>
          <NavItem icon={LayoutDashboard} label="Study Desk" active={currentView === 'dashboard'} onClick={() => setView('dashboard')} rankColor={rankStyles.bg} />
          <NavItem icon={BookOpen} label="Curriculum" active={currentView === 'course'} onClick={() => setView('course')} rankColor={rankStyles.bg} />
          <NavItem icon={Award} label="Credentials" active={currentView === 'certificate'} onClick={() => setView('certificate')} rankColor={rankStyles.bg} />
          <NavItem icon={Trophy} label="Leaderboard" active={currentView === 'leaderboard'} onClick={() => setView('leaderboard')} rankColor={rankStyles.bg} />
          
          <div className="px-4 py-2 mt-8 text-[10px] font-bold text-stone-500 uppercase tracking-widest font-sans flex justify-between items-center opacity-40">
            <span>System</span>
            <Cpu size={10} />
          </div>
          <NavItem icon={PlusCircle} label="Contribution" active={currentView === 'admin'} onClick={() => setView('admin')} rankColor={rankStyles.bg} />
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/20 backdrop-blur-sm">
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-stone-400 hover:text-white transition-all duration-500 text-xs font-bold uppercase tracking-wide"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          )}
          <button 
            onClick={() => window.location.href = menuHref}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-white/5 hover:bg-red-950/40 border border-white/5 text-stone-400 hover:text-red-400 transition-all duration-500 text-xs font-bold uppercase tracking-wide group/signout"
          >
            <LogOut size={14} className="group-hover/signout:-translate-x-1 transition-transform" />
            <span>Back to Menu</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto relative z-10 scroll-smooth bg-transparent custom-scrollbar">
        <div className="min-h-full pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </div>
      </main>

      {/* Mobile Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-obsidian/95 backdrop-blur-2xl border-t border-white/5 flex justify-around items-center px-2 py-4 z-50">
        <button onClick={() => window.location.href = menuHref} className="text-stone-500 transition-all duration-300 p-2"><Home size={22} /></button>
        <button onClick={() => setView('dashboard')} className={`${currentView === 'dashboard' ? rankStyles.text + ' scale-110' : 'text-stone-500'} transition-all duration-300 p-2`}><LayoutDashboard size={22} /></button>
        <button onClick={() => setView('course')} className={`${currentView === 'course' ? rankStyles.text + ' scale-110' : 'text-stone-500'} transition-all duration-300 p-2`}><BookOpen size={22} /></button>
        <button onClick={() => setView('certificate')} className={`${currentView === 'certificate' ? rankStyles.text + ' scale-110' : 'text-stone-500'} transition-all duration-300 p-2`}><Award size={22} /></button>
        <button onClick={() => setView('leaderboard')} className={`${currentView === 'leaderboard' ? rankStyles.text + ' scale-110' : 'text-stone-500'} transition-all duration-300 p-2`}><Trophy size={22} /></button>
        <button onClick={() => setView('admin')} className={`${currentView === 'admin' ? rankStyles.text + ' scale-110' : 'text-stone-500'} transition-all duration-300 p-2`}><PlusCircle size={22} /></button>
      </nav>
    </div>
  );
};
