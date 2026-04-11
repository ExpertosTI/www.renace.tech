import Link from "next/link";

export default function TermsPage() {
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
                <h1 className="text-4xl font-black text-gray-900 mb-8">Términos y Condiciones de Uso</h1>

                <div className="prose prose-lg max-w-none">
                    <p className="text-gray-600 mb-8">
                        <strong>Última actualización:</strong> {new Date().toLocaleDateString('es', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Aceptación de los Términos</h2>
                        <p className="text-gray-600">
                            Al acceder y utilizar JairoApp, aceptas estar legalmente vinculado por estos términos y condiciones.
                            Si no estás de acuerdo con alguna parte de estos términos, no podrás acceder al servicio.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Descripción del Servicio</h2>
                        <p className="text-gray-600">
                            JairoApp es una plataforma B2B que permite a las empresas:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
                            <li>Crear perfiles empresariales verificados</li>
                            <li>Conectar con otras empresas (proveedores, distribuidores, socios)</li>
                            <li>Publicar y buscar productos/servicios</li>
                            <li>Enviar y recibir solicitudes de cotización (RFQ)</li>
                            <li>Comunicarse a través de mensajería integrada</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Registro y Cuentas</h2>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Debes proporcionar información veraz y actualizada</li>
                            <li>Eres responsable de mantener la confidencialidad de tu contraseña</li>
                            <li>Debes tener al menos 18 años para usar el servicio</li>
                            <li>Una persona solo puede tener una cuenta activa</li>
                            <li>Nos reservamos el derecho de suspender cuentas que violen estos términos</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Uso Aceptable</h2>
                        <p className="text-gray-600 mb-4">
                            Al usar JairoApp, te comprometes a NO:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2">
                            <li>Proporcionar información falsa o engañosa</li>
                            <li>Suplantar la identidad de otra persona o empresa</li>
                            <li>Enviar spam o contenido no solicitado</li>
                            <li>Intentar acceder a cuentas de otros usuarios</li>
                            <li>Usar la plataforma para actividades ilegales</li>
                            <li>Extraer datos de manera automatizada sin autorización</li>
                            <li>Publicar contenido ofensivo, difamatorio o ilegal</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Contenido del Usuario</h2>
                        <p className="text-gray-600">
                            Mantienes la propiedad de todo el contenido que publicas. Al compartir contenido, nos otorgas
                            una licencia no exclusiva para mostrarlo en la plataforma. Eres responsable de que tu contenido
                            no infrinja derechos de terceros.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Transacciones entre Usuarios</h2>
                        <p className="text-gray-600">
                            JairoApp facilita conexiones entre empresas pero no es parte de las transacciones comerciales
                            que se realicen. No garantizamos la calidad, seguridad o legalidad de los productos/servicios
                            ofrecidos por los usuarios. Cada empresa es responsable de sus propias negociaciones.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Limitación de Responsabilidad</h2>
                        <p className="text-gray-600">
                            JairoApp se proporciona "tal cual" sin garantías de ningún tipo. No seremos responsables por:
                        </p>
                        <ul className="list-disc pl-6 text-gray-600 space-y-2 mt-4">
                            <li>Pérdidas derivadas de transacciones entre usuarios</li>
                            <li>Interrupciones temporales del servicio</li>
                            <li>Acciones de terceros en la plataforma</li>
                            <li>Pérdida de datos por causas fuera de nuestro control</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Propiedad Intelectual</h2>
                        <p className="text-gray-600">
                            La plataforma JairoApp, incluyendo su diseño, logos, código y funcionalidades, es propiedad
                            de JairoApp. No puedes copiar, modificar o distribuir ningún elemento sin autorización escrita.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Terminación</h2>
                        <p className="text-gray-600">
                            Puedes cancelar tu cuenta en cualquier momento desde la configuración. Nos reservamos el
                            derecho de suspender o terminar cuentas que violen estos términos, sin previo aviso.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Modificaciones</h2>
                        <p className="text-gray-600">
                            Podemos modificar estos términos en cualquier momento. Te notificaremos de cambios
                            significativos por email. El uso continuado del servicio constituye aceptación de los
                            nuevos términos.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contacto</h2>
                        <p className="text-gray-600">
                            Para consultas sobre estos términos:
                        </p>
                        <p className="text-gray-600 mt-2">
                            <strong>Email:</strong> legal@jairoapp.com
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
