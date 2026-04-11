"use client";

import Link from "next/link";
import { Building2, MapPin, Mail, Phone, Twitter, Linkedin, Instagram } from "lucide-react";

import { usePathname } from "next/navigation";

export function Footer() {
    const pathname = usePathname();
    const isAuthPage = ["/login", "/registro", "/recuperar", "/onboarding"].includes(pathname);
    if (isAuthPage) return null;

    const currentYear = new Date().getFullYear();

    const links = {
        platform: [
            { href: "/directorio", label: "Directorio" },
            { href: "/cotizaciones", label: "Solicitudes (RFQ)" },
            { href: "/registro", label: "Registrar Empresa" },
            { href: "/login", label: "Iniciar Sesión" }
        ],
        resources: [] as { href: string; label: string }[],
        // resources: [
        //     { href: "/ayuda", label: "Centro de Ayuda" },
        //     { href: "/blog", label: "Blog" },
        //     { href: "/api-docs", label: "API" },
        //     { href: "/partners", label: "Partners" }
        // ],
        legal: [
            { href: "/terms", label: "Términos de Uso" },
            { href: "/privacy", label: "Privacidad" },
            // { href: "/cookies", label: "Cookies" }
        ]
    };

    const socials = [
        { icon: Twitter, href: "https://twitter.com/jairoapp", label: "Twitter" },
        { icon: Linkedin, href: "https://linkedin.com/company/jairoapp", label: "LinkedIn" },
        { icon: Instagram, href: "https://instagram.com/jairoapp", label: "Instagram" }
    ];

    return (
        <footer className="bg-gray-900 text-white">
            <div className="max-w-7xl mx-auto px-4 py-16">
                <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
                    {/* Brand */}
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-4">
                            <img src="/logo.svg" alt="JairoApp" className="w-10 h-10 object-contain" />
                            <span className="text-2xl font-black">JairoApp</span>
                        </div>
                        <p className="text-gray-400 mb-6 max-w-sm">
                            Plataforma B2B líder para conectar empresas y expandir negocios.
                            Encuentra proveedores, distribuidores y socios comerciales.
                        </p>
                        <div className="flex gap-4">
                            {socials.map((social) => (
                                <a
                                    key={social.label}
                                    href={social.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center hover:bg-white/20 transition-colors"
                                    aria-label={social.label}
                                >
                                    <social.icon size={18} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Platform Links */}
                    <div>
                        <h4 className="font-bold mb-4">Plataforma</h4>
                        <ul className="space-y-3">
                            {links.platform.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h4 className="font-bold mb-4">Recursos</h4>
                        <ul className="space-y-3">
                            {links.resources.map((link) => (
                                <li key={link.href}>
                                    <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold mb-4">Contacto</h4>
                        <ul className="space-y-3 text-gray-400">
                            <li className="flex items-center gap-2">
                                <Mail size={16} />
                                <a href="mailto:info@jairoapp.com" className="hover:text-white">
                                    info@jairoapp.com
                                </a>
                            </li>
                            <li className="flex items-center gap-2">
                                <Phone size={16} />
                                <span>Soporte 24/7</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom */}
                <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-gray-400 text-sm">
                        © {currentYear} JairoApp. Todos los derechos reservados.
                    </p>
                    <div className="flex gap-6 text-sm">
                        {links.legal.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
