'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const token = searchParams.get('token');
        const error = searchParams.get('error');
        const details = searchParams.get('details');

        // Check if we're in a popup
        if (window.opener && window.opener !== window) {
            // We're in a popup - send message to parent and close
            if (token) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', token }, '*');
            } else {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: error || 'unknown', details }, '*');
            }
            window.close();
            return;
        }

        // Not in popup - handle normally
        if (token) {
            localStorage.setItem('token', token);
            // Fetch profile to store user data
            fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api'}/auth/perfil`, {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(user => {
                    localStorage.setItem('usuario', JSON.stringify(user));
                    // Redirect based on role or default
                    if (user.role === 'admin' || user.role === 'super_admin') {
                        router.push('/admin');
                    } else {
                        router.push('/directorio');
                    }
                })
                .catch(() => {
                    router.push('/login?error=auth_failed');
                });
        } else {
            router.push('/login?error=no_token');
        }
    }, [router, searchParams]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-gray-600 font-medium">Autenticando...</p>
        </div>
    );
}

export default function CallbackPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <CallbackContent />
        </Suspense>
    );
}
