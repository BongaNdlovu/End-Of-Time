import React from 'react';
import { User, Course } from '../types';
import { Download, ShieldCheck, Fingerprint, Award, Feather, Star } from 'lucide-react';

interface CertificateProps {
  user: User;
  courses: Course[]; // For selecting which certificate to view
}

export const Certificate: React.FC<CertificateProps> = ({ user, courses }) => {
  const orderedCourses = [...courses].sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  const completedCourse = (() => {
    if (user.studyLevelCompleted > 0) {
      return (
        orderedCourses.find((c) => c.sequence === user.studyLevelCompleted) ||
        orderedCourses.slice().reverse().find((c) => c.sequence <= user.studyLevelCompleted) ||
        orderedCourses[0]
      );
    }
    return orderedCourses[0];
  })();
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-4 md:p-12 h-full flex flex-col items-center justify-center overflow-y-auto min-h-screen">
      
      <div className="mb-8 flex gap-4 print:hidden w-full max-w-[1000px] justify-between items-center animate-fade-in">
        <div className="flex flex-col">
            <h2 className="text-2xl font-serif font-bold text-stone-900 dark:text-white">Credentials</h2>
            <p className="text-stone-500 text-sm">Official Academic Record</p>
        </div>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-stone-900 dark:bg-white text-white dark:text-stone-900 px-6 py-3 rounded-full shadow-lg hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors text-xs font-sans font-bold uppercase tracking-widest"
        >
          <Download size={16} />
          <span>Export PDF</span>
        </button>
      </div>

      <div className="w-full max-w-[1000px] relative shadow-2xl animate-slide-up transform-gpu perspective-1000 group">
         
         {/* Main Certificate Card */}
         <div className="relative bg-[#fdfbf7] dark:bg-[#1c1917] overflow-hidden border-[16px] border-double border-stone-200 dark:border-stone-800 p-1 md:p-2">
            
            {/* Inner Gold Border */}
            <div className="border-2 border-gold-500/30 dark:border-gold-500/20 h-full p-8 md:p-16 relative">
                
                {/* Background Texture/Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
                    <Feather size={400} className="text-stone-900 dark:text-white transform -rotate-12" />
                </div>
                
                {/* Corner Ornaments */}
                <div className="absolute top-4 left-4 w-16 h-16 border-t-2 border-l-2 border-gold-600/50 dark:border-gold-500/40"></div>
                <div className="absolute top-4 right-4 w-16 h-16 border-t-2 border-r-2 border-gold-600/50 dark:border-gold-500/40"></div>
                <div className="absolute bottom-4 left-4 w-16 h-16 border-b-2 border-l-2 border-gold-600/50 dark:border-gold-500/40"></div>
                <div className="absolute bottom-4 right-4 w-16 h-16 border-b-2 border-r-2 border-gold-600/50 dark:border-gold-500/40"></div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center text-center h-full">
                    
                    {/* Header */}
                    <div className="mb-12">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Star size={24} className="text-gold-600 dark:text-gold-500 fill-current" />
                            <span className="text-xs font-bold text-stone-500 uppercase tracking-[0.3em]">Summa Theologica</span>
                            <Star size={24} className="text-gold-600 dark:text-gold-500 fill-current" />
                        </div>
                        <h1 className="font-display font-bold text-4xl md:text-5xl text-stone-900 dark:text-stone-100 uppercase tracking-widest mb-2">End Of Time Academy</h1>
                        <p className="font-serif italic text-stone-600 dark:text-stone-400 text-lg">School of Systematic Theology</p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 flex flex-col justify-center w-full max-w-2xl">
                        <p className="font-sans text-xs font-bold text-stone-400 uppercase tracking-widest mb-6">This document certifies that</p>
                        
                        <h2 className="font-serif font-bold text-4xl md:text-6xl text-stone-900 dark:text-white mb-8 relative inline-block py-2">
                            {user.name}
                            {/* Decorative underline */}
                            <span className="absolute bottom-0 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-gold-500 to-transparent"></span>
                        </h2>
                        
                        <p className="font-serif text-stone-600 dark:text-stone-300 text-lg md:text-xl leading-relaxed mb-8">
                            Has satisfactorily completed all requirements and rigorous examination for the course of study entitled
                        </p>
                        
                        <h3 className="font-display font-bold text-2xl md:text-3xl text-gold-700 dark:text-gold-400 uppercase tracking-wide mb-12">
                            {completedCourse.title}
                        </h3>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="w-full flex flex-col md:flex-row justify-between items-end mt-12 pt-8 border-t border-stone-200 dark:border-stone-800/50">
                        
                        <div className="text-center md:text-left mb-8 md:mb-0">
                             <div className="h-12 flex items-end justify-center md:justify-start">
                                 <span className="font-handwriting font-serif italic text-2xl text-stone-800 dark:text-stone-200 pr-4">Alistair Vance, PhD</span>
                             </div>
                             <div className="w-48 h-px bg-stone-300 dark:bg-stone-700 mb-2"></div>
                             <p className="text-[10px] font-sans font-bold text-stone-400 uppercase tracking-widest">Academic Dean</p>
                        </div>

                        {/* Gold Seal */}
                        <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center mx-auto md:mx-0 -mt-12 md:-mt-0">
                            <div className="absolute inset-0 bg-gold-500 dark:bg-gold-600 rounded-full opacity-20 animate-pulse-slow"></div>
                            <div className="absolute inset-2 border-2 border-dashed border-gold-600 dark:border-gold-400 rounded-full"></div>
                            <Award size={48} className="text-gold-700 dark:text-gold-400" />
                        </div>

                        <div className="text-center md:text-right">
                             <div className="h-12 flex items-end justify-center md:justify-end">
                                 <span className="font-mono text-lg text-stone-800 dark:text-stone-200">{date}</span>
                             </div>
                             <div className="w-48 h-px bg-stone-300 dark:bg-stone-700 mb-2 ml-auto"></div>
                             <p className="text-[10px] font-sans font-bold text-stone-400 uppercase tracking-widest">Date Issued</p>
                        </div>

                    </div>
                    
                    <div className="mt-8 text-[10px] font-mono text-stone-300 dark:text-stone-700 uppercase tracking-widest">
                        ID: {user.id}-{completedCourse.id}-VERIFIED
                    </div>

                </div>
            </div>
         </div>
      </div>
    </div>
  );
};
