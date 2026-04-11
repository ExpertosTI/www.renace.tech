"use client";

import { useEffect, useState } from "react";
import { Check, X, Building2, Globe, Mail } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

export default function ValidateCompaniesPage() {
    const [companies, setCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/admin/companies/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCompanies(data);
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        if (!confirm(`¿Estás seguro de que deseas ${action === 'approve' ? 'APROBAR' : 'RECHAZAR'} esta empresa?`)) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_URL}/admin/companies/${id}/${action}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });

            if (res.ok) {
                setCompanies(prev => prev.filter(c => c.id !== id));
            }
        } catch {
            alert("Error al procesar la acción");
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-white">Validar Empresas</h1>
                <p className="text-slate-400">Empresas pendientes de aprobación</p>
            </div>

            {companies.length === 0 ? (
                <div className="bg-slate-900 p-12 rounded-2xl text-center border border-slate-800">
                    <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white">¡Todo al día!</h3>
                    <p className="text-slate-400">No hay empresas pendientes de validación.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {companies.map((company) => (
                        <div key={company.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row gap-6">
                            {/* Logo / Icon */}
                            <div className="w-16 h-16 bg-slate-800 rounded-xl flex-shrink-0 flex items-center justify-center">
                                <Building2 size={32} className="text-slate-500" />
                            </div>

                            {/* Info */}
                            <div className="flex-1">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{company.name}</h3>
                                        <p className="text-sm text-slate-500">Solicitado el {new Date(company.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleAction(company.id, 'reject')}
                                            className="px-4 py-2 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg font-medium transition-colors flex items-center gap-2 border border-red-500/20"
                                        >
                                            <X size={18} /> Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleAction(company.id, 'approve')}
                                            className="px-6 py-2 bg-green-600 text-white hover:bg-green-500 rounded-lg font-medium transition-colors shadow-lg shadow-green-600/20 flex items-center gap-2"
                                        >
                                            <Check size={18} /> Aprobar
                                        </button>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-4 text-sm bg-slate-800/50 p-4 rounded-xl">
                                    <div className="space-y-2 text-slate-300">
                                        <p><span className="font-semibold text-slate-400">Administrador:</span> {company.admin_name}</p>
                                        <p className="flex items-center gap-2">
                                            <Mail size={14} className="text-slate-500" />
                                            {company.admin_email}
                                        </p>
                                    </div>
                                    <div className="space-y-2 text-slate-300">
                                        <p><span className="font-semibold text-slate-400">Sitio Web:</span> {company.website || 'No especificado'}</p>
                                        <p><span className="font-semibold text-slate-400">Descripción:</span> {company.description || 'Sin descripción'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

