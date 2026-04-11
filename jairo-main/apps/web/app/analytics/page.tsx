"use client";

import { useState, useEffect } from "react";
import {
    BarChart3, TrendingUp, TrendingDown, Users, Eye, Package,
    FileText, MessageCircle, Building2, Calendar, Download
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
    profileViews: number;
    connections: number;
    pendingRequests: number;
    products: number;
    openRfqs: number;
    unreadMessages: number;
}

interface ProfileView {
    viewer_name: string;
    viewer_company_name: string;
    created_at: string;
}

export default function AnalyticsPage() {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [profileViews, setProfileViews] = useState<ProfileView[]>([]);
    const [connectionStats, setConnectionStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'connections' | 'products'>('overview');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

    useEffect(() => {
        loadData();
    }, []);

    const getToken = () => localStorage.getItem("token");

    const loadData = async () => {
        try {
            const [dashRes, viewsRes, connRes] = await Promise.all([
                fetch(`${API_URL}/analytics/dashboard`, { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch(`${API_URL}/analytics/profile-views`, { headers: { Authorization: `Bearer ${getToken()}` } }),
                fetch(`${API_URL}/analytics/connections`, { headers: { Authorization: `Bearer ${getToken()}` } })
            ]);

            const [dashData, viewsData, connData] = await Promise.all([
                dashRes.json(),
                viewsRes.json(),
                connRes.json()
            ]);

            setStats(dashData.stats);
            setProfileViews(viewsData.vistas || []);
            setConnectionStats(connData);
        } catch (error) {
            console.error("Error loading analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (hours < 24) return `hace ${hours}h`;
        if (days < 7) return `hace ${days}d`;
        return new Date(date).toLocaleDateString('es');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary to-primary-700 text-white">
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="flex items-center gap-4 mb-6">
                        <Link href="/directorio" className="flex items-center gap-2">
                            <img src="/logo.svg" alt="JairoApp" className="w-10 h-10 object-contain bg-white rounded-xl p-1" />
                            <span className="text-2xl font-black">JairoApp</span>
                        </Link>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-black mb-2">Analytics</h1>
                            <p className="text-white/70">Métricas y rendimiento de tu empresa</p>
                        </div>
                        <button className="bg-white/20 backdrop-blur px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-white/30">
                            <Download size={20} /> Exportar
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="max-w-7xl mx-auto px-4 -mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[
                        { icon: Eye, label: 'Vistas de Perfil', value: stats?.profileViews || 0, color: 'purple' },
                        { icon: Users, label: 'Conexiones', value: stats?.connections || 0, color: 'blue' },
                        { icon: Building2, label: 'Solicitudes', value: stats?.pendingRequests || 0, color: 'orange' },
                        { icon: Package, label: 'Productos', value: stats?.products || 0, color: 'green' },
                        { icon: FileText, label: 'RFQs Abiertos', value: stats?.openRfqs || 0, color: 'yellow' },
                        { icon: MessageCircle, label: 'Mensajes', value: stats?.unreadMessages || 0, color: 'pink' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 shadow-lg">
                            <div className={`w-10 h-10 bg-${stat.color}-100 rounded-xl flex items-center justify-center mb-3`}>
                                <stat.icon className={`text-${stat.color}-500`} size={20} />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                            <p className="text-sm text-gray-500">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-7xl mx-auto px-4 mt-8">
                <div className="bg-white rounded-xl p-1 inline-flex gap-1">
                    {[
                        { id: 'overview', label: 'Resumen' },
                        { id: 'profile', label: 'Visitas' },
                        { id: 'connections', label: 'Conexiones' },
                        { id: 'products', label: 'Productos' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${activeTab === tab.id
                                ? 'bg-primary text-white'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {activeTab === 'overview' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Recent Profile Views */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4">Últimas visitas a tu perfil</h3>
                            {profileViews.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No hay visitas recientes</p>
                            ) : (
                                <div className="space-y-3">
                                    {profileViews.slice(0, 5).map((view, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                                            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                                                <span className="text-primary font-bold">
                                                    {view.viewer_name?.charAt(0) || '?'}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-900">{view.viewer_name || 'Visitante'}</p>
                                                <p className="text-sm text-gray-500">{view.viewer_company_name || 'Empresa'}</p>
                                            </div>
                                            <span className="text-sm text-gray-400">{formatTime(view.created_at)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Connections by Sector */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4">Conexiones por sector</h3>
                            {connectionStats?.porSector?.length === 0 ? (
                                <p className="text-gray-500 text-center py-8">No hay datos</p>
                            ) : (
                                <div className="space-y-3">
                                    {connectionStats?.porSector?.slice(0, 5).map((item: any, i: number) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="flex-1">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-700">{item.sector || 'Sin sector'}</span>
                                                    <span className="font-medium text-gray-900">{item.total}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                                                        style={{ width: `${(item.total / (connectionStats?.porSector[0]?.total || 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-gray-900">Quién vio tu perfil</h3>
                            <span className="text-sm text-gray-500">{profileViews.length} visitas totales</span>
                        </div>

                        {profileViews.length === 0 ? (
                            <div className="text-center py-16">
                                <Eye className="mx-auto text-gray-300 mb-4" size={64} />
                                <h4 className="text-lg font-semibold text-gray-700">No hay visitas aún</h4>
                                <p className="text-gray-500 mt-2">Completa tu perfil para atraer más visitas</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {profileViews.map((view, i) => (
                                    <div key={i} className="flex items-center gap-4 py-4">
                                        <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center">
                                            <span className="text-primary font-bold text-lg">
                                                {view.viewer_name?.charAt(0) || '?'}
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900">{view.viewer_name || 'Visitante anónimo'}</p>
                                            <p className="text-sm text-gray-500">{view.viewer_company_name || ''}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500">{formatTime(view.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'connections' && (
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4">Por sector</h3>
                            <div className="space-y-4">
                                {connectionStats?.porSector?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-gray-700">{item.sector || 'Sin sector'}</span>
                                        <span className="font-bold text-primary">{item.total}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl p-6 shadow-sm">
                            <h3 className="font-bold text-gray-900 mb-4">Por tipo de relación</h3>
                            <div className="space-y-4">
                                {connectionStats?.porTipo?.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                        <span className="text-gray-700 capitalize">{item.tipo || 'General'}</span>
                                        <span className="font-bold text-secondary">{item.total}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="bg-white rounded-2xl p-6 shadow-sm">
                        <h3 className="font-bold text-gray-900 mb-4">Rendimiento de productos</h3>
                        <p className="text-gray-500 text-center py-8">
                            Ve a <Link href="/mi-catalogo" className="text-primary hover:underline">Mi Catálogo</Link> para ver estadísticas detalladas
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
