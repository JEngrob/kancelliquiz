# Complete Setup Script - Azure + GitHub
# Dette script guider dig gennem hele setup processen

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quiz Game - Complete Azure Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Azure Setup
Write-Host "STEP 1: Azure Setup" -ForegroundColor Yellow
Write-Host "-------------------" -ForegroundColor Yellow
Write-Host ""
$appName = Read-Host "Enter your Azure Web App name (must be globally unique, e.g., kancelliquiz-abc123)"

if ([string]::IsNullOrWhiteSpace($appName)) {
    Write-Host "ERROR: App name cannot be empty!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Running Azure setup script..." -ForegroundColor Yellow
& "$PSScriptRoot\azure-setup.ps1" -AppName $appName

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Azure setup failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 2: GitHub Secrets Setup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is available
$ghCli = Get-Command gh -ErrorAction SilentlyContinue
if ($ghCli) {
    Write-Host "GitHub CLI detected. Do you want to set secrets automatically? (y/n)" -ForegroundColor Yellow
    $autoSetup = Read-Host
    
    if ($autoSetup -eq "y" -or $autoSetup -eq "Y") {
        Write-Host "Checking GitHub CLI authentication..." -ForegroundColor Yellow
        $ghAuth = gh auth status 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Not authenticated. Please login..." -ForegroundColor Yellow
            gh auth login
        }
        
        Write-Host "Setting GitHub secrets..." -ForegroundColor Yellow
        
        # Set AZURE_WEBAPP_NAME
        gh secret set AZURE_WEBAPP_NAME --body $appName
        
        # Set AZURE_WEBAPP_PUBLISH_PROFILE
        $profilePath = "azure-publish-profile.xml"
        if (Test-Path $profilePath) {
            $profileContent = Get-Content -Path $profilePath -Raw
            $profileContent | gh secret set AZURE_WEBAPP_PUBLISH_PROFILE
            Write-Host "GitHub secrets set successfully!" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Publish profile not found. Please set secrets manually." -ForegroundColor Yellow
        }
    } else {
        Write-Host "Manual setup selected." -ForegroundColor Yellow
    }
} else {
    Write-Host "GitHub CLI not found. Manual setup required." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Manual GitHub Secrets Setup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If secrets were not set automatically, follow these steps:" -ForegroundColor White
Write-Host ""
Write-Host "1. Go to: https://github.com/JEngrob/kancelliquiz/settings/secrets/actions" -ForegroundColor Cyan
Write-Host "2. Click 'New repository secret'" -ForegroundColor White
Write-Host "3. Add these secrets:" -ForegroundColor White
Write-Host ""
Write-Host "   Name: AZURE_WEBAPP_NAME" -ForegroundColor Gray
Write-Host "   Value: $appName" -ForegroundColor Gray
Write-Host ""
Write-Host "   Name: AZURE_WEBAPP_PUBLISH_PROFILE" -ForegroundColor Gray
Write-Host "   Value: (copy entire content from azure-publish-profile.xml)" -ForegroundColor Gray
Write-Host ""
Write-Host "See scripts/github-secrets-setup.md for detailed instructions." -ForegroundColor Yellow
Write-Host ""

# Step 3: Git Setup
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 3: Git Repository Setup" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$gitRemote = git remote get-url origin 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "Git remote already configured: $gitRemote" -ForegroundColor Green
} else {
    Write-Host "Git remote not configured. Setting up..." -ForegroundColor Yellow
    
    # Initialize git if needed
    if (-not (Test-Path ".git")) {
        Write-Host "Initializing git repository..." -ForegroundColor Yellow
        git init
        git branch -M main
    }
    
    # Add remote
    Write-Host "Adding GitHub remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/JEngrob/kancelliquiz.git
    
    Write-Host "Git remote configured!" -ForegroundColor Green
}

Write-Host ""
Write-Host "Ready to push? (y/n)" -ForegroundColor Yellow
$pushNow = Read-Host

if ($pushNow -eq "y" -or $pushNow -eq "Y") {
    Write-Host "Adding files..." -ForegroundColor Yellow
    git add .
    
    Write-Host "Committing..." -ForegroundColor Yellow
    git commit -m "Add Azure deployment configuration"
    
    Write-Host "Pushing to GitHub..." -ForegroundColor Yellow
    git push -u origin main
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Deployment Triggered!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Monitor deployment at:" -ForegroundColor Yellow
        Write-Host "https://github.com/JEngrob/kancelliquiz/actions" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "App will be available at:" -ForegroundColor Yellow
        Write-Host "https://$appName.azurewebsites.net" -ForegroundColor Cyan
        Write-Host ""
    } else {
        Write-Host "ERROR: Failed to push to GitHub!" -ForegroundColor Red
        Write-Host "Please push manually: git push -u origin main" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "To push later, run:" -ForegroundColor Yellow
    Write-Host "  git add ." -ForegroundColor Gray
    Write-Host "  git commit -m 'Add Azure deployment configuration'" -ForegroundColor Gray
    Write-Host "  git push -u origin main" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

