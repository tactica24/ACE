param(
  [string]$Repo = "",
  [string]$EnvPath = ".env.local",
  [string[]]$AdditionalEnvPath = @()
)

$ErrorActionPreference = "Stop"

function Read-DotEnvFile {
  param([string]$Path)

  $values = @{}
  if (-not (Test-Path $Path)) {
    return $values
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

      $values[$name] = $value
    }
  }

  return $values
}

function Get-SecretValue {
  param(
    [hashtable]$Values,
    [string]$Name,
    [string[]]$FallbackNames = @()
  )

  if ($Values.ContainsKey($Name) -and $Values[$Name]) {
    return $Values[$Name]
  }

  foreach ($fallbackName in $FallbackNames) {
    if ($Values.ContainsKey($fallbackName) -and $Values[$fallbackName]) {
      return $Values[$fallbackName]
    }
  }

  $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")
  if ($processValue) {
    return $processValue
  }

  foreach ($fallbackName in $FallbackNames) {
    $fallbackValue = [Environment]::GetEnvironmentVariable($fallbackName, "Process")
    if ($fallbackValue) {
      return $fallbackValue
    }
  }

  throw "Missing value for $Name. Add it to $EnvPath first."
}

function Try-Get-SecretValue {
  param(
    [hashtable]$Values,
    [string]$Name,
    [string[]]$FallbackNames = @()
  )

  try {
    return Get-SecretValue -Values $Values -Name $Name -FallbackNames $FallbackNames
  } catch {
    return $null
  }
}

function Set-GitHubSecret {
  param(
    [string]$Name,
    [string]$Value
  )

  if ($Repo) {
    $Value | gh secret set $Name --repo $Repo
  } else {
    $Value | gh secret set $Name
  }

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to upload GitHub secret $Name."
  }
}

$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  throw "GitHub CLI is not installed or not on PATH. Install it, then run: gh auth login"
}

$authCheck = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
  throw "GitHub CLI is not logged in. Run: gh auth login"
}

$values = @{}
foreach ($path in @($EnvPath) + $AdditionalEnvPath) {
  $fileValues = Read-DotEnvFile $path
  foreach ($key in $fileValues.Keys) {
    $values[$key] = $fileValues[$key]
  }
}

$secretMap = @(
  @{ Name = "ACE_ANDROID_KEYSTORE_PASSWORD"; Fallbacks = @() },
  @{ Name = "ACE_ANDROID_KEY_ALIAS"; Fallbacks = @() },
  @{ Name = "ACE_ANDROID_KEY_PASSWORD"; Fallbacks = @() }
)

foreach ($secret in $secretMap) {
  $value = Get-SecretValue -Values $values -Name $secret.Name -FallbackNames $secret.Fallbacks
  Set-GitHubSecret -Name $secret.Name -Value $value
  Write-Host "Uploaded $($secret.Name)"
}

$optionalSecretMap = @(
  @{ Name = "ACE_FIREBASE_API_KEY"; Fallbacks = @("NEXT_PUBLIC_FIREBASE_API_KEY") },
  @{ Name = "ACE_FIREBASE_APP_ID"; Fallbacks = @("NEXT_PUBLIC_FIREBASE_APP_ID") },
  @{ Name = "ACE_FIREBASE_MESSAGING_SENDER_ID"; Fallbacks = @("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") },
  @{ Name = "ACE_FIREBASE_PROJECT_ID"; Fallbacks = @("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "FIREBASE_PROJECT_ID") },
  @{ Name = "ACE_FIREBASE_AUTH_DOMAIN"; Fallbacks = @("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") },
  @{ Name = "ACE_FIREBASE_STORAGE_BUCKET"; Fallbacks = @("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", "FIREBASE_STORAGE_BUCKET") },
  @{ Name = "BUNNY_STORAGE_API_KEY"; Fallbacks = @() },
  @{ Name = "BUNNY_STORAGE_ZONE"; Fallbacks = @() },
  @{ Name = "BUNNY_STORAGE_ENDPOINT"; Fallbacks = @() },
  @{ Name = "BUNNY_CDN_HOSTNAME"; Fallbacks = @() },
  @{ Name = "BUNNY_TOKEN_KEY"; Fallbacks = @() },
  @{ Name = "ACE_ANDROID_APK_STORAGE_KEY"; Fallbacks = @() }
)

foreach ($secret in $optionalSecretMap) {
  $value = Try-Get-SecretValue -Values $values -Name $secret.Name -FallbackNames $secret.Fallbacks
  if ($value) {
    Set-GitHubSecret -Name $secret.Name -Value $value
    Write-Host "Uploaded $($secret.Name)"
  } else {
    Write-Host "Skipped $($secret.Name) because it is not set."
  }
}

$keystorePath = Get-SecretValue -Values $values -Name "ACE_ANDROID_KEYSTORE_PATH"
if (-not (Test-Path $keystorePath)) {
  throw "Keystore file not found at $keystorePath"
}

$keystoreBase64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path $keystorePath)))
Set-GitHubSecret -Name "ACE_ANDROID_KEYSTORE_BASE64" -Value $keystoreBase64
Write-Host "Uploaded ACE_ANDROID_KEYSTORE_BASE64"
Write-Host "GitHub Android secrets are synced."
