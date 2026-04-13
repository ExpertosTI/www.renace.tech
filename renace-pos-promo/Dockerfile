FROM nginx:alpine

# Copiar el archivo index.html y la carpeta images
COPY index.html /usr/share/nginx/html/index.html
COPY images/ /usr/share/nginx/html/images/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
