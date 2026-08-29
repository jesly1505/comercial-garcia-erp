# ==========================================
# STAGE 1: Build
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Argumento para URL de API en tiempo de build si se requiere
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ==========================================
# STAGE 2: Nginx Production Server
# ==========================================
FROM nginx:alpine AS runner

# Copiar configuración Nginx optimizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar bundle de Vite compilado
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
