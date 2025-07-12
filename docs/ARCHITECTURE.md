# 🏗️ Zengineer - Architektúra Dokumentáció

## 📁 Projekt Struktúra

A Zengineer modern **Angular Enterprise Architecture** struktúrát követ, amely biztosítja a skálázhatóságot, karbantarthatóságot és tiszta kód szervezést.

### 📂 Gyökér Struktúra

```
zengineer/
├── 📚 docs/               # Teljes dokumentáció
├── 🛠️ tools/             # Fejlesztői eszközök és tesztek
├── 🏗️ infrastructure/    # Docker, CI/CD, deployment
├── 🎭 frontend/          # Angular alkalmazás
├── 📧 email-templates/   # Email sablonok
└── 📜 scripts/          # Utility szkriptek
```

### 🎭 Frontend Architektúra (Angular)

```
frontend/src/app/
├── 🏛️ core/              # Singleton szolgáltatások (app-wide)
│   ├── services/         # AuthService, QuizService, etc.
│   ├── guards/          # Route guards (auth protection)
│   └── interceptors/    # HTTP interceptors
├── 🔄 shared/            # Megosztott komponensek és utils
│   ├── components/      # Újrafelhasználható UI komponensek
│   ├── utils/           # Helper függvények
│   ├── pipes/           # Custom pipe-ok
│   └── directives/      # Custom direktívák
├── 🎯 features/          # Feature-specifikus modulok
│   ├── auth/            # Bejelentkezés, regisztráció
│   │   ├── login/
│   │   └── register/
│   ├── quiz/            # Quiz kezelés és tanulás
│   │   ├── quiz-manager/
│   │   ├── quiz-card-editor/
│   │   ├── quiz-stats/
│   │   └── study-mode/
│   └── dashboard/       # Főoldal és navigáció
└── 🌍 assets/           # Statikus fájlok és fordítások
    └── i18n/            # Többnyelvűség fájlok
```

## 🎯 Architektúra Elvek

### 1. **Separation of Concerns**
- **Core**: Alkalmazás szintű singleton szolgáltatások
- **Shared**: Újrafelhasználható komponensek
- **Features**: Önálló, izolált funkciók

### 2. **Lazy Loading**
```typescript
// Feature modulok lazy loading-ja
{
  path: 'quiz-manager',
  loadComponent: () => import('./features/quiz/quiz-manager/quiz-manager')
    .then(m => m.QuizManager)
}
```

### 3. **Path Mapping**
```typescript
// tsconfig.app.json
"paths": {
  "@core/*": ["app/core/*"],
  "@shared/*": ["app/shared/*"],
  "@features/*": ["app/features/*"]
}
```

### 4. **Barrel Exports**
```typescript
// core/index.ts
export * from './services/auth.service';
export * from './guards/auth-guard';
```

## 🔧 Technológiai Stack

### Frontend
- **Framework**: Angular 20+ (Standalone Components)
- **Styling**: SCSS + Angular Material
- **State Management**: Angular Signals (reactive)
- **Routing**: Angular Router (lazy loaded)
- **HTTP**: Angular HttpClient + Interceptors
- **Internationalization**: ngx-translate

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Real-time**: Supabase WebSocket
- **Deployment**: Docker + Render.com
- **CI/CD**: GitHub Actions

## 📋 Kódolási Szabályok

### 1. **Naming Conventions**
- **Components**: PascalCase (`QuizManager`)
- **Services**: camelCase + Service suffix (`authService`)
- **Files**: kebab-case (`quiz-manager.ts`)

### 2. **Import Order**
```typescript
// 1. Angular imports
import { Component } from '@angular/core';

// 2. Third-party imports
import { TranslateModule } from '@ngx-translate/core';

// 3. Application imports
import { AuthService } from '@core/services/auth.service';
```

### 3. **Component Structure**
```typescript
@Component({
  selector: 'app-quiz-manager',
  standalone: true,
  imports: [/* ... */],
  templateUrl: './quiz-manager.html',
  styleUrl: './quiz-manager.scss'
})
export class QuizManager {
  // 1. Signals/Properties
  // 2. Constructor
  // 3. Lifecycle hooks
  // 4. Public methods
  // 5. Private methods
}
```

## 🔄 Data Flow

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   Components    │───▶│   Services   │───▶│    Supabase     │
│   (Features)    │    │    (Core)    │    │   (Backend)     │
└─────────────────┘    └──────────────┘    └─────────────────┘
         ▲                       │                     │
         │                       ▼                     │
┌─────────────────┐    ┌──────────────┐               │
│     Signals     │◀───│     HTTP     │◀──────────────┘
│   (Reactive)    │    │ Interceptors │
└─────────────────┘    └──────────────┘
```

## 🚀 Deployment Architektúra

```
┌─────────────────┐
│   GitHub Repo   │
└─────────┬───────┘
          │ git push
          ▼
┌─────────────────┐
│ GitHub Actions  │ (CI/CD Pipeline)
└─────────┬───────┘
          │ docker build
          ▼
┌─────────────────┐
│   Render.com    │ (Production)
└─────────┬───────┘
          │ HTTP/HTTPS
          ▼
┌─────────────────┐
│     Users       │
└─────────────────┘
```

Ez az architektúra biztosítja a kód tisztaságát, skálázhatóságát és a könnyű karbantarthatóságot.
