# GitHub Secrets Setup Guide

Efter Azure ressourcer er oprettet, skal du tilføje secrets til GitHub repository.

## Automatisk Setup (via GitHub CLI)

Hvis du har GitHub CLI installeret:

```bash
# Login til GitHub CLI
gh auth login

# Sæt secrets (erstatter <app-name> og <path-to-publish-profile>)
gh secret set AZURE_WEBAPP_NAME --body "<app-name>"
gh secret set AZURE_WEBAPP_PUBLISH_PROFILE < <path-to-publish-profile>
```

## Manuel Setup (via GitHub Web Interface)

1. Gå til dit GitHub repository: https://github.com/JEngrob/kancelliquiz
2. Klik på **"Settings"** tab
3. I venstre menu, gå til **"Secrets and variables"** > **"Actions"**
4. Klik **"New repository secret"**

### Secret 1: AZURE_WEBAPP_NAME

- **Name:** `AZURE_WEBAPP_NAME`
- **Secret:** Dit Azure Web App navn (f.eks. `kancelliquiz-abc123`)
- Klik **"Add secret"**

### Secret 2: AZURE_WEBAPP_PUBLISH_PROFILE

- **Name:** `AZURE_WEBAPP_PUBLISH_PROFILE`
- **Secret:** 
  1. Åbn filen `azure-publish-profile.xml` (oprettet af setup script)
  2. Kopier hele XML indholdet
  3. Indsæt hele indholdet som secret value
- Klik **"Add secret"**

## Verificer Secrets

Efter at have tilføjet secrets, kan du verificere dem i GitHub:
- Gå til Settings > Secrets and variables > Actions
- Du skal se begge secrets listet (værdierne er skjulte af sikkerhedsmæssige årsager)

## Test Deployment

Efter secrets er sat op:

1. Push kode til GitHub:
   ```bash
   git add .
   git commit -m "Add Azure deployment"
   git push origin main
   ```

2. Gå til GitHub Repository > **"Actions"** tab
3. Se workflow køre automatisk
4. Verificer at deployment er successful






