# 🚀 RENASIS REMOTE - GUÍA DE DESPLIEGUE FINAL (CON TRAEFIK Y SSL)

### 📍 PASO 1: Iniciar el servidor RENASIS con SSL en `remote.renace.tech`

Copia y pega este comando en tu terminal SSH (`root@RenaceTech:/opt/renasis#`):

```bash
cd /opt/renasis

cat << 'EOF' > docker-compose.yml
services:
  hbbs:
    container_name: renasis-hbbs
    image: rustdesk/rustdesk-server:latest
    command: hbbs -r remote.renace.tech:21117 -k _
    volumes:
      - ./data:/root
    network_mode: "host"
    depends_on:
      - hbbr
    restart: unless-stopped

  hbbr:
    container_name: renasis-hbbr
    image: rustdesk/rustdesk-server:latest
    command: hbbr -k _
    volumes:
      - ./data:/root
    network_mode: "host"
    restart: unless-stopped

  renasis-api:
    container_name: renasis-api-server
    image: ghcr.io/kingmo888/rustdesk-api-server:latest
    restart: unless-stopped
    ports:
      - "21114:21114"
    environment:
      - CSRF_TRUSTED_ORIGINS=http://remote.renace.tech:21114,https://remote.renace.tech
      - ID_SERVER=remote.renace.tech
    volumes:
      - ./api_data:/rustdesk-api-server/db
      - /etc/timezone:/etc/timezone:ro
      - /etc/localtime:/etc/localtime:ro
    networks:
      - default
      - RenaceNet
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=RenaceNet"
      - "traefik.http.routers.renasis-http.rule=Host(`remote.renace.tech`)"
      - "traefik.http.routers.renasis-http.entrypoints=web"
      - "traefik.http.routers.renasis-http.middlewares=renasis-https"
      - "traefik.http.routers.renasis-https.rule=Host(`remote.renace.tech`)"
      - "traefik.http.routers.renasis-https.entrypoints=websecure"
      - "traefik.http.routers.renasis-https.tls=true"
      - "traefik.http.routers.renasis-https.tls.certresolver=letsencryptresolver"
      - "traefik.http.middlewares.renasis-https.redirectscheme.scheme=https"
      - "traefik.http.services.renasis-svc.loadbalancer.server.port=21114"

networks:
  default:
    driver: bridge
  RenaceNet:
    external: true
EOF

docker compose up -d
```

---

### 📍 PASO 2: Desplegar los cambios web de `renace.tech`

Copia y pega esto en la terminal SSH para desplegar la nueva página `renace.tech/renasis` y los instaladores en el sitio web de producción:

```bash
cd /opt/www.renace.tech && git pull origin main && ./deploy_corporate.sh
```
