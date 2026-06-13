param(
  [string]$OutputPath = "..\public\downloads\ace-studio-android.apk"
)

$ErrorActionPreference = "Stop"

function Read-DotEnvFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#")) {
      return
    }

    if ($line -match "^([A-Za-z_][A-Za-z0-9_]*)=(.*)$") {
      $name = $Matches[1]
      $value = $Matches[2].Trim()

      if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
        $value = $value.Substring(1, $value.Length - 2)
      }

      if (-not [Environment]::GetEnvironmentVariable($name, "Process")) {
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
      }
    }
  }
}

function Get-RequiredEnv {
  param(
    [string]$Name,
    [string[]]$FallbackNames = @()
  )

  $value = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ($value) {
    return $value
  }

  foreach ($fallbackName in $FallbackNames) {
    $fallbackValue = [Environment]::GetEnvironmentVariable($fallbackName, "Process")
    if ($fallbackValue) {
      return $fallbackValue
    }
  }

  throw "Missing required Android build value: $Name"
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$flutterRoot = Join-Path $repoRoot "ace_flutter"

Read-DotEnvFile (Join-Path $repoRoot ".env.local")
Read-DotEnvFile (Join-Path $repoRoot ".env.production.local")
Read-DotEnvFile (Join-Path $repoRoot ".env.production")
Read-DotEnvFile (Join-Path $repoRoot ".env")

$apiBaseUrl = [Environment]::GetEnvironmentVariable("ACE_API_BASE_URL", "Process")
if (-not $apiBaseUrl) {
  $apiBaseUrl = [Environment]::GetEnvironmentVariable("ACE_APP_BASE_URL", "Process")
}
if (-not $apiBaseUrl) {
  $apiBaseUrl = "https://www.acestudio.ng"
}

$dartDefines = @(
  "--dart-define=ACE_API_BASE_URL=$apiBaseUrl",
  "--dart-define=ACE_ENVIRONMENT=production",
  "--dart-define=ACE_FIREBASE_API_KEY=$(Get-RequiredEnv "ACE_FIREBASE_API_KEY" @("NEXT_PUBLIC_FIREBASE_API_KEY"))",
  "--dart-define=ACE_FIREBASE_APP_ID=$(Get-RequiredEnv "ACE_FIREBASE_APP_ID" @("NEXT_PUBLIC_FIREBASE_APP_ID"))",
  "--dart-define=ACE_FIREBASE_MESSAGING_SENDER_ID=$(Get-RequiredEnv "ACE_FIREBASE_MESSAGING_SENDER_ID" @("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"))",
  "--dart-define=ACE_FIREBASE_PROJECT_ID=$(Get-RequiredEnv "ACE_FIREBASE_PROJECT_ID" @("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID"))",
  "--dart-define=ACE_FIREBASE_AUTH_DOMAIN=$(Get-RequiredEnv "ACE_FIREBASE_AUTH_DOMAIN" @("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN"))",
  "--dart-define=ACE_FIREBASE_STORAGE_BUCKET=$(Get-RequiredEnv "ACE_FIREBASE_STORAGE_BUCKET" @("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "FIREBASE_STORAGE_BUCKET"))",
  "--dart-define=ACE_IOS_BUNDLE_ID=ng.acestudio.mobile"
)

Push-Location $flutterRoot
try {
  flutter pub get
  flutter build apk --release @dartDefines

  $apkPath = Join-Path $flutterRoot "build\app\outputs\flutter-apk\app-release.apk"
  if (-not (Test-Path $apkPath)) {
    throw "Flutter build completed, but $apkPath was not created."
  }

  $resolvedOutputPath = Join-Path $flutterRoot $OutputPath
  $outputDirectory = Split-Path $resolvedOutputPath -Parent
  New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
  Copy-Item -Path $apkPath -Destination $resolvedOutputPath -Force

  Write-Host "Android APK copied to $resolvedOutputPath"
}
finally {
  Pop-Location
}
