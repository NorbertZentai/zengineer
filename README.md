# 🧠 Zengineer

[![CI/CD Pipeline](https://github.com/NorbertZentai/zengineer/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/NorbertZentai/zengineer/actions/workflows/ci-cd.yml)

Intelligent quiz application with modern Angular frontend and **Supabase** cloud backend.

## 🚀 Features

- **🔐 Authentication**: Complete user registration, login, and management
- **📝 Quiz Management**: Create, edit, and organize quizzes with rich editor
- **📊 Analytics**: Comprehensive statistics and progress tracking
- **🎓 Study Mode**: Interactive learning with spaced repetition
- **🌍 Internationalization**: Multi-language support (EN/HU)
- **🐳 Docker Support**: Containerized deployment ready
- **☁️ Cloud Backend**: Supabase Postgres with real-time features
- **⚡ Modern Architecture**: Angular 20+ with standalone components

## 📁 Project Structure

```
zengineer/
├── 📚 docs/               # Documentation and guides
├── 🛠️ tools/             # Development and testing tools
├── 🏗️ infrastructure/    # Docker and deployment configs
├── 🎭 frontend/          # Angular application
│   └── src/app/
│       ├── core/         # Services, guards, interceptors
│       ├── shared/       # Reusable components, utils
│       ├── features/     # Feature modules
│       │   ├── auth/     # Authentication (login, register)
│       │   ├── quiz/     # Quiz management & study
│       │   └── dashboard/ # Main dashboard
│       └── assets/       # Static files and i18n
├── 📧 email-templates/   # Email templates
└── 📜 scripts/          # Utility scripts
```

## 🧪 Automated Testing

Comprehensive CI/CD pipeline with multi-stage testing:

### ✅ **Integration Tests** (runs on every commit)
- 🌐 Supabase connectivity and auth
- 🔧 Frontend build verification
- � Docker container orchestration
- � Health checks and monitoring

### ⚙️ **Unit Tests**
- 📱 Angular component testing with TestBed
- 🔧 Service testing with dependency injection
- 🧩 Guard and interceptor testing

### � **End-to-End Tests**
- � User journey testing
- 📝 Quiz creation and management flows
- � Statistics and analytics validation

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

##### 1. 💾 **Perzisztens tárolás MongoDB Atlas-szal (INGYENES)**
```bash
# 512MB ingyenes MongoDB Atlas cluster
# Automatikus szinkronizáció PocketBase ↔ MongoDB
# Részletes setup: MONGODB_SETUP.md
```

##### 2. Keep-alive szolgáltatás
```bash
# Keep-alive script futtatása (külön Render service-ként)
node keep-alive.js
```

##### 3. Health check végpontok
- Backend: `/health.html`
- Frontend: `/`
- MongoDB Sync: `/health`

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
