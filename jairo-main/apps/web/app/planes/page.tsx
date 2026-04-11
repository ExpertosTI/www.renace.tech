"use client";

import React, { Suspense, useEffect, useState } from "react";
import { Check, Star, Zap, Shield, ArrowRight, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

function PlanesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string>("free");

    useEffect(() => {
        // Check current plan from user profile (mock)
        // In real app, fetch from /api/users/me
        const paymentStatus = searchParams?.get('payment');
        if (paymentStatus === 'success') {
            alert("¡Pago realizado con éxito! Tu plan ha sido actualizado.");
            // Refresh user data (if context exists)
        } else if (paymentStatus === 'cancelled') {
            alert("El proceso de pago fue cancelado.");
        }
    }, [searchParams]);

    const handleSubscribe = async (planKey: string) => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login?redirect=/planes');
            return;
        }

        setLoading(true);
        try {
            // Determine user ID from token (simple decode)
            const payload = JSON.parse(atob(token.split('.')[1] || ""));

            const res = await fetch(`${API_URL}/pagos/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    plan: planKey,
                    userId: payload.id
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url; // Redirect to Stripe
                } else {
                    alert("Error obteniendo link de pago");
                }
            } else {
                alert("Error al iniciar suscripción");
            }
        } catch {
            alert("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const plans = [
        {
            key: 'free',
            name: "Gratis",
            price: "$0",
            period: "/mes",
            description: "Para comenzar a descubrir oportunidades.",
            features: [
                "Acceso al Directorio Básico",
                "Ver 3 RFQs por mes",
                "Perfil de Empresa Básico",
                "Soporte por Email"
            ],
            buttonText: "Plan Actual",
            primary: false
        },
        {
            key: 'pro',
            name: "Profesional",
            price: "$29",
            period: "/mes",
            description: "Para empresas que buscan crecer activamente.",
            features: [
                "Directorio Completo Ilimitado",
                "RFQs Ilimitados",
                "Perfil Destacado",
                "Prioridad en Búsquedas",
                "Mensajería Directa Ilimitada",
                "Soporte Prioritario"
            ],
            buttonText: "Mejorar Plan",
            primary: true
        },
        {
            key: 'enterprise',
            name: "Enterprise",
            price: "$99",
            period: "/mes",
            description: "Soluciones a medida para grandes volúmenes.",
            features: [
                "Todo lo de Profesional",
                "API de Integración",
                "Account Manager Dedicado",
                "Múltiples Usuarios Admin",
                "Auditoría Avanzada",
                "Soporte 24/7"
            ],
            buttonText: "Contactar Ventas",
            primary: false,
            action: () => router.push('/contacto')
        }
    ];

    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            <div className="pt-24 pb-20">
                <div className="max-w-7xl mx-auto px-4 text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                        Planes que escalan <span className="text-primary">contigo</span>
                    </h1>
                    <p className="text-xl text-gray-500 max-w-2xl mx-auto">
                        Elige el plan perfecto para potenciar tus conexiones B2B y acceder a las mejores oportunidades del mercado.
                    </p>
                </div>

                <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => (
                        <div key={plan.key} className={`relative rounded-3xl p-8 border ${plan.primary
                            ? 'border-primary bg-primary/5 shadow-xl scale-105 z-10'
                            : 'border-gray-200 hover:border-primary/50 transition-colors'
                            }`}>
                            {plan.primary && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg flex items-center gap-2">
                                    <Star size={14} fill="white" /> Más Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black text-gray-900">{plan.price}</span>
                                    <span className="text-gray-500 font-medium">{plan.period}</span>
                                </div>
                                <p className="text-gray-500 mt-4 h-12">{plan.description}</p>
                            </div>

                            <ul className="space-y-4 mb-8">
                                {plan.features.map((feat, i) => (
                                    <li key={i} className="flex items-start gap-3 text-gray-700">
                                        <div className={`mt-1 p-1 rounded-full ${plan.primary ? 'bg-primary/20 text-primary' : 'bg-gray-100 text-gray-500'}`}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        <span className="text-sm font-medium">{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            <button
                                onClick={() => plan.action ? plan.action() : handleSubscribe(plan.key)}
                                disabled={loading || plan.key === 'free'} // Disable free if already default
                                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${plan.primary
                                    ? 'bg-gradient-to-r from-primary to-orange-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02]'
                                    : plan.key === 'free'
                                        ? 'bg-gray-100 text-gray-400 cursor-default'
                                        : 'bg-white border-2 border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white'
                                    }`}
                            >
                                {plan.buttonText} {plan.key !== 'free' && <ArrowRight size={18} />}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="max-w-3xl mx-auto px-4 mt-20 text-center">
                    <p className="text-gray-400 text-sm">
                        * Todos los precios están expresados en dólares americanos (USD). Los planes se renuevan automáticamente cada mes. Puedes cancelar en cualquier momento desde tu panel de administración.
                    </p>
                </div>
            </div>

            <Footer />
        </div>
    );
}

export default function PlanesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <p className="text-gray-500 font-medium">Cargando planes...</p>
                </div>
            </div>
        }>
            <PlanesContent />
        </Suspense>
    );
}
