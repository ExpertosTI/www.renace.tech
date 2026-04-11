"use client";

import { useState, useEffect } from "react";
import { Building2, Search, MapPin, Globe, Phone, Network, ChevronRight } from "lucide-react";
import Link from "next/link";

interface Empresa {
    id: string;
    name: string;
    email: string;
    phone: string;
    website: string;
    address: string;
    sector_nombre: string;
    tipo_nombre: string;
    descripcion: string;
    conexiones: number;
}

interface Sector {
    id: string;
    name: string;
    icon: string;
}

export default function DirectorioPage() {
    const [cargando, setCargando] = useState(true);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [sectorFiltro, setSectorFiltro] = useState("");
    const [tipoFiltro, setTipoFiltro] = useState("");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

    useEffect(() => {
        cargarDatos();
    }, [busqueda, sectorFiltro, tipoFiltro]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const params = new URLSearchParams();
            if (busqueda) params.append('busqueda', busqueda);
            if (sectorFiltro) params.append('sector', sectorFiltro);
            if (tipoFiltro) params.append('tipo', tipoFiltro);
            params.append('estado', 'active');

            const [empresasRes, sectoresRes] = await Promise.all([
                fetch(`${API_URL}/empresas?${params.toString()}`),
                fetch(`${API_URL}/sectores`)
            ]);

            if (empresasRes.ok) {
                const data = await empresasRes.json();
                setEmpresas(data.empresas || []);
            }
            if (sectoresRes.ok) {
                const data = await sectoresRes.json();
                setSectores(data.sectores || []);
            }
        } catch {
            // Silent fail
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header / Hero */}
            <div className="pt-8 pb-8 bg-gradient-to-r from-primary via-primary-600 to-primary-700 text-white rounded-b-3xl mb-8">
                <div className="max-w-7xl mx-auto px-4 mt-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-black mb-4">Directorio Empresarial</h1>
                    <p className="text-xl text-white/80">
                        Encuentra y conecta con empresas registradas
                    </p>

                    {/* Search */}
                    <div className="max-w-2xl mx-auto mt-8">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Buscar empresas..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/30"
                                />
                            </div>
                            <div className="flex gap-2">
                                <select
                                    value={sectorFiltro}
                                    onChange={(e) => setSectorFiltro(e.target.value)}
                                    className="flex-1 sm:flex-none px-4 py-4 rounded-xl text-gray-900 focus:outline-none text-sm"
                                >
                                    <option value="">Todos los sectores</option>
                                    {sectores.map(s => (
                                        <option key={s.id} value={s.name}>{s.icon} {s.name}</option>
                                    ))}
                                </select>
                                <select
                                    value={tipoFiltro}
                                    onChange={(e) => setTipoFiltro(e.target.value)}
                                    className="flex-1 sm:flex-none px-4 py-4 rounded-xl text-gray-900 focus:outline-none text-sm"
                                >
                                    <option value="">Todos los tipos</option>
                                    <option value="proveedor">Proveedor</option>
                                    <option value="distribuidor">Distribuidor</option>
                                    <option value="fabricante">Fabricante</option>
                                    <option value="servicio">Servicios</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Sectors Filter */}
            <div className="border-b bg-white sticky top-16 z-10 shadow-sm mb-6">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                        <button
                            onClick={() => setSectorFiltro("")}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${!sectorFiltro ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            ⚡ Todos
                        </button>
                        {sectores.slice(0, 10).map((sector) => (
                            <button
                                key={sector.id}
                                onClick={() => setSectorFiltro(sector.name)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap flex items-center gap-1 transition-all flex-shrink-0 ${sectorFiltro === sector.name
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <span>{sector.icon}</span>
                                <span className="hidden sm:inline">{sector.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Companies Grid */}
            <div className="max-w-7xl mx-auto px-4 py-8 pb-20">
                {cargando ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Cargando empresas...</p>
                    </div>
                ) : empresas.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 className="text-gray-400" size={40} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No hay empresas</h3>
                        <p className="text-gray-500 mb-6">
                            {busqueda || sectorFiltro
                                ? "No se encontraron empresas con esos filtros"
                                : "Sé el primero en registrar tu empresa"}
                        </p>
                        <Link
                            href="/registro"
                            className="inline-block bg-gradient-to-r from-primary to-primary-600 text-white px-8 py-3 rounded-xl font-semibold hover:shadow-lg"
                        >
                            Registrar mi Empresa
                        </Link>
                    </div>
                ) : (
                    <>
                        <p className="text-gray-500 mb-6">{empresas.length} empresas encontradas</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {empresas.map((empresa) => (
                                <div
                                    key={empresa.id}
                                    className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center">
                                            <Building2 className="text-primary" size={28} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-gray-900 text-lg truncate">{empresa.name}</h3>
                                            <p className="text-sm text-primary font-medium">{empresa.sector_nombre}</p>
                                            {empresa.tipo_nombre && (
                                                <span className="inline-block mt-1 px-2 py-0.5 bg-secondary/10 text-secondary text-xs rounded font-medium">
                                                    {empresa.tipo_nombre}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {empresa.descripcion && (
                                        <p className="text-gray-500 text-sm mt-4 line-clamp-2">{empresa.descripcion}</p>
                                    )}

                                    <div className="mt-4 space-y-2 text-sm text-gray-600">
                                        {empresa.address && (
                                            <div className="flex items-center gap-2">
                                                <MapPin size={14} className="text-gray-400" />
                                                <span className="truncate">{empresa.address}</span>
                                            </div>
                                        )}
                                        {empresa.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-gray-400" />
                                                <span>{empresa.phone}</span>
                                            </div>
                                        )}
                                        {empresa.website && (
                                            <div className="flex items-center gap-2">
                                                <Globe size={14} className="text-gray-400" />
                                                <a href={empresa.website} target="_blank" className="text-primary hover:underline truncate">
                                                    {empresa.website.replace(/https?:\/\//, '')}
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-gray-500 text-sm">
                                            <Network size={14} />
                                            <span>{empresa.conexiones || 0} conexiones</span>
                                        </div>
                                        <Link
                                            href={`/empresa/${empresa.id}`}
                                            className="text-primary font-medium text-sm hover:underline flex items-center gap-1"
                                        >
                                            Ver perfil <ChevronRight size={14} />
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
