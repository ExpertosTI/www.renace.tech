# -*- coding: utf-8 -*-
import requests
import hmac
import hashlib
import time
import logging
from odoo import models, fields, api
from odoo.exceptions import UserError

_logger = logging.getLogger(__name__)

RENACE_API_BASE = 'https://renace.tech'


class RenaceSSOLinkWizard(models.TransientModel):
    _name = 'renace.sso.link.wizard'
    _description = 'Wizard — Generar Enlace SSO de RENACE'

    user_id = fields.Many2one(
        'res.users',
        string='Usuario',
        required=True,
        readonly=True,
    )
    odoo_login = fields.Char(
        string='Login',
        required=True,
        readonly=True,
    )
    instance_name = fields.Char(
        string='Nombre de Instancia',
        help='Nombre descriptivo de esta instancia de Odoo en el portal.',
    )
    sso_link = fields.Char(
        string='Enlace de Acceso',
        readonly=True,
    )
    state = fields.Selection(
        [('draft', 'Pendiente'), ('done', 'Enlace Generado'), ('error', 'Error')],
        default='draft',
        readonly=True,
    )
    error_message = fields.Char(readonly=True)

    def _get_portal_encryption_key(self):
        """Obtiene la clave de cifrado del portal desde ir.config_parameter."""
        key = self.env['ir.config_parameter'].sudo().get_param('renace_sso.portal_encryption_key', '')
        if not key:
            raise UserError(
                'No se encontró la clave de cifrado del portal (renace_sso.portal_encryption_key). '
                'Configúrala en Ajustes → Parámetros Técnicos.'
            )
        return key

    def _get_odoo_base_url(self):
        """Obtiene la URL base de esta instancia de Odoo."""
        return self.env['ir.config_parameter'].sudo().get_param('web.base.url', '')

    def _build_hmac_signature(self, payload: str, secret: str) -> str:
        """Genera firma HMAC-SHA256 para autenticar la solicitud admin."""
        return hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

    def action_generate_link(self):
        """Llama al API de renace.tech para generar un token SSO de administrador."""
        self.ensure_one()

        try:
            portal_key = self._get_portal_encryption_key()
        except UserError as e:
            self.write({'state': 'error', 'error_message': str(e)})
            return self._reopen()

        odoo_url = self._get_odoo_base_url()
        odoo_db = self.env.cr.dbname
        timestamp = str(int(time.time()))

        # Build signed payload
        payload = f"{self.odoo_login}:{odoo_db}:{timestamp}"
        signature = self._build_hmac_signature(payload, portal_key)

        request_body = {
            'odoo_login': self.odoo_login,
            'odoo_db': odoo_db,
            'odoo_url': odoo_url,
            'instance_name': self.instance_name or odoo_url,
            'timestamp': timestamp,
            'signature': signature,
        }

        try:
            _logger.info('[RENACE SSO] Requesting admin SSO token for user: %s', self.odoo_login)
            response = requests.post(
                f'{RENACE_API_BASE}/api/sso/admin-generate',
                json=request_body,
                timeout=10,
            )

            if response.status_code == 200:
                data = response.json()
                sso_link = data.get('redirect_url') or data.get('sso_url')
                if sso_link:
                    self.write({
                        'state': 'done',
                        'sso_link': sso_link,
                    })
                    _logger.info('[RENACE SSO] Link generated successfully for: %s', self.odoo_login)
                else:
                    self.write({'state': 'error', 'error_message': 'La respuesta no contiene URL de acceso.'})
            else:
                error_msg = response.json().get('error', f'Error HTTP {response.status_code}')
                _logger.warning('[RENACE SSO] API error: %s', error_msg)
                self.write({'state': 'error', 'error_message': error_msg})

        except requests.exceptions.ConnectionError:
            self.write({'state': 'error', 'error_message': 'No se pudo conectar con renace.tech'})
        except requests.exceptions.Timeout:
            self.write({'state': 'error', 'error_message': 'Tiempo de espera agotado al contactar renace.tech'})
        except Exception as e:
            _logger.exception('[RENACE SSO] Unexpected error generating SSO link')
            self.write({'state': 'error', 'error_message': str(e)})

        return self._reopen()

    def _reopen(self):
        """Reabre el mismo wizard para mostrar el resultado."""
        return {
            'type': 'ir.actions.act_window',
            'name': 'Generar Enlace de Acceso — RENACE',
            'res_model': 'renace.sso.link.wizard',
            'res_id': self.id,
            'view_mode': 'form',
            'target': 'new',
        }

    def action_copy_done(self):
        """Cierra el wizard (el usuario ya copió el enlace)."""
        return {'type': 'ir.actions.act_window_close'}
