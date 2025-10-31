# Usar Node.js LTS
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar el código fuente
COPY . .

# Exponer el puerto (Render usa la variable PORT)
EXPOSE $PORT

# Comando para iniciar la aplicación
CMD ["node", "src/main.js"]
