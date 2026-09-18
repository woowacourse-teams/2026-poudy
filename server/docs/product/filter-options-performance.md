# 필터 선택지 계산 성능 (#460)

## 측정 당시 방법과 범위

Windows, JDK 21.0.8, 논리 프로세서 16개 환경에서 아래 명령으로 측정했다.
현재는 벤치마크를 테스트 소스와 실행 스크립트에서 제거했으며, 당시 작업물은 이 문서 하단에
원문으로 보관한다. 일반 테스트에서 컴파일하거나 실행하지 않는다.

```powershell
cd server
./scripts/filter-options-benchmark.ps1 -Baseline 5b06873
```

스크립트는 기준 커밋의 `Products` 소스를 `build/filter-options-baseline` 아래 별도 이름으로
컴파일한다. 새 `ProductPage` 생성자의 추가 필드만 null로 맞추며 기존 판정·정렬·집계는
유지한다. 현재 구현과 같은 JVM·같은 카탈로그·같은 요청 조건으로 비교한다.
운영 소스나 테스트를 임시로 덮어쓰지 않는다.

측정은 `Products.find`부터 응답 DTO 변환과 JSON 직렬화까지다. 네트워크·HTTP 서블릿,
서비스의 제외 코드 해석과 검색 로그 비용은 포함하지 않는다. 표의 처리량도 외부 HTTP RPS가
아닌 이 계산·직렬화 작업의 초당 처리 건수다. 운영 응답 시간이나 용량을 보장하는 측정은 아니다.

- 합성 제품 500개 / 10,000개, 브랜드 20개, 소분류 3개, 제품별 성분 1개를 사용한다.
- 무조건 조회와 복합 조회를 비교한다. 복합 조회는 검색어, 복수 브랜드·카테고리,
  피부 타입, 수분·유분, 성분 포함·제외와 빠른 제외에서 해석된 성분 ID를 함께 적용한다.
- 첫 페이지 20개를 조회한다. 두 버전의 실제 제품 목록이 같음을 먼저 확인한다.
- 각 카탈로그·조건에서 변경 전후를 각각 150회 워밍업한다. 동시 작업 수 1 / 8에서
  각각 400회 측정하고 실행 시작부터 완료까지의 p50·p95와 전체 처리량을 기록한다.
- 테스트 작업 수가 제한된 일반 검증과 별도로 실행하며 타임아웃이나 검증 기준을 완화하지 않는다.
- 당시 결과 파일은 `server/build/filter-options-benchmark.csv`였으며, 아래 표에 전체 측정값을 보존했다.

## 2026-09-18 측정 결과

다른 빌드·테스트를 실행하지 않은 상태에서 최종 측정했다. 단위는 ms이며 처리량은 초당
계산·직렬화 완료 건수다. 모든 행은 첫 페이지 응답이다.

| 제품 수 | 조건 | 동시 작업 | 변경 전 p50 / p95 | 변경 후 p50 / p95 | 처리량 전 → 후 |
| --- | --- | --- | --- | --- | --- |
| 500 | 없음 | 1 | 0.658 / 1.753 | 0.964 / 2.149 | 953.8 → 842.0 |
| 500 | 없음 | 8 | 0.681 / 4.299 | 1.302 / 6.398 | 5655.2 → 3715.8 |
| 500 | 복합 | 1 | 0.712 / 1.387 | 0.938 / 2.014 | 1227.3 → 930.0 |
| 500 | 복합 | 8 | 0.725 / 4.780 | 1.917 / 9.963 | 4779.0 → 2610.7 |
| 10,000 | 없음 | 1 | 7.938 / 12.259 | 17.210 / 24.189 | 122.4 → 58.1 |
| 10,000 | 없음 | 8 | 14.731 / 27.821 | 36.838 / 59.895 | 498.5 → 205.4 |
| 10,000 | 복합 | 1 | 26.756 / 34.689 | 47.851 / 61.719 | 42.7 → 20.2 |
| 10,000 | 복합 | 8 | 50.060 / 83.779 | 61.184 / 74.043 | 145.9 → 128.4 |

