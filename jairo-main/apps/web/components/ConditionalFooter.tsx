"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./Footer";

// Routes where footer should NOT appear
const noFooterRoutes = [
    '/admin',
    '/login',
    '/registro',
    '/recuperar',
    '/onboarding',
    '/mensajes',
    '/directorio',
    '/mi-catalogo',
    '/cotizaciones',
    '/rfq',
    '/analytics',
    '/configuracion',
    '/notificaciones',
    '/empresa'
];

export function ConditionalFooter() {
    const pathname = usePathname();

    // Check if current path starts with any of the no-footer routes
    const shouldHideFooter = noFooterRoutes.some(route =>
        pathname?.startsWith(route)
    );

    if (shouldHideFooter) {
        return null;
    }

    return <Footer />;
}
