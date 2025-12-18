#!/usr/bin/env pwsh

# Teams Application Access Policy Setup Script for Tipu
# Run on macOS after installing PowerShell

Write-Host "🚀 Tipu Teams Application Access Policy Setup" -ForegroundColor Cyan
Write-Host ""

# Check if Teams module is installed
Write-Host "📦 Checking Microsoft Teams module..." -ForegroundColor Yellow
$teamsModule = Get-Module -Name MicrosoftTeams -ListAvailable

if (-not $teamsModule) {
    Write-Host "❌ MicrosoftTeams module not found. Installing..." -ForegroundColor Red
    Install-Module -Name MicrosoftTeams -Force -AllowClobber -Scope CurrentUser
    Write-Host "✅ Module installed" -ForegroundColor Green
} else {
    Write-Host "✅ Module already installed" -ForegroundColor Green
}

# Import module
Write-Host ""
Write-Host "📥 Importing Teams module..." -ForegroundColor Yellow
Import-Module MicrosoftTeams
Write-Host "✅ Module imported" -ForegroundColor Green

# Connect to Teams
Write-Host ""
Write-Host "🔐 Connecting to Microsoft Teams..." -ForegroundColor Yellow
Write-Host "⚠️  A browser window will open - sign in with your admin account" -ForegroundColor Cyan
Connect-MicrosoftTeams

# Get App ID from user
Write-Host ""
Write-Host "📋 Enter your Azure App Registration Client ID:" -ForegroundColor Yellow
Write-Host "   (Find it in Azure Portal → App registrations → Your app)" -ForegroundColor Gray
Write-Host "   (Or check tipu-api/.env MICROSOFT_CLIENT_ID)" -ForegroundColor Gray
$appId = Read-Host "App Client ID"

if (-not $appId) {
    Write-Host "❌ App ID is required. Exiting." -ForegroundColor Red
    exit 1
}

# Create policy
Write-Host ""
Write-Host "🔨 Creating Application Access Policy..." -ForegroundColor Yellow
try {
    New-CsApplicationAccessPolicy -Identity "Tipu-Teams-Policy" -AppIds $appId -Description "Allow Tipu app to create Teams meetings on behalf of users"
    Write-Host "✅ Policy created successfully" -ForegroundColor Green
} catch {
    if ($_.Exception.Message -like "*already exists*") {
        Write-Host "⚠️  Policy already exists - skipping creation" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Error creating policy: $_" -ForegroundColor Red
        exit 1
    }
}

# Get organizer email
Write-Host ""
Write-Host "📧 Enter your Teams Organizer Email:" -ForegroundColor Yellow
Write-Host "   (This is the TEAMS_ORGANIZER_EMAIL from your .env file)" -ForegroundColor Gray
$organizerEmail = Read-Host "Organizer Email"

if (-not $organizerEmail) {
    Write-Host "❌ Organizer email is required. Exiting." -ForegroundColor Red
    exit 1
}

# Grant policy
Write-Host ""
Write-Host "🎫 Granting policy to organizer user..." -ForegroundColor Yellow
try {
    Grant-CsApplicationAccessPolicy -PolicyName "Tipu-Teams-Policy" -Identity $organizerEmail
    Write-Host "✅ Policy granted successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Error granting policy: $_" -ForegroundColor Red
    Write-Host "   Make sure the email is correct and the user exists in your tenant" -ForegroundColor Gray
    exit 1
}

# Verify
Write-Host ""
Write-Host "🔍 Verifying policy assignment..." -ForegroundColor Yellow
try {
    $user = Get-CsOnlineUser -Identity $organizerEmail | Select-Object UserPrincipalName, ApplicationAccessPolicy
    Write-Host "✅ Policy verification:" -ForegroundColor Green
    Write-Host "   User: $($user.UserPrincipalName)" -ForegroundColor Cyan
    Write-Host "   Policy: $($user.ApplicationAccessPolicy)" -ForegroundColor Cyan
} catch {
    Write-Host "⚠️  Could not verify immediately (this is normal)" -ForegroundColor Yellow
}

# Done
Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "⏰ IMPORTANT: Wait 15-20 minutes for the policy to propagate" -ForegroundColor Yellow
Write-Host "   Microsoft's servers need time to sync this change." -ForegroundColor Gray
Write-Host ""
Write-Host "📝 After waiting, test by creating a booking and checking for Teams meeting link generation." -ForegroundColor Cyan
Write-Host ""

# Disconnect
Disconnect-MicrosoftTeams
Write-Host "✅ Disconnected from Teams" -ForegroundColor Green