500개 단일 복합 요청에서는 p95가 약 0.63ms 증가했다. 10,000개 단일 복합 요청에서는
약 27.03ms 증가했다. 마지막 행에서 p95만 줄어든 것은 전반적인 속도 개선의 근거가 아니다.
해당 행도 p50은 늘고 처리량은 줄었으며 공유 머신에서 순차 측정한 JIT·GC 변동을 포함한다.

## 해석상의 한계

첫 페이지에서 전체 카탈로그를 추가 판정·집계하므로 비용이 늘어난다. 후보별 제품 정렬과
검색 로그를 반복하지 않고, 후속 페이지에서는 후보 계산을 수행하지 않는다.
기존 최상위 집계도 호환성을 위해 유지하므로 전환 중에는 두 의미의 집계 비용이 모두 든다.

합성 데이터의 조건 분포와 성분 수는 실제 제품 분포와 다르다. 공유 개발 머신의 CPU 스케줄링,
JIT·GC 영향과 짧은 측정 시간 때문에 작은 차이는 일반화하지 않는다. 실제 카탈로그·배포 환경의
HTTP 부하 시험은 별도로 필요하다.

## 측정 작업물 보관

아래는 측정 당시 코드 원문이다. 실행 가능한 프로젝트 파일이 아닌 기록이며, 위 명령도 현재 체크아웃에서 바로 실행하는 명령이 아니다.

기준 구현은 커밋 `5b06873`, 측정 대상 서버 구현은 `01ce14e`, 도구 원본은 `21e210e`에 있다. 다시 측정할 경우 해당 버전의 의존성 및 `ProductSensoryTestFixture`와 함께 별도 측정 환경에서 복원한다.

<details>
<summary>server/src/test/java/com/poudy/product/domain/FilterOptionsBenchmark.java</summary>

