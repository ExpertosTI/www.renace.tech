"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    Building2, MapPin, Globe, Phone, Mail, Network,
    ArrowLeft, MessageCircle, Package, FileText, Loader2
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

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
    logo_url?: string;
}

export default function EmpresaPerfilPage() {
    const params = useParams();
    const router = useRouter();
    const [empresa, setEmpresa] = useState<Empresa | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        if (params?.id) {
            fetchEmpresa(params.id as string);
        }
    }, [params?.id]);

    const fetchEmpresa = async (id: string) => {
        try {
            const res = await fetch(`${API_URL}/empresas/${id}`);
            if (res.ok) {
                const data = await res.json();
                setEmpresa(data);
            } else {
                setError("Empresa no encontrada");
            }
        } catch {
            setError("Error al cargar la empresa");
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Cargando perfil...</p>
                </div>
            </div>
        );
    }

    if (error || !empresa) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Building2 size={40} className="text-gray-400" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{error || "Empresa no encontrada"}</h2>
                    <Link href="/directorio" className="text-primary hover:underline">
                        ← Volver al directorio
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary via-primary-600 to-primary-700 text-white py-8">
                <div className="max-w-4xl mx-auto px-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span>Volver</span>
                    </button>

                    <div className="flex flex-col sm:flex-row items-start gap-6">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
                            {empresa.logo_url ? (
                                <img src={empresa.logo_url} alt={empresa.name} className="w-16 h-16 rounded-xl object-cover" />
                            ) : (
                                <Building2 size={40} className="text-white" />
                            )}
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl sm:text-3xl font-black mb-2">{empresa.name}</h1>
                            <div className="flex flex-wrap gap-2">
                                {empresa.sector_nombre && (
                                    <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                                        {empresa.sector_nombre}
                                    </span>
                                )}
                                {empresa.tipo_nombre && (
                                    <span className="px-3 py-1 bg-secondary/30 rounded-full text-sm font-medium">
                                        {empresa.tipo_nombre}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Info */}
                    <div className="md:col-span-2 space-y-6">
                        {/* Description */}
                        {empresa.descripcion && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900 mb-3">Acerca de</h2>
                                <p className="text-gray-600 leading-relaxed">{empresa.descripcion}</p>
                            </div>
                        )}

                        {/* Contact Info */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Información de Contacto</h2>
                            <div className="space-y-4">
                                {empresa.address && (
                                    <div className="flex items-start gap-3">
                                        <MapPin size={20} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-600">{empresa.address}</span>
                                    </div>
                                )}
                                {empresa.phone && (
                                    <div className="flex items-center gap-3">
                                        <Phone size={20} className="text-gray-400 flex-shrink-0" />
                                        <a href={`tel:${empresa.phone}`} className="text-gray-600 hover:text-primary">
                                            {empresa.phone}
                                        </a>
                                    </div>
                                )}
                                {empresa.email && (
                                    <div className="flex items-center gap-3">
                                        <Mail size={20} className="text-gray-400 flex-shrink-0" />
                                        <a href={`mailto:${empresa.email}`} className="text-primary hover:underline">
                                            {empresa.email}
                                        </a>
                                    </div>
                                )}
                                {empresa.website && (
                                    <div className="flex items-center gap-3">
                                        <Globe size={20} className="text-gray-400 flex-shrink-0" />
                                        <a
                                            href={empresa.website.startsWith('http') ? empresa.website : `https://${empresa.website}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline truncate"
                                        >
                                            {empresa.website.replace(/https?:\/\//, '')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Stats */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <div className="flex items-center gap-3 mb-4">
                                <Network className="text-primary" size={24} />
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{empresa.conexiones || 0}</p>
                                    <p className="text-sm text-gray-500">Conexiones</p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-3">
                            <button className="w-full bg-gradient-to-r from-primary to-primary-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition-all">
                                <MessageCircle size={20} />
                                Enviar Mensaje
                            </button>
                            <button className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all">
                                <Network size={20} />
                                Conectar
                            </button>
                        </div>

                        {/* Quick Links */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-3">Enlaces Rápidos</h3>
                            <div className="space-y-2">
                                <Link
                                    href={`/directorio?empresa=${empresa.id}`}
                                    className="flex items-center gap-2 text-gray-600 hover:text-primary py-2"
                                >
                                    <Package size={18} />
                                    Ver Catálogo
                                </Link>
                                <Link
                                    href={`/cotizaciones?empresa=${empresa.id}`}
                                    className="flex items-center gap-2 text-gray-600 hover:text-primary py-2"
                                >
                                    <FileText size={18} />
                                    Solicitudes Activas
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
