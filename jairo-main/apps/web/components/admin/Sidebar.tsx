"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Building2,
    Tags,
    Network,
    Users,
    Settings,
    LogOut,
    ChevronLeft,
    Menu
} from "lucide-react";
import { useState } from "react";

const menuItems = [
    { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/admin/empresas", icon: Building2, label: "Empresas" },
    { href: "/admin/sectores", icon: Tags, label: "Sectores" },
    { href: "/admin/relaciones", icon: Network, label: "Engranajes" },
    { href: "/admin/usuarios", icon: Users, label: "Usuarios" },
    { href: "/admin/configuracion", icon: Settings, label: "Configuración" },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <>
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b z-50 px-4 py-3 flex items-center justify-between">
                <Link href="/admin" className="flex items-center gap-2">
                    <img src="/logo.svg" alt="JairoApp" className="w-8 h-8 object-contain" />
                    <span className="font-black text-lg">
                        <span className="text-primary">Jairo</span>
                        <span className="text-secondary">App</span>
                    </span>
                </Link>
                <button className="p-2 hover:bg-gray-100 rounded-lg">
                    <Menu size={20} />
                </button>
            </div>

            {/* Desktop Sidebar */}
            <aside className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen bg-white border-r transition-all duration-300 z-50 ${collapsed ? "w-20" : "w-64"
                }`}>
                {/* Logo */}
                <div className="p-4 border-b flex items-center justify-between">
                    <Link href="/admin" className="flex items-center gap-2">
                        <img src="/logo.svg" alt="JairoApp" className="w-10 h-10 object-contain" />
                        {!collapsed && (
                            <span className="font-black text-xl">
                                <span className="text-primary">Jairo</span>
                                <span className="text-secondary">App</span>
                            </span>
                        )}
                    </Link>
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg"
                    >
                        <ChevronLeft className={`transition-transform ${collapsed ? "rotate-180" : ""}`} size={18} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4">
                    <ul className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <li key={item.href}>
                                    <Link
                                        href={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                            ? "bg-gradient-to-r from-primary to-primary-600 text-white shadow-lg shadow-primary/25"
                                            : "text-gray-600 hover:bg-gray-100"
                                            }`}
                                    >
                                        <item.icon size={20} />
                                        {!collapsed && <span className="font-medium">{item.label}</span>}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t">
                    <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                            AD
                        </div>
                        {!collapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">Admin</p>
                                <p className="text-xs text-gray-500 truncate">Super Admin</p>
                            </div>
                        )}
                    </div>
                    <Link
                        href="/"
                        className={`flex items-center gap-3 mt-3 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors ${collapsed ? "justify-center" : ""
                            }`}
                    >
                        <LogOut size={18} />
                        {!collapsed && <span className="text-sm font-medium">Cerrar Sesión</span>}
                    </Link>
                </div>
            </aside>
        </>
    );
}
