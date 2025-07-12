# 🛠️ Tools - Fejlesztői Eszközök

Ez a könyvtár tartalmazza a fejlesztéshez és teszteléshez használt eszközöket.

## 📂 Fájlok

### Tesztelés
- **test-simple.ps1** - PowerShell teszt szkript Windows környezethez
- **test-suite.sh** - Bash teszt szkript Linux/macOS környezethez

## 🚀 Használat

### Windows (PowerShell)
```powershell
# Alap tesztek futtatása
.\tools\test-simple.ps1

# Supabase környezeti változók beállítása
$env:SUPABASE_URL="your-supabase-url"
$env:SUPABASE_KEY="your-supabase-key"
```

### Linux/macOS (Bash)
```bash
# Alap tesztek futtatása
./tools/test-suite.sh

# Supabase környezeti változók beállítása
export SUPABASE_URL="your-supabase-url"
export SUPABASE_KEY="your-supabase-key"
```

## 🧪 Tesztek

A szkriptek a következőket ellenőrzik:
- ✅ Környezeti konfigurációk
- ✅ Fájl struktúra
- ✅ Docker konfigurációk
- ✅ Supabase kapcsolat (opcionális)
