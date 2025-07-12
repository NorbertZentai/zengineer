# 🏗️ Infrastructure - Deployment és Infrastruktúra

Ez a könyvtár tartalmazza a deployment és infrastruktúra konfigurációs fájlokat.

## 📂 Fájlok

### Docker
- **docker-compose.yml** - Multi-container alkalmazás definíció

### Cloud Deployment
- **render.yaml** - Render.com deployment konfiguráció

## 🚀 Deployment

### Helyi Fejlesztés (Docker Compose)
```bash
cd infrastructure
docker-compose up -d
```

### Render.com Deployment
A `render.yaml` fájl automatikusan konfigurálja:
- ✅ Frontend build és deployment
- ✅ Static file serving
- ✅ Environment variables
- ✅ Custom domains

### Environment Variables
Szükséges környezeti változók:
```env
SUPABASE_URL=your-supabase-project-url
SUPABASE_KEY=your-supabase-anon-key
```

## 🔧 Konfiguráció

### Docker Compose Szolgáltatások
- **frontend**: Angular alkalmazás Nginx-szel
- **Automatikus build**: Lenient TypeScript konfiguráció

### Render.com Beállítások
- **Build Command**: `npm run build:prod`
- **Start Command**: `nginx -g 'daemon off;'`
- **Node Version**: 20.x
