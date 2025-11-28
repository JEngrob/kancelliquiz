# Hvor Finder Jeg Startup Command i Azure Portal?

## Step-by-Step Guide

### Trin 1: Naviger til Configuration
1. Åbn [Azure Portal](https://portal.azure.com)
2. Find din App Service "hitster-online" i venstre navigation eller søg efter den
3. Klik på din App Service

### Trin 2: Åbn Configuration
1. I venstre navigation pane, find **"Settings"** sektionen
2. Klik på **"Configuration (preview)"** (den er under Settings)

### Trin 3: Gå til General Settings
1. Klik på **"General settings"** tab (øverst på siden, ved siden af "Stack settings", "Path mappings", etc.)

### Trin 4: Find Startup Command Feltet
1. **Scroll ned på siden** - Startup Command er ikke synligt i toppen
2. Du vil se flere sektioner:
   - **Platform settings** (øverst)
   - **Debugging** (i midten)
   - **Incoming client certificates** (lidt længere ned)
   - **Startup Command** (nederst på siden) ⬅️ **HER ER DET!**

### Trin 5: Indtast Startup Command
1. Find **"Startup Command"** tekstfeltet
2. Indtast følgende:
   ```
   cd /home/site/wwwroot && npm run start:production
   ```
3. Scroll ned til bunden af siden
4. Klik **"Save"** eller **"Apply"** knappen

## Visual Guide

```
Azure Portal
├── hitster-online (Web App)
    ├── Settings
        └── Configuration (preview) ⬅️ KLIK HER
            ├── General settings tab ⬅️ KLIK HER
            │   ├── Platform settings (øverst)
            │   ├── Debugging
            │   ├── Incoming client certificates
            │   └── Startup Command ⬅️ SCROLL NED TIL HER
            ├── Stack settings tab
            ├── Path mappings tab
            └── Error pages tab
```

## Hvis Du Ikke Kan Se Startup Command

### Mulige Årsager:

1. **Du er på Windows App Service**
   - Startup Command vises kun for Linux App Services
   - Tjek "Overview" → "Essentials" → "Operating System"
   - Skal være "Linux", ikke "Windows"

2. **Du har ikke scrollet langt nok ned**
   - Startup Command er nederst på siden
   - Scroll helt ned til bunden

3. **Du er i forkert tab**
   - Sørg for at være på **"General settings"** tab
   - Ikke "Stack settings" eller "Path mappings"

## Alternativ: Brug Azure CLI

Hvis du ikke kan finde feltet i portalen, kan du bruge Azure CLI:

```bash
# Login til Azure
az login

# Sæt startup command
az webapp config set \
  --name hitster-online \
  --resource-group hitster-rg \
  --startup-file "cd /home/site/wwwroot && npm run start:production"
```

## Efter Du Har Opdateret

1. **Restart App Service:**
   - Gå til "Overview"
   - Klik "Restart" knappen
   - Vent 1-2 minutter

2. **Tjek Log Stream:**
   - Gå til "Log stream" (under Monitoring)
   - Se om appen starter korrekt nu

3. **Verificer:**
   - Åbn din app URL: `https://hitster-online.azurewebsites.net`
   - Tjek om den virker

## Troubleshooting

Hvis du stadig har problemer:
- Se `AZURE-QUICK-FIX.md` for hurtig løsning
- Se `AZURE-TROUBLESHOOTING.md` for detaljerede troubleshooting trin



