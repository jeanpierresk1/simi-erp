# Usamos una imagen ligera de Node.js
FROM node:18-alpine

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias
COPY package*.json ./

# Instalamos las dependencias
RUN npm install

# Copiamos el resto del código
COPY . .

# Exponemos el puerto que usa nuestra app
EXPOSE 3000

# Comando para iniciar la aplicación
CMD ["node", "index.js"]