package com.poudy.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;

import com.poudy.category.domain.Categories;
import com.poudy.category.domain.Category;
import com.poudy.category.repository.CategoryRepository;
import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.excludecode.domain.ExcludeCodes;
import com.poudy.excludecode.repository.ExcludeCodeRepository;
import com.poudy.ingredient.domain.Ingredients;
import com.poudy.myfilter.repository.MyFilterRepository;
import com.poudy.product.domain.Product;
import com.poudy.product.domain.ProductComparison;
import com.poudy.product.domain.ProductComparisonFilterStatus;
import com.poudy.product.domain.ProductComparisonItem;
import com.poudy.product.domain.ProductComparisonSelection;
import com.poudy.product.domain.ProductPart;
import com.poudy.product.repository.ProductRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;

@DisplayName("제품 비교 서비스")
class ProductComparisonServiceTest {

    private final ProductRepository products = mock(ProductRepository.class);
    private final CategoryRepository categories = mock(CategoryRepository.class);
    private final ExcludeCodeRepository excludeCodes = mock(ExcludeCodeRepository.class);
    private final MyFilterRepository myFilters = mock(MyFilterRepository.class);
    private final ProductComparisonService service = new ProductComparisonService(
        products,
        categories,
        excludeCodes,
        myFilters
    );

    @Test
    @DisplayName("제품을 일괄 조회하고 카테고리·공통 기준·회원 필터를 한 번씩 읽어 요청 순서로 조립한다")
    void batchesReadsAndRestoresRequestedOrder() {
        Product first = product(1L);
        Product second = product(2L);
        Product third = product(3L);
        given(products.findAllById(List.of(3L, 1L, 2L))).willReturn(List.of(first, second, third));
        stubCatalogs();
        given(myFilters.findIngredientIds(7L)).willReturn(List.of(9L));

        ProductComparison comparison = service.compare(List.of(selection(3L), selection(1L), selection(2L)), 7L);

        assertThat(comparison.items()).extracting(ProductComparisonItem::myFilterStatus)
            .containsExactly(
                ProductComparisonFilterStatus.NO_MATCH,
                ProductComparisonFilterStatus.NO_MATCH,
                ProductComparisonFilterStatus.NO_MATCH
            );
        assertThat(comparison.items()).extracting(ProductComparisonItem::product).containsExactly(third, first, second);
        verify(products).findAllById(List.of(3L, 1L, 2L));
        verify(categories).findAll();
        verify(excludeCodes).findAll();
        verify(myFilters).findIngredientIds(7L);
        verifyNoMoreInteractions(products, categories, excludeCodes, myFilters);
    }

    @Test
    @DisplayName("비로그인 비교에서는 회원 필터를 조회하지 않는다")
    void doesNotReadAnonymousFilter() {
        Product product = product(1L);
        given(products.findAllById(List.of(1L))).willReturn(List.of(product));
        stubCatalogs();

        assertThat(service.compare(List.of(selection(1L)), null).items())
            .extracting(ProductComparisonItem::myFilterStatus)
            .containsExactly(ProductComparisonFilterStatus.GUEST);
        verifyNoInteractions(myFilters);
    }

    @Test
    @DisplayName("일괄 조회에서 빠진 제품이 있으면 전체를 실패한다")
    void rejectsMissingProducts() {
        Product product = product(1L);
        given(products.findAllById(List.of(1L, 2L))).willReturn(List.of(product));

        assertThatThrownBy(() -> service.compare(List.of(selection(1L), selection(2L)), 7L))
            .isInstanceOf(ResourceNotFoundException.class)
            .extracting(exception -> ((ResourceNotFoundException) exception).code())
            .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND);
        verifyNoInteractions(categories, excludeCodes, myFilters);
    }

    @Test
    @DisplayName("회원 필터 조회 실패를 빈 필터로 바꾸지 않는다")
    void propagatesFilterReadFailure() {
        Product product = product(1L);
        given(products.findAllById(List.of(1L))).willReturn(List.of(product));
        stubCatalogs();
        DataAccessResourceFailureException failure = new DataAccessResourceFailureException("test failure");
        given(myFilters.findIngredientIds(7L)).willThrow(failure);

        assertThatThrownBy(() -> service.compare(List.of(selection(1L)), 7L)).isSameAs(failure);
    }

    private void stubCatalogs() {
        given(categories.findAll()).willReturn(
            Categories.from(
                List.of(
                    new Category(1L, null, "스킨케어", 0),
                    new Category(2L, 1L, "스킨/토너", 1)
                )
            )
        );
        ExcludeCodes cautions = mock(ExcludeCodes.class);
        given(cautions.groups()).willReturn(List.of());
        given(excludeCodes.findAll()).willReturn(cautions);
    }

    private Product product(Long id) {
        Product product = mock(Product.class);
        given(product.id()).willReturn(id);
        given(product.category()).willReturn(new Category(2L, 1L, "스킨/토너", 1));
        given(product.selectPart(null)).willReturn(Optional.of(new ProductPart(id, null, new Ingredients(List.of()))));
        return product;
    }

    private ProductComparisonSelection selection(Long productId) {
        return new ProductComparisonSelection(productId, null);
    }
}
