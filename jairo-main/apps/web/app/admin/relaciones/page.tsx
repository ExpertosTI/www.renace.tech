"use client";

import { useState, useEffect } from "react";
import { Network, Plus, ArrowRight, Building2, Check, X, Loader2, Filter } from "lucide-react";

interface Relacion {
    id: string;
    relationship_type: string;
    status: string;
    empresa_origen_nombre: string;
    empresa_origen_logo: string;
    empresa_destino_nombre: string;
    empresa_destino_logo: string;
    sector_origen: string;
    sector_destino: string;
    created_at: string;
}

interface Estadisticas {
    resumen: { activas: number; pendientes: number; rechazadas: number; total: number };
    porTipo: { tipo: string; cantidad: number }[];
}

const tiposRelacion = [
    { valor: "proveedor", etiqueta: "Proveedor", color: "bg-blue-100 text-blue-700" },
    { valor: "cliente", etiqueta: "Cliente", color: "bg-green-100 text-green-700" },
    { valor: "socio", etiqueta: "Socio", color: "bg-purple-100 text-purple-700" },
    { valor: "distribuidor", etiqueta: "Distribuidor", color: "bg-orange-100 text-orange-700" },
];

export default function RelacionesPage() {
    const [cargando, setCargando] = useState(true);
    const [relaciones, setRelaciones] = useState<Relacion[]>([]);
    const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
    const [filtroTipo, setFiltroTipo] = useState("");
    const [filtroEstado, setFiltroEstado] = useState("");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

    useEffect(() => {
        cargarDatos();
    }, [filtroTipo, filtroEstado]);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const params = new URLSearchParams();
            if (filtroTipo) params.append('tipo', filtroTipo);
            if (filtroEstado) params.append('estado', filtroEstado);

            const [relacionesRes, statsRes] = await Promise.all([
                fetch(`${API_URL}/relaciones?${params.toString()}`),
                fetch(`${API_URL}/relaciones/estadisticas/resumen`)
            ]);

            if (relacionesRes.ok) {
                const data = await relacionesRes.json();
                setRelaciones(data.relaciones || []);
            }
            if (statsRes.ok) {
                setEstadisticas(await statsRes.json());
            }
        } catch (error) {
            console.error("Error cargando relaciones:", error);
        } finally {
            setCargando(false);
        }
    };

    const aprobarRelacion = async (id: string) => {
        try {
            await fetch(`${API_URL}/relaciones/${id}/aprobar`, { method: 'PUT' });
            cargarDatos();
        } catch (error) {
            console.error("Error aprobando relación:", error);
        }
    };

    const rechazarRelacion = async (id: string) => {
        try {
            await fetch(`${API_URL}/relaciones/${id}/rechazar`, { method: 'PUT' });
            cargarDatos();
        } catch (error) {
            console.error("Error rechazando relación:", error);
        }
    };

    const formatearFecha = (fecha: string) => {
        return new Date(fecha).toLocaleDateString('es-DO', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Engranajes</h1>
                    <p className="text-gray-500 mt-1">Gestiona las conexiones entre empresas</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                    <Plus size={20} />
                    Nueva Conexión
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-sm text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{estadisticas?.resumen.total || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-sm text-green-600">Activas</p>
                    <p className="text-2xl font-bold text-green-600">{estadisticas?.resumen.activas || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-sm text-yellow-600">Pendientes</p>
                    <p className="text-2xl font-bold text-yellow-600">{estadisticas?.resumen.pendientes || 0}</p>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <p className="text-sm text-red-600">Rechazadas</p>
                    <p className="text-2xl font-bold text-red-600">{estadisticas?.resumen.rechazadas || 0}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-500">Filtrar:</span>
                </div>
                <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                >
                    <option value="">Todos los tipos</option>
                    {tiposRelacion.map(t => (
                        <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
                    ))}
                </select>
                <select
                    value={filtroEstado}
                    onChange={(e) => setFiltroEstado(e.target.value)}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                >
                    <option value="">Todos los estados</option>
                    <option value="active">Activas</option>
                    <option value="pending">Pendientes</option>
                    <option value="rejected">Rechazadas</option>
                </select>
            </div>

            {/* Relationships List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {cargando ? (
                    <div className="p-12 text-center">
                        <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={32} />
                        <p className="text-gray-500">Cargando conexiones...</p>
                    </div>
                ) : relaciones.length === 0 ? (
                    <div className="p-12 text-center">
                        <Network className="mx-auto mb-4 text-gray-300" size={48} />
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No hay conexiones</h3>
                        <p className="text-gray-500">Las empresas aún no han establecido relaciones</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {relaciones.map((rel) => (
                            <div key={rel.id} className="p-4 hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    {/* Empresa Origen */}
                                    <div className="flex-1 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                            <Building2 className="text-blue-600" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{rel.empresa_origen_nombre}</h4>
                                            <p className="text-xs text-gray-500">{rel.sector_origen || "Sin sector"}</p>
                                        </div>
                                    </div>

                                    {/* Relationship Type */}
                                    <div className="flex flex-col items-center px-4">
                                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${tiposRelacion.find(t => t.valor === rel.relationship_type)?.color || "bg-gray-100"
                                            }`}>
                                            {tiposRelacion.find(t => t.valor === rel.relationship_type)?.etiqueta || rel.relationship_type}
                                        </span>
                                        <ArrowRight className="text-gray-300 mt-1" size={20} />
                                    </div>

                                    {/* Empresa Destino */}
                                    <div className="flex-1 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                            <Building2 className="text-green-600" size={20} />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-gray-900">{rel.empresa_destino_nombre}</h4>
                                            <p className="text-xs text-gray-500">{rel.sector_destino || "Sin sector"}</p>
                                        </div>
                                    </div>

                                    {/* Status & Actions */}
                                    <div className="flex items-center gap-3">
                                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${rel.status === "active"
                                            ? "bg-green-100 text-green-700"
                                            : rel.status === "pending"
                                                ? "bg-yellow-100 text-yellow-700"
                                                : "bg-red-100 text-red-700"
                                            }`}>
                                            {rel.status === "active" ? "Activa" : rel.status === "pending" ? "Pendiente" : "Rechazada"}
                                        </span>

                                        {rel.status === "pending" && (
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => aprobarRelacion(rel.id)}
                                                    className="p-1.5 bg-green-100 hover:bg-green-200 rounded text-green-600"
                                                    title="Aprobar"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={() => rechazarRelacion(rel.id)}
                                                    className="p-1.5 bg-red-100 hover:bg-red-200 rounded text-red-600"
                                                    title="Rechazar"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}

                                        <span className="text-xs text-gray-400">{formatearFecha(rel.created_at)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
