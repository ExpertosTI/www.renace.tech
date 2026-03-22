# -*- coding: utf-8 -*-
{
    'name': 'RENACE SSO',
    'version': '1.0.0',
    'category': 'Authentication',
    'summary': 'Single Sign-On integration with renace.tech portal',
    'description': """
        RENACE SSO Module
        =================
        
        Este módulo permite la autenticación SSO desde el portal de renace.tech.
        
        Características:
        - Endpoint /renace/sso para validar tokens SSO
        - Creación automática de sesión de Odoo
        - Redirección transparente sin pantalla de login
        - Integración con el sistema de tokens de renace.tech
    """,
    'author': 'RENACE.TECH',
    'website': 'https://renace.tech',
    'depends': ['base', 'web'],
    'data': [],
    'installable': True,
    'application': False,
    'auto_install': False,
    'license': 'LGPL-3',
}
