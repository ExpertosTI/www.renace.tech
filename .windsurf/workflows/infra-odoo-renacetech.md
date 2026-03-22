---
description: Contexto de Infraestructura Odoo (RenaceTech)
---

# Contexto de Infraestructura Odoo (RenaceTech)

Eres un experto DevOps en despliegues de Odoo en Ubuntu 20.04/22.04 con múltiples instancias aisladas.

## Reglas del servidor
1. Cada servicio tiene su propio usuario de sistema, usuario PostgreSQL y carpeta raíz (ej: `/nombre/`).
2. Código fuente de Odoo: `/nombre/nombre-server/`.
3. Addons personalizados: `/nombre/custom/addons/`.
4. Entorno virtual Python en `/nombre/nombre-server/venv` (siempre usar este Python).
5. Siempre usar systemd (`/etc/systemd/system/nombre-server.service`); nunca usar scripts LSB (`/etc/init.d/`).

## Receta automática para servicio en estado "exited"/"dead"
Ejecuta los siguientes comandos (ajusta `nombre` y `usuario`):

1) Relajar requirements (gevent/greenlet estrictos):
```bash
sed -i "s/gevent==/gevent>=/g; s/greenlet==/greenlet>=/g" requirements.txt
```

2) Instalar entorno en orden correcto para evitar fallos `cbor2` y `pkg_resources`:
```bash
source /nombre/nombre-server/venv/bin/activate
pip install --upgrade pip
pip install "setuptools<70.0.0" wheel setuptools_scm
pip install --no-build-isolation cbor2==5.4.2
pip install -r requirements.txt
```

3) Crear servicio systemd (tipo simple) y eliminar init.d si existiera:
```bash
sudo rm -f /etc/init.d/nombre-server
sudo tee /etc/systemd/system/nombre-server.service > /dev/null <<'EOF'
[Unit]
Description=Odoo service nombre-server
After=network.target postgresql.service

[Service]
Type=simple
User=usuario
Group=usuario
ExecStart=/nombre/nombre-server/venv/bin/python /nombre/nombre-server/odoo-bin -c /etc/nombre-server.conf
Restart=always
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
sudo systemctl daemon-reload
sudo systemctl enable nombre-server
sudo systemctl restart nombre-server
```

4) Permisos finales sobre la carpeta del servicio:
```bash
sudo chown -R usuario:usuario /usuario/
```

## Notas
- No pedir ediciones manuales con nano/vim; siempre entregar comandos listos (sed, cat <<'EOF', etc.).
- Cada instancia es aislada (usuario, db, carpeta y venv propios).

## Script helper `fix-odoo`
Crear un helper global para aplicar la receta de forma rápida (ajusta `<servicio>`):
```bash
cat << 'EOF' | sudo tee /usr/local/bin/fix-odoo
#!/bin/bash
SERVICE=$1
if [ -z "$SERVICE" ]; then echo "Uso: fix-odoo <nombre_servicio> (ej: blokecom)"; exit 1; fi

echo "🔧 Arreglando $SERVICE..."
cd /$SERVICE/$SERVICE-server/ || exit 1

echo "1. Creando entorno virtual..."
sudo apt-get install python3-venv python3-dev build-essential -y > /dev/null 2>&1
sudo python3 -m venv venv

echo "2. Parcheando requirements..."
sudo sed -i 's/gevent==/gevent>=/g' requirements.txt
sudo sed -i 's/greenlet==/greenlet>=/g' requirements.txt

echo "3. Instalando librerías (esto tomará unos minutos)..."
sudo ./venv/bin/pip install --upgrade pip > /dev/null 2>&1
sudo ./venv/bin/pip install "setuptools<70.0.0" wheel setuptools_scm > /dev/null 2>&1
sudo ./venv/bin/pip install --no-build-isolation cbor2==5.4.2 > /dev/null 2>&1
sudo ./venv/bin/pip install -r requirements.txt > /dev/null 2>&1

echo "4. Migrando a Systemd..."
sudo service $SERVICE-server stop > /dev/null 2>&1
sudo rm /etc/init.d/$SERVICE-server > /dev/null 2>&1

cat << SYSTEMD | sudo tee /etc/systemd/system/$SERVICE-server.service > /dev/null
[Unit]
Description=Odoo Service for $SERVICE
Requires=postgresql.service
After=network.target postgresql.service

[Service]
Type=simple
SyslogIdentifier=$SERVICE-server
PermissionsStartOnly=true
User=$SERVICE
Group=$SERVICE
ExecStart=/$SERVICE/$SERVICE-server/venv/bin/python3 /$SERVICE/$SERVICE-server/odoo-bin -c /etc/$SERVICE-server.conf
StandardOutput=journal+console
Restart=always

[Install]
WantedBy=multi-user.target
SYSTEMD

echo "5. Ajustando permisos y reiniciando..."
sudo chown -R $SERVICE:$SERVICE /$SERVICE/
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE-server
sudo systemctl restart $SERVICE-server

echo "✅ ¡Listo! Estado actual:"
sudo systemctl status $SERVICE-server --no-pager | grep Active
EOF

sudo chmod +x /usr/local/bin/fix-odoo
```

Uso: `sudo fix-odoo <servicio>`
