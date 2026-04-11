"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    Menu, X, Bell, MessageCircle, User, Building2,
    BarChart3, Package, FileText, Settings, LogOut, Search
} from "lucide-react";

export function Navbar() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [showUserMenu, setShowUserMenu] = useState(false);

    const isAuthPage = ["/login", "/registro", "/recuperar", "/onboarding"].includes(pathname);

    // ALL hooks must be called BEFORE any conditional returns (React Rules of Hooks)
    useEffect(() => {
        setMounted(true);
        const storedUser = localStorage.getItem("usuario");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // Load unread counts only when mounted and user exists
    useEffect(() => {
        if (mounted && user) {
            loadUnreadCounts();
        }
    }, [mounted, user]);

    // Conditional returns AFTER all hooks
    if (!mounted || isAuthPage) return null;

    const loadUnreadCounts = async () => {
        const token = localStorage.getItem("token");
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

        try {
            const [msgRes, notifRes] = await Promise.all([
                fetch(`${API_URL}/messages/unread-count`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/notifications/unread-count`, { headers: { Authorization: `Bearer ${token}` } })
            ]);

            const [msgData, notifData] = await Promise.all([msgRes.json(), notifRes.json()]);
            setUnreadMessages(msgData.unread || 0);
            setUnreadNotifs(notifData.unread || 0);
        } catch (error) {
            // Silently fail
        }
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.href = "/login";
    };

    const navLinks = [
        { href: "/directorio", label: "Directorio" },
        { href: "/cotizaciones", label: "RFQs" },
        { href: "/analytics", label: "Analytics" }
    ];

    const userMenuItems = [
        { href: "/mi-catalogo", icon: Package, label: "Mi Catálogo" },
        { href: "/analytics", icon: BarChart3, label: "Analytics" },
        { href: "/configuracion", icon: Settings, label: "Configuración" }
    ];

    return (
        <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo.svg" alt="JairoApp" className="w-10 h-10 object-contain" />
                        <span className="text-2xl font-black hidden sm:block">
                            <span className="text-primary">Jairo</span>
                            <span className="text-secondary">App</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`font-medium transition-colors ${pathname === link.href
                                    ? "text-primary"
                                    : "text-gray-600 hover:text-primary"
                                    }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                    </nav>

                    {/* Right Side */}
                    <div className="flex items-center gap-2">
                        {user ? (
                            <>
                                {/* Messages */}
                                <Link
                                    href="/mensajes"
                                    className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <MessageCircle size={22} className="text-gray-600" />
                                    {unreadMessages > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                                            {unreadMessages > 9 ? '9+' : unreadMessages}
                                        </span>
                                    )}
                                </Link>

                                {/* Notifications */}
                                <Link
                                    href="/notificaciones"
                                    className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors"
                                >
                                    <Bell size={22} className="text-gray-600" />
                                    {unreadNotifs > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-secondary text-white text-xs rounded-full flex items-center justify-center">
                                            {unreadNotifs > 9 ? '9+' : unreadNotifs}
                                        </span>
                                    )}
                                </Link>

                                {/* User Menu */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
                                        type="button"
                                    >
                                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center pointer-events-none">
                                            <span className="text-white font-bold text-sm">
                                                {user.nombre?.charAt(0) || 'U'}
                                            </span>
                                        </div>
                                        <span className="hidden sm:block text-sm font-medium text-gray-700 pointer-events-none">
                                            {user.nombre?.split(' ')[0]}
                                        </span>
                                    </button>

                                    {showUserMenu && (
                                        <>
                                            {/* Backdrop to close on click outside */}
                                            <div
                                                className="fixed inset-0 z-[9998] bg-black/20"
                                                onClick={() => setShowUserMenu(false)}
                                            />
                                            <div className="fixed right-4 top-16 w-64 bg-white rounded-2xl shadow-2xl border py-2 z-[9999] max-h-[80vh] overflow-y-auto">
                                                <div className="px-4 py-3 border-b">
                                                    <p className="font-medium text-gray-900">{user.nombre}</p>
                                                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                                                </div>
                                                {userMenuItems.map((item) => (
                                                    <Link
                                                        key={item.href}
                                                        href={item.href}
                                                        onClick={() => setShowUserMenu(false)}
                                                        className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 text-gray-700"
                                                    >
                                                        <item.icon size={18} />
                                                        {item.label}
                                                    </Link>
                                                ))}
                                                <hr className="my-2" />
                                                <button
                                                    onClick={logout}
                                                    className="flex items-center gap-3 px-4 py-2 hover:bg-red-50 text-red-600 w-full"
                                                >
                                                    <LogOut size={18} />
                                                    Cerrar Sesión
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="text-gray-600 hover:text-primary font-medium px-4 py-2"
                                >
                                    Iniciar Sesión
                                </Link>
                                <Link
                                    href="/registro"
                                    className="bg-primary text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-600"
                                >
                                    Registrar
                                </Link>
                            </>
                        )}

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="md:hidden p-2 rounded-xl hover:bg-gray-100"
                        >
                            {isOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isOpen && (
                    <div className="md:hidden py-4 border-t">
                        <nav className="flex flex-col gap-2">
                            {navLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`px-4 py-3 rounded-xl font-medium ${pathname === link.href
                                        ? "bg-primary/10 text-primary"
                                        : "text-gray-600 hover:bg-gray-50"
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </nav>
                    </div>
                )}
            </div>
        </header>
    );
}
