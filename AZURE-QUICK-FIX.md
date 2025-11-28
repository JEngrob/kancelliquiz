# Azure Quick Fix - App Container Failed to Start

## 🚨 HURTIG FIX (5 minutter)

### Trin 1: Tjek Log Stream
1. Gå til Azure Portal > din App Service
2. Klik på **"Log stream"** (under Monitoring)
3. **Kopier fejlmeddelelsen** - dette fortæller dig præcist hvad der er galt

### Trin 2: Fix Startup Command
1. I venstre navigation pane, find **"Settings"** (skal være ekspanderet)
2. Klik på **"Configuration (preview)"**
3. Gå til **"General settings"** tab (øverst på siden)
4. **Scroll ned på siden** - Startup Command feltet ligger nederst på siden, efter "Platform settings", "Debugging", og "Incoming client certificates" sektionerne
5. Find **"Startup Command"** feltet (det er et tekstfelt)
6. Sæt til:
   ```
   cd /home/site/wwwroot && npm run start:production
   ```
   **Vigtigt:** `cd /home/site/wwwroot &&` sikrer at npm kører fra den korrekte mappe.
7. Klik **"Save"** eller **"Apply"** (nederst på siden)

### Trin 3: Verificer Environment Variables
1. Gå til **"Configuration"** > **"Application settings"**
2. Verificer disse er sat:
   ```
   NODE_ENV=production
   NEXT_PUBLIC_URL=https://hitster-online-2355.azurewebsites.net
   NEXT_PUBLIC_SOCKET_URL=https://hitster-online-2355.azurewebsites.net
   PORT=8080
   ```
3. **Vigtigt:** Erstat URL'en med din faktiske app URL!
4. Klik **"Save"**

### Trin 4: Restart App Service
1. Gå til **"Overview"**
2. Klik **"Restart"**
3. Vent 1-2 minutter
4. Tjek **"Log stream"** igen

## 🔍 Hvis det stadig ikke virker

### Option A: Build først, så start
1. Gå til **"Configuration"** > **"General settings"**
2. Sæt **"Startup Command"** til:
   ```
   cd /home/site/wwwroot && npm run build && npm run start:production
   ```
3. Klik **"Save"** og restart

### Option B: Brug direkte tsx command
1. Gå til **"Configuration"** > **"General settings"**
2. Sæt **"Startup Command"** til:
   ```
   cd /home/site/wwwroot && node_modules/.bin/tsx server.ts
   ```
3. Klik **"Save"** og restart

### Option C: Tjek Build Script
1. Verificer at `.oryx-build.sh` eksisterer i projektet
2. Den skal indeholde:
   ```bash
   #!/bin/bash
   npm install
   npm run build
   ```

## 📋 Checklist

- [ ] Log Stream tjekket - fejlmeddelelse fundet?
- [ ] Startup Command sat til `npm run start:production`
- [ ] Alle environment variables sat korrekt
- [ ] App Service restartet
- [ ] Log Stream tjekket igen efter restart

## 🆘 Hvis intet virker

1. **Se detaljerede instruktioner:** `AZURE-TROUBLESHOOTING.md`
2. **Test lokalt først:**
   ```bash
   npm run build
   npm run start:production
   ```
3. **Kontakt Azure Support** hvis problemet fortsætter

## 💡 Mest Almindelige Fejl

| Fejl | Løsning |
|------|---------|
| "Cannot find module 'next'" | Build mangler - tjek `.oryx-build.sh` |
| "ENOENT: .next/BUILD_ID" | Next.js ikke bygget - kør `npm run build` |
| "Port already in use" | Fjern PORT env var (Azure sætter det automatisk) |
| "EADDRINUSE" | Restart App Service |

