"use client";

import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, MessageCircle, Users, FileText, Eye, Settings } from "lucide-react";
import Link from "next/link";

interface Notification {
    id: string;
    type: string;
    title: string;
    message: string;
    link: string;
    read_at: string | null;
    created_at: string;
}

export default function NotificacionesPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

    useEffect(() => {
        loadNotifications();
    }, []);

    const getToken = () => localStorage.getItem("token");

    const loadNotifications = async () => {
        try {
            const res = await fetch(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = await res.json();
            setNotifications(data.notificaciones || []);
        } catch (error) {
            console.error("Error loading notifications:", error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: string) => {
        try {
            await fetch(`${API_URL}/notifications/${id}/read`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setNotifications(notifications.map(n =>
                n.id === id ? { ...n, read_at: new Date().toISOString() } : n
            ));
        } catch (error) {
            console.error("Error marking as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await fetch(`${API_URL}/notifications/read-all`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            setNotifications(notifications.map(n => ({ ...n, read_at: new Date().toISOString() })));
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'connection_request':
            case 'connection_accepted':
                return <Users className="text-blue-500" size={20} />;
            case 'new_message':
                return <MessageCircle className="text-green-500" size={20} />;
            case 'rfq_received':
            case 'rfq_quote':
            case 'rfq_accepted':
                return <FileText className="text-orange-500" size={20} />;
            case 'profile_view':
                return <Eye className="text-purple-500" size={20} />;
            default:
                return <Bell className="text-gray-500" size={20} />;
        }
    };

    const formatTime = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `hace ${minutes}m`;
        if (hours < 24) return `hace ${hours}h`;
        if (days < 7) return `hace ${days}d`;
        return new Date(date).toLocaleDateString('es');
    };

    const filteredNotifications = filter === 'unread'
        ? notifications.filter(n => !n.read_at)
        : notifications;

    const unreadCount = notifications.filter(n => !n.read_at).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Bell className="text-primary" size={24} />
                            <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
                            {unreadCount > 0 && (
                                <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-sm text-primary font-medium hover:underline"
                                >
                                    Marcar todas como leídas
                                </button>
                            )}
                            <Link href="/configuracion" className="text-gray-500 hover:text-gray-700">
                                <Settings size={20} />
                            </Link>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 mt-4">
                        <button
                            onClick={() => setFilter('all')}
                            className={`pb-2 border-b-2 font-medium text-sm ${filter === 'all'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500'
                                }`}
                        >
                            Todas
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`pb-2 border-b-2 font-medium text-sm ${filter === 'unread'
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-gray-500'
                                }`}
                        >
                            Sin leer ({unreadCount})
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-3xl mx-auto py-4">
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="text-center py-16">
                        <Bell className="mx-auto text-gray-300 mb-4" size={64} />
                        <h3 className="text-xl font-semibold text-gray-700">No hay notificaciones</h3>
                        <p className="text-gray-500 mt-2">
                            {filter === 'unread' ? 'Todas las notificaciones están leídas' : 'Aún no tienes notificaciones'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl overflow-hidden divide-y">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                onClick={() => !notification.read_at && markAsRead(notification.id)}
                                className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.read_at ? 'bg-primary/5' : ''
                                    }`}
                            >
                                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className={`font-medium ${!notification.read_at ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-xs text-gray-400 flex-shrink-0">
                                            {formatTime(notification.created_at)}
                                        </span>
                                    </div>
                                    {notification.message && (
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{notification.message}</p>
                                    )}
                                    {notification.link && (
                                        <Link
                                            href={notification.link}
                                            className="text-sm text-primary font-medium hover:underline mt-2 inline-block"
                                        >
                                            Ver más →
                                        </Link>
                                    )}
                                </div>
                                {!notification.read_at && (
                                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
