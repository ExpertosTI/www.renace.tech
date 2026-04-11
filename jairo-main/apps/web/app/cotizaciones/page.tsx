"use client";

import { useState, useEffect } from "react";
import { FileText, Plus, Clock, DollarSign, Package, ChevronRight, Filter, Search } from "lucide-react";
import Link from "next/link";

interface RFQ {
    id: string;
    title: string;
    description: string;
    budget: number;
    deadline: string;
    status: string;
    sector_name: string;
    requester_name: string;
    company_name: string;
    quote_count: number;
    created_at: string;
}

export default function CotizacionesPage() {
    const [rfqs, setRfqs] = useState<RFQ[]>([]);
    const [myRfqs, setMyRfqs] = useState<RFQ[]>([]);
    const [activeTab, setActiveTab] = useState<'public' | 'my' | 'received'>('public');
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newRfq, setNewRfq] = useState({
        title: '',
        description: '',
        quantity: 0,
        budget: 0,
        deadline: ''
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

    useEffect(() => {
        loadRfqs();
    }, [activeTab]);

    const getToken = () => localStorage.getItem("token");

    const loadRfqs = async () => {
        setLoading(true);
        try {
            let url = `${API_URL}/rfq`;
            const headers: any = {};

            if (activeTab === 'my') {
                url = `${API_URL}/rfq/my-requests`;
                headers.Authorization = `Bearer ${getToken()}`;
            } else if (activeTab === 'received') {
                url = `${API_URL}/rfq/received`;
                headers.Authorization = `Bearer ${getToken()}`;
            }

            const res = await fetch(url, { headers });
            const data = await res.json();

            if (activeTab === 'my') {
                setMyRfqs(data.rfqs || []);
            } else {
                setRfqs(data.rfqs || []);
            }
        } catch (error) {
            console.error("Error loading RFQs:", error);
        } finally {
            setLoading(false);
        }
    };

    const createRfq = async () => {
        try {
            await fetch(`${API_URL}/rfq`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(newRfq)
            });
            setShowCreate(false);
            setNewRfq({ title: '', description: '', quantity: 0, budget: 0, deadline: '' });
            loadRfqs();
        } catch (error) {
            console.error("Error creating RFQ:", error);
        }
    };

    const displayRfqs = activeTab === 'my' ? myRfqs : rfqs;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD' }).format(value);
    };

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return 'bg-green-100 text-green-700';
            case 'closed': return 'bg-gray-100 text-gray-700';
            default: return 'bg-blue-100 text-blue-700';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary to-primary-700 text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex items-center justify-between mb-6">
                        <Link href="/directorio" className="flex items-center gap-2">
                            <img src="/logo.svg" alt="JairoApp" className="w-10 h-10 object-contain bg-white rounded-xl p-1" />
                            <span className="text-2xl font-black">JairoApp</span>
                        </Link>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="bg-secondary px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-secondary-600"
                        >
                            <Plus size={20} /> Nueva Solicitud
                        </button>
                    </div>

                    <h1 className="text-3xl font-black mb-2">Solicitudes de Cotización (RFQ)</h1>
                    <p className="text-white/70">Encuentra oportunidades de negocio y envía cotizaciones</p>
                </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex gap-8">
                        {[
                            { id: 'public', label: 'Oportunidades Públicas' },
                            { id: 'received', label: 'Recibidas' },
                            { id: 'my', label: 'Mis Solicitudes' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-4 border-b-2 font-medium transition-colors ${activeTab === tab.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Search & Filters */}
                <div className="flex gap-4 mb-6">
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar solicitudes..."
                            className="w-full pl-12 pr-4 py-3 bg-white border rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <button className="px-4 py-3 bg-white border rounded-xl flex items-center gap-2 text-gray-700 hover:bg-gray-50">
                        <Filter size={20} /> Filtrar
                    </button>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Cargando solicitudes...</p>
                    </div>
                ) : displayRfqs.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border">
                        <FileText className="mx-auto text-gray-300 mb-4" size={64} />
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No hay solicitudes</h3>
                        <p className="text-gray-500 mb-6">
                            {activeTab === 'my'
                                ? 'Crea tu primera solicitud de cotización'
                                : 'No hay oportunidades disponibles en este momento'}
                        </p>
                        {activeTab === 'my' && (
                            <button
                                onClick={() => setShowCreate(true)}
                                className="bg-primary text-white px-6 py-3 rounded-xl font-medium"
                            >
                                Crear Solicitud
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {displayRfqs.map((rfq) => (
                            <Link
                                key={rfq.id}
                                href={`/cotizaciones/${rfq.id}`}
                                className="bg-white rounded-2xl p-6 border hover:shadow-lg transition-all group"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(rfq.status)}`}>
                                                {rfq.status === 'open' ? 'Abierta' : 'Cerrada'}
                                            </span>
                                            {rfq.sector_name && (
                                                <span className="text-sm text-gray-500">{rfq.sector_name}</span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary mb-2">
                                            {rfq.title}
                                        </h3>
                                        <p className="text-gray-500 text-sm line-clamp-2 mb-4">{rfq.description}</p>

                                        <div className="flex items-center gap-6 text-sm">
                                            {rfq.budget && (
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <DollarSign size={16} className="text-green-500" />
                                                    <span>Presupuesto: {formatCurrency(rfq.budget)}</span>
                                                </div>
                                            )}
                                            {rfq.deadline && (
                                                <div className="flex items-center gap-1 text-gray-600">
                                                    <Clock size={16} className="text-orange-500" />
                                                    <span>Fecha límite: {formatDate(rfq.deadline)}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Package size={16} className="text-blue-500" />
                                                <span>{rfq.quote_count || 0} cotizaciones</span>
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRight className="text-gray-300 group-hover:text-primary" size={24} />
                                </div>

                                <div className="mt-4 pt-4 border-t flex items-center gap-2 text-sm text-gray-500">
                                    <span>Publicado por:</span>
                                    <span className="font-medium text-gray-700">{rfq.company_name || rfq.requester_name}</span>
                                    <span>•</span>
                                    <span>{formatDate(rfq.created_at)}</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Nueva Solicitud de Cotización</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                                <input
                                    type="text"
                                    value={newRfq.title}
                                    onChange={(e) => setNewRfq({ ...newRfq, title: e.target.value })}
                                    placeholder="Ej: Compra de materiales de oficina"
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={newRfq.description}
                                    onChange={(e) => setNewRfq({ ...newRfq, description: e.target.value })}
                                    placeholder="Describe lo que necesitas..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto (USD)</label>
                                    <input
                                        type="number"
                                        value={newRfq.budget || ''}
                                        onChange={(e) => setNewRfq({ ...newRfq, budget: parseFloat(e.target.value) })}
                                        placeholder="0.00"
                                        className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha límite</label>
                                    <input
                                        type="date"
                                        value={newRfq.deadline}
                                        onChange={(e) => setNewRfq({ ...newRfq, deadline: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowCreate(false)}
                                className="flex-1 py-3 border rounded-xl font-medium hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={createRfq}
                                disabled={!newRfq.title}
                                className="flex-1 py-3 bg-primary text-white rounded-xl font-medium disabled:opacity-50"
                            >
                                Publicar Solicitud
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
