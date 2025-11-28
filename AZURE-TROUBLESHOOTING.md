# Azure Troubleshooting Guide - Hitster Online

## App Container Failed to Start

Hvis du ser "App Container Failed to Start" i Azure Portal, følg disse trin:

### 1. Tjek Log Stream (Vigtigste første skridt)

1. Gå til din App Service i Azure Portal
2. Gå til **"Log stream"** (under Monitoring)
3. Se efter fejlmeddelelser - dette vil vise dig præcis hvad der går galt

### 2. Verificer Startup Command

1. I venstre navigation pane, find **"Settings"** og klik på **"Configuration (preview)"**
2. Gå til **"General settings"** tab (øverst på siden)
3. **Scroll ned på siden** - Startup Command feltet ligger nederst på siden, efter "Platform settings", "Debugging", og "Incoming client certificates" sektionerne
4. Tjek **"Startup Command"** feltet
5. Det skal være én af følgende:

**Option A (Anbefalet):**
```bash
cd /home/site/wwwroot && npm run start:production
```
**Vigtigt:** `cd /home/site/wwwroot &&` sikrer at npm kører fra den korrekte mappe hvor `package.json` ligger.

**Option B (Hvis Option A ikke virker):**
```bash
cd /home/site/wwwroot && node_modules/.bin/tsx server.ts
```

**Option C (Hvis build mangler):**
```bash
cd /home/site/wwwroot && npm run build && npm run start:production
```

### 3. Verificer Environment Variables

Gå til **"Configuration"** > **"Application settings"** og verificer:

```
NODE_ENV=production
NEXT_PUBLIC_URL=https://hitster-online-2355.azurewebsites.net
NEXT_PUBLIC_SOCKET_URL=https://hitster-online-2355.azurewebsites.net
PORT=8080
```

**Vigtigt:** 
- Erstat URL'en med din faktiske app URL
- PORT skal være `8080` (Azure sætter dette automatisk, men det skal være sat)

### 4. Verificer Build Process

Azure bruger Oryx build system. Tjek at `.oryx-build.sh` eksisterer og indeholder:

```bash
#!/bin/bash
# Custom build script for Azure Oryx
npm install
npm run build
```

### 5. Tjek Node.js Version

1. Gå til **"Configuration"** > **"General settings"**
2. Verificer **"Stack"** er sat til **"Node 18 LTS"** eller **"Node 20 LTS"**
3. Verificer at `package.json` har:
```json
"engines": {
  "node": ">=18.0.0",
  "npm": ">=9.0.0"
}
```

### 6. Tjek at Next.js Build Eksisterer

Hvis build fejler, kan du:

1. Gå til **"SSH"** eller **"Console"** i Azure Portal
2. Kør manuelt:
```bash
npm install
npm run build
```

3. Tjek at `.next` mappen eksisterer:
```bash
ls -la .next
```

### 7. Test Startup Command Lokalt

Før du deployer, test at startup command virker lokalt:

```bash
# Sæt environment variables
$env:NODE_ENV="production"
$env:PORT="8080"
$env:NEXT_PUBLIC_URL="https://hitster-online-2355.azurewebsites.net"
$env:NEXT_PUBLIC_SOCKET_URL="https://hitster-online-2355.azurewebsites.net"

# Build først
npm run build

# Start serveren
npm run start:production
```

### 8. Common Issues og Løsninger

#### Issue: "ENOENT: no such file or directory, open '/package.json'"
**Løsning:**
- Dette betyder at npm kører fra forkert directory
- Sæt startup command til: `cd /home/site/wwwroot && npm run start:production`
- Dette sikrer at npm kører fra den korrekte mappe

#### Issue: "Cannot find module 'next'"
**Løsning:** 
- Tjek at `npm install` kører under build
- Verificer at `node_modules` eksisterer i deployment
- Verificer at startup command kører fra `/home/site/wwwroot`

#### Issue: "ENOENT: no such file or directory, open '.next/BUILD_ID'"
**Løsning:**
- Next.js er ikke blevet bygget
- Sørg for at `npm run build` kører før startup
- Tjek `.oryx-build.sh` script
- Prøv: `cd /home/site/wwwroot && npm run build && npm run start:production`

#### Issue: "Port 8080 already in use"
**Løsning:**
- Dette bør ikke ske på Azure, men hvis det gør:
- Fjern PORT environment variable (Azure sætter det automatisk)
- Eller sæt PORT til en anden værdi

#### Issue: "Error: listen EADDRINUSE"
**Løsning:**
- Tjek at kun én proces kører
- Restart App Service i Azure Portal

### 9. Redeploy med Debugging

1. **Fjern eksisterende deployment:**
   - Gå til **"Deployment Center"**
   - Stop continuous deployment midlertidigt

2. **Deploy manuelt med logging:**
```bash
az webapp up \
  --name hitster-online \
  --resource-group <resource-group> \
  --runtime "NODE:18-lts" \
  --logs
```

3. **Eller via Azure Portal:**
   - Gå til **"Deployment Center"**
   - Vælg **"Logs"** for at se deployment logs

### 10. Verificer File Structure

Efter deployment skal følgende filer/mapper eksistere:

```
/
├── .next/              # Next.js build output (vigtig!)
├── node_modules/       # Dependencies
├── server.ts           # Combined server entry point
├── server/             # Socket.IO server code
├── package.json        # Dependencies
└── .oryx-build.sh      # Build script
```

### 11. Enable Application Logging

For bedre debugging:

1. Gå til **"Configuration"** > **"General settings"**
2. Under **"Application Logging"**, aktiver:
   - **File system**: On
   - **Level**: Verbose
3. Klik **"Save"**

Derefter kan du se logs i **"Log stream"**.

### 12. Test Container Locally (Avanceret)

Hvis du har Docker installeret, kan du teste container lokalt:

```bash
# Build Docker image (hvis du har Dockerfile)
docker build -t hitster-test .

# Run container
docker run -p 8080:8080 \
  -e NODE_ENV=production \
  -e PORT=8080 \
  -e NEXT_PUBLIC_URL=http://localhost:8080 \
  -e NEXT_PUBLIC_SOCKET_URL=http://localhost:8080 \
  hitster-test
```

## HTTP 5XX Errors

Hvis du ser HTTP 503 (Service Unavailable) fejl:

1. **Dette er normalt hvis containeren ikke starter** - løs "App Container Failed to Start" først
2. **Cold Start**: På gratis tier kan første request tage 10-30 sekunder
3. **CPU Limit**: På gratis tier er der 60 minutter CPU per dag - tjek **"Metrics"** for CPU brug

## Application Logs Limited

Hvis du ser "Application logging is limited to startup failures":

1. Dette betyder at app logging kun viser startup fejl
2. For fuld logging, aktiver **"Application Logging"** i Configuration
3. Se **"Log stream"** for live logs

## Næste Skridt

Hvis ingen af ovenstående løsninger virker:

1. **Tjek Log Stream** - dette er den vigtigste kilde til fejlmeddelelser
2. **Kontakt Azure Support** - de kan hjælpe med container issues
3. **Overvej at opgradere** - gratis tier har begrænsninger der kan forårsage problemer

## Quick Fix Checklist

- [ ] Tjek Log Stream for fejlmeddelelser
- [ ] Verificer Startup Command er sat korrekt
- [ ] Verificer alle environment variables er sat
- [ ] Tjek Node.js version matcher
- [ ] Verificer at Next.js build kører (tjek `.next` mappe)
- [ ] Test startup command lokalt først
- [ ] Aktiver Application Logging for bedre debugging
- [ ] Restart App Service efter ændringer

