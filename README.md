# 🧠 Zengineer

[![CI/CD Pipeline](https://github.com/NorbertZentai/zengineer/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/NorbertZentai/zengineer/actions/workflows/ci-cd.yml)

Intelligent quiz application with Angular frontend and PocketBase backend.

## 🚀 Features

- **🔐 Authentication**: Complete user registration, login, and management
- **📝 Quiz Management**: Create, edit, and organize quizzes
- **📊 Statistics**: Track learning progress and performance
- **🌍 Internationalization**: Multi-language support (EN/HU)
- **🐳 Docker Support**: Containerized deployment

## 🧪 Automated Testing

This project includes comprehensive CI/CD pipeline with automated testing:

### ✅ **Auth Integration Tests** (runs on every commit)
- 🌐 Backend connectivity
- 🧪 User registration 
- 🔑 Login/logout functionality
- 🗑️ User cleanup (delete)

### ⚙️ **Frontend Unit Tests**
- 📱 Angular component testing
- 🔧 Service testing with mocking
- 🧩 Dependency injection testing

### 🐳 **Docker Integration Tests**
- 🏗️ Frontend build verification
- 🔧 Backend container testing
- 📦 Docker Compose orchestration

## 🛠️ Development

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- Git

### Quick Start

```bash
# Clone the repository
git clone https://github.com/NorbertZentai/zengineer.git
cd zengineer

# Start with Docker
docker-compose up -d

# Or run locally
npm install
npm run test

# Frontend development
cd frontend
npm install
npm start

# Backend (PocketBase)
cd backend
# PocketBase runs automatically in Docker
```

## 🐛 Docker Troubleshooting

Ha a frontend és backend között nincs kapcsolat Docker-ben:

### Gyors diagnosztika
```bash
# Docker containerek státusza
docker-compose ps

# Backend kapcsolat tesztelése
curl -s http://localhost:8080/api/health
```

### Gyakori problémák és megoldások

1. **Container kommunikáció**
   ```bash
   # Ellenőrizd a hálózatot
   docker network ls | grep zengineer
   
   # Containers state
   docker-compose ps
   ```

2. **Environment konfiguráció**
   - `environment.docker.ts`: API proxy (`/api`)
   - `environment.prod.ts`: Direct backend URL (`https://zengineer-backend.onrender.com`)

3. **CORS problémák**
   - Backend origins beállítva: `http://localhost:3000,http://frontend`
   - Nginx proxy CORS headers hozzáadva

4. **Build konfigurációk**
   ```bash
   # Proxy-val (Docker helyi fejlesztés)
   npm run build:docker
   
   # Production (Render.com deployment)
   npm run build:prod
   ```

### Testing

```bash
# Run auth integration tests
npm run test:auth

# Run frontend unit tests  
cd frontend
npm test

# Run full CI pipeline locally
npm run test:ci
```

## 📦 Deployment

### 🚀 **Render.com Deployment** (Production)

A projekt készen áll a Render.com automatikus deployment-re:

**Frontend**: `https://zengineer-frontend.onrender.com`
**Backend**: `https://zengineer-backend.onrender.com`

```bash
# Render.com deployment steps:
1. Connect GitHub repository to Render.com
2. Frontend service: Docker build using Dockerfile
3. Backend service: Docker build using backend/Dockerfile
4. Environment variables automatically configured
```

### 🌐 Render.com Deployment

### Problémák és megoldások az ingyenes verzióban

#### 🚨 **Ismert problémák:**
1. **Hibernálás**: 15 perc inaktivitás után a szolgáltatások leállnak
2. **Adatvesztés**: Container újraindításkor az adatok elvesznek
3. **Cold start**: Hibernálás után lassú indítás

#### ✅ **Megoldások:**
##### 1. Keep-alive szolgáltatás
```bash
# Keep-alive script futtatása (külön Render service-ként)
node keep-alive.js
```

##### 2. Perzisztens adattárolás
- Render Persistent Disks használata (fizetős)
- Vagy külső adatbázis (MongoDB Atlas ingyenes tier)

##### 3. Health check végpontok
- Backend: `/health.html`
- Frontend: `/`

### Deployment lépések:

1. **Backend deploy:**
   ```bash
   # Render.com-on új Web Service
   # Repository: https://github.com/NorbertZentai/zengineer
   # Build Command: docker build -f backend/Dockerfile backend
   # Start Command: /pb/pocketbase serve --http=0.0.0.0:8080
   ```

2. **Frontend deploy:**
   ```bash
   # Render.com-on új Web Service  
   # Build Command: docker build -f frontend/Dockerfile frontend
   ```

3. **Keep-alive service (opcionális):**
   ```bash
   # Render.com-on új Web Service
   # Build Command: cp keepalive-package.json package.json && npm install
   # Start Command: npm start
   ```

### Environment változók:
```
# Backend
PB_CORS_ORIGINS=https://zengineer-frontend.onrender.com,https://zengineer.cv
PORT=8080

# Frontend  
BACKEND_URL=https://zengineer-backend.onrender.com
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Angular 18    │    │   PocketBase    │    │     Docker      │
│   Frontend      │◄──►│    Backend      │◄──►│   Containers    │
│   (Port 3000)   │    │   (Port 8080)   │    │   (Production)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📝 Environment Variables

- `POCKETBASE_URL`: Backend API URL (default: http://localhost:8080)
- `NODE_ENV`: Environment mode (development/production)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push and create a Pull Request

**All commits trigger automated tests** - ensure your code passes:
- ✅ Auth integration tests
- ✅ Frontend unit tests  
- ✅ Docker build tests

## 📄 License

This project is licensed under the ISC License.

## ✅ **Deployment Status**

### 🚀 **Render.com Ready** ✅

**Szükséges lépések a Render.com-on:**

1. **Repository csatlakoztatása:**
   ```
   https://github.com/NorbertZentai/zengineer
   ```

2. **Backend Service létrehozása:**
   - **Service Type**: Web Service
   - **Environment**: Docker
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Build Context**: `./backend`

3. **Frontend Service létrehozása:**
   - **Service Type**: Web Service  
   - **Environment**: Docker
   - **Dockerfile Path**: `./frontend/Dockerfile`
   - **Build Context**: `./frontend`

4. **Environment Variables** (automatikusan konfigurált):
   - Backend CORS: `https://zengineer-frontend.onrender.com`
   - Frontend API URL: `https://zengineer-backend.onrender.com`

### 🎯 **Expected URLs:**
- 🌐 **Frontend**: `https://zengineer-frontend.onrender.com`
- 🔗 **Backend**: `https://zengineer-backend.onrender.com`

---

**Status**: 🟢 All tests passing | 🚀 Ready for production
