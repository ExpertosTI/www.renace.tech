-- Migration: SSO Tokens Table
-- Description: Tabla para almacenar tokens de un solo uso para SSO entre renace.tech y Odoo

CREATE TABLE IF NOT EXISTS sso_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) UNIQUE NOT NULL,
  user_id INTEGER NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  instance_id INTEGER NOT NULL REFERENCES odoo_instances(id) ON DELETE CASCADE,
  odoo_login VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_sso_tokens_token ON sso_tokens(token);
CREATE INDEX idx_sso_tokens_user_id ON sso_tokens(user_id);
CREATE INDEX idx_sso_tokens_expires_at ON sso_tokens(expires_at);
CREATE INDEX idx_sso_tokens_used ON sso_tokens(used);

-- Modificar tabla portal_users para soportar vinculación sin contraseña
ALTER TABLE portal_users 
  ALTER COLUMN odoo_password_enc DROP NOT NULL;

-- Agregar columna para tracking de última actualización de contraseña
ALTER TABLE portal_users 
  ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMP;

-- Comentarios
COMMENT ON TABLE sso_tokens IS 'Tokens de un solo uso para autenticación SSO entre renace.tech y Odoo';
COMMENT ON COLUMN sso_tokens.token IS 'Token único generado para la sesión SSO';
COMMENT ON COLUMN sso_tokens.expires_at IS 'Timestamp de expiración del token (típicamente 5 minutos)';
COMMENT ON COLUMN sso_tokens.used IS 'Indica si el token ya fue consumido';
COMMENT ON COLUMN portal_users.password_updated_at IS 'Última vez que el usuario actualizó su contraseña';
