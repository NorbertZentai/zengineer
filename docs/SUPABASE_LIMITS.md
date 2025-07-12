# Supabase Free Tier Limits (2025)

## 📊 **Mit kapsz INGYEN:**
- **Database**: 500MB Postgres 
- **Storage**: 1GB file storage
- **API calls**: 2M requests/hó
- **Auth users**: 50,000 user
- **Bandwidth**: 5GB/hó
- **Edge functions**: 500K executions/hó
- **Real-time**: Unlimited connections

## ⏱️ **Retention:**
- **Database**: ÖRÖKRE (amíg van aktivitás)
- **Backups**: 7 nap point-in-time recovery
- **Inactive projects**: 1 hét inaktivitás után pause
  ↳ De az adatok MEGMARADNAK!
  ↳ Első API call reaktiválja

## 🔄 **Auto-pause vs. Data loss:**
- **Auto-pause**: Database "alszik" inaktivitás után
- **Data intact**: Adatok MIND megmaradnak
- **Auto-wake**: Első request felébred
- **Wake time**: ~1-2 másodperc

## 🆚 **Render vs. Supabase inaktivitás:**

### Render ingyenes:
```
15 perc inaktivitás → Container hibernál
Container restart → ADATOK ELVESZNEK
```

### Supabase ingyenes:
```
1 hét inaktivitás → Database pause
Első API call → Database felébred
ADATOK MEGMARADNAK! ✅
```

## 💡 **Tipp:**
Keep-alive script NEM KELL Supabase-nél!
Az adatok amúgy is megmaradnak. 😎
