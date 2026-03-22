# -*- coding: utf-8 -*-
{
    'name': 'RENACE SSO',
    'version': '18.0.1.0.0',
    'category': 'Authentication',
    'summary': 'Single Sign-On with renace.tech portal — botón de vinculación en usuarios',
    'description': """
        RENACE SSO Module
        =================

        Permite la autenticación SSO desde el portal de clientes renace.tech.

        Características:
        - Endpoint /renace/sso para crear sesión de Odoo automáticamente
        - Botón en el formulario de usuario para generar enlace de acceso
        - Wizard que muestra el enlace copiable y el QR
        - Integración segura con HMAC usando PORTAL_ENCRYPTION_KEY
    """,
    'author': 'RENACE.TECH',
    'website': 'https://renace.tech',
    'depends': ['base', 'web', 'mail'],
    'data': [
        'security/ir.model.access.csv',
        'views/res_users_views.xml',
        'wizard/renace_sso_link_wizard_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'renace_sso/static/src/js/sso_link_copy.js',
        ],
    },
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
