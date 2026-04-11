"use client";

import { useState, useEffect } from "react";
import { Building2, ArrowRight, Check, Loader2 } from "lucide-react";
import Link from "next/link";

interface Sector {
    id: string;
    name: string;
    icon: string;
    color: string;
}

interface TipoEmpresa {
    id: string;
    name: string;
    description: string;
}

export default function RegistroEmpresa() {
    const [paso, setPaso] = useState(1);
    const [cargando, setCargando] = useState(false);
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [tipos, setTipos] = useState<TipoEmpresa[]>([]);
    const [formulario, setFormulario] = useState({
        nombre: "",
        rnc: "",
        email: "",
        telefono: "",
        direccion: "",
        website: "",
        sectorId: "",
        tipoId: "",
        descripcion: "",
        nombreContacto: "",
        password: "",
        confirmPassword: "",
    });
    const [exito, setExito] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        cargarSectores();
        cargarTipos();
    }, []);

    const cargarSectores = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';
            const res = await fetch(`${apiUrl}/sectores`);
            const data = await res.json();
            setSectores(data.sectores || []);
        } catch (error) {
            console.error("Error cargando sectores:", error);
        }
    };

    const cargarTipos = async () => {
        try {
            setTipos([
                { id: "1", name: "Proveedor", description: "Suministra productos o servicios" },
                { id: "2", name: "Distribuidor", description: "Distribuye productos al mercado" },
                { id: "3", name: "Fabricante", description: "Produce o manufactura bienes" },
                { id: "4", name: "Mayorista", description: "Vende al por mayor" },
                { id: "5", name: "Minorista", description: "Vende al consumidor final" },
                { id: "6", name: "Importador", description: "Importa productos del exterior" },
                { id: "7", name: "Exportador", description: "Exporta productos internacionalmente" },
                { id: "8", name: "Consultor", description: "Servicios de consultoría" },
            ]);
        } catch (error) {
            console.error("Error cargando tipos:", error);
        }
    };

    const handleSubmit = async () => {
        if (formulario.password !== formulario.confirmPassword) {
            setError("Las contraseñas no coinciden");
            return;
        }
        if (formulario.password.length < 6) {
            setError("La contraseña debe tener al menos 6 caracteres");
            return;
        }

        setCargando(true);
        setError("");
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';
            const res = await fetch(`${apiUrl}/empresas`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formulario),
            });

            if (res.ok) {
                setExito(true);
            } else {
                const data = await res.json();
                setError(data.message || "Error al registrar empresa");
            }
        } catch (error) {
            console.error("Error registrando empresa:", error);
            setError("Error de conexión. Intenta de nuevo.");
        } finally {
            setCargando(false);
        }
    };

    if (exito) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary via-primary-600 to-primary-700 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 shadow-2xl text-center max-w-md">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                        <Check className="text-white" size={40} />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">¡Registro Exitoso!</h1>
                    <p className="text-gray-500 mb-6">
                        Tu empresa ha sido registrada. Nuestro equipo revisará tu solicitud y te contactaremos pronto.
                    </p>
                    <Link
                        href="/"
                        className="inline-block bg-gradient-to-r from-primary to-primary-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                        Volver al Inicio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary to-primary-700 text-white">
                <div className="max-w-4xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-8">
                        <Link href="/" className="flex items-center gap-2">
                            <img src="/logo.svg" alt="JairoApp" className="w-12 h-12 object-contain bg-white rounded-xl p-1" />
                            <span className="text-2xl font-black">JairoApp</span>
                        </Link>

                        {/* Steps */}
                        <div className="hidden md:flex items-center gap-2">
                            {[1, 2, 3].map((n) => (
                                <div key={n} className="flex items-center">
                                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${paso >= n ? 'bg-secondary text-white' : 'bg-white/20 text-white/60'
                                        }`}>
                                        {paso > n ? '✓' : n}
                                    </span>
                                    {n < 3 && <div className={`w-12 h-0.5 mx-1 ${paso > n ? 'bg-secondary' : 'bg-white/20'}`} />}
                                </div>
                            ))}
                        </div>
                    </div>

                    <h1 className="text-3xl font-black">Registra tu Empresa</h1>
                    <p className="text-white/70 mt-2">Únete a la red empresarial global</p>
                </div>
            </div>

            <div className="max-w-2xl mx-auto px-4 py-8 -mt-4">
                {/* Paso 1 */}
                {paso === 1 && (
                    <div className="bg-white rounded-3xl p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-gradient-to-br from-primary to-primary-600 rounded-xl">
                                <Building2 className="text-white" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Información Básica</h2>
                                <p className="text-gray-500 text-sm">Datos de tu empresa</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Empresa *</label>
                                <input
                                    type="text"
                                    value={formulario.nombre}
                                    onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                                    placeholder="Ej: Distribuidora del Caribe"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ID Fiscal / RNC (opcional)</label>
                                <input
                                    type="text"
                                    value={formulario.rnc}
                                    onChange={(e) => setFormulario({ ...formulario, rnc: e.target.value })}
                                    placeholder="ID tributario de su país"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        value={formulario.email}
                                        onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                                        placeholder="contacto@empresa.com"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                                    <input
                                        type="tel"
                                        value={formulario.telefono}
                                        onChange={(e) => setFormulario({ ...formulario, telefono: e.target.value })}
                                        placeholder="+1 (XXX) XXX-XXXX"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <input
                                    type="text"
                                    value={formulario.direccion}
                                    onChange={(e) => setFormulario({ ...formulario, direccion: e.target.value })}
                                    placeholder="Calle, Sector, Ciudad"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div className="pt-4 border-t">
                                <h3 className="font-semibold text-gray-900 mb-3">👤 Datos de tu Cuenta</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Tu Nombre *</label>
                                        <input
                                            type="text"
                                            value={formulario.nombreContacto}
                                            onChange={(e) => setFormulario({ ...formulario, nombreContacto: e.target.value })}
                                            placeholder="Juan Pérez"
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña *</label>
                                            <input
                                                type="password"
                                                value={formulario.password}
                                                onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
                                                placeholder="Mínimo 6 caracteres"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar *</label>
                                            <input
                                                type="password"
                                                value={formulario.confirmPassword}
                                                onChange={(e) => setFormulario({ ...formulario, confirmPassword: e.target.value })}
                                                placeholder="Repetir contraseña"
                                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={() => setPaso(2)}
                                disabled={!formulario.nombre || !formulario.email || !formulario.telefono || !formulario.nombreContacto || !formulario.password}
                                className="w-full mt-4 bg-gradient-to-r from-primary to-primary-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                            >
                                Continuar <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>
                )}

                {/* Paso 2 */}
                {paso === 2 && (
                    <div className="bg-white rounded-3xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Selecciona tu Sector</h2>
                        <p className="text-gray-500 mb-6">¿En qué industria opera tu empresa?</p>

                        <div className="grid grid-cols-3 gap-3 mb-6">
                            {sectores.length > 0 ? sectores.map((sector) => (
                                <button
                                    key={sector.id}
                                    onClick={() => setFormulario({ ...formulario, sectorId: sector.id })}
                                    className={`p-4 rounded-xl border-2 text-center transition-all ${formulario.sectorId === sector.id
                                        ? 'border-primary bg-primary/5 shadow-lg'
                                        : 'border-gray-100 hover:border-primary/50'
                                        }`}
                                >
                                    <span className="text-2xl block mb-1">{sector.icon}</span>
                                    <span className="text-sm font-medium text-gray-700">{sector.name}</span>
                                </button>
                            )) : (
                                ['💻 Tecnología', '🛒 Comercio', '🏭 Manufactura', '🏗️ Construcción', '🏥 Salud', '🏖️ Turismo', '🌾 Agricultura', '💰 Finanzas', '📚 Educación'].map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setFormulario({ ...formulario, sectorId: String(i) })}
                                        className={`p-4 rounded-xl border-2 text-center transition-all ${formulario.sectorId === String(i)
                                            ? 'border-primary bg-primary/5 shadow-lg'
                                            : 'border-gray-100 hover:border-primary/50'
                                            }`}
                                    >
                                        <span className="text-2xl block mb-1">{s.split(' ')[0]}</span>
                                        <span className="text-sm font-medium text-gray-700">{s.split(' ')[1]}</span>
                                    </button>
                                ))
                            )}
                        </div>

                        <h3 className="font-bold text-gray-900 mb-3">Tipo de Empresa</h3>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            {tipos.map((tipo) => (
                                <button
                                    key={tipo.id}
                                    onClick={() => setFormulario({ ...formulario, tipoId: tipo.id })}
                                    className={`p-3 rounded-xl border-2 text-left transition-all ${formulario.tipoId === tipo.id
                                        ? 'border-secondary bg-secondary/5'
                                        : 'border-gray-100 hover:border-secondary/50'
                                        }`}
                                >
                                    <span className="font-medium text-gray-900 text-sm">{tipo.name}</span>
                                </button>
                            ))}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setPaso(1)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                                Atrás
                            </button>
                            <button
                                onClick={() => setPaso(3)}
                                disabled={!formulario.sectorId}
                                className="flex-1 bg-gradient-to-r from-primary to-primary-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50"
                            >
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* Paso 3 */}
                {paso === 3 && (
                    <div className="bg-white rounded-3xl p-8 shadow-xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Cuéntanos sobre tu empresa</h2>
                        <p className="text-gray-500 mb-6">Esta información ayudará a otras empresas a conocerte</p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sitio Web</label>
                                <input
                                    type="url"
                                    value={formulario.website}
                                    onChange={(e) => setFormulario({ ...formulario, website: e.target.value })}
                                    placeholder="https://tuempresa.com"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={formulario.descripcion}
                                    onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
                                    placeholder="Describe los productos o servicios que ofrece tu empresa..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                                />
                            </div>

                            <div className="bg-gray-50 rounded-xl p-4">
                                <h4 className="font-medium text-gray-700 mb-2">Resumen del Registro:</h4>
                                <p className="text-sm text-gray-600"><strong>Empresa:</strong> {formulario.nombre}</p>
                                <p className="text-sm text-gray-600"><strong>Email:</strong> {formulario.email}</p>
                                <p className="text-sm text-gray-600"><strong>Teléfono:</strong> {formulario.telefono}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setPaso(2)} className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium hover:bg-gray-50">
                                Atrás
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={cargando}
                                className="flex-1 bg-gradient-to-r from-secondary to-secondary-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {cargando ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                                {cargando ? 'Registrando...' : 'Registrar Empresa'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
