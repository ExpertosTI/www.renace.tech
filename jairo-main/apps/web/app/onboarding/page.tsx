"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Building2, User, Package, Target, Check, ArrowRight, ArrowLeft,
    Upload, Users, Globe, Phone, Mail
} from "lucide-react";
import Link from "next/link";

const steps = [
    { id: 1, title: "Tu Perfil", icon: User },
    { id: 2, title: "Tu Empresa", icon: Building2 },
    { id: 3, title: "Productos", icon: Package },
    { id: 4, title: "Objetivos", icon: Target }
];

export default function OnboardingPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        // Profile
        nombre: "",
        telefono: "",
        cargo: "",
        // Company
        empresaNombre: "",
        empresaDescripcion: "",
        sector: "",
        tipoEmpresa: "",
        website: "",
        // Products
        tieneProductos: false,
        productosDescripcion: "",
        // Goals
        objetivos: [] as string[]
    });

    const [loading, setLoading] = useState(false);

    const submitData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api'}/usuarios/onboarding`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (!res.ok) throw new Error('Error en onboarding');

            const data = await res.json();

            // Allow user to proceed with updated context
            localStorage.setItem("onboardingComplete", "true");

            // Optionally update stored user info if you keep user in localstorage/context
            if (data.user) {
                // Update local user state logic if exists
            }

            router.push("/directorio");
        } catch (error) {
            console.error(error);
            alert('Hubo un error al guardar tu perfil. Por favor intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (currentStep < 4) {
            setCurrentStep(currentStep + 1);
        } else {
            submitData();
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const toggleGoal = (goal: string) => {
        setFormData(prev => ({
            ...prev,
            objetivos: prev.objetivos.includes(goal)
                ? prev.objetivos.filter(g => g !== goal)
                : [...prev.objetivos, goal]
        }));
    };

    const goals = [
        { id: "proveedores", label: "Encontrar proveedores", icon: "🔍" },
        { id: "clientes", label: "Conseguir nuevos clientes", icon: "💼" },
        { id: "distribuidores", label: "Buscar distribuidores", icon: "🚚" },
        { id: "socios", label: "Encontrar socios comerciales", icon: "🤝" },
        { id: "exportar", label: "Exportar productos", icon: "🌎" },
        { id: "networking", label: "Hacer networking", icon: "👥" }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-primary-600 to-primary-700">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2 mb-6">
                        <img src="/logo.svg" alt="JairoApp" className="w-12 h-12 object-contain bg-white rounded-xl p-1" />
                        <span className="text-3xl font-black text-white">JairoApp</span>
                    </Link>
                    <h1 className="text-2xl font-bold text-white mb-2">¡Bienvenido a JairoApp!</h1>
                    <p className="text-white/70">Completa tu perfil para comenzar a conectar</p>
                </div>

                {/* Progress */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    {steps.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentStep >= step.id
                                    ? "bg-white text-primary"
                                    : "bg-white/20 text-white/50"
                                    }`}
                            >
                                {currentStep > step.id ? (
                                    <Check size={20} />
                                ) : (
                                    <step.icon size={20} />
                                )}
                            </div>
                            {index < steps.length - 1 && (
                                <div
                                    className={`w-8 h-1 mx-1 rounded ${currentStep > step.id ? "bg-white" : "bg-white/20"
                                        }`}
                                />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step Title */}
                <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white">
                        Paso {currentStep}: {steps[currentStep - 1].title}
                    </h2>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl p-6 shadow-xl">
                    {/* Step 1: Profile */}
                    {currentStep === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo</label>
                                <input
                                    type="text"
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                    placeholder="Tu nombre"
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="tel"
                                    value={formData.telefono}
                                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    placeholder="+1 (XXX) XXX-XXXX"
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo en la empresa</label>
                                <input
                                    type="text"
                                    value={formData.cargo}
                                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                                    placeholder="Ej: Director Comercial"
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Company */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la empresa</label>
                                <input
                                    type="text"
                                    value={formData.empresaNombre}
                                    onChange={(e) => setFormData({ ...formData, empresaNombre: e.target.value })}
                                    placeholder="Nombre de tu empresa"
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                                <textarea
                                    value={formData.empresaDescripcion}
                                    onChange={(e) => setFormData({ ...formData, empresaDescripcion: e.target.value })}
                                    placeholder="¿A qué se dedica tu empresa?"
                                    rows={3}
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Sector</label>
                                    <select
                                        value={formData.sector}
                                        onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                    >
                                        <option value="">Seleccionar</option>
                                        <option value="tecnologia">Tecnología</option>
                                        <option value="comercio">Comercio</option>
                                        <option value="manufactura">Manufactura</option>
                                        <option value="servicios">Servicios</option>
                                        <option value="construccion">Construcción</option>
                                        <option value="salud">Salud</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        value={formData.tipoEmpresa}
                                        onChange={(e) => setFormData({ ...formData, tipoEmpresa: e.target.value })}
                                        className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                    >
                                        <option value="">Seleccionar</option>
                                        <option value="proveedor">Proveedor</option>
                                        <option value="distribuidor">Distribuidor</option>
                                        <option value="fabricante">Fabricante</option>
                                        <option value="mayorista">Mayorista</option>
                                        <option value="minorista">Minorista</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Website (opcional)</label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://tuempresa.com"
                                    className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Products */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <p className="text-gray-600 text-center">
                                ¿Tu empresa ofrece productos o servicios que quieras mostrar en el catálogo?
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setFormData({ ...formData, tieneProductos: true })}
                                    className={`p-6 rounded-xl border-2 transition-all ${formData.tieneProductos
                                        ? "border-primary bg-primary/5"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <Package className={`mx-auto mb-2 ${formData.tieneProductos ? "text-primary" : "text-gray-400"}`} size={32} />
                                    <p className="font-medium">Sí, tengo productos</p>
                                </button>
                                <button
                                    onClick={() => setFormData({ ...formData, tieneProductos: false })}
                                    className={`p-6 rounded-xl border-2 transition-all ${!formData.tieneProductos
                                        ? "border-primary bg-primary/5"
                                        : "border-gray-200 hover:border-gray-300"
                                        }`}
                                >
                                    <Users className={`mx-auto mb-2 ${!formData.tieneProductos ? "text-primary" : "text-gray-400"}`} size={32} />
                                    <p className="font-medium">Solo networking</p>
                                </button>
                            </div>

                            {formData.tieneProductos && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Describe brevemente tus productos/servicios
                                    </label>
                                    <textarea
                                        value={formData.productosDescripcion}
                                        onChange={(e) => setFormData({ ...formData, productosDescripcion: e.target.value })}
                                        placeholder="Ej: Fabricamos equipos industriales, ofrecemos servicios de consultoría..."
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white border rounded-xl text-gray-900 resize-none"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 4: Goals */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <p className="text-gray-600 text-center mb-4">
                                ¿Qué esperas lograr con JairoApp? (Selecciona todos los que apliquen)
                            </p>

                            <div className="grid grid-cols-2 gap-3">
                                {goals.map((goal) => (
                                    <button
                                        key={goal.id}
                                        onClick={() => toggleGoal(goal.id)}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${formData.objetivos.includes(goal.id)
                                            ? "border-primary bg-primary/5"
                                            : "border-gray-200 hover:border-gray-300"
                                            }`}
                                    >
                                        <span className="text-2xl mb-2 block">{goal.icon}</span>
                                        <span className="text-sm font-medium">{goal.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex gap-3 mt-8">
                        {currentStep > 1 && (
                            <button
                                onClick={handleBack}
                                className="flex-1 py-3 border rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50"
                            >
                                <ArrowLeft size={18} /> Atrás
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 py-3 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-primary-600 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? "Guardando..." : (currentStep === 4 ? "Completar" : "Siguiente")} {!loading && <ArrowRight size={18} />}
                        </button>
                    </div>

                    {/* Skip */}
                    {currentStep < 4 && (
                        <button
                            onClick={() => setCurrentStep(4)}
                            className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
                        >
                            Saltar por ahora
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
}
