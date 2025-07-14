# Check Windows Firewall rules for port 3000

Write-Host "=== Checking Windows Firewall rules for port 3000 ===" -ForegroundColor Cyan
Write-Host ""

# Check for rules specifically mentioning port 3000
Write-Host "Searching for rules with port 3000..." -ForegroundColor Yellow
$port3000Rules = Get-NetFirewallRule | Where-Object {
    $portFilter = $_ | Get-NetFirewallPortFilter
    $portFilter.LocalPort -contains 3000
}

if ($port3000Rules) {
    Write-Host "Found rules for port 3000:" -ForegroundColor Green
    foreach ($rule in $port3000Rules) {
        Write-Host "  Rule Name: $($rule.DisplayName)"
        Write-Host "  Enabled: $($rule.Enabled)"
        Write-Host "  Direction: $($rule.Direction)"
        Write-Host "  Action: $($rule.Action)"
        Write-Host "  ---"
    }
} else {
    Write-Host "No specific rules found for port 3000" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Checking for Node.js related rules ===" -ForegroundColor Cyan
$nodeRules = Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*Node*" -or $_.DisplayName -like "*node*" }

if ($nodeRules) {
    Write-Host "Found Node.js related rules:" -ForegroundColor Green
    foreach ($rule in $nodeRules) {
        Write-Host "  Rule Name: $($rule.DisplayName)"
        Write-Host "  Enabled: $($rule.Enabled)"
        Write-Host "  Direction: $($rule.Direction)"
        Write-Host "  Action: $($rule.Action)"
        Write-Host "  ---"
    }
} else {
    Write-Host "No Node.js related rules found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Checking current firewall profile status ===" -ForegroundColor Cyan
$profiles = Get-NetFirewallProfile
foreach ($profile in $profiles) {
    Write-Host "$($profile.Name) Profile:"
    Write-Host "  Enabled: $($profile.Enabled)"
    Write-Host "  DefaultInboundAction: $($profile.DefaultInboundAction)"
    Write-Host "  DefaultOutboundAction: $($profile.DefaultOutboundAction)"
    Write-Host "  ---"
}