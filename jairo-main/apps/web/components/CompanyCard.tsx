import Link from "next/link";
import { Building2, MapPin, Globe, Phone, Star, ChevronRight, Users } from "lucide-react";

interface Company {
    id: string;
    name: string;
    slug: string;
    description?: string;
    email: string;
    phone?: string;
    website?: string;
    city?: string;
    country?: string;
    sector_name?: string;
    type_name?: string;
    verified?: boolean;
    logo_url?: string;
    connection_count?: number;
}

interface CompanyCardProps {
    company: Company;
    variant?: "default" | "compact" | "featured";
}

export function CompanyCard({ company, variant = "default" }: CompanyCardProps) {
    if (variant === "compact") {
        return (
            <Link
                href={`/empresa/${company.slug}`}
                className="flex items-center gap-4 p-4 bg-white rounded-xl border hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
                <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                        <Building2 className="text-primary" size={24} />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary">
                        {company.name}
                    </h3>
                    {company.sector_name && (
                        <p className="text-sm text-gray-500 truncate">{company.sector_name}</p>
                    )}
                </div>
                <ChevronRight className="text-gray-300 group-hover:text-primary" size={20} />
            </Link>
        );
    }

    if (variant === "featured") {
        return (
            <Link
                href={`/empresa/${company.slug}`}
                className="relative bg-gradient-to-br from-primary to-primary-700 text-white rounded-2xl p-6 overflow-hidden hover:shadow-xl transition-all group"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/20 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                        <Star className="text-secondary" size={16} fill="currentColor" />
                        <span className="text-sm font-medium text-white/80">Destacado</span>
                    </div>

                    <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mb-4">
                        {company.logo_url ? (
                            <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                            <span className="text-2xl font-bold text-primary">{company.name.charAt(0)}</span>
                        )}
                    </div>

                    <h3 className="text-xl font-bold mb-2">{company.name}</h3>
                    <p className="text-white/70 text-sm line-clamp-2 mb-4">
                        {company.description || `Empresa del sector ${company.sector_name || 'tecnología'}`}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-white/60">
                        {company.city && (
                            <span className="flex items-center gap-1">
                                <MapPin size={14} />
                                {company.city}
                            </span>
                        )}
                        {company.connection_count && (
                            <span className="flex items-center gap-1">
                                <Users size={14} />
                                {company.connection_count} conexiones
                            </span>
                        )}
                    </div>
                </div>
            </Link>
        );
    }

    // Default variant
    return (
        <Link
            href={`/empresa/${company.slug}`}
            className="bg-white rounded-2xl p-6 border hover:shadow-lg hover:-translate-y-1 transition-all group"
        >
            <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    {company.logo_url ? (
                        <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                        <Building2 className="text-primary" size={32} />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 truncate group-hover:text-primary">
                            {company.name}
                        </h3>
                        {company.verified && (
                            <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                </svg>
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                        {company.sector_name && (
                            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                {company.sector_name}
                            </span>
                        )}
                        {company.type_name && (
                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                                {company.type_name}
                            </span>
                        )}
                    </div>

                    {company.description && (
                        <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                            {company.description}
                        </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        {(company.city || company.country) && (
                            <span className="flex items-center gap-1">
                                <MapPin size={12} />
                                {[company.city, company.country].filter(Boolean).join(', ')}
                            </span>
                        )}
                        {company.website && (
                            <span className="flex items-center gap-1">
                                <Globe size={12} />
                                Website
                            </span>
                        )}
                        {company.phone && (
                            <span className="flex items-center gap-1">
                                <Phone size={12} />
                                {company.phone}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}

export function CompanyGrid({ companies, variant = "default" }: { companies: Company[]; variant?: "default" | "compact" }) {
    if (variant === "compact") {
        return (
            <div className="grid gap-3">
                {companies.map((company) => (
                    <CompanyCard key={company.id} company={company} variant="compact" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies.map((company) => (
                <CompanyCard key={company.id} company={company} />
            ))}
        </div>
    );
}
