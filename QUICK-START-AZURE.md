# Quick Start - Azure Deployment

Dette er en hurtig guide til at deploye Quiz Game til Azure med minimal manuel intervention.

## Forudsætninger

- Azure CLI installeret: https://aka.ms/installazurecliwindows
- GitHub CLI installeret (valgfrit): https://cli.github.com/
- Git installeret
- Azure konto (gratis tier tilgængelig)

## Automatisk Setup (Anbefalet)

### 1. Kør Setup Script

```powershell
# Naviger til projekt mappe
cd C:\Kode\QuizGame

# Kør komplet setup script
.\scripts\setup-complete.ps1
```

Scriptet vil:
1. Guide dig gennem Azure ressourcer oprettelse
2. Konfigurere environment variables automatisk
3. Download publish profile
4. (Valgfrit) Sætte GitHub secrets automatisk hvis GitHub CLI er installeret
5. Guide dig gennem git push

### 2. Følg Prompts

Scriptet vil spørge dig om:
- Azure Web App navn (skal være globalt unikt, f.eks. `kancelliquiz-abc123`)
- Om du vil sætte GitHub secrets automatisk
- Om du vil pushe kode nu

### 3. Verificer Deployment

Efter scriptet er færdigt:
1. Gå til GitHub Actions: https://github.com/JEngrob/kancelliquiz/actions
2. Se workflow køre automatisk
3. Vent til deployment er færdig
4. Åbn din app URL: `https://<din-app-navn>.azurewebsites.net`

## Manuel Setup (Hvis Scripts Ikke Virker)

### 1. Azure Setup

Kør Azure setup script separat:

```powershell
.\scripts\azure-setup.ps1 -AppName "kancelliquiz-<dit-unikke-navn>"
```

Eller følg den detaljerede guide i [AZURE-DEPLOYMENT.md](AZURE-DEPLOYMENT.md)

### 2. GitHub Secrets

Følg guide i [scripts/github-secrets-setup.md](scripts/github-secrets-setup.md)

### 3. Push Kode

```bash
git add .
git commit -m "Add Azure deployment"
git push origin main
```

## Troubleshooting

### Azure CLI Ikke Fundet

Installér Azure CLI:
- Windows: `winget install -e --id Microsoft.AzureCLI`
- Eller download fra: https://aka.ms/installazurecliwindows

### GitHub CLI Ikke Fundet

Installér GitHub CLI:
- Windows: `winget install -e --id GitHub.cli`
- Eller download fra: https://cli.github.com/

### Script Fejler

1. Tjek at du er logged ind: `az login`
2. Tjek at du har rettigheder til at oprette ressourcer
3. Se fejlmeddelelser i script output
4. Følg manuel setup guide i [AZURE-DEPLOYMENT.md](AZURE-DEPLOYMENT.md)

### Deployment Fejler

1. Tjek GitHub Actions logs: https://github.com/JEngrob/kancelliquiz/actions
2. Verificer GitHub Secrets er sat korrekt
3. Tjek Azure Portal > Log Stream for runtime fejl
4. Se troubleshooting i [AZURE-DEPLOYMENT.md](AZURE-DEPLOYMENT.md)

## Næste Skridt

Efter deployment:
1. Test applikationen i browseren
2. Enable Application Logging i Azure Portal (hvis ikke allerede gjort)
3. Overvåg første 24 timer for problemer
4. Se [AZURE-DEPLOYMENT.md](AZURE-DEPLOYMENT.md) for post-deployment optimering

## Support

- Detaljeret guide: [AZURE-DEPLOYMENT.md](AZURE-DEPLOYMENT.md)
- Troubleshooting: Se troubleshooting sektion i AZURE-DEPLOYMENT.md
- Azure dokumentation: https://docs.microsoft.com/azure/app-service/




