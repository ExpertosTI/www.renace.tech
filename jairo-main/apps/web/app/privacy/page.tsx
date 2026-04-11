import Link from "next/link";

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo.svg" alt="JairoApp" className="w-10 h-10 object-contain" />
                        <span className="text-2xl font-black">
                            <span className="text-primary">Jairo</span>
                            <span className="text-secondary">App</span>
                        </span>
                    </Link>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12">
                <h1 className="text-4xl font-black text-gray-900 mb-8">Política de Privacidad</h1>

                <div className="prose prose-lg max-w-none">
                    <p className="text-gray-600 mb-8">
                        <strong>Última actualización:</strong> {new Date().toLocaleDateString('es', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Información que Recopilamos</h2>
                        <p className="text-gray-600 mb-4">
                            En JairoApp recopilamos la siguiente información:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li><strong>Información de cuenta:</strong> nombre, email, contraseña (encriptada), teléfono</li>
                            <li><strong>Información empresarial:</strong> nombre de empresa, descripción, sector, ubicación</li>
                            <li><strong>Datos de uso:</strong> interacciones dentro de la plataforma, conexiones, mensajes</li>
                            <li><strong>Información técnica:</strong> dirección IP, tipo de navegador, dispositivo</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Uso de la Información</h2>
                        <p className="text-gray-600 mb-4">
                            Utilizamos tu información para:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Proporcionar y mantener nuestros servicios</li>
                            <li>Facilitar conexiones entre empresas</li>
                            <li>Enviar notificaciones relevantes sobre tu cuenta</li>
                            <li>Mejorar y personalizar la experiencia del usuario</li>
                            <li>Prevenir fraudes y garantizar la seguridad</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Compartir Información</h2>
                        <p className="text-gray-600 mb-4">
                            No vendemos tu información personal. Podemos compartir datos con:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li><strong>Otras empresas en la plataforma:</strong> Solo la información que elijas hacer pública en tu perfil</li>
                            <li><strong>Proveedores de servicios:</strong> Para procesar pagos, enviar emails, analytics</li>
                            <li><strong>Autoridades:</strong> Cuando sea requerido por ley</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Seguridad de los Datos</h2>
                        <p className="text-gray-600">
                            Implementamos medidas de seguridad técnicas y organizativas:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
                            <li>Encriptación de contraseñas con bcrypt</li>
                            <li>Conexiones HTTPS/TLS</li>
                            <li>Tokens JWT con expiración</li>
                            <li>Rate limiting para prevenir ataques</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Tus Derechos</h2>
                        <p className="text-gray-600 mb-4">
                            Tienes derecho a:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Acceder a tus datos personales</li>
                            <li>Rectificar información incorrecta</li>
                            <li>Solicitar la eliminación de tus datos</li>
                            <li>Exportar tus datos en formato portable</li>
                            <li>Retirar tu consentimiento en cualquier momento</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Cookies</h2>
                        <p className="text-gray-600">
                            Utilizamos cookies esenciales para el funcionamiento de la plataforma y cookies opcionales para análisis.
                            Puedes gestionar tus preferencias de cookies en la configuración de tu navegador.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Contacto</h2>
                        <p className="text-gray-600">
                            Para cualquier consulta sobre privacidad, contáctanos en:
                        </p>
                        <p className="text-gray-600 mt-2">
                            <strong>Email:</strong> privacidad@jairoapp.com
                        </p>
                    </section>
                </div>

                <div className="mt-12 pt-8 border-t">
                    <Link href="/" className="text-primary hover:underline">
                        ← Volver al inicio
                    </Link>
                </div>
            </main>
        </div>
    );
}
