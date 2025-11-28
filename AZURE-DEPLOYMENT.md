# Azure Deployment Guide - Quiz Game

Denne guide beskriver hvordan du deployer Quiz Game applikationen til Azure App Service på Free Tier med automatisk deployment via GitHub Actions.

## Forudsætninger

- Azure konto (gratis tier tilgængelig)
- GitHub konto
- Git installeret lokalt
- Repository: https://github.com/JEngrob/kancelliquiz

## Fase 1: Azure Portal Setup (Første Gang)

### 1.1 Opret Resource Group

1. Log ind på [Azure Portal](https://portal.azure.com)
2. Klik på "Create a resource"
3. Søg efter "Resource Group" og klik "Create"
4. Indstillinger:
   - **Subscription**: Vælg din subscription
   - **Resource Group**: `kancelliquiz-rg`
   - **Region**: West Europe (eller nærmeste)
5. Klik "Review + create" og derefter "Create"

### 1.2 Opret App Service Plan

1. I Azure Portal, klik "Create a resource"
2. Søg efter "App Service Plan" og klik "Create"
3. Indstillinger:
   - **Subscription**: Vælg din subscription
   - **Resource Group**: Vælg `kancelliquiz-rg`
   - **Name**: `kancelliquiz-plan`
   - **Operating System**: **Linux**
   - **Region**: West Europe (samme som Resource Group)
   - **Pricing tier**: **Free (F1)** - Vælg "Dev/Test" tab og vælg "F1"
4. Klik "Review + create" og derefter "Create"

### 1.3 Opret Web App

1. I Azure Portal, klik "Create a resource"
2. Søg efter "Web App" og klik "Create"
3. **Basics tab:**
   - **Subscription**: Vælg din subscription
   - **Resource Group**: Vælg `kancelliquiz-rg`
   - **Name**: `kancelliquiz-<unikt-navn>` (skal være globalt unikt, f.eks. `kancelliquiz-abc123`)
   - **Publish**: Code
   - **Runtime stack**: **Node 18 LTS**
   - **Operating System**: **Linux**
   - **Region**: West Europe
   - **App Service Plan**: Vælg `kancelliquiz-plan`

4. Klik "Review + create" og derefter "Create"

**Vigtigt:** Gem app navnet - det bliver din URL: `https://kancelliquiz-<navn>.azurewebsites.net`

### 1.4 Konfigurer Environment Variables

1. Gå til din Web App i Azure Portal
2. I venstre menu, gå til **"Configuration"** > **"Application settings"**
3. Klik **"+ New application setting"** for hver af følgende:

   **NODE_ENV:**
   - Name: `NODE_ENV`
   - Value: `production`

   **NEXT_PUBLIC_URL:**
   - Name: `NEXT_PUBLIC_URL`
   - Value: `https://kancelliquiz-<din-navn>.azurewebsites.net` (erstatter `<din-navn>` med dit faktiske app navn)

   **NEXT_PUBLIC_SOCKET_URL:**
   - Name: `NEXT_PUBLIC_SOCKET_URL`
   - Value: `https://kancelliquiz-<din-navn>.azurewebsites.net` (samme som ovenfor)

   **PORT:**
   - Name: `PORT`
   - Value: `8080`

4. Klik **"Save"** (øverst på siden)

### 1.5 Konfigurer Startup Command

1. I samme **"Configuration"** side, gå til **"General settings"** tab (øverst)
2. Scroll ned til **"Startup Command"** feltet (nederst på siden)
3. Indtast følgende:
   ```bash
   cd /home/site/wwwroot && npm run start:production
   ```
4. Klik **"Save"** (øverst på siden)

### 1.6 Opret Deployment Credentials

1. I Azure Portal, gå til din Web App
2. I venstre menu, gå til **"Deployment Center"**
3. Under **"Settings"** tab:
   - **Source**: Vælg "Local Git" eller "FTPS"
   - Klik **"Save"**
4. Vent til deployment credentials er oprettet
5. Klik på **"Get publish profile"** knappen (øverst)
6. Download `.publishsettings` filen - du skal bruge indholdet til GitHub Secrets

## Fase 2: GitHub Repository Setup

### 2.1 Push Kode til GitHub

Hvis du ikke allerede har pushet kode til GitHub:

```bash
# Initialiser git (hvis ikke allerede gjort)
git init

# Tilføj alle filer
git add .

# Commit
git commit -m "Initial commit with Azure deployment"

# Tilføj remote
git remote add origin https://github.com/JEngrob/kancelliquiz.git

# Push til main branch
git branch -M main
git push -u origin main
```

### 2.2 Konfigurer GitHub Secrets

1. Gå til dit GitHub repository: https://github.com/JEngrob/kancelliquiz
2. Klik på **"Settings"** tab
3. I venstre menu, gå til **"Secrets and variables"** > **"Actions"**
4. Klik **"New repository secret"**

   **Secret 1: AZURE_WEBAPP_NAME**
   - Name: `AZURE_WEBAPP_NAME`
   - Secret: Dit Azure Web App navn (f.eks. `kancelliquiz-abc123`)
   - Klik "Add secret"

   **Secret 2: AZURE_WEBAPP_PUBLISH_PROFILE**
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Secret: Åbn den downloadede `.publishsettings` fil og kopier hele XML indholdet
   - Indsæt hele indholdet som secret value
   - Klik "Add secret"

## Fase 3: Første Deployment

### 3.1 Trigger Deployment

1. Push kode til GitHub (hvis ikke allerede gjort):
   ```bash
   git add .
   git commit -m "Add Azure deployment configuration"
   git push origin main
   ```

2. GitHub Actions workflow starter automatisk

### 3.2 Monitor Deployment

1. Gå til GitHub Repository > **"Actions"** tab
2. Klik på den kørende workflow
3. Se build og deploy processen
4. Vent til workflow er færdig (grøn checkmark)

### 3.3 Verificer Deployment

1. Gå til Azure Portal > din Web App > **"Deployment Center"** > **"Logs"**
2. Tjek at deployment var successful
3. Åbn din app URL: `https://kancelliquiz-<navn>.azurewebsites.net`
4. Test applikationen:
   - Opret et spil som vært
   - Join som spiller i anden browser/incognito
   - Test Socket.IO real-time kommunikation

## Fase 4: Post-Deployment

### 4.1 Enable Application Logging

1. Azure Portal > din Web App > **"Configuration"** > **"General settings"**
2. Scroll ned til **"Application Logging"** sektion
3. **File system**: Slå til **"On"**
4. **Level**: Vælg **"Verbose"**
5. Klik **"Save"**

Nu kan du se logs i **"Log stream"** (under Monitoring i venstre menu).

### 4.2 Test Applikationen

1. **Frontend Test:**
   - Åbn app URL i browser
   - Verificer at siden loader korrekt
   - Test navigation mellem sider

2. **Socket.IO Test:**
   - Opret spil som vært
   - Åbn `/player` i anden browser/incognito
   - Join med spil-koden
   - Verificer at real-time kommunikation virker

3. **Quiz Test:**
   - Vælg en quiz som vært
   - Start spillet
   - Test at spørgsmål sendes til spillere
   - Test at svar modtages korrekt
   - Test point system

## Troubleshooting

### App Container Failed to Start

**Symptom:** App starter ikke i Azure Portal

**Løsning:**
1. Gå til **"Log stream"** i Azure Portal (under Monitoring)
2. Se efter specifikke fejlmeddelelser
3. Tjek at Startup Command er sat korrekt: `cd /home/site/wwwroot && npm run start:production`
4. Verificer at alle environment variables er sat
5. Tjek at Node.js version matcher (18 LTS)

### GitHub Actions Deployment Fejler

**Symptom:** Workflow fejler i GitHub Actions

**Løsning:**
1. Gå til GitHub Repository > Actions > Fejlede workflow
2. Se build logs for specifikke fejl
3. Verificer at GitHub Secrets er sat korrekt:
   - `AZURE_WEBAPP_NAME` skal matche dit Azure Web App navn
   - `AZURE_WEBAPP_PUBLISH_PROFILE` skal indeholde hele publish profile XML
4. Tjek at repository har korrekt filer (`.github/workflows/azure-deploy.yml`)

### Socket.IO Virker Ikke

**Symptom:** Real-time kommunikation virker ikke

**Løsning:**
1. Verificer at `NEXT_PUBLIC_SOCKET_URL` matcher frontend URL
2. Tjek browser console for CORS fejl
3. Verificer at WebSockets er aktiveret (automatisk på Azure)
4. Tjek at `NEXT_PUBLIC_SOCKET_URL` er sat korrekt i environment variables

### Build Fejler

**Symptom:** Next.js build fejler under deployment

**Løsning:**
1. Test build lokalt først: `npm run build`
2. Tjek at alle dependencies er installeret korrekt
3. Verificer at `.oryx-build.sh` eksisterer og har korrekt indhold
4. Tjek GitHub Actions logs for specifikke build fejl

### App Går i Sovemode

**Symptom:** Første request tager 10-30 sekunder

**Løsning:**
- Dette er normalt på Free Tier
- Appen "vågner" automatisk ved første request
- Overvej opgradering til Basic Tier hvis dette er et problem

## Free Tier Begrænsninger

- **CPU**: 60 minutter per dag
- **RAM**: 1 GB
- **Storage**: 1 GB
- **Cold Start**: 10-30 sekunder efter inaktivitet
- **Custom Domain**: Ikke tilgængelig (kun *.azurewebsites.net)
- **SSL**: Automatisk HTTPS inkluderet

## Opgradering

Hvis du har brug for mere ressource:

- **Basic Tier (B1)**: ~$13/måned
  - Ingen CPU begrænsning
  - Custom domain support
  - Bedre performance

- **Standard Tier (S1)**: ~$70/måned
  - Endnu bedre performance
  - Auto-scaling
  - SSL certifikat

## Automatisk Deployment

Efter første setup:
- Hver push til `main` branch trigger automatisk deployment
- GitHub Actions kører build og deploy automatisk
- Ingen manuel intervention nødvendig

## Support

- [Azure App Service Dokumentation](https://docs.microsoft.com/azure/app-service/)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Socket.IO Deployment](https://socket.io/docs/v4/deployment/)
- [GitHub Actions Dokumentation](https://docs.github.com/en/actions)

## Noter

- Appen bruger `tsx` til at køre TypeScript direkte
- Next.js build sker automatisk ved deployment
- Socket.IO og Next.js kører på samme port via combined server (`server.ts`)
- Environment variables skal være sat korrekt for at appen virker

