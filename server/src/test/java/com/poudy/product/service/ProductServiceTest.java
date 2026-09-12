package com.poudy.product.service;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.domain.Products;
import com.poudy.product.logging.ProductSearchLogger;
import com.poudy.product.repository.ProductRepository;
import com.poudy.search.domain.SearchKeyword;
import com.poudy.search.observation.ProductSearchObserver;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
@DisplayName("제품 서비스")
class ProductServiceTest {

    @Test
    @DisplayName("빠른 제외 성분군을 성분 필터로 풀어 제품을 조회한다")
    void findsProductsWithResolvedExcludeCodes() {
        Product product = product(1L);
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodeIngredients excludeCodeIngredients = mock(ExcludeCodeIngredients.class);
        given(repository.findAll()).willReturn(Products.from(List.of(product)));
        given(excludeCodeIngredients.idsOf(List.of(ExcludeCode.HARSH_PRESERVATIVES)))
            .willReturn(Set.of(999L));
        ProductService service = new ProductService(
            repository,
            categories(),
            excludeCodeIngredients,
            new ProductSearchLogger(),
            mock(ProductSearchObserver.class)
        );
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(ExcludeCode.HARSH_PRESERVATIVES),
            null
        );

        ProductPage found = service.findProducts(
            query,
            ProductSort.NAME_ASC,
            0,
            20
        );

