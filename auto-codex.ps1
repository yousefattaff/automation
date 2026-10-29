<#
.SYNOPSIS
  Self-healing loop for Codex CLI that automatically resumes on disconnect or rate limits,
  with customizable model selection.
#>

param(
    [string]$Model = "gpt-6-sol",
    [string]$SessionId = "",
    [switch]$NewSession
)

Write-Host "Starting Codex self-healing auto-retry loop..." -ForegroundColor Cyan
Write-Host "Model target: $Model" -ForegroundColor Green

while ($true) {
    if ($NewSession) {
        Write-Host "Starting new Codex session with model '$Model'..." -ForegroundColor Yellow
        & codex -m $Model -a never -s danger-full-access
        # After first launch, continue resuming this session
        $NewSession = $false
    } elseif ($SessionId) {
        Write-Host "Resuming specific session ($SessionId) with model '$Model'..." -ForegroundColor Yellow
        & codex resume $SessionId -m $Model -a never -s danger-full-access
    } else {
        Write-Host "Resuming most recent session with model '$Model'..." -ForegroundColor Yellow
        & codex resume --last -m $Model -a never -s danger-full-access
    }

    $exitCode = $LASTEXITCODE
    Write-Host "Codex exited or disconnected (code: $exitCode). Sleeping 15s before auto-reconnecting..." -ForegroundColor DarkYellow
    Start-Sleep -Seconds 15
}
