param(
  [string]$Repo = "",
  [string]$LocalEnvPath = ".env.local",
  [string]$PulledEnvPath = ".env.vercel.production.local"
)

$ErrorActionPreference = "Stop"

$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercel) {
  throw "Vercel CLI is not installed or not on PATH. Install it with: npm i -g vercel. Then run: vercel login"
}

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  throw "GitHub CLI is not installed or not on PATH. Install it, then run: gh auth login"
}

vercel whoami | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Vercel CLI is not logged in. Run: vercel login"
}

gh auth status | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not logged in. Run: gh auth login"
}

Write-Host "Pulling production environment variables from Vercel..."
vercel env pull $PulledEnvPath --environment=production --yes

if (-not (Test-Path $PulledEnvPath)) {
  throw "Vercel env pull did not create $PulledEnvPath"
}

$syncScript = Join-Path $PSScriptRoot "sync-github-android-secrets.ps1"
$args = @(
  "-EnvPath",
  $LocalEnvPath,
  "-AdditionalEnvPath",
  $PulledEnvPath
)

if ($Repo) {
  $args += @("-Repo", $Repo)
}

& $syncScript @args
Write-Host "Vercel production env has been synced into GitHub Android build secrets."
