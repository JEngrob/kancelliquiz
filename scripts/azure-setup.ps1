# Azure Setup Script for Quiz Game
# Dette script opretter alle Azure ressourcer automatisk
# Kør: .\scripts\azure-setup.ps1

param(
    [Parameter(Mandatory=$true)]
    [string]$AppName,
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroup = "kancelliquiz-rg",
    
    [Parameter(Mandatory=$false)]
    [string]$Location = "westeurope",
    
    [Parameter(Mandatory=$false)]
    [string]$PlanName = "kancelliquiz-plan"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Azure Setup Script for Quiz Game" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Azure CLI is installed
Write-Host "Checking Azure CLI installation..." -ForegroundColor Yellow
$azCli = Get-Command az -ErrorAction SilentlyContinue
if (-not $azCli) {
    Write-Host "ERROR: Azure CLI is not installed!" -ForegroundColor Red
    Write-Host "Install Azure CLI: https://aka.ms/installazurecliwindows" -ForegroundColor Yellow
    exit 1
}
Write-Host "Azure CLI found: $($azCli.Version)" -ForegroundColor Green
Write-Host ""

# Check if logged in
Write-Host "Checking Azure login status..." -ForegroundColor Yellow
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Not logged in. Please login..." -ForegroundColor Yellow
    az login
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) {
        Write-Host "ERROR: Failed to login to Azure!" -ForegroundColor Red
        exit 1
    }
}
Write-Host "Logged in as: $($account.user.name)" -ForegroundColor Green
Write-Host "Subscription: $($account.name) ($($account.id))" -ForegroundColor Green
Write-Host ""

# Confirm before proceeding
Write-Host "This will create the following resources:" -ForegroundColor Yellow
Write-Host "  Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "  App Service Plan: $PlanName (Free F1)" -ForegroundColor White
Write-Host "  Web App: $AppName" -ForegroundColor White
Write-Host "  Location: $Location" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Continue? (y/n)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# Create Resource Group
Write-Host "Creating Resource Group: $ResourceGroup..." -ForegroundColor Yellow
$rgExists = az group exists --name $ResourceGroup | ConvertFrom-Json
if ($rgExists -eq $false) {
    az group create --name $ResourceGroup --location $Location | Out-Null
    Write-Host "Resource Group created successfully!" -ForegroundColor Green
} else {
    Write-Host "Resource Group already exists. Skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Create App Service Plan
Write-Host "Creating App Service Plan: $PlanName..." -ForegroundColor Yellow
$planExists = az appservice plan list --resource-group $ResourceGroup --query "[?name=='$PlanName']" | ConvertFrom-Json
if ($planExists.Count -eq 0) {
    az appservice plan create `
        --name $PlanName `
        --resource-group $ResourceGroup `
        --sku FREE `
        --is-linux | Out-Null
    Write-Host "App Service Plan created successfully!" -ForegroundColor Green
} else {
    Write-Host "App Service Plan already exists. Skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Create Web App
Write-Host "Creating Web App: $AppName..." -ForegroundColor Yellow
$appExists = az webapp list --resource-group $ResourceGroup --query "[?name=='$AppName']" | ConvertFrom-Json
if ($appExists.Count -eq 0) {
    az webapp create `
        --name $AppName `
        --resource-group $ResourceGroup `
        --plan $PlanName `
        --runtime "NODE:18-lts" | Out-Null
    Write-Host "Web App created successfully!" -ForegroundColor Green
} else {
    Write-Host "Web App already exists. Skipping..." -ForegroundColor Yellow
}
Write-Host ""

# Configure Environment Variables
Write-Host "Configuring Environment Variables..." -ForegroundColor Yellow
$appUrl = "https://$AppName.azurewebsites.net"
az webapp config appsettings set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --settings `
        NODE_ENV=production `
        NEXT_PUBLIC_URL=$appUrl `
        NEXT_PUBLIC_SOCKET_URL=$appUrl `
        PORT=8080 | Out-Null
Write-Host "Environment Variables configured!" -ForegroundColor Green
Write-Host ""

# Configure Startup Command
Write-Host "Configuring Startup Command..." -ForegroundColor Yellow
az webapp config set `
    --name $AppName `
    --resource-group $ResourceGroup `
    --startup-file "cd /home/site/wwwroot && npm run start:production" | Out-Null
Write-Host "Startup Command configured!" -ForegroundColor Green
Write-Host ""

# Enable Application Logging
Write-Host "Enabling Application Logging..." -ForegroundColor Yellow
az webapp log config `
    --name $AppName `
    --resource-group $ResourceGroup `
    --application-logging filesystem `
    --level verbose | Out-Null
Write-Host "Application Logging enabled!" -ForegroundColor Green
Write-Host ""

# Get Publish Profile
Write-Host "Downloading Publish Profile..." -ForegroundColor Yellow
$publishProfile = az webapp deployment list-publishing-profiles `
    --name $AppName `
    --resource-group $ResourceGroup `
    --xml | Out-String

$profilePath = "azure-publish-profile.xml"
$publishProfile | Out-File -FilePath $profilePath -Encoding UTF8
Write-Host "Publish Profile saved to: $profilePath" -ForegroundColor Green
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "App URL: $appUrl" -ForegroundColor Cyan
Write-Host "Resource Group: $ResourceGroup" -ForegroundColor White
Write-Host "App Name: $AppName" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Publish Profile saved to: $profilePath" -ForegroundColor White
Write-Host "2. Add GitHub Secrets:" -ForegroundColor White
Write-Host "   - AZURE_WEBAPP_NAME = $AppName" -ForegroundColor Gray
Write-Host "   - AZURE_WEBAPP_PUBLISH_PROFILE = (copy content from $profilePath)" -ForegroundColor Gray
Write-Host "3. Push code to GitHub to trigger deployment" -ForegroundColor White
Write-Host ""




