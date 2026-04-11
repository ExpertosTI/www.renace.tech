'use client';

import React, { useState } from 'react';
import Head from 'next/head';

export default function EventConfirmationPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    whatsapp: '',
    company: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call to register attendance
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-4 font-sans selection:bg-[#d4af37] selection:text-black">
      <Head>
        <title>Círculo Empresarial - Confirmación Digital | JairoApp</title>
      </Head>

      {/* Background Decorative Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#d4af37] opacity-[0.03] blur-[100px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#d4af37] opacity-[0.03] blur-[100px] rounded-full"></div>
      </div>

      <main className="relative z-10 w-full max-w-lg">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="w-16 h-16 border-2 border-[#d4af37] rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(212,175,55,0.2)]">
            <span className="text-[#d4af37] text-3xl font-bold italic">A</span>
          </div>
          <h2 className="text-[#d4af37] tracking-[0.3em] uppercase text-sm font-semibold mb-2">Círculo Empresarial</h2>
          <h1 className="text-3xl font-light text-center">Networking & Alianzas</h1>
        </div>

        {/* glassmorphic card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
          {/* subtle gold accent line at top */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent"></div>

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="text-center mb-8">
                <p className="text-gray-400 text-sm leading-relaxed">
                  Confirma tu asistencia digital para habilitar tu perfil en <span className="text-white font-medium">JairoApp</span> y acceder a la red de oportunidades exclusivas del evento.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Nombre Completo</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Ej. Ángel David Flores"
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-[#d4af37]/50 focus:bg-white/[0.08] transition-all"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Correo Electrónico</label>
                  <input 
                    required
                    type="email" 
                    placeholder="correo@empresa.com"
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-[#d4af37]/50 focus:bg-white/[0.08] transition-all"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">WhatsApp</label>
                  <input 
                    required
                    type="tel" 
                    placeholder="+1 (829) 000-0000"
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-[#d4af37]/50 focus:bg-white/[0.08] transition-all"
                    value={formData.whatsapp}
                    onChange={(e) => setFormData({...formData, whatsapp: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest text-gray-500 mb-2 ml-1">Empresa</label>
                  <input 
                    required
                    type="text" 
                    placeholder="Nombre de tu organización"
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 placeholder:text-gray-600 focus:outline-none focus:border-[#d4af37]/50 focus:bg-white/[0.08] transition-all"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#d4af37] to-[#b8860b] text-black font-bold py-4 rounded-xl shadow-[0_10px_30px_rgba(212,175,55,0.2)] hover:shadow-[0_15px_40px_rgba(212,175,55,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
                ) : (
                  <>CONFIRMAR REGISTRO</>
                )}
              </button>
            </form>
          ) : (
            <div className="text-center py-12 animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-[#d4af37]/20 border border-[#d4af37] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-[#d4af37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold mb-2">¡Confirmación Exitosa!</h3>
              <p className="text-gray-400 mb-8">
                Bienvenido al Círculo Empresarial. Tus datos han sido validados en JairoApp.
              </p>
              <div className="p-4 bg-white/[0.05] rounded-2xl text-left border border-white/[0.1]">
                <p className="text-[10px] uppercase tracking-widest text-[#d4af37] mb-1">Próximos Pasos</p>
                <p className="text-sm text-gray-300">Te enviaremos un código de acceso VIP por WhatsApp el día del evento.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-gray-600 text-[10px] tracking-[0.2em] uppercase">
          Powered by JairoApp &copy; 2026
        </div>
      </main>

      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-from-bottom-4 { from { transform: translateY(1rem); } to { transform: translateY(0); } }
        @keyframes zoom-in-95 { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation-fill-mode: both; }
        .fade-in { animation-name: fade-in; }
        .slide-in-from-bottom-4 { animation-name: slide-in-from-bottom-4; }
        .zoom-in-95 { animation-name: zoom-in-95; }
      `}</style>
    </div>
  );
}
