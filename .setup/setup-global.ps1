$ErrorActionPreference = 'Stop'
$env:CODEX_HOME = 'C:\Users\Jorge\.codex'
$nodePath = 'C:\Users\Jorge\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$pythonPath = 'C:\Users\Jorge\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$toolsRoot = Join-Path $env:CODEX_HOME 'tools\landing-quality'
New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null
$npmRoot = Join-Path $toolsRoot 'npm'
$npmCli = Join-Path $npmRoot 'package\bin\npm-cli.js'
if (-not (Test-Path -LiteralPath $npmCli)) {
    $npmInfo = Invoke-RestMethod -Uri 'https://registry.npmjs.org/npm/latest'
    $npmArchive = Join-Path $toolsRoot 'npm.tgz'
    Invoke-WebRequest -Uri $npmInfo.dist.tarball -OutFile $npmArchive
    New-Item -ItemType Directory -Force -Path $npmRoot | Out-Null
    tar.exe -xzf $npmArchive -C $npmRoot
    if ($LASTEXITCODE -ne 0) { throw 'npm extraction failed' }
}
$env:PATH = (Split-Path $nodePath) + ';' + $env:PATH
& $nodePath $npmCli install --prefix $toolsRoot --no-audit --no-fund '@playwright/mcp@latest' '@playwright/test@latest'
if ($LASTEXITCODE -ne 0) { throw 'Playwright installation failed' }
$serverCli = Join-Path $toolsRoot 'node_modules\@playwright\mcp\cli.js'
& $nodePath $serverCli --help
if ($LASTEXITCODE -ne 0) { throw 'Playwright MCP startup failed' }
$playwrightCli = Join-Path $toolsRoot 'node_modules\playwright\cli.js'
& $nodePath $playwrightCli install chromium
if ($LASTEXITCODE -ne 0) { throw 'Chromium installation failed' }
$browserExe = & $nodePath -e "console.log(require('C:/Users/Jorge/.codex/tools/landing-quality/node_modules/playwright').chromium.executablePath())"
& codex mcp add playwright -- $nodePath $serverCli --headless --isolated --caps testing --executable-path $browserExe
if ($LASTEXITCODE -ne 0) { throw 'Global MCP configuration failed' }
$installer = 'C:\Users\Jorge\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py'
foreach ($skillName in @('emil-design-eng', 'animate', 'review-animations')) {
    if (-not (Test-Path -LiteralPath (Join-Path $env:CODEX_HOME "skills\$skillName"))) {
        & $pythonPath $installer --repo emilkowalski/skills --path "skills/$skillName"
        if ($LASTEXITCODE -ne 0) { throw "Skill installation failed: $skillName" }
    }
}
& codex mcp get playwright
