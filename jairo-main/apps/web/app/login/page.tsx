"use client";

import { useState, useEffect, Suspense } from "react";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [formulario, setFormulario] = useState({
        email: "",
        password: "",
    });

    // Handle Google OAuth callback (from URL params - fallback)
    useEffect(() => {
        const token = searchParams.get('token');
        const googleAuth = searchParams.get('google');
        const errorParam = searchParams.get('error');
        const errorDetails = searchParams.get('details');

        if (errorParam) {
            let msg = 'Error al iniciar sesión con Google.';
            if (errorDetails) {
                try {
                    const decoded = decodeURIComponent(errorDetails);
                    msg += ` Detalle: ${decoded.substring(0, 100)}`;
                } catch {
                    msg += ` Detalle: ${errorDetails}`;
                }
            }
            setError(msg);
            return;
        }

        if (token && googleAuth) {
            handleGoogleToken(token);
        }
    }, [searchParams, router]);

    // Handle Google OAuth popup message
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'GOOGLE_AUTH_SUCCESS' && event.data?.token) {
                handleGoogleToken(event.data.token);
            } else if (event.data?.type === 'GOOGLE_AUTH_ERROR') {
                setError(`Error al iniciar sesión con Google. ${event.data.details || ''}`);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [router]);

    const handleGoogleToken = (token: string) => {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            localStorage.setItem("token", token);
            localStorage.setItem("usuario", JSON.stringify({
                id: payload.id,
                email: payload.email,
                nombre: payload.email.split('@')[0],
                rol: payload.role
            }));

            if (payload.role === "super_admin" || payload.role === "admin") {
                router.push("/admin");
            } else {
                router.push("/directorio");
            }
        } catch (e) {
            setError('Error procesando autenticación');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setCargando(true);

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';
            const res = await fetch(`${apiUrl}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formulario),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Error al iniciar sesión");
            }

            localStorage.setItem("token", data.token);
            localStorage.setItem("usuario", JSON.stringify(data.usuario));

            if (data.usuario.rol === "super_admin" || data.usuario.rol === "admin") {
                router.push("/admin");
            } else {
                router.push("/directorio");
            }
        } catch (err: any) {
            setError(err.message || "Credenciales inválidas");
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-primary-600 to-primary-700 flex items-center justify-center p-4">
            {/* Background decorations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-20 w-72 h-72 bg-secondary/20 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-20 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 justify-center">
                        <img src="/logo.svg" alt="JairoApp" className="w-32 h-32 object-contain bg-white rounded-2xl p-2 shadow-lg" />
                    </Link>
                    <p className="text-white/80 mt-4 text-lg font-medium">Plataforma B2B Empresarial</p>
                </div>

                {/* Card */}
                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Iniciar Sesión</h2>
                    <p className="text-gray-500 mb-6">Accede a tu cuenta empresarial</p>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4 mb-6">
                        <button
                            type="button"
                            onClick={() => {
                                const width = 500;
                                const height = 600;
                                const left = window.screenX + (window.outerWidth - width) / 2;
                                const top = window.screenY + (window.outerHeight - height) / 2;
                                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';
                                window.open(
                                    `${apiUrl}/auth/google`,
                                    'Google Login',
                                    `width=${width},height=${height},left=${left},top=${top}`
                                );
                            }}
                            className="w-full bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-50 flex items-center justify-center gap-3 transition-all"
                        >
                            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                            Continuar con Google
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-4 text-gray-500">O usa tu correo</span>
                            </div>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="email"
                                    value={formulario.email}
                                    onChange={(e) => setFormulario({ ...formulario, email: e.target.value })}
                                    placeholder="tu@email.com"
                                    className="w-full pl-14 pr-4 py-3.5 bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type={mostrarPassword ? "text" : "password"}
                                    value={formulario.password}
                                    onChange={(e) => setFormulario({ ...formulario, password: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full pl-14 pr-12 py-3.5 bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setMostrarPassword(!mostrarPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {mostrarPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary" />
                                <span className="text-gray-600">Recordarme</span>
                            </label>
                            <Link href="/recuperar" className="text-primary font-medium hover:underline">
                                ¿Olvidaste tu contraseña?
                            </Link>
                        </div>

                        <button
                            type="submit"
                            disabled={cargando}
                            className="w-full bg-gradient-to-r from-primary to-primary-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/25 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
                        >
                            {cargando ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    Iniciar Sesión <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500">
                            ¿No tienes cuenta?{" "}
                            <Link href="/registro" className="text-primary font-semibold hover:underline">
                                Registra tu empresa
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/50 text-xs mt-6">
                    © 2026 JairoApp. Todos los derechos reservados.
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-primary via-primary-dark to-gray-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-white" /></div>}>
            <LoginContent />
        </Suspense>
    );
}
