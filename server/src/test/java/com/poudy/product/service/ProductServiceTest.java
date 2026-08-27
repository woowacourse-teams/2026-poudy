package com.poudy.product.service;

import static com.poudy.product.support.ProductSensoryTestFixture.sensory;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.brand.domain.Brand;
import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCode;
import com.poudy.excludecode.domain.ExcludeCodeIngredients;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductDetail;
import com.poudy.product.domain.ProductPage;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.domain.ProductVariant;
import com.poudy.product.domain.ProductVariants;
import com.poudy.product.domain.Products;
import com.poudy.product.repository.ProductRepository;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 서비스")
class ProductServiceTest {

    @Test
    @DisplayName("빠른 제외 성분군을 성분 필터로 풀어 제품을 조회한다")
    void findsProductsWithResolvedExcludeCodes() {
        Product product = product(1L);
        ProductRepository repository = mock(ProductRepository.class);
        ExcludeCodeIngredients excludeCodeIngredients = mock(ExcludeCodeIngredients.class);
        given(repository.findAll()).willReturn(new Products(List.of(product)));
        given(excludeCodeIngredients.idsOf(List.of(ExcludeCode.HARSH_PRESERVATIVES)))
            .willReturn(Set.of(999L));
        ProductService service = new ProductService(
            repository,
            categories(product.category()),
            excludeCodeIngredients
        );
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            List.of(ExcludeCode.HARSH_PRESERVATIVES)
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
        given(repository.findAll()).willReturn(new Products(List.of(product)));
        given(excludeCodeIngredients.freeCodesOf(product.ingredients()))
            .willReturn(List.of(ExcludeCode.SULFATES));
        ProductService service = new ProductService(
            repository,
            categories(product.category()),
            excludeCodeIngredients
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
        given(repository.findAll()).willReturn(new Products(List.of()));
        ProductService service = new ProductService(
            repository,
            Categories.from(List.of(parent, child)),
            excludeCodeIngredients
        );

        assertThatThrownBy(() -> service.findDetail(999L))
            .isInstanceOf(ResourceNotFoundException.class)
            .extracting(exception -> ((ResourceNotFoundException) exception).code())
            .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND);
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
            new Ingredients(List.of()),
            "https://example.com/product.png",
            new ProductVariants(List.of(variant)),
            sensory(1, 1),
            OffsetDateTime.parse("2026-08-01T00:00:00Z")
        );
    }

    private static Categories categories(Category child) {
        Category parent = new Category(child.parentId(), null, "스킨케어", 0);
        return Categories.from(List.of(parent, child));
    }
}