        assertThat(found.items()).containsExactly(product);
    }

    @Test
    @DisplayName("제품 상세에 카테고리 경로와 포함하지 않는 성분군을 함께 담는다")
    void findsProductDetail() {
        Product product = product(1L);
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodeIngredients excludeCodeIngredients = mock(ExcludeCodeIngredients.class);
        given(repository.findAll()).willReturn(Products.from(List.of(product)));
        given(excludeCodeIngredients.freeCodesOf(argThat(ingredients -> ingredients.contains(10L))))
            .willReturn(List.of(ExcludeCode.SULFATES));
        ProductService service = new ProductService(
            repository,
            categories(),
            excludeCodeIngredients,
            new ProductSearchLogger(),
            mock(ProductSearchObserver.class)
        );

        ProductDetail detail = service.findDetail(1L);

        assertThat(detail.product()).isEqualTo(product);
        assertThat(detail.categoryPath()).extracting(Category::id).containsExactly(1L, 2L);
        assertThat(detail.freeOfCodes()).containsExactly(ExcludeCode.SULFATES);
    }

    @Test
    @DisplayName("제품 ID를 찾지 못하면 제품 없음 예외를 던진다")
    void rejectsUnknownProduct() {
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodeIngredients excludeCodeIngredients = mock(ExcludeCodeIngredients.class);
        Category parent = new Category(1L, null, "스킨케어", 0);
        Category child = new Category(2L, 1L, "토너", 1);
        given(repository.findAll()).willReturn(Products.from(List.of()));
        ProductService service = new ProductService(
            repository,
            Categories.from(List.of(parent, child)),
            excludeCodeIngredients,
            new ProductSearchLogger(),
            mock(ProductSearchObserver.class)
        );

        assertThatThrownBy(() -> service.findDetail(999L))
            .isInstanceOf(ResourceNotFoundException.class)
            .extracting(exception -> ((ResourceNotFoundException) exception).code())
            .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND);
    }

    @Test
    @DisplayName("제품 검색을 필터 적용 여부와 함께 기록한다")
    void logsProductSearch(CapturedOutput output) {
        Product product = product(1L);
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodeIngredients excludeCodeIngredients = mock(ExcludeCodeIngredients.class);
        given(repository.findAll()).willReturn(Products.from(List.of(product)));
        given(excludeCodeIngredients.idsOf(List.of())).willReturn(Set.of());
        ProductService service = new ProductService(
            repository,
            categories(),
            excludeCodeIngredients,
            new ProductSearchLogger(),
            mock(ProductSearchObserver.class)
        );
        ProductQuery query = new ProductQuery(
            "제품",
            null,
            List.of(1L),
            null,
            null,
            null,
            null,
            null,
            null
        );

        ProductPage found = service.findProducts(query, ProductSort.NAME_ASC, 0, 20);

        assertThat(found.totalElements()).isEqualTo(1);
        assertThat(output).contains(
            "searchType=PRODUCT_SEARCH",
            "keyword=\"제품\"",
            "page=0",
            "sort=NAME_ASC",
            "filtered=true",
            "resultCount=1",
            "outcome=SUCCESS"
        );
    }

    @Test
    @DisplayName("검색어 없는 목록, 후속 페이지, 개수와 자동완성 조회는 검색 로그를 남기지 않는다")
    void skipsNonSearchAndCountLogs(CapturedOutput output) {
        Product product = product(1L);
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodeIngredients excludeCodeIngredients = mock(ExcludeCodeIngredients.class);
        given(repository.findAll()).willReturn(Products.from(List.of(product)));
        given(excludeCodeIngredients.idsOf(List.of())).willReturn(Set.of());
        ProductService service = new ProductService(
            repository,
            categories(),
            excludeCodeIngredients,
            new ProductSearchLogger(),
            mock(ProductSearchObserver.class)
        );
        ProductQuery browse = new ProductQuery(null, null, null, null, null, null, null, null, null);
        ProductQuery search = new ProductQuery("제품", null, null, null, null, null, null, null, null);

        service.findProducts(browse, ProductSort.NAME_ASC, 0, 20);
        service.findProducts(search, ProductSort.PRICE_DESC, 1, 20);
        service.countProducts(search);
        service.suggestProducts("제품", 0, 20);

        assertThat(output).doesNotContain("event=search_completed");
    }

    @Test
    void observesOnlyCompletedFirstPageAndKeepsResponseOnObservationFailure() {
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodeIngredients excludes = mock(ExcludeCodeIngredients.class);
        given(repository.findAll()).willReturn(Products.from(List.of(product(1L))));
        given(excludes.idsOf(List.of())).willReturn(Set.of());
        ProductSearchObserver observer = mock(ProductSearchObserver.class);
        ProductService service = new ProductService(
            repository,
            categories(),
            excludes,
            new ProductSearchLogger(),
            observer
        );
        ProductQuery query = new ProductQuery("제품", null, null, null, null, null, null, null, null);
        service.findProducts(query, ProductSort.NAME_ASC, 0, 20);
        service.findProducts(query, ProductSort.PRICE_DESC, 0, 20);
        service.findProducts(query, ProductSort.NAME_ASC, 1, 20);
        service.countProducts(query);
        service.suggestProducts("제품", 0, 20);
        service.findDetail(1L);
        service.findProducts(
            new ProductQuery(null, null, null, null, null, null, null, null, null),
            ProductSort.NAME_ASC,
            0,
            20
        );
        org.mockito.Mockito.verify(observer, org.mockito.Mockito.times(2)).completed(new SearchKeyword("제품"), 1L);
        org.mockito.Mockito.verifyNoMoreInteractions(observer);
        ProductQuery filtered = new ProductQuery("제품", null, List.of(999L), null, null, null, null, null, null);
        service.findProducts(filtered, ProductSort.NAME_ASC, 0, 20);
        org.mockito.Mockito.verify(observer).completed(new SearchKeyword("제품"), 0L);
        org.mockito.Mockito.doThrow(new IllegalStateException("observation broken")).when(observer)
            .completed(new SearchKeyword("제품"), 1L);
        assertThat(service.findProducts(query, ProductSort.NAME_ASC, 0, 20).totalElements()).isEqualTo(1L);
    }

    @Test
    @DisplayName("기록이 실패해도 검색 응답은 그대로 나가고 성공이 오류로 뒤집히지 않는다")
    void keepsResponseWhenLoggingFails(CapturedOutput output) {
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodeIngredients excludes = mock(ExcludeCodeIngredients.class);
        given(repository.findAll()).willReturn(Products.from(List.of(product(1L))));
        given(excludes.idsOf(List.of())).willReturn(Set.of());
        ProductSearchLogger logger = new ProductSearchLogger() {
            @Override
            public void completed(Context context, long elapsedNanos, long resultCount) {
                throw new IllegalStateException("logging broken");
            }
        };
        ProductSearchObserver observer = mock(ProductSearchObserver.class);
        ProductService service = new ProductService(repository, categories(), excludes, logger, observer);

        ProductPage result = service.findProducts(
            new ProductQuery("제품", null, null, null, null, null, null, null, null),
            ProductSort.NAME_ASC,
            0,
            20
        );

        assertThat(result.totalElements()).isEqualTo(1L);
        assertThat(output).contains("event=search_recording_failed").doesNotContain("outcome=ERROR");
        org.mockito.Mockito.verify(observer).completed(new SearchKeyword("제품"), 1L);
    }

    private static Product product(Long id) {
        Brand brand = new Brand(1L, "브랜드", null, null);
        Category category = new Category(2L, 1L, "토너", 1);
        ProductVariant variant = new ProductVariant(id, 10000L, new BigDecimal("100"), "ml", "active");

        return new Product(
            id,
            "제품",
            brand,
            category,
            new Ingredients(
                List.of(new Ingredient(10L, "성분", null, null, null, null, null, null, null, null))
            ),
            "https://example.com/product.png",
            new ProductVariants(List.of(variant)),
            sensory(1, 1),
            OffsetDateTime.parse("2026-08-01T00:00:00Z"),
            java.util.Set.of()
        );
    }

    private static Categories categories() {
        Category parent = new Category(1L, null, "스킨케어", 0);
        Category child = new Category(2L, 1L, "토너", 1);
        return Categories.from(List.of(parent, child));
    }
}
