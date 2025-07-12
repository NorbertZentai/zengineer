# 📚 Zengineer - Dokumentáció

Ez a könyvtár tartalmazza a Zengineer projekt összes dokumentációját.

## 📂 Fájlok

- **PERSISTENCE_COMPARISON.md** - Adatbázis és perzisztencia opciók összehasonlítása
- **SUPABASE_LIMITS.md** - Supabase korlátok és limitek
- **SUPABASE_SETUP.md** - Supabase beállítási útmutató

## 🏗️ Architektúra

A projekt modern Angular best practice-eket követ:

### Frontend Struktúra
```
src/app/
├── core/           # Alapvető szolgáltatások, guards
├── shared/         # Megosztott komponensek, utils
├── features/       # Feature modulok (auth, quiz, dashboard)
└── assets/         # Statikus fájlok
```

### Főbb Funkciók
- **Autentikáció**: Supabase alapú bejelentkezés/regisztráció
- **Quiz Kezelés**: Kvíz létrehozás, szerkesztés, statisztikák
- **Tanulási Mód**: Interaktív kártya alapú tanulás
- **Többnyelvűség**: Magyar és angol nyelv támogatás
