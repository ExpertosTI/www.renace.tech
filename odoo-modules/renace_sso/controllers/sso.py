# -*- coding: utf-8 -*-
import requests
import logging
from odoo import http
from odoo.http import request

_logger = logging.getLogger(__name__)

RENACE_SSO_VERIFY_URL = 'https://renace.tech/api/sso/verify'


class RenaceSSOController(http.Controller):
    
    @http.route('/renace/sso', type='http', auth='none', csrf=False, methods=['GET'])
    def sso_login(self, token=None, **kwargs):
        """
        Endpoint SSO que recibe el token desde renace.tech y crea la sesión de Odoo.
        
        Flujo:
        1. Recibe token desde URL
        2. Valida token contra renace.tech API
        3. Obtiene datos del usuario (odoo_login, odoo_db)
        4. Crea sesión de Odoo automáticamente
        5. Redirige a /web
        """
        if not token:
            return request.redirect('/web/login?error=' + 
                'Token SSO no proporcionado. Por favor inicia sesión desde el portal.')
        
        try:
            # Validar token contra renace.tech
            _logger.info(f'[RENACE SSO] Validating token: {token[:8]}...')
            
            response = requests.get(
                RENACE_SSO_VERIFY_URL,
                params={'token': token},
                timeout=10
            )
            
            if response.status_code != 200:
                error_msg = response.json().get('error', 'Token inválido')
                _logger.warning(f'[RENACE SSO] Token validation failed: {error_msg}')
                return request.redirect('/web/login?error=' + error_msg)
            
            data = response.json()
            
            if not data.get('valid'):
                _logger.warning('[RENACE SSO] Token not valid')
                return request.redirect('/web/login?error=Token SSO inválido')
            
            odoo_login = data.get('odoo_login')
            odoo_db = data.get('odoo_db')
            
            if not odoo_login or not odoo_db:
                _logger.error('[RENACE SSO] Missing odoo_login or odoo_db in response')
                return request.redirect('/web/login?error=Datos de autenticación incompletos')
            
            # Verificar que estamos en la base de datos correcta
            current_db = request.session.db
            if current_db and current_db != odoo_db:
                _logger.warning(f'[RENACE SSO] DB mismatch: current={current_db}, expected={odoo_db}')
                return request.redirect('/web/login?error=Base de datos incorrecta')
            
            # Establecer la base de datos si no está configurada
            if not current_db:
                request.session.db = odoo_db
            
            # Buscar el usuario en Odoo
            uid = request.env['res.users'].sudo().search([
                ('login', '=', odoo_login)
            ], limit=1).id
            
            if not uid:
                _logger.error(f'[RENACE SSO] User not found: {odoo_login}')
                return request.redirect('/web/login?error=Usuario no encontrado en Odoo')
            
            # Crear sesión de Odoo
            request.session.authenticate(odoo_db, odoo_login, uid)
            request.session.uid = uid
            request.session.login = odoo_login
            request.session.session_token = request.env['res.users'].browse(uid)._compute_session_token(request.session.sid)
            
            _logger.info(f'[RENACE SSO] Successfully authenticated user: {odoo_login}')
            
            # Redirigir a /web
            return request.redirect('/web')
            
        except requests.exceptions.RequestException as e:
            _logger.error(f'[RENACE SSO] Request error: {str(e)}')
            return request.redirect('/web/login?error=Error de conexión con el servidor de autenticación')
        
        except Exception as e:
            _logger.error(f'[RENACE SSO] Unexpected error: {str(e)}')
            return request.redirect('/web/login?error=Error interno del servidor')
