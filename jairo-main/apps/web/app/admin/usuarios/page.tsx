"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Edit, Trash2, Shield, Mail, Building2, Loader2, Search, Link as LinkIcon, X } from "lucide-react";

interface Usuario {
    id: string;
    email: string;
    name: string;
    role: string;
    avatar: string | null;
    empresa_nombre: string | null;
    created_at: string;
    company_id?: string;
}

interface Empresa {
    id: string;
    name: string;
}

const roles = [
    { valor: "super_admin", etiqueta: "Super Admin", color: "bg-red-100 text-red-700", icono: "🔴" },
    { valor: "admin", etiqueta: "Administrador", color: "bg-orange-100 text-orange-700", icono: "🟠" },
    { valor: "manager", etiqueta: "Gerente", color: "bg-blue-100 text-blue-700", icono: "🔵" },
    { valor: "user", etiqueta: "Usuario", color: "bg-gray-100 text-gray-700", icono: "⚪" },
];

export default function UsuariosPage() {
    const [cargando, setCargando] = useState(true);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [filtroRol, setFiltroRol] = useState("");
    const [total, setTotal] = useState(0);
    const [empresas, setEmpresas] = useState<Empresa[]>([]);
    const [linkingUser, setLinkingUser] = useState<Usuario | null>(null);
    const [selectedEmpresa, setSelectedEmpresa] = useState("");

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

    useEffect(() => {
        cargarUsuarios();
        cargarEmpresas();
    }, [busqueda, filtroRol]);

    const cargarEmpresas = async () => {
        try {
            const res = await fetch(`${API_URL}/empresas`);
            if (res.ok) {
                const data = await res.json();
                setEmpresas(data.empresas || []);
            }
        } catch {
            // Silent fail
        }
    };

    const cargarUsuarios = async () => {
        setCargando(true);
        try {
            const params = new URLSearchParams();
            if (busqueda) params.append('busqueda', busqueda);
            if (filtroRol) params.append('rol', filtroRol);

            const res = await fetch(`${API_URL}/usuarios?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setUsuarios(data.usuarios || []);
                setTotal(data.total || 0);
            }
        } catch {
            // Silent fail
        } finally {
            setCargando(false);
        }
    };

    const cambiarRol = async (userId: string, nuevoRol: string) => {
        try {
            await fetch(`${API_URL}/usuarios/${userId}/rol`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rol: nuevoRol })
            });
            cargarUsuarios();
        } catch {
            // Silent fail
        }
    };

    const eliminarUsuario = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await fetch(`${API_URL}/usuarios/${id}`, { method: 'DELETE' });
            cargarUsuarios();
        } catch {
            // Silent fail
        }
    };

    const vincularEmpresa = async () => {
        if (!linkingUser || !selectedEmpresa) return;
        try {
            await fetch(`${API_URL}/usuarios/${linkingUser.id}/invitar`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ empresaId: selectedEmpresa })
            });
            setLinkingUser(null);
            setSelectedEmpresa("");
            cargarUsuarios();
        } catch {
            // Silent fail
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
                    <h1 className="text-3xl font-black text-white">Usuarios</h1>
                    <p className="text-slate-400 mt-1">{total} usuarios registrados en la plataforma</p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium">
                    <Plus size={20} />
                    Invitar Usuario
                </button>
            </div>

            {/* Roles Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {roles.map((rol) => {
                    const count = usuarios.filter(u => u.role === rol.valor).length;
                    return (
                        <div key={rol.valor} className="bg-slate-900 rounded-xl p-4 border border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="text-xl">{rol.icono}</span>
                                <span className="font-medium text-slate-300">{rol.etiqueta}</span>
                            </div>
                            <p className="text-2xl font-bold text-white mt-2">{count}</p>
                        </div>
                    );
                })}
            </div>

            {/* Filters */}
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 flex flex-wrap gap-4">
                <div className="flex-1 relative min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar usuario..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500"
                    />
                </div>
                <select
                    value={filtroRol}
                    onChange={(e) => setFiltroRol(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                >
                    <option value="">Todos los roles</option>
                    {roles.map(r => (
                        <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
                    ))}
                </select>
            </div>

            {/* Users Table */}
            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                {cargando ? (
                    <div className="p-12 text-center">
                        <Loader2 className="animate-spin mx-auto mb-4 text-primary" size={32} />
                        <p className="text-slate-400">Cargando usuarios...</p>
                    </div>
                ) : usuarios.length === 0 ? (
                    <div className="p-12 text-center">
                        <Users className="mx-auto mb-4 text-slate-600" size={48} />
                        <h3 className="text-lg font-medium text-white mb-1">No hay usuarios</h3>
                        <p className="text-slate-400">
                            {busqueda || filtroRol ? "No se encontraron usuarios con esos filtros" : "Aún no hay usuarios registrados"}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800 border-b border-slate-700">
                                <tr>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Usuario</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Empresa</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Rol</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Registrado</th>
                                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {usuarios.map((usuario) => (
                                    <tr key={usuario.id} className="hover:bg-slate-800/50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-primary to-orange-400 rounded-full flex items-center justify-center text-white font-bold">
                                                    {usuario.name ? usuario.name.split(' ').map(n => n[0]).join('').slice(0, 2) : '?'}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-white">{usuario.name || 'Sin nombre'}</h4>
                                                    <p className="text-sm text-slate-500 flex items-center gap-1">
                                                        <Mail size={12} />
                                                        {usuario.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {usuario.empresa_nombre ? (
                                                <div className="flex items-center gap-2 text-slate-300">
                                                    <Building2 size={16} className="text-slate-500" />
                                                    <span className="truncate max-w-[150px]">{usuario.empresa_nombre}</span>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setLinkingUser(usuario)}
                                                    className="flex items-center gap-1 text-primary hover:text-orange-400 text-sm font-medium"
                                                >
                                                    <LinkIcon size={14} />
                                                    Vincular
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={usuario.role}
                                                onChange={(e) => cambiarRol(usuario.id, e.target.value)}
                                                className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${roles.find(r => r.valor === usuario.role)?.color || "bg-gray-100"
                                                    }`}
                                            >
                                                {roles.map(r => (
                                                    <option key={r.valor} value={r.valor}>{r.etiqueta}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">
                                            {formatearFecha(usuario.created_at)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-blue-400">
                                                    <Edit size={18} />
                                                </button>
                                                <button
                                                    onClick={() => eliminarUsuario(usuario.id)}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal para vincular empresa */}
            {linkingUser && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
                    <div className="bg-slate-900 rounded-2xl w-full max-w-md border border-slate-700 shadow-2xl">
                        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-white">Vincular Usuario a Empresa</h3>
                            <button onClick={() => setLinkingUser(null)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="p-4 bg-slate-800 rounded-xl">
                                <p className="text-sm text-slate-400">Usuario:</p>
                                <p className="font-semibold text-white">{linkingUser.name || linkingUser.email}</p>
                                <p className="text-sm text-slate-500">{linkingUser.email}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Seleccionar Empresa</label>
                                <select
                                    value={selectedEmpresa}
                                    onChange={(e) => setSelectedEmpresa(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {empresas.map((e) => (
                                        <option key={e.id} value={e.id}>{e.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-700 flex gap-3">
                            <button
                                onClick={() => setLinkingUser(null)}
                                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={vincularEmpresa}
                                disabled={!selectedEmpresa}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50"
                            >
                                Vincular
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
