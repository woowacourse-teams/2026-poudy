package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mockingDetails;

import com.poudy.product.domain.Badge;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
@Sql("/db/search-test-data.sql")
@DisplayName("상품 표시 조회 SQL 경계")
class ProductReadQueriesTest {
    @MockitoSpyBean
    private NamedParameterJdbcTemplate jdbc;

    @Autowired
    private ProductQueryRepository queries;

    @Autowired
    private ProductRepository products;

    @Autowired
    private JdbcTemplate fixture;

    @BeforeEach
    void addIngredientData() {
        fixture.update("insert into badge(code, name) values ('DAISO', '다이소')");
        fixture.update("insert into product_badge(product_id, badge_code) values (90001, 'DAISO')");
        fixture.update("""
            insert into product_component (product_id, display_order, name)
            values (90001, 0, '조회 검증 구성품')
            """);
        fixture.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select id, 90001, 0 from product_component where product_id = 90001
            """);
    }

    @Test
    @DisplayName("자동완성은 검색·표시·배지 세 조회만 실행하고 성분을 재로딩하지 않는다")
    void suggestionsUseThreeSelects() {
        clearInvocations(jdbc);
        var result = queries.suggest("검증토너", 1, 20);
        assertThat(result.items()).isNotEmpty();
        assertThat(selects()).hasSize(3).noneMatch(sql -> sql.contains("product_ingredient"));
        assertThat(selects()).filteredOn(sql -> sql.contains("product_badge")).hasSize(1);
        assertThat(result.items().stream().filter(item -> item.id().equals(90001L)).findFirst().orElseThrow().badges())
            .extracting(Badge::code).containsExactly("DAISO");
    }

    @Test
    @DisplayName("빈 자동완성 페이지도 total을 보존하고 표시 정보 조회를 생략한다")
    void emptySuggestionPageOnlySearches() {
        long total = queries.suggest("검증토너", 1, 20).totalElements();
        clearInvocations(jdbc);
        var result = queries.suggest("검증토너", 100, 20);
        assertThat(result.items()).isEmpty();
        assertThat(result.totalElements()).isEqualTo(total).isPositive();
        assertThat(selects()).hasSize(1);
    }

    @Test
    @DisplayName("목록은 후보·브랜드·카테고리·카드·배지 다섯 조회로 상세와 같은 표시 정보를 반환한다")
    void listLoadsOnlyCardData() {
        var full = products.findById(90001L).orElseThrow();
        clearInvocations(jdbc);
        var result = queries.find(query(List.of()), ProductSort.DEFAULT, 1, 20);
        assertThat(selects()).hasSize(5)
            .noneMatch(sql -> sql.contains("ingredient_source") || sql.contains("any(:excluded)"));
        assertThat(selects()).filteredOn(sql -> sql.contains("product_badge")).hasSize(1);
        var card = result.items().stream().filter(item -> item.id().equals(full.id())).findFirst().orElseThrow();
        assertThat(card.name()).isEqualTo(full.name());
        assertThat(card.brand()).isEqualTo(full.brand());
        assertThat(card.badges()).extracting(Badge::code).containsExactly("DAISO");
        assertThat(card.imageUrl()).isEqualTo(full.imageUrl());
        assertThat(card.price()).isEqualTo(full.representativeVariant().price());
        assertThat(card.volumeValue()).isEqualByComparingTo(full.representativeVariant().volumeValue());
        assertThat(card.volumeUnit()).isEqualTo(full.representativeVariant().volumeUnit());
        assertThat(card.moistureLevel()).isEqualTo(full.moistureLevel());
        assertThat(card.oilLevel()).isEqualTo(full.oilLevel());
        assertThat(card.updatedAt()).isEqualTo(full.updatedAt());
    }

    @Test
    @DisplayName("활성 제외 조건이 있으면 성분 제외 검사는 유지한다")
    void activeExclusionRemains() {
        clearInvocations(jdbc);
        queries.count(query(List.of(90001L)));
        assertThat(selects()).isNotEmpty().allMatch(sql -> sql.contains("any(:excluded)"));
    }

    private ProductQuery query(List<Long> excluded) {
        return new ProductQuery("검증토너", null, null, null, null, null, excluded, null, null, null, null);
    }

    private List<String> selects() {
        return mockingDetails(jdbc).getInvocations().stream()
            .filter(invocation -> invocation.getMethod().getName().startsWith("query"))
            .filter(
                invocation -> invocation.getArguments().length > 1
                    && invocation.getArgument(1) instanceof SqlParameterSource
            )
            .map(invocation -> invocation.getArgument(0))
            .filter(String.class::isInstance).map(String.class::cast).toList();
    }
}
