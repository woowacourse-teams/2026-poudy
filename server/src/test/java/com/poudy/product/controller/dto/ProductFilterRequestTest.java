package com.poudy.product.controller.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InvalidRequestException;
import java.lang.reflect.RecordComponent;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("제품 필터 요청")
class ProductFilterRequestTest {

    @Test
    @DisplayName("검색어만 있으면 필터 조건이 없다고 답한다")
    void reportsNoFilterConditionWhenOnlyKeywordIsGiven() {
        assertThat(filterWith(ProductFilterRequest.KEYWORD, "토너").hasFilterCondition()).isFalse();
        assertThat(emptyFilter().hasFilterCondition()).isFalse();
    }

    @Test
    @DisplayName("빈 목록은 조건으로 보지 않는다")
    void treatsEmptyListAsNoCondition() {
        assertThat(filterWith("categoryIds", List.of()).hasFilterCondition()).isFalse();
    }

    @Test
    @DisplayName("검색어를 뺀 모든 필드가 필터 조건으로 판정된다")
    void reportsFilterConditionForEveryFilterField() {
        for (RecordComponent component : filterComponents()) {
            ProductFilterRequest filter = filterWith(component.getName(), List.of("아무 값"));

            assertThat(filter.hasFilterCondition())
                    .withFailMessage("%s 가 hasFilterCondition 에서 빠졌습니다", component.getName()).isTrue();
        }
    }

    @Test
    @DisplayName("검색어만 오면 통과시킨다")
    void acceptsKeywordWithoutFilter() {
        assertThatCode(() -> filterWith(ProductFilterRequest.KEYWORD, "토너").validateSearchOnly())
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("필터 조건이 함께 오면 검색어를 주지 않는다")
    void rejectsSearchCombinedWithFilter() {
        ProductFilterRequest filter = filterWith("categoryIds", List.of(1L), ProductFilterRequest.KEYWORD, "토너");

        assertThatThrownBy(filter::validateSearchOnly).isInstanceOf(InvalidRequestException.class)
                .extracting(exception -> ((InvalidRequestException) exception).code())
                .isEqualTo(ErrorCode.CONFLICTING_SEARCH_AND_FILTER);
    }

    @Test
    @DisplayName("검색어가 비어 있으면 검색어를 주지 않는다")
    void rejectsBlankKeyword() {
        assertThatThrownBy(() -> filterWith(ProductFilterRequest.KEYWORD, "").validateSearchOnly())
                .isInstanceOf(InvalidRequestException.class)
                .extracting(exception -> ((InvalidRequestException) exception).code())
                .isEqualTo(ErrorCode.INVALID_QUERY_PARAMETER);
        assertThatThrownBy(() -> filterWith(ProductFilterRequest.KEYWORD, "   ").validateSearchOnly())
                .isInstanceOf(InvalidRequestException.class);
        assertThatThrownBy(() -> emptyFilter().validateSearchOnly()).isInstanceOf(InvalidRequestException.class);
    }

    @Test
    @DisplayName("검색과 필터를 가르는 파라미터 이름이 실제 필드와 같다")
    void keywordConstantMatchesRecordComponent() {
        assertThat(Arrays.stream(ProductFilterRequest.class.getRecordComponents()).map(RecordComponent::getName))
                .contains(ProductFilterRequest.KEYWORD);
    }

    private List<RecordComponent> filterComponents() {
        List<RecordComponent> components = Arrays.stream(ProductFilterRequest.class.getRecordComponents())
                .filter(component -> !ProductFilterRequest.KEYWORD.equals(component.getName())).toList();

        assertThat(components).isNotEmpty();

        return components;
    }

    private ProductFilterRequest emptyFilter() {
        return filterWith(null, null);
    }

    private ProductFilterRequest filterWith(String name, Object value) {
        return filterWith(name, value, null, null);
    }

    private ProductFilterRequest filterWith(String name, Object value, String otherName, Object otherValue) {
        RecordComponent[] components = ProductFilterRequest.class.getRecordComponents();
        Class<?>[] types = Arrays.stream(components).map(RecordComponent::getType).toArray(Class<?>[]::new);
        Object[] arguments = Arrays.stream(components)
                .map(component -> filled(component.getName(), name, value, otherName, otherValue)).toArray();

        try {
            return ProductFilterRequest.class.getDeclaredConstructor(types).newInstance(arguments);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private Object filled(String component, String name, Object value, String otherName, Object otherValue) {
        if (component.equals(name)) {
            return value;
        }
        if (component.equals(otherName)) {
            return otherValue;
        }

        return null;
    }
}
