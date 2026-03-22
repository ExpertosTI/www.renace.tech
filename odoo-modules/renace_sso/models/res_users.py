# -*- coding: utf-8 -*-
from odoo import models, fields


class ResUsers(models.Model):
    _inherit = 'res.users'

    renace_portal_active = fields.Boolean(
        string='Acceso Portal RENACE',
        default=False,
        help='Indica si este usuario tiene habilitado el acceso al portal de renace.tech.'
    )
    renace_portal_login = fields.Char(
        string='Login en Portal RENACE',
        compute='_compute_renace_portal_login',
        store=False,
        help='El login que se usará en el portal (igual al login de Odoo).'
    )

    def _compute_renace_portal_login(self):
        for user in self:
            user.renace_portal_login = user.login

    def action_generate_renace_sso_link(self):
        """Abre el wizard para generar el enlace SSO de renace.tech."""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Generar Enlace de Acceso — RENACE',
            'res_model': 'renace.sso.link.wizard',
            'view_mode': 'form',
            'target': 'new',
            'context': {
                'default_user_id': self.id,
                'default_odoo_login': self.login,
            },
        }
