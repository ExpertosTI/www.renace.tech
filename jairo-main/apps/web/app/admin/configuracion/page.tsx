"use client";

import { useState } from "react";
import { Settings, Save, Bell, Shield, Palette, Globe } from "lucide-react";

export default function ConfiguracionPage() {
    const [configuracion, setConfiguracion] = useState({
        nombrePlataforma: "JairoApp",
        emailSoporte: "soporte@jairoapp.renace.tech",
        notificacionesEmail: true,
        notificacionesPush: false,
        modoOscuro: false,
        idioma: "es",
        moneda: "DOP",
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-gray-900">Configuración</h1>
                <p className="text-gray-500 mt-1">Ajusta las preferencias de la plataforma</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* General Settings */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Settings className="text-primary" size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Información General</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Nombre de la Plataforma
                                </label>
                                <input
                                    type="text"
                                    value={configuracion.nombrePlataforma}
                                    onChange={(e) => setConfiguracion({ ...configuracion, nombrePlataforma: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email de Soporte
                                </label>
                                <input
                                    type="email"
                                    value={configuracion.emailSoporte}
                                    onChange={(e) => setConfiguracion({ ...configuracion, emailSoporte: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Bell className="text-blue-600" size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Notificaciones</h2>
                        </div>
                        <div className="space-y-4">
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-gray-700">Notificaciones por Email</span>
                                <div className={`w-12 h-6 rounded-full transition-colors ${configuracion.notificacionesEmail ? 'bg-primary' : 'bg-gray-200'
                                    }`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${configuracion.notificacionesEmail ? 'translate-x-6' : 'translate-x-0.5'
                                        } mt-0.5`} />
                                </div>
                            </label>
                            <label className="flex items-center justify-between cursor-pointer">
                                <span className="text-gray-700">Notificaciones Push</span>
                                <div className={`w-12 h-6 rounded-full transition-colors ${configuracion.notificacionesPush ? 'bg-primary' : 'bg-gray-200'
                                    }`}>
                                    <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${configuracion.notificacionesPush ? 'translate-x-6' : 'translate-x-0.5'
                                        } mt-0.5`} />
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Regional */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Globe className="text-green-600" size={20} />
                            </div>
                            <h2 className="text-lg font-bold text-gray-900">Configuración Regional</h2>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                                <select
                                    value={configuracion.idioma}
                                    onChange={(e) => setConfiguracion({ ...configuracion, idioma: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="es">Español</option>
                                    <option value="en">English</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                                <select
                                    value={configuracion.moneda}
                                    onChange={(e) => setConfiguracion({ ...configuracion, moneda: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                                >
                                    <option value="DOP">Peso Dominicano (DOP)</option>
                                    <option value="USD">Dólar (USD)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Quick Actions */}
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4">Acciones Rápidas</h3>
                        <div className="space-y-3">
                            <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
                                <Shield className="text-gray-500" size={20} />
                                <span className="text-sm text-gray-700">Gestionar Permisos</span>
                            </button>
                            <button className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left">
                                <Palette className="text-gray-500" size={20} />
                                <span className="text-sm text-gray-700">Personalizar Tema</span>
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <button className="w-full flex items-center justify-center gap-2 bg-primary text-white px-4 py-3 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                        <Save size={20} />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}
