package com.poudy.product.service;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeGroup;
import com.poudy.excludecode.domain.ExcludeCodeIngredient;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.ingredient.domain.Ingredient;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.logging.ProductSearchLogger;
import com.poudy.product.repository.ProductRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

@ExtendWith(OutputCaptureExtension.class)
@DisplayName("제품 서비스")
class ProductServiceTest {

    @Test
    @DisplayName("검색 조건과 정렬·페이지를 저장소에 전달한다")
    void delegatesProductQuery() {
        Product product = product(1L);
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodes excludeCodeIngredients = mock(ExcludeCodes.class);
        given(repository.findById(1L)).willReturn(java.util.Optional.of(product));
        stubPage(repository, product);
        ProductService service = new ProductService(
            repository,
            categoryRepository(categories()),
            excludeCodeRepository(excludeCodeIngredients),
            new ProductSearchLogger()
        );
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(new ExcludeCode("HARSH_PRESERVATIVES")),
            null
        );

        ProductPage found = service.findProducts(
            query,
            ProductSort.NAME_ASC,
            1,
            20
        );

        assertThat(found.items()).containsExactly(product);
        verify(repository).find(query, ProductSort.NAME_ASC, 1, 20);
    }

    @Test
    @DisplayName("제품 상세에 카테고리 경로와 포함하지 않는 성분군을 함께 담는다")
    void findsProductDetail() {
        Product product = product(1L);
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodes excludeCodeIngredients = mock(ExcludeCodes.class);
        given(repository.findById(1L)).willReturn(java.util.Optional.of(product));
        stubPage(repository, product);
        ExcludeCodeGroup sulfates = new ExcludeCodeGroup(
            new ExcludeCode("SULFATES"),
            "설페이트 성분",
            "설명",
            List.of(new ExcludeCodeIngredient(20L, "성분", null))
        );
        ExcludeCodeGroup fragrance = new ExcludeCodeGroup(
            new ExcludeCode("FRAGRANCE_ALLERGENS"),
            "향료",
            "설명",
            List.of(new ExcludeCodeIngredient(10L, "성분", null))
        );
        given(excludeCodeIngredients.freeCodesOf(argThat(ingredients -> ingredients.contains(10L))))
            .willReturn(List.of(sulfates));
        given(excludeCodeIngredients.groups()).willReturn(List.of(fragrance, sulfates));
        ProductService service = new ProductService(
            repository,
            categoryRepository(categories()),
            excludeCodeRepository(excludeCodeIngredients),
            new ProductSearchLogger()
        );

        ProductDetail detail = service.findDetail(1L);

        assertThat(detail.product()).isEqualTo(product);
        assertThat(detail.categoryPath()).extracting(Category::id).containsExactly(1L, 2L);
        assertThat(detail.freeOfCodes()).containsExactly(new ExcludeCode("SULFATES"));
        assertThat(detail.containsIngredientFrom(sulfates)).isFalse();
        assertThat(detail.containsIngredientFrom(fragrance)).isTrue();
    }

    @Test
    @DisplayName("제품 ID를 찾지 못하면 제품 없음 예외를 던진다")
    void rejectsUnknownProduct() {
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodes excludeCodeIngredients = mock(ExcludeCodes.class);
        Category parent = new Category(1L, null, "스킨케어", 0);
        Category child = new Category(2L, 1L, "토너", 1);
        given(repository.findById(999L)).willReturn(java.util.Optional.empty());
        ProductService service = new ProductService(
            repository,
            categoryRepository(Categories.from(List.of(parent, child))),
            excludeCodeRepository(excludeCodeIngredients),
            new ProductSearchLogger()
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
        ExcludeCodes excludeCodeIngredients = mock(ExcludeCodes.class);
        given(repository.findById(1L)).willReturn(java.util.Optional.of(product));
        stubPage(repository, product);
        ProductService service = new ProductService(
            repository,
            categoryRepository(categories()),
            excludeCodeRepository(excludeCodeIngredients),
            new ProductSearchLogger()
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

        ProductPage found = service.findProducts(query, ProductSort.NAME_ASC, 1, 20);

        assertThat(found.totalElements()).isEqualTo(1);
        assertThat(output.getOut()).containsOnlyOnce("event=search_completed");
        assertThat(output).contains(
            "searchType=PRODUCT_SEARCH",
            "keyword=\"제품\"",
            "page=1",
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
        ExcludeCodes excludeCodeIngredients = mock(ExcludeCodes.class);
        given(repository.findById(1L)).willReturn(java.util.Optional.of(product));
        stubPage(repository, product);
        ProductService service = new ProductService(
            repository,
            categoryRepository(categories()),
            excludeCodeRepository(excludeCodeIngredients),
            new ProductSearchLogger()
        );
        ProductQuery browse = new ProductQuery(null, null, null, null, null, null, null, null, null);
        ProductQuery search = new ProductQuery("제품", null, null, null, null, null, null, null, null);

        service.findProducts(browse, ProductSort.NAME_ASC, 1, 20);
        service.findProducts(search, ProductSort.PRICE_DESC, 2, 20);
        service.countProducts(search);
        service.suggestProducts("제품", 1, 20);

        assertThat(output).doesNotContain("event=search_completed");
    }

    @Test
    @DisplayName("기록이 실패해도 검색 응답은 그대로 나가고 성공이 오류로 뒤집히지 않는다")
    void keepsResponseWhenLoggingFails(CapturedOutput output) {
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodes excludes = mock(ExcludeCodes.class);
        stubPage(repository, product(1L));
        ProductSearchLogger logger = new ProductSearchLogger() {
            @Override
            public void completed(Context context, long elapsedNanos, long resultCount) {
                throw new IllegalStateException("logging broken");
            }
        };
        ProductService service = new ProductService(
            repository,
            categoryRepository(categories()),
            excludeCodeRepository(excludes),
            logger
        );

        ProductPage result = service.findProducts(
            new ProductQuery("제품", null, null, null, null, null, null, null, null),
            ProductSort.NAME_ASC,
            1,
            20
        );

        assertThat(result.totalElements()).isEqualTo(1L);
        assertThat(output).contains("event=search_recording_failed").doesNotContain("outcome=ERROR");
    }

    private static void stubPage(ProductRepository repository, Product product) {
        given(repository.find(any(ProductQuery.class), any(), anyInt(), anyInt()))
            .willReturn(new ProductPage(List.of(product), 1, List.of(), List.of(), List.of(), null));
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
                List.of(new Ingredient(10L, "성분", null, null, null, null, null, null))
            ),
            "https://example.com/product.png",
            new ProductVariants(List.of(variant)),
            sensory(1, 1),
            OffsetDateTime.parse("2026-08-01T00:00:00Z"),
            java.util.Set.of()
        );
    }

    private static CategoryRepository categoryRepository(Categories categories) {
        CategoryRepository categoryRepository = mock(CategoryRepository.class);
        given(categoryRepository.findAll()).willReturn(categories);
        return categoryRepository;
    }

    private static ExcludeCodeRepository excludeCodeRepository(ExcludeCodes excludeCodeIngredients) {
        ExcludeCodeRepository excludeCodeRepository = mock(ExcludeCodeRepository.class);
        given(excludeCodeRepository.findAll()).willReturn(excludeCodeIngredients);
        given(excludeCodeRepository.containsAll(any())).willReturn(true);
        return excludeCodeRepository;
    }

    private static Categories categories() {
        Category parent = new Category(1L, null, "스킨케어", 0);
        Category child = new Category(2L, 1L, "토너", 1);
        return Categories.from(List.of(parent, child));
    }
}
