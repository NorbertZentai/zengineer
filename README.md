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

The application automatically builds and deploys via GitHub Actions:

1. **Code Push** → Triggers CI/CD pipeline
2. **Tests Run** → Auth, frontend, and integration tests
3. **Build** → Docker images created
4. **Deploy** → Automatic deployment (when configured)

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

---

**Status**: 🟢 All tests passing | 🚀 Ready for production
