"use client";

import { useState, useEffect } from "react";
import { Tags, Plus, Edit, Trash2, Building2, Loader2, Save, X } from "lucide-react";

interface Sector {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    total_empresas: number;
}

interface TipoEmpresa {
    id: string;
    name: string;
    description: string;
}

export default function SectoresPage() {
    const [cargando, setCargando] = useState(true);
    const [sectores, setSectores] = useState<Sector[]>([]);
    const [tipos, setTipos] = useState<TipoEmpresa[]>([]);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [editando, setEditando] = useState<Sector | null>(null);
    const [formulario, setFormulario] = useState({ nombre: "", descripcion: "", icono: "🏢", color: "#3B82F6" });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        setCargando(true);
        try {
            const [sectoresRes, tiposRes] = await Promise.all([
                fetch(`${API_URL}/dashboard/sectores-distribucion`),
                fetch(`${API_URL}/sectores`)
            ]);

            if (sectoresRes.ok) {
                const data = await sectoresRes.json();
                setSectores(data.sectores || []);
            }
            // Cargar tipos cuando el endpoint esté disponible
        } catch (error) {
            console.error("Error cargando sectores:", error);
        } finally {
            setCargando(false);
        }
    };

    const guardarSector = async () => {
        try {
            const method = editando ? 'PUT' : 'POST';
            const url = editando ? `${API_URL}/sectores/${editando.id}` : `${API_URL}/sectores`;

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formulario)
            });

            setMostrarFormulario(false);
            setEditando(null);
            setFormulario({ nombre: "", descripcion: "", icono: "🏢", color: "#3B82F6" });
            cargarDatos();
        } catch (error) {
            console.error("Error guardando sector:", error);
        }
    };

    const eliminarSector = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este sector?')) return;
        try {
            await fetch(`${API_URL}/sectores/${id}`, { method: 'DELETE' });
            cargarDatos();
        } catch (error) {
            console.error("Error eliminando sector:", error);
        }
    };

    const iconos = ["🏢", "💻", "🛒", "🏭", "🏗️", "🏥", "🏖️", "🌾", "💰", "📚", "🚚", "⚡", "💼", "🎨", "🔧"];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900">Sectores y Tipos</h1>
                    <p className="text-gray-500 mt-1">Configura los sectores empresariales y tipos de empresa</p>
                </div>
                <button
                    onClick={() => {
                        setEditando(null);
                        setFormulario({ nombre: "", descripcion: "", icono: "🏢", color: "#3B82F6" });
                        setMostrarFormulario(true);
                    }}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium"
                >
                    <Plus size={20} />
                    Nuevo Sector
                </button>
            </div>

            {/* Modal Formulario */}
            {mostrarFormulario && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">{editando ? 'Editar Sector' : 'Nuevo Sector'}</h3>
                            <button onClick={() => setMostrarFormulario(false)} className="p-1 hover:bg-gray-100 rounded">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    type="text"
                                    value={formulario.nombre}
                                    onChange={(e) => setFormulario({ ...formulario, nombre: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                    placeholder="Ej: Tecnología"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={formulario.descripcion}
                                    onChange={(e) => setFormulario({ ...formulario, descripcion: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg"
                                    rows={2}
                                    placeholder="Describe el sector..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Icono</label>
                                <div className="flex flex-wrap gap-2">
                                    {iconos.map((icono) => (
                                        <button
                                            key={icono}
                                            onClick={() => setFormulario({ ...formulario, icono })}
                                            className={`w-10 h-10 rounded-lg border-2 text-xl ${formulario.icono === icono ? 'border-primary bg-primary/10' : 'border-gray-200'
                                                }`}
                                        >
                                            {icono}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                                <input
                                    type="color"
                                    value={formulario.color}
                                    onChange={(e) => setFormulario({ ...formulario, color: e.target.value })}
                                    className="w-full h-10 rounded-lg cursor-pointer"
                                />
                            </div>
                            <button
                                onClick={guardarSector}
                                className="w-full bg-primary text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2"
                            >
                                <Save size={18} />
                                {editando ? 'Actualizar' : 'Crear'} Sector
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sectors Grid */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Sectores Empresariales</h2>
                {cargando ? (
                    <div className="text-center py-12">
                        <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={32} />
                        <p className="text-gray-500">Cargando sectores...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sectores.map((sector) => (
                            <div
                                key={sector.id}
                                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                                        style={{ backgroundColor: `${sector.color}20` }}
                                    >
                                        {sector.icon}
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => {
                                                setEditando(sector);
                                                setFormulario({
                                                    nombre: sector.name,
                                                    descripcion: sector.description || "",
                                                    icono: sector.icon || "🏢",
                                                    color: sector.color || "#3B82F6"
                                                });
                                                setMostrarFormulario(true);
                                            }}
                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-500"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => eliminarSector(sector.id)}
                                            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mt-4">{sector.name}</h3>
                                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{sector.description}</p>
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
                                    <Building2 size={16} className="text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">{sector.total_empresas || 0} empresas</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
