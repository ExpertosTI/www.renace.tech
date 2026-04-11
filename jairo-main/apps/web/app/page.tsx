"use client";

import Link from "next/link";
import { Building2, Network, Search, ArrowRight, ChevronRight, Star, Shield, Zap, Globe, TrendingUp, Package, Eye } from "lucide-react";
import { useState, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  images: string[];
  company_name: string;
  views: number;
}

export default function Home() {
  const [stats, setStats] = useState([
    { value: "—", label: "Empresas" },
    { value: "—", label: "Sectores" },
    { value: "—", label: "Conexiones" },
    { value: "—", label: "Satisfacción" },
  ]);
  const [busqueda, setBusqueda] = useState("");
  const [latestProducts, setLatestProducts] = useState<Product[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://jairoapp.renace.tech/api';

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        // Fetch stats
        const statsRes = await fetch(`${apiUrl}/analytics/public-stats`);
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats([
            { value: `${data.totalEmpresas || 0}+`, label: "Empresas" },
            { value: `${data.totalSectores || 12}`, label: "Sectores" },
            { value: `${data.totalConexiones || 0}+`, label: "Conexiones" },
            { value: "98%", label: "Satisfacción" },
          ]);
        }

        // Fetch latest products
        const productsRes = await fetch(`${apiUrl}/products?page=1`);
        if (productsRes.ok) {
          const data = await productsRes.json();
          setLatestProducts((data.productos || []).slice(0, 8));
        }
      } catch (e) {
        console.log("Error cargando datos");
      }
    };
    cargarDatos();
  }, []);

  const features = [
    {
      icon: Building2,
      title: "Directorio Empresarial",
      description: "Encuentra y conecta con empresas verificadas por sector y ubicación.",
    },
    {
      icon: Network,
      title: "Red de Conexiones",
      description: "Establece relaciones comerciales: proveedores, clientes, socios y distribuidores.",
    },
    {
      icon: Shield,
      title: "Empresas Verificadas",
      description: "Todas las empresas pasan por un proceso de verificación para garantizar confiabilidad.",
    },
    {
      icon: Zap,
      title: "Oportunidades B2B",
      description: "Recibe notificaciones de empresas buscando tus productos o servicios.",
    },
  ];

  const sectors = [
    { icon: "💻", name: "Tecnología" },
    { icon: "🛒", name: "Comercio" },
    { icon: "🏭", name: "Manufactura" },
    { icon: "🏗️", name: "Construcción" },
    { icon: "🏥", name: "Salud" },
    { icon: "🏖️", name: "Turismo" },
    { icon: "🌾", name: "Agricultura" },
    { icon: "💰", name: "Finanzas" },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (busqueda.trim()) {
      window.location.href = `/directorio?busqueda=${encodeURIComponent(busqueda)}`;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="pt-10 pb-20 bg-gradient-to-br from-primary via-primary-600 to-primary-700 text-white overflow-hidden relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-secondary rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative z-10 w-full flex flex-col md:flex-row items-center gap-12">
          <div className="max-w-3xl flex-1">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur px-4 py-2 rounded-full text-sm mb-6">
              <Star className="text-secondary" size={16} />
              <span>La red empresarial B2B líder de la región</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6">
              Conecta tu empresa con
              <span className="text-secondary"> nuevos mercados</span>
            </h1>

            <p className="text-xl text-white/80 mb-8 max-w-2xl">
              JairoApp es la plataforma B2B que conecta proveedores, distribuidores y empresas. Encuentra socios comerciales, expande tu red y haz crecer tu negocio.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/registro" className="bg-secondary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-secondary-600 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl">
                Registrar mi Empresa <ArrowRight size={20} />
              </Link>
              <Link href="/directorio" className="bg-white/20 backdrop-blur text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/30 transition-all flex items-center justify-center gap-2">
                Explorar Directorio
              </Link>
            </div>

            {/* Search Bar - Functional */}
            <form onSubmit={handleSearch} className="bg-white rounded-2xl p-2 flex shadow-xl max-w-xl">
              <div className="flex-1 flex items-center gap-3 px-4">
                <Search className="text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Buscar empresas, sectores..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="flex-1 py-3 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none"
                />
              </div>
              <button type="submit" className="bg-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-600 transition-colors">
                Buscar
              </button>
            </form>
          </div>

          {/* Hero Image / Dynamic Element */}
          <div className="hidden md:block flex-1 relative">
            <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-4 mb-4 border-b border-white/10 pb-4">
// <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-primary font-bold text-xl">
                //   J
                // </div>
                <div className="relative group-hover:scale-110 transition-transform duration-500">
                  <div className="absolute inset-0 bg-white/50 blur-xl rounded-full jairo-glow"></div>
                  <img src="/logo.svg" alt="JairoApp" className="w-16 h-16 object-contain relative z-10 drop-shadow-xl" />
                </div>
                <div>
                  <div className="h-4 w-32 bg-white/20 rounded mb-2"></div>
                  <div className="h-3 w-20 bg-white/10 rounded"></div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-20 bg-white/5 rounded-xl"></div>
                <div className="h-20 bg-white/5 rounded-xl"></div>
                <div className="h-20 bg-white/5 rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats - Dynamic */}
      <section className="py-12 bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl font-black text-primary">{stat.value}</p>
                <p className="text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest Products */}
      {latestProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-black text-gray-900">
                  Productos <span className="text-secondary">Recientes</span>
                </h2>
                <p className="text-gray-500 mt-2">Descubre los últimos productos agregados por nuestras empresas</p>
              </div>
              <Link
                href="/directorio"
                className="hidden md:flex items-center gap-2 text-primary font-medium hover:underline"
              >
                Ver todos <ArrowRight size={16} />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {latestProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all group"
                >
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                    {product.images && product.images[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="text-gray-300" size={48} />
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    {product.company_name && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {product.company_name}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-lg font-bold text-primary">
                        {product.price
                          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(product.price)
                          : '—'
                        }
                      </span>
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Eye size={14} />
                        {product.views || 0}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-8 md:hidden">
              <Link
                href="/directorio"
                className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
              >
                Ver todos los productos <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Todo lo que necesitas para <span className="text-primary">hacer negocios</span>
            </h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              Herramientas diseñadas para conectar empresas y facilitar el comercio B2B
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group">
                <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="text-white" size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sectors */}
      <section id="sectors" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              Explora por <span className="text-secondary">Sector</span>
            </h2>
            <p className="text-xl text-gray-500">
              Encuentra empresas en el sector que necesitas
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {sectors.map((sector, i) => (
              <Link
                key={i}
                href={`/directorio?sector=${sector.name}`}
                className="bg-white rounded-xl p-6 flex items-center gap-4 hover:shadow-lg hover:-translate-y-1 transition-all group border border-gray-100"
              >
                <span className="text-3xl">{sector.icon}</span>
                <span className="text-lg font-semibold text-gray-700 group-hover:text-primary">{sector.name}</span>
                <ChevronRight className="ml-auto text-gray-300 group-hover:text-primary" size={20} />
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link href="/directorio" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
              Ver todos los sectores <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary-700 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-black mb-6">
            ¿Listo para hacer crecer tu negocio?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Únete a cientos de empresas que ya usan JairoApp para expandir su red comercial
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/registro" className="bg-secondary text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-secondary-600 transition-all inline-flex items-center justify-center gap-2">
              Registrar Empresa Gratis <ArrowRight size={20} />
            </Link>
            <Link href="/login" className="bg-white/20 backdrop-blur text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/30 transition-all">
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