```java
package com.poudy.product.domain;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.common.dto.PaginationRequest;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.controller.dto.ProductPageResponse;
import com.poudy.product.domain.sensory.MoistureLevel;
import com.poudy.product.domain.sensory.OilLevel;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.skintype.domain.SkinType;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.Executors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import tools.jackson.databind.ObjectMapper;

/** 목록 계산부터 응답 JSON 직렬화까지 비교한다. 네트워크·서블릿·검색 로그는 측정 범위 밖이다. */
@EnabledIfEnvironmentVariable(named = "FILTER_OPTIONS_BENCHMARK", matches = "true")
class FilterOptionsBenchmark {

    private static final int WARMUP = 150;
    private static final int SAMPLES = 400;
    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Categories CATEGORIES = Categories.from(
        List.of(
            new Category(100L, null, "스킨케어", 0),
            new Category(1L, 100L, "크림", 1),
            new Category(2L, 100L, "토너", 1),
            new Category(3L, 100L, "세럼", 1)
        )
    );

    @Test
    void compareBeforeAndAfter() throws Exception {
        List<String> rows = new ArrayList<>();
        rows.add("products,condition,concurrency,version,p50_ms,p95_ms,requests_per_second");
        Class<?> baselineClass = Class.forName("com.poudy.product.domain.BaselineProducts");
        for (int size : List.of(500, 10000)) {
            List<Product> catalog = IntStream.range(0, size).mapToObj(FilterOptionsBenchmark::product).toList();
            Object before = baselineClass.getMethod("from", List.class).invoke(null, catalog);
            Products after = Products.from(catalog);
            for (boolean complex : List.of(false, true)) {
                ProductFilter filter = filter(complex);
                Callable<byte[]> oldRequest = request(before, filter);
                Callable<byte[]> newRequest = request(after, filter);
                assertThat(MAPPER.readTree(oldRequest.call()).path("items"))
                    .isEqualTo(MAPPER.readTree(newRequest.call()).path("items"));
                for (int i = 0; i < WARMUP; i++) {
                    oldRequest.call();
                    newRequest.call();
                }
                for (int concurrency : List.of(1, 8)) {
                    rows.add(measure(size, complex, concurrency, "before", oldRequest));
                    rows.add(measure(size, complex, concurrency, "after", newRequest));
                }
            }
        }
        Files.write(Path.of("build/filter-options-benchmark.csv"), rows);
    }

    private Callable<byte[]> request(Object products, ProductFilter filter) throws Exception {
        Method find = products.getClass()
            .getMethod("find", ProductFilter.class, ProductSort.class, int.class, int.class, Categories.class);
        return () -> {
            ProductPage page = (ProductPage) find.invoke(products, filter, ProductSort.NAME_ASC, 1, 20, CATEGORIES);
            return MAPPER.writeValueAsBytes(ProductPageResponse.from(page, new PaginationRequest(1, 20)));
        };
    }

    private String measure(int size, boolean complex, int concurrency, String version, Callable<byte[]> request)
        throws Exception {
        List<Callable<Long>> calls = IntStream.range(0, SAMPLES).mapToObj(index -> (Callable<Long>) () -> {
            long start = System.nanoTime();
            byte[] response = request.call();
            assertThat(response.length).isPositive();
            return System.nanoTime() - start;
        }).toList();
        try (var executor = Executors.newFixedThreadPool(concurrency)) {
            long started = System.nanoTime();
            var results = executor.invokeAll(calls);
            double seconds = (System.nanoTime() - started) / 1_000_000_000.0;
            long[] times = new long[SAMPLES];
            for (int i = 0; i < SAMPLES; i++) {
                times[i] = results.get(i).get();
            }
            Arrays.sort(times);
            return String.format(
                Locale.ROOT,
                "%d,%s,%d,%s,%.3f,%.3f,%.1f",
                size,
                complex ? "complex" : "all",
                concurrency,
                version,
                times[SAMPLES / 2] / 1_000_000.0,
                times[(int) (SAMPLES * 0.95)] / 1_000_000.0,
                SAMPLES / seconds
            );
        }
    }

    private static ProductFilter filter(boolean complex) {
        if (!complex) {
            return new ProductFilter(null, null, null, null, null, null, null);
        }
        return new ProductFilter(
            new SearchKeyword("보습"),
            List.of(1L, 2L),
            List.of(1L, 2L, 3L),
            List.of(new MoistureLevel(1), new MoistureLevel(2)),
            List.of(new OilLevel(1)),
            IngredientFilter.of(List.of(1L), List.of(99L), Set.of(100L)),
            SkinType.DRY
        );
    }

    private static Product product(int index) {
        long id = index + 1L;
        Ingredient ingredient = new Ingredient(1L, "보습 성분", null, null, null, null, null, null, null, null);
        return new Product(
            id,
            "보습 제품 " + index,
            new Brand(index % 20 + 1L, "브랜드 " + (index % 20), null, null),
            new Category(index % 3 + 1L, 100L, "카테고리", 1),
            new Ingredients(List.of(ingredient)),
            "",
            new ProductVariants(List.of(new ProductVariant(id, 10000L + index, BigDecimal.valueOf(100), "ml", "SALE"))),
            sensory(index % 3, index % 2),
            OffsetDateTime.parse("2026-09-18T00:00:00Z"),
            index % 2 == 0 ? Set.of(SkinType.OILY) : Set.of(SkinType.DRY, SkinType.SENSITIVE)
        );
    }
}
```

</details>

<details>
<summary>server/scripts/filter-options-benchmark.gradle</summary>

```groovy
// 변경 전 Products 소스를 별도 이름으로 컴파일한다. 운영 소스나 검증 태스크를 바꾸지 않는다.
allprojects {
    afterEvaluate {
        sourceSets.test.java.srcDir(layout.buildDirectory.dir('filter-options-baseline'))
    }
}
```

</details>

<details>
<summary>server/scripts/filter-options-benchmark.ps1</summary>

```powershell
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
```

</details>
