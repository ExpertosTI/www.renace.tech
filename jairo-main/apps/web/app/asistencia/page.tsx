'use client';

import React from 'react';
import Link from 'next/link';
import Head from 'next/head';

export default function AttendanceLandingPage() {
  return (
    <div className="min-h-screen bg-[#0F1419] text-white font-sans selection:bg-[#F7931E] selection:text-black">
      <Head>
        <title>Networking & Alianzas | Círculo Empresarial JairoApp</title>
      </Head>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center p-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#1B7F3C] opacity-[0.05] blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-[#F7931E] opacity-[0.05] blur-[120px] rounded-full"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-20"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-4xl text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-white/[0.1] text-[#F7931E] text-xs font-semibold tracking-widest uppercase">
            <span className="w-2 h-2 rounded-full bg-[#F7931E] animate-pulse"></span>
            Próximo Evento Exclusivo
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extralight tracking-tight leading-tight">
            Círculo Empresarial <br />
            <span className="font-semibold bg-gradient-to-r from-[#1B7F3C] via-[#F7931E] to-[#1B7F3C] bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
              Networking & Alianzas
            </span>
          </h1>

          <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Un espacio donde la visión se encuentra con la oportunidad. Únete a los líderes que están transformando el ecosistema empresarial dominicano en JairoApp.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-8">
            <Link 
              href="/asistencia/confirm"
              className="group relative px-8 py-4 bg-[#F7931E] text-black font-bold rounded-2xl shadow-[0_10px_40px_rgba(247,147,30,0.3)] hover:shadow-[0_15px_60px_rgba(247,147,30,0.5)] hover:scale-[1.05] transition-all duration-300 overflow-hidden"
            >
              <span className="relative z-10">CONFIRMAR MI ASISTENCIA</span>
              <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-20 transition-opacity"></div>
            </Link>
            
            <button className="px-8 py-4 bg-white/[0.05] border border-white/[0.1] text-white font-semibold rounded-2xl hover:bg-white/[0.1] transition-all">
              VER AGENDA DEL EVENTO
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-30">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features/Info Section */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Perfil Digital VIP",
              desc: "Accede a la red del evento y conecta directamente con otros conferencistas y asistentes.",
              icon: "💎"
            },
            {
              title: "Oportunidades IA",
              desc: "Nuestro motor de matching sugiere alianzas estratégicas basadas en tu sector y necesidades.",
              icon: "⚡"
            },
            {
              title: "Acceso Prioritario",
              desc: "Los miembros de JairoApp tienen check-in express y espacios reservados para coworking.",
              icon: "🛡️"
            }
          ].map((item, i) => (
            <div key={i} className="p-8 rounded-3xl bg-white/[0.03] border border-white/[0.08] hover:border-[#1B7F3C]/50 transition-all duration-500 group">
              <div className="text-4xl mb-6">{item.icon}</div>
              <h3 className="text-xl font-semibold mb-4 text-[#F7931E]">{item.title}</h3>
              <p className="text-gray-400 leading-relaxed font-light">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Logos/Trust Section */}
      <section className="py-24 border-t border-white/[0.05]">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.4em] text-gray-500 font-semibold">Impulsado por el ecosistema</p>
        </div>
        <div className="flex flex-wrap justify-center gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700">
           {/* Placeholder for logos */}
           <div className="text-2xl font-bold tracking-tighter italic text-white/50">RE-NACE</div>
           <div className="text-2xl font-bold tracking-tighter italic text-white/50">ExpertosTI</div>
           <div className="text-2xl font-bold tracking-tighter italic text-white/50">CírculoRD</div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 text-center">
        <div className="max-w-2xl mx-auto p-12 rounded-[3rem] bg-gradient-to-br from-[#1B7F3C]/20 to-transparent border border-[#1B7F3C]/20 relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-light mb-6">¿Deseas participar como empresa patrocinadora?</h2>
            <button className="text-[#F7931E] font-bold hover:underline">CONTÁCTANOS AQUÍ</button>
          </div>
          <div className="absolute top-[-50%] left-[-50%] w-full h-full bg-[#1B7F3C] opacity-[0.05] blur-[100px] rounded-full"></div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/[0.05] text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border border-[#F7931E] rounded-full flex items-center justify-center">
            <span className="text-[#F7931E] font-bold tracking-tighter">J</span>
          </div>
          <p className="text-gray-600 text-[10px] tracking-[0.3em] uppercase">
            JairoApp &copy; 2026 | El Futuro de los Negocios
          </p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient { background-size: 200% auto; animation: gradient 3s ease infinite; }
        .animate-in { animation-fill-mode: both; }
        .fade-in { animation-name: fadeIn; }
        .slide-in-from-bottom-8 { animation-name: slideUp; }
      `}</style>
    </div>
  );
}
