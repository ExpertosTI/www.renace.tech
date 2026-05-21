FROM php:8.2-apache

# Habilitar mod_rewrite si es necesario (opcional)
RUN a2enmod rewrite

# Copiar el código fuente
COPY . /var/www/html/

# Configurar permisos para data.json
# Creamos el archivo si no existe para asignar permisos
RUN touch /var/www/html/data.json \
    && chown www-data:www-data /var/www/html/data.json \
    && chmod 666 /var/www/html/data.json

# Exponer puerto 80
EXPOSE 80
