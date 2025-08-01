# -------------------------
# Stage 1 – Build Angular app
# -------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Csak a csomagdefiníciók másolása a cache miatt
COPY package*.json ./

# Dependencies telepítése (dev és prod is kell a buildhez)
RUN npm ci --silent

# Teljes projekt másolása és build
COPY . .

# Angular app buildelése Production konfigurációval (Render.com számára)
RUN npm run build:prod

# -------------------------
# Stage 2 – Serve with NGINX
# -------------------------
FROM nginx:stable-alpine

# Angular build output másolása az nginx root-ba
COPY --from=builder /app/dist/zengineer/browser /usr/share/nginx/html 

# Production NGINX config (egyszerű SPA fallback)
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

# Port megnyitása
EXPOSE 80

# NGINX indítása
CMD ["nginx", "-g", "daemon off;"]