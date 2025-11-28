# Azure Deployment Guide - Hitster Online

Denne guide beskriver hvordan du deployer Hitster Online appen til Azure App Service på gratis tier.

## Forudsætninger

- Azure konto (gratis tier tilgængelig)
- Azure CLI installeret (valgfrit, men anbefalet)
- Git repository med din kode (GitHub, Azure DevOps, eller lokal)

## Arkitektur

Appen kører som en kombineret server der håndterer både:
- Next.js frontend (React app)
- Socket.IO backend (real-time kommunikation)

Begge kører på samme port (Azure App Service sætter PORT environment variable).

## Deployment Metoder

### Metode 1: Azure Portal (Anbefalet for begyndere)

#### Trin 1: Opret Azure App Service

1. Log ind på [Azure Portal](https://portal.azure.com)
2. Klik på "Create a resource"
3. Søg efter "Web App" og vælg "Web App"
4. Klik "Create"

#### Trin 2: Konfigurer App Service

**Basics tab:**
- **Subscription**: Vælg din subscription
- **Resource Group**: Opret ny eller vælg eksisterende
- **Name**: Vælg et unikt navn (f.eks. `hitster-online`)
- **Publish**: Code
- **Runtime stack**: Node 18 LTS eller Node 20 LTS
- **Operating System**: Linux (anbefalet) eller Windows
- **Region**: Vælg nærmeste region
- **App Service Plan**: 
  - Klik "Create new"
  - Vælg "Free (F1)" tier
  - Vælg en location
  - Klik "OK"

**Deployment tab:**
- **Continuous Deployment**: Vælg efter behov (GitHub Actions, Azure DevOps, eller None)

Klik "Review + create" og derefter "Create"

#### Trin 3: Konfigurer Environment Variables

1. Gå til din App Service i Azure Portal
2. Gå til "Configuration" > "Application settings"
3. Tilføj følgende environment variables:

```
NODE_ENV=production
NEXT_PUBLIC_URL=https://<din-app-navn>.azurewebsites.net
NEXT_PUBLIC_SOCKET_URL=https://<din-app-navn>.azurewebsites.net
PORT=8080
```

**Vigtigt**: Erstat `<din-app-navn>` med dit faktiske app navn.

4. Klik "Save"

#### Trin 4: Konfigurer Startup Command (Linux)

Hvis du bruger Linux:

1. I venstre navigation pane, find **"Settings"** og klik på **"Configuration (preview)"**
2. Gå til **"General settings"** tab (øverst på siden)
3. **Scroll ned på siden** - Startup Command feltet ligger nederst på siden, efter alle de andre indstillinger
4. Find **"Startup Command"** feltet (et tekstfelt) og indtast:
   ```
   cd /home/site/wwwroot && npm run start:production
   ```
   **Vigtigt:** `cd /home/site/wwwroot &&` sikrer at npm kører fra den korrekte mappe hvor `package.json` ligger.
   
   **Note:** Azure build system (Oryx) kører automatisk `npm run build` under deployment via `.oryx-build.sh`. Hvis appen ikke starter, prøv:
   ```
   cd /home/site/wwwroot && npm run build && npm run start:production
   ```
4. Klik **"Save"** (øverst på siden)

#### Trin 5: Deploy Kode

**Option A: Via Git (GitHub/Azure DevOps)**

1. Gå til "Deployment Center"
2. Vælg din kilde (GitHub, Azure DevOps, etc.)
3. Følg instruktionerne for at forbinde din repository
4. Azure vil automatisk deploye ved hver push

**Option B: Via Azure CLI**

```bash
# Login til Azure
az login

# Deploy fra lokal mappe
az webapp up --name <din-app-navn> --resource-group <resource-group-navn> --runtime "NODE:18-lts"
```

**Option C: Via VS Code Azure Extension**

1. Installer "Azure App Service" extension i VS Code
2. Right-click på projektet
3. Vælg "Deploy to Web App"
4. Følg instruktionerne

### Metode 2: Azure CLI (Avanceret)

#### Forudsætninger

```bash
# Installer Azure CLI hvis ikke allerede installeret
# Windows: winget install -e --id Microsoft.AzureCLI
# Mac: brew install azure-cli
# Linux: curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Sæt subscription (hvis du har flere)
az account set --subscription "<subscription-id>"
```

#### Opret Resource Group

```bash
az group create --name hitster-rg --location "West Europe"
```

#### Opret App Service Plan (Free Tier)

```bash
az appservice plan create \
  --name hitster-plan \
  --resource-group hitster-rg \
  --sku FREE \
  --is-linux
```

#### Opret Web App

```bash
az webapp create \
  --name hitster-online \
  --resource-group hitster-rg \
  --plan hitster-plan \
  --runtime "NODE:18-lts"
```

#### Konfigurer Environment Variables

```bash
az webapp config appsettings set \
  --name hitster-online \
  --resource-group hitster-rg \
  --settings \
    NODE_ENV=production \
    NEXT_PUBLIC_URL=https://hitster-online.azurewebsites.net \
    NEXT_PUBLIC_SOCKET_URL=https://hitster-online.azurewebsites.net \
    PORT=8080
```

#### Sæt Startup Command (Linux)

```bash
az webapp config set \
  --name hitster-online \
  --resource-group hitster-rg \
  --startup-file "cd /home/site/wwwroot && npm run start:production"
```

**Vigtigt:** `cd /home/site/wwwroot &&` sikrer at npm kører fra den korrekte mappe hvor `package.json` ligger.

**Note:** Hvis appen ikke starter, prøv at inkludere build i startup command:
```bash
az webapp config set \
  --name hitster-online \
  --resource-group hitster-rg \
  --startup-file "cd /home/site/wwwroot && npm run build && npm run start:production"
```

#### Deploy Kode

```bash
# Fra projekt root
az webapp up \
  --name hitster-online \
  --resource-group hitster-rg \
  --runtime "NODE:18-lts"
```

## Post-Deployment

### Verificer Deployment

1. Åbn din app URL: `https://<din-app-navn>.azurewebsites.net`
2. Test at frontend loader korrekt
3. Test Socket.IO forbindelse ved at oprette et spil

### Troubleshooting

#### App Container Failed to Start

Dette er den mest almindelige fejl. Se **AZURE-TROUBLESHOOTING.md** for detaljerede instruktioner.

**Hurtig fix:**

1. **Tjek Log Stream først** (vigtigste skridt):
   - Gå til "Log stream" i Azure Portal
   - Se efter specifikke fejlmeddelelser

2. **Verificer Startup Command**:
   - Gå til "Configuration" > "General settings"
   - Startup Command skal være: `cd /home/site/wwwroot && npm run start:production`
   - **Vigtigt:** Hvis du ser fejl "ENOENT: no such file or directory, open '/package.json'", betyder det at npm kører fra forkert directory. Brug altid `cd /home/site/wwwroot &&` før npm kommandoen.
   - Hvis det ikke virker, prøv: `cd /home/site/wwwroot && npm run build && npm run start:production`

3. **Verificer Environment Variables**:
   - `NODE_ENV=production`
   - `NEXT_PUBLIC_URL=https://<din-app>.azurewebsites.net`
   - `NEXT_PUBLIC_SOCKET_URL=https://<din-app>.azurewebsites.net`
   - `PORT=8080`

4. **Verificer Build Process**:
   - Tjek at `.oryx-build.sh` eksisterer og indeholder `npm run build`
   - Tjek at `.next` mappen eksisterer efter deployment

5. **Test lokalt først**:
   ```bash
   npm run build
   npm run start:production
   ```

#### App starter ikke

1. Tjek logs i Azure Portal:
   - Gå til "Log stream" for live logs
   - Gå til "Logs" for historiske logs

2. Verificer environment variables er sat korrekt

3. Tjek at Node.js version matcher (18 eller 20)

4. Se **AZURE-TROUBLESHOOTING.md** for detaljerede troubleshooting trin

#### Socket.IO virker ikke

1. Verificer at `NEXT_PUBLIC_SOCKET_URL` er sat til samme URL som frontend
2. Tjek browser console for CORS fejl
3. Verificer at WebSockets er aktiveret (skal være automatisk på Azure)

#### App går i "sovemode"

På gratis tier kan appen gå i "sovemode" efter inaktivitet. Dette er normalt og appen vil vågne op ved første request (kan tage 10-30 sekunder).

## Begrænsninger på Gratis Tier

- **CPU**: 60 minutter CPU tid per dag
- **RAM**: 1 GB
- **Storage**: 1 GB
- **Custom Domain**: Ikke tilgængelig (kun *.azurewebsites.net)
- **Cold Start**: App kan "sove" efter inaktivitet

## Opgradering

Hvis du har brug for mere ressource, kan du opgradere til:
- **Basic Tier (B1)**: ~$13/måned - Ingen CPU begrænsning, custom domain
- **Standard Tier (S1)**: ~$70/måned - Bedre performance, SSL certifikat

## Vedligeholdelse

### Opdateringer

1. Push ændringer til din Git repository
2. Azure vil automatisk redeploy hvis Continuous Deployment er aktiveret
3. Eller manuelt deploy via Azure Portal eller CLI

### Monitoring

- **Application Insights**: Tilføj for gratis monitoring (anbefalet)
- **Log Stream**: Se live logs i Azure Portal
- **Metrics**: Overvåg CPU, memory, og requests

## Support

- [Azure App Service Dokumentation](https://docs.microsoft.com/azure/app-service/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Socket.IO Deployment](https://socket.io/docs/v4/deployment/)

## Noter

- Appen bruger `tsx` til at køre TypeScript direkte (ingen build step nødvendig for server kode)
- Next.js build sker automatisk ved deployment
- Socket.IO og Next.js kører på samme port via den kombinerede server

