"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Send, CheckCircle, Building2 } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function ContactoPage() {
    const [form, setForm] = useState({ nombre: "", email: "", empresa: "", mensaje: "", tipo: "general" });
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulación de envío (en producción conectar con EmailService)
        await new Promise(r => setTimeout(r, 1500));
        setSent(true);
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <div className="pt-24 pb-20">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="text-center mb-16">
                        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                            ¿Cómo podemos <span className="text-primary">ayudarte</span>?
                        </h1>
                        <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                            Estamos aquí para responder tus preguntas sobre planes, integraciones o cualquier consulta empresarial.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-12">
                        {/* Formulario */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl">
                            {sent ? (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle className="text-green-600" size={40} />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Mensaje Enviado!</h2>
                                    <p className="text-gray-500">Te responderemos en menos de 24 horas.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                                            <input
                                                type="text"
                                                value={form.nombre}
                                                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Empresa</label>
                                        <input
                                            type="text"
                                            value={form.empresa}
                                            onChange={(e) => setForm({ ...form, empresa: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Consulta</label>
                                        <select
                                            value={form.tipo}
                                            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                                        >
                                            <option value="general">Consulta General</option>
                                            <option value="ventas">Información de Planes</option>
                                            <option value="soporte">Soporte Técnico</option>
                                            <option value="integracion">Integración API</option>
                                            <option value="enterprise">Plan Enterprise</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Mensaje</label>
                                        <textarea
                                            rows={4}
                                            value={form.mensaje}
                                            onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                                            required
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-primary to-orange-500 text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {loading ? "Enviando..." : <>Enviar Mensaje <Send size={18} /></>}
                                    </button>
                                </form>
                            )}
                        </div>

                        {/* Información de Contacto */}
                        <div className="space-y-8">
                            <div className="bg-gradient-to-br from-primary to-primary-700 rounded-3xl p-8 text-white">
                                <h3 className="text-2xl font-bold mb-6">Información de Contacto</h3>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Mail size={24} />
                                        </div>
                                        <div>
                                            <p className="text-white/70 text-sm">Email</p>
                                            <p className="font-semibold">info@renace.space</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                            <Phone size={24} />
                                        </div>
                                        <div>
                                            <p className="text-white/70 text-sm">Teléfono</p>
                                            <p className="font-semibold">+1 (829) 988-3002</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                                            <MapPin size={24} />
                                        </div>
                                        <div>
                                            <p className="text-white/70 text-sm">Ubicación</p>
                                            <p className="font-semibold">Santo Domingo, República Dominicana</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 rounded-3xl p-8">
                                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Building2 className="text-primary" /> ¿Eres una empresa grande?
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    Nuestro equipo de ventas puede diseñar una solución personalizada para tu organización.
                                </p>
                                <p className="text-primary font-semibold">ventas@renace.space</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
