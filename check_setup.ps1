$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$marker = Join-Path $root '.setup_done'

if (-not (Test-Path $marker)) {
  Write-Output '1'
  exit
}

$markerTime = (Get-Item $marker).LastWriteTimeUtc

$sources = @(
  (Join-Path $root 'backend\prisma\schema.prisma'),
  (Join-Path $root 'backend\package.json')
)

$migrations = Get-ChildItem (Join-Path $root 'backend\prisma\migrations') -Recurse -Filter *.sql -ErrorAction SilentlyContinue
foreach ($m in $migrations) { $sources += $m.FullName }

foreach ($s in $sources) {
  if (-not (Test-Path $s)) { continue }
  if ((Get-Item $s).LastWriteTimeUtc -gt $markerTime) {
    Write-Output '1'
    exit
  }
}

Write-Output '0'