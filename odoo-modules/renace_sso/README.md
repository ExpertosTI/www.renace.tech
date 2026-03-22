# RENACE SSO - Módulo de Odoo

## Descripción

Módulo de Odoo que permite la autenticación SSO (Single Sign-On) desde el portal de renace.tech.

## Instalación

### 1. Copiar el módulo a Odoo

```bash
# Copiar el módulo a la carpeta de addons de Odoo
cp -r renace_sso /path/to/odoo/addons/

# O crear un symlink
ln -s /path/to/renace.tech/odoo-modules/renace_sso /path/to/odoo/addons/renace_sso
```

### 2. Actualizar lista de aplicaciones

```bash
# Reiniciar Odoo con actualización de módulos
odoo-bin -c /path/to/odoo.conf -u all -d your_database
```

### 3. Instalar el módulo

1. Ir a Aplicaciones en Odoo
2. Actualizar lista de aplicaciones
3. Buscar "RENACE SSO"
4. Hacer clic en "Instalar"

## Configuración

No requiere configuración adicional. El módulo automáticamente:

- Expone el endpoint `/renace/sso?token=XXX`
- Valida tokens contra `https://renace.tech/api/sso/verify`
- Crea sesiones de Odoo automáticamente
- Redirige a `/web` después del login exitoso

## Flujo SSO

1. Usuario ingresa credenciales en `https://renace.tech/portal`
2. renace.tech valida contra Odoo y genera token SSO
3. Usuario es redirigido a `https://cliente.renace.tech/renace/sso?token=XXX`
4. Módulo valida token y crea sesión de Odoo
5. Usuario es redirigido a `/web` sin ver pantalla de login

## Seguridad

- Tokens de un solo uso (se marcan como usados después de validación)
- Tokens expiran en 5 minutos
- Validación contra servidor central de renace.tech
- Registro de IP y user-agent para auditoría

## Troubleshooting

### Error: "Token inválido"
- Verificar que el token no haya expirado (5 minutos)
- Verificar que el token no haya sido usado previamente
- Verificar conectividad con renace.tech

### Error: "Usuario no encontrado en Odoo"
- Verificar que el usuario existe en Odoo con el mismo login
- Verificar que el usuario está activo

### Error: "Base de datos incorrecta"
- Verificar que la URL apunta a la instancia correcta de Odoo
- Verificar configuración de `odoo_db` en renace.tech

## Logs

Los logs del módulo se pueden ver en:

```bash
tail -f /var/log/odoo/odoo-server.log | grep "RENACE SSO"
```
