param([string]$Baseline = '5b06873')
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$source = git show "${Baseline}:server/src/main/java/com/poudy/product/domain/Products.java"
if ($LASTEXITCODE -ne 0) { throw '기준 커밋의 Products를 읽지 못했습니다.' }
$baselineSource = ($source -join "`n") -replace '\bProducts\b', 'BaselineProducts'
# 새 응답 객체의 추가 필드만 null로 맞춘다. 계산·정렬·집계 알고리즘은 기준 커밋 그대로다.
$baselineSource = $baselineSource.Replace('skinTypesOf(matched)', 'skinTypesOf(matched), null')
$targetDirectory = Join-Path $PWD 'build/filter-options-baseline'
New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null
[IO.File]::WriteAllText((Join-Path $targetDirectory 'BaselineProducts.java'), $baselineSource)
$previousBenchmark = $env:FILTER_OPTIONS_BENCHMARK
try {
    $env:FILTER_OPTIONS_BENCHMARK = 'true'
    & ./gradlew.bat -I scripts/filter-options-benchmark.gradle test --tests '*FilterOptionsBenchmark' --rerun-tasks
    if ($LASTEXITCODE -ne 0) { throw '성능 측정에 실패했습니다.' }
    Get-Content build/filter-options-benchmark.csv
} finally {
    $env:FILTER_OPTIONS_BENCHMARK = $previousBenchmark
}
