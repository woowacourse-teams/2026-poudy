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
