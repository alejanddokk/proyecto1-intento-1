$ErrorActionPreference = 'Stop'
$env:CODEX_HOME = 'C:\Users\Jorge\.codex'
$pythonPath = 'C:\Users\Jorge\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe'
$installerPath = 'C:\Users\Jorge\.codex\skills\.system\skill-installer\scripts\install-skill-from-github.py'
$packages = @(
    @{ Repo = 'pbakaus/impeccable'; Paths = @('.agents/skills/impeccable'); Names = @('impeccable') },
    @{ Repo = 'Leonxlnx/taste-skill'; Paths = @('skills/taste-skill'); Names = @('design-taste-frontend') },
    @{ Repo = 'greensock/gsap-skills'; Paths = @('skills/gsap-core', 'skills/gsap-timeline', 'skills/gsap-scrolltrigger', 'skills/gsap-plugins', 'skills/gsap-performance'); Names = @('gsap-core', 'gsap-timeline', 'gsap-scrolltrigger', 'gsap-plugins', 'gsap-performance') }
)
$records = @()
foreach ($package in $packages) {
    $commit = Invoke-RestMethod -Uri ('https://api.github.com/repos/' + $package.Repo + '/commits/main') -Headers @{ 'User-Agent' = 'Codex-creative-skills-setup' }
    $revision = $commit.sha
    for ($index = 0; $index -lt $package.Paths.Count; $index++) {
        $skillName = $package.Names[$index]
        $destination = Join-Path $env:CODEX_HOME ('skills\' + $skillName)
        if (-not (Test-Path -LiteralPath $destination)) {
            & $pythonPath $installerPath --repo $package.Repo --ref $revision --path $package.Paths[$index] --name $skillName
            if ($LASTEXITCODE -ne 0) { throw ('No se pudo instalar ' + $skillName) }
            $installationState = 'installed'
        } else {
            $installationState = 'already-present'
        }
        if (-not (Test-Path -LiteralPath (Join-Path $destination 'SKILL.md'))) { throw ('Falta SKILL.md: ' + $skillName) }
        $records += [PSCustomObject]@{ Name = $skillName; Repo = $package.Repo; Revision = $revision; Path = $package.Paths[$index]; State = $installationState }
    }
}
$records | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath '.setup\creative-skills-install.json' -Encoding utf8
$records | Select-Object Name,State | Format-Table -AutoSize
