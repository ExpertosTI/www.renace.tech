"use client";

import { useState, useEffect } from "react";
import {
    Settings, User, Building2, Bell, Shield, CreditCard,
    Globe, Moon, Sun, ChevronRight, LogOut, Camera, Loader2, Link as LinkIcon, CheckCircle, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Company Section Component
function CompanySection({ API_URL, user }: { API_URL: string; user: any }) {
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [linking, setLinking] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const getToken = () => localStorage.getItem("token");

    useEffect(() => {
        checkCompanyStatus();
    }, []);

    const checkCompanyStatus = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/perfil`, {
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (data.company_id) {
                    // Fetch company details
                    const compRes = await fetch(`${API_URL}/empresas/${data.company_id}`);
                    if (compRes.ok) {
                        setCompanyInfo(await compRes.json());
                    }
                }
            }
        } catch {
            // Silent fail
        } finally {
            setLoading(false);
        }
    };

    const linkCompany = async () => {
        setLinking(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await fetch(`${API_URL}/usuarios/claim-company`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${getToken()}` }
            });
            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: data.message });
                if (data.company) {
                    setCompanyInfo(data.company);
                    // Update stored user info
                    const storedUser = localStorage.getItem("usuario");
                    if (storedUser) {
                        const userData = JSON.parse(storedUser);
                        userData.company_id = data.company.id;
                        userData.empresa_nombre = data.company.name;
                        localStorage.setItem("usuario", JSON.stringify(userData));
                    }
                }
            } else {
                setMessage({ type: 'error', text: data.message || 'Error al vincular empresa' });
            }
        } catch {
            setMessage({ type: 'error', text: 'Error de conexión' });
        } finally {
            setLinking(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl p-6 shadow-sm flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={32} />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Mi Empresa</h2>

            {companyInfo ? (
                <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
                        <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="font-medium text-green-800">Empresa Vinculada</p>
                            <p className="text-green-700 text-sm">Tu cuenta está conectada a una empresa</p>
                        </div>
                    </div>

                    {/* Logo Section */}
                    <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <div className="w-20 h-20 bg-white border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden">
                                    {companyInfo.logo ? (
                                        <img
                                            src={companyInfo.logo}
                                            alt={companyInfo.name}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <Building2 className="text-gray-400" size={32} />
                                    )}
                                </div>
                                <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl cursor-pointer">
                                    <Camera className="text-white" size={24} />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;

                                            // Convert to base64 for now (in production use proper upload)
                                            const reader = new FileReader();
                                            reader.onloadend = async () => {
                                                try {
                                                    const res = await fetch(`${API_URL}/empresas/${companyInfo.id}`, {
                                                        method: 'PUT',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            Authorization: `Bearer ${getToken()}`
                                                        },
                                                        body: JSON.stringify({ logo: reader.result })
                                                    });
                                                    if (res.ok) {
                                                        setCompanyInfo({ ...companyInfo, logo: reader.result as string });
                                                        setMessage({ type: 'success', text: 'Logo actualizado' });
                                                    }
                                                } catch {
                                                    setMessage({ type: 'error', text: 'Error al subir logo' });
                                                }
                                            };
                                            reader.readAsDataURL(file);
                                        }}
                                    />
                                </label>
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">{companyInfo.name}</h3>
                                <p className="text-sm text-gray-500">
                                    Estado: <span className={companyInfo.status === 'active' ? 'text-green-600' : 'text-yellow-600'}>
                                        {companyInfo.status === 'active' ? 'Activa' : companyInfo.status === 'pending' ? 'Pendiente' : companyInfo.status}
                                    </span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">Haz clic en el logo para cambiarlo</p>
                            </div>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${message.type === 'success'
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                            }`}>
                            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                        </div>
                    )}

                    <Link
                        href="/mi-catalogo"
                        className="block w-full py-3 bg-primary text-white rounded-xl font-medium text-center hover:bg-primary-600 transition-colors"
                    >
                        Gestionar Mi Catálogo
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
                        <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                        <div>
                            <p className="font-medium text-yellow-800">Sin Empresa Vinculada</p>
                            <p className="text-yellow-700 text-sm">
                                Para publicar productos y crear cotizaciones necesitas vincular tu cuenta a una empresa.
                            </p>
                        </div>
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success'
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                            }`}>
                            {message.type === 'success' ? (
                                <CheckCircle className="flex-shrink-0 mt-0.5" size={18} />
                            ) : (
                                <AlertCircle className="flex-shrink-0 mt-0.5" size={18} />
                            )}
                            <span className="text-sm">{message.text}</span>
                        </div>
                    )}

                    <button
                        onClick={linkCompany}
                        disabled={linking}
                        className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {linking ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                Vinculando...
                            </>
                        ) : (
                            <>
                                <LinkIcon size={18} />
                                Vincular Mi Empresa
                            </>
                        )}
                    </button>

                    <p className="text-sm text-gray-500 text-center">
                        Tu cuenta ({user?.email}) se vinculará automáticamente a una empresa registrada con el mismo email.
                    </p>

                    <div className="pt-4 border-t">
                        <p className="text-sm text-gray-600 mb-2">¿No tienes empresa registrada?</p>
                        <Link
                            href="/registro"
                            className="block w-full py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium text-center hover:bg-gray-100 transition-colors"
                        >
                            Registrar Nueva Empresa
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function ConfiguracionPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeSection, setActiveSection] = useState('profile');
    const [darkMode, setDarkMode] = useState(false);
    const [notifPrefs, setNotifPrefs] = useState({
        emailConnections: true,
        emailMessages: true,
        emailRfqs: true,
        pushEnabled: true
    });

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

    useEffect(() => {
        const storedUser = localStorage.getItem("usuario");
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        loadPreferences();
    }, []);

    const getToken = () => localStorage.getItem("token");

    const loadPreferences = async () => {
        // Load from local storage or API
        const savedDarkMode = localStorage.getItem("darkMode") === "true";
        setDarkMode(savedDarkMode);
    };

    const saveNotificationPrefs = async () => {
        try {
            await fetch(`${API_URL}/notifications/preferences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getToken()}`
                },
                body: JSON.stringify(notifPrefs)
            });
        } catch (error) {
            console.error("Error saving preferences:", error);
        }
    };

    const toggleDarkMode = () => {
        const newValue = !darkMode;
        setDarkMode(newValue);
        localStorage.setItem("darkMode", String(newValue));
        // Apply to document
        document.documentElement.classList.toggle('dark', newValue);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        router.push("/login");
    };

    const sections = [
        { id: 'profile', icon: User, label: 'Perfil' },
        { id: 'company', icon: Building2, label: 'Mi Empresa' },
        { id: 'notifications', icon: Bell, label: 'Notificaciones' },
        { id: 'security', icon: Shield, label: 'Seguridad' },
        { id: 'appearance', icon: Moon, label: 'Apariencia' },
        { id: 'language', icon: Globe, label: 'Idioma' }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Link href="/directorio" className="text-gray-500 hover:text-gray-700">
                        <ChevronRight className="rotate-180" size={24} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
                </div>
            </header>

            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <div className="md:w-64 flex-shrink-0">
                        <div className="bg-white rounded-2xl p-4 shadow-sm">
                            <nav className="space-y-1">
                                {sections.map((section) => (
                                    <button
                                        key={section.id}
                                        onClick={() => setActiveSection(section.id)}
                                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeSection === section.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-gray-700 hover:bg-gray-50'
                                            }`}
                                    >
                                        <section.icon size={20} />
                                        <span className="font-medium">{section.label}</span>
                                    </button>
                                ))}
                                <hr className="my-4" />
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={20} />
                                    <span className="font-medium">Cerrar Sesión</span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        {activeSection === 'profile' && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 mb-6">Información del Perfil</h2>

                                <div className="flex items-center gap-6 mb-8">
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                                            <span className="text-white text-3xl font-bold">
                                                {user?.nombre?.charAt(0) || 'U'}
                                            </span>
                                        </div>
                                        <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center border hover:bg-gray-50">
                                            <Camera size={16} className="text-gray-600" />
                                        </button>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{user?.nombre || 'Usuario'}</h3>
                                        <p className="text-gray-500">{user?.email}</p>
                                        <p className="text-sm text-primary capitalize mt-1">{user?.rol || 'Usuario'}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                        <input
                                            type="text"
                                            defaultValue={user?.nombre}
                                            className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                        <input
                                            type="email"
                                            defaultValue={user?.email}
                                            className="w-full px-4 py-3 bg-gray-50 border rounded-xl text-gray-900"
                                        />
                                    </div>
                                    <button className="w-full py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-600">
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeSection === 'company' && (
                            <CompanySection API_URL={API_URL} user={user} />
                        )}

                        {activeSection === 'notifications' && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 mb-6">Preferencias de Notificaciones</h2>

                                <div className="space-y-4">
                                    {[
                                        { key: 'emailConnections', label: 'Notificaciones de conexiones', desc: 'Recibe emails cuando alguien quiere conectar contigo' },
                                        { key: 'emailMessages', label: 'Notificaciones de mensajes', desc: 'Recibe emails cuando recibes nuevos mensajes' },
                                        { key: 'emailRfqs', label: 'Notificaciones de RFQs', desc: 'Recibe emails sobre nuevas solicitudes de cotización' },
                                        { key: 'pushEnabled', label: 'Notificaciones push', desc: 'Recibe notificaciones en el navegador' }
                                    ].map((item) => (
                                        <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                            <div>
                                                <p className="font-medium text-gray-900">{item.label}</p>
                                                <p className="text-sm text-gray-500">{item.desc}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setNotifPrefs({ ...notifPrefs, [item.key]: !notifPrefs[item.key as keyof typeof notifPrefs] });
                                                }}
                                                className={`w-12 h-6 rounded-full transition-colors ${notifPrefs[item.key as keyof typeof notifPrefs] ? 'bg-primary' : 'bg-gray-300'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${notifPrefs[item.key as keyof typeof notifPrefs] ? 'translate-x-6' : 'translate-x-0.5'
                                                    }`} />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={saveNotificationPrefs}
                                    className="w-full mt-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-600"
                                >
                                    Guardar Preferencias
                                </button>
                            </div>
                        )}

                        {activeSection === 'security' && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 mb-6">Seguridad</h2>

                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">Cambiar Contraseña</p>
                                                <p className="text-sm text-gray-500">Actualiza tu contraseña regularmente</p>
                                            </div>
                                            <button className="text-primary font-medium hover:underline">
                                                Cambiar
                                            </button>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">Autenticación de dos factores</p>
                                                <p className="text-sm text-gray-500">Añade una capa extra de seguridad</p>
                                            </div>
                                            <span className="text-sm text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                                                Próximamente
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-900">Sesiones activas</p>
                                                <p className="text-sm text-gray-500">Revisa y cierra sesiones en otros dispositivos</p>
                                            </div>
                                            <button className="text-primary font-medium hover:underline">
                                                Ver
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'appearance' && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 mb-6">Apariencia</h2>

                                <div className="p-4 bg-gray-50 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            {darkMode ? <Moon className="text-primary" size={24} /> : <Sun className="text-orange-500" size={24} />}
                                            <div>
                                                <p className="font-medium text-gray-900">Modo Oscuro</p>
                                                <p className="text-sm text-gray-500">
                                                    {darkMode ? 'Activado' : 'Desactivado'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={toggleDarkMode}
                                            className={`w-12 h-6 rounded-full transition-colors ${darkMode ? 'bg-primary' : 'bg-gray-300'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-0.5'
                                                }`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeSection === 'language' && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 mb-6">Idioma</h2>

                                <div className="space-y-2">
                                    {[
                                        { code: 'es', label: 'Español', flag: '🇪🇸' },
                                        { code: 'en', label: 'English', flag: '🇺🇸' },
                                        { code: 'pt', label: 'Português', flag: '🇧🇷' }
                                    ].map((lang) => (
                                        <button
                                            key={lang.code}
                                            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-colors ${lang.code === 'es' ? 'bg-primary/10 border-2 border-primary' : 'bg-gray-50 hover:bg-gray-100'
                                                }`}
                                        >
                                            <span className="text-2xl">{lang.flag}</span>
                                            <span className="font-medium text-gray-900">{lang.label}</span>
                                            {lang.code === 'es' && (
                                                <span className="ml-auto text-primary text-sm">Actual</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeSection === 'company' && (
                            <div className="bg-white rounded-2xl p-6 shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 mb-6">Mi Empresa</h2>

                                {user?.empresa ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                                            <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center">
                                                <Building2 className="text-primary" size={32} />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{user.empresa.nombre}</h3>
                                                <p className="text-sm text-gray-500">/{user.empresa.slug}</p>
                                            </div>
                                        </div>
                                        <Link
                                            href={`/empresa/${user.empresa.slug}/editar`}
                                            className="block w-full py-3 text-center bg-primary text-white rounded-xl font-medium"
                                        >
                                            Editar Empresa
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="text-center py-8">
                                        <Building2 className="mx-auto text-gray-300 mb-4" size={48} />
                                        <p className="text-gray-500 mb-4">No tienes una empresa asociada</p>
                                        <Link
                                            href="/registro"
                                            className="inline-block bg-primary text-white px-6 py-3 rounded-xl font-medium"
                                        >
                                            Registrar Empresa
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
