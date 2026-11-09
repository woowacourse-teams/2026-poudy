package com.poudy.product.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mockingDetails;

import com.poudy.brand.domain.BrandProductCount;
import com.poudy.category.domain.CategoryProductCount;
import com.poudy.product.domain.Mark;
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
import org.springframework.transaction.annotation.Isolation;
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
        fixture.update("insert into product_mark(product_id, mark_code) values (90001, 'DAISO')");
        fixture.update("""
            insert into product_component (product_id, display_order, name, moisture_level, oil_level)
            values (90001, 0, '조회 검증 구성품', 1, 1)
            """);
        fixture.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select id, 90001, 0 from product_component where product_id = 90001
            """);
    }

    @Test
    @DisplayName("자동완성은 검색·표시·표식 세 조회만 실행하고 성분을 재로딩하지 않는다")
    void suggestionsUseThreeSelects() {
        clearInvocations(jdbc);
        var result = queries.suggest("검증토너", 1, 20);
        assertThat(result.items()).isNotEmpty();
        assertThat(selects()).hasSize(3).noneMatch(sql -> sql.contains("product_ingredient"));
        assertThat(selects()).filteredOn(sql -> sql.contains("select pm.product_id, m.code")).hasSize(1);
        assertThat(result.items().stream().filter(item -> item.id().equals(90001L)).findFirst().orElseThrow().marks())
            .extracting(Mark::code).containsExactly("DAISO");
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
    @DisplayName("목록은 후보·브랜드·카테고리·카드·표식 다섯 조회로 상세와 같은 표시 정보를 반환한다")
    void listLoadsOnlyCardData() {
        var full = products.findById(90001L).orElseThrow();
        clearInvocations(jdbc);
        var result = queries.find(query(List.of(), List.of(90000L, 90002L)), ProductSort.DEFAULT, 1, 20);
        assertThat(selects()).hasSize(5)
            .noneMatch(sql -> sql.contains("ingredient_source") || sql.contains("any(:excluded)"));
        assertThat(selects()).filteredOn(sql -> sql.contains("select pm.product_id, m.code")).hasSize(1);
        assertThat(result.filterOptions().brands()).extracting(BrandProductCount::id).contains(90000L, 90002L);
        assertThat(result.filterOptions().brands()).filteredOn(brand -> brand.id().equals(90002L))
            .extracting(BrandProductCount::productCount).containsExactly(0L);
        var card = result.items().stream().filter(item -> item.id().equals(full.id())).findFirst().orElseThrow();
        assertThat(card.name()).isEqualTo(full.name());
        assertThat(card.brand()).isEqualTo(full.brand());
        assertThat(card.marks()).extracting(Mark::code).containsExactly("DAISO");
        assertThat(card.imageUrl()).isEqualTo(full.imageUrl());
        assertThat(card.price()).isEqualTo(full.representativeVariant().price());
        assertThat(card.volumeValue()).isEqualByComparingTo(full.representativeVariant().volumeValue());
        assertThat(card.volumeUnit()).isEqualTo(full.representativeVariant().volumeUnit());
        assertThat(card.moistureLevel()).isEqualTo(full.moistureLevel());
        assertThat(card.oilLevel()).isEqualTo(full.oilLevel());
        assertThat(card.updatedAt()).isEqualTo(full.updatedAt());
    }

    @Test
    @DisplayName("후속 페이지는 필터 선택지 정의 조회를 생략하고 빈 페이지도 전체 개수를 유지한다")
    void laterPagesSkipFacetLookups() {
        ProductQuery query = query(List.of());
        long total = queries.find(query, ProductSort.DEFAULT, 1, 1).totalElements();

        clearInvocations(jdbc);
        var later = queries.find(query, ProductSort.DEFAULT, 2, 1);
        assertThat(later.items()).hasSize(1);
        assertThat(later.totalElements()).isEqualTo(total);
        assertThat(later.filterOptions()).isNull();
        assertThat(selects()).hasSize(3);

        clearInvocations(jdbc);
        var empty = queries.find(query, ProductSort.DEFAULT, 100, 1);
        assertThat(empty.items()).isEmpty();
        assertThat(empty.totalElements()).isEqualTo(total).isPositive();
        assertThat(empty.filterOptions()).isNull();
        assertThat(selects()).hasSize(1);
    }

    @Test
    @DisplayName("내부 카드 페이지는 공개 목록의 순서와 개수를 유지하고 선택지 조회를 생략한다")
    void cardPagePreservesResultsWithoutFacets() {
        ProductQuery query = query(List.of(), List.of(90000L, 90002L));
        var expected = queries.find(query, ProductSort.DEFAULT, 1, 20);
        clearInvocations(jdbc);

        var result = queries.findCards(query, ProductSort.DEFAULT, 1, 20);

        assertThat(result.items()).isEqualTo(expected.items());
        assertThat(result.totalElements()).isEqualTo(expected.totalElements()).isPositive();
        assertThat(result.filterOptions()).isNull();
        assertThat(selects()).hasSize(3);

        clearInvocations(jdbc);
        var empty = queries.findCards(query, ProductSort.DEFAULT, 100, 20);
        assertThat(empty.items()).isEmpty();
        assertThat(empty.totalElements()).isEqualTo(expected.totalElements());
        assertThat(selects()).hasSize(1);
    }

    @Test
    @DisplayName("포함 성분은 중복 입력과 여러 구성품을 고려해 모든 성분을 가진 상품만 한 번 반환한다")
    void includedIngredientsRetainAllOfSemanticsAcrossPlans() {
        fixture.update("""
            insert into product_component (product_id, display_order, name)
            values (90001, 1, '중복 성분 구성품'), (90002, 0, '다른 성분 구성품')
            """);
        fixture.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select id, 90001, 0 from product_component where product_id = 90001 and display_order = 1
            union all
            select id, 90002, 0 from product_component where product_id = 90002
            """);
        ProductQuery single = including(List.of(90001L, 90001L));
        ProductQuery multiple = including(List.of(90001L, 90002L, 90001L));
        for (String mode : List.of("force_custom_plan", "force_generic_plan")) {
            fixture.execute("set local plan_cache_mode = " + mode);
            var result = queries.find(single, ProductSort.DEFAULT, 1, 20);
            assertThat(result.items()).extracting(card -> card.id()).containsExactly(90001L);
            assertThat(result.totalElements()).isEqualTo(1);
            assertThat(queries.count(single)).isEqualTo(1);
            assertThat(queries.count(multiple)).isZero();
        }
        fixture.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select id, 90002, 1 from product_component where product_id = 90001 and display_order = 1
            """);
        fixture.execute("set local plan_cache_mode = force_custom_plan");
        var custom = queries.find(multiple, ProductSort.PRICE_ASC, 1, 20);
        fixture.execute("set local plan_cache_mode = force_generic_plan");
        var generic = queries.find(multiple, ProductSort.PRICE_ASC, 1, 20);
        assertThat(generic).usingRecursiveComparison().isEqualTo(custom);
        assertThat(generic.items()).extracting(card -> card.id()).containsExactly(90001L);
        assertThat(generic.totalElements()).isEqualTo(1);
    }

    private ProductQuery including(List<Long> ingredients) {
        return new ProductQuery(null, null, null, null, null, ingredients, null, null, null, null, null, false, null);
    }

    @Test
    @DisplayName("기본 정렬은 조회수 동률의 ID 순서와 두 번째 페이지 경계를 유지한다")
    void defaultPagesPreservePopularityTies() {
        fixture.update("""
            insert into product_daily_view(view_date, product_id, view_count)
            values ((now() at time zone 'Asia/Seoul')::date - 1, 90001, 99),
                   ((now() at time zone 'Asia/Seoul')::date - 1, 90003, 99)
            """);
        // 첫 옵션의 순번이 0이 아니어도 기본 정렬의 상품 후보에서 빠지지 않는다.
        fixture.update("update product_variant set display_order = 7 where product_id = 90003");
        ProductQuery query = new ProductQuery(
            null,
            null,
            List.of(90000L),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false,
            null
        );
        for (String mode : List.of("force_custom_plan", "force_generic_plan")) {
            fixture.execute("set local plan_cache_mode = " + mode);
            var first = queries.find(query, ProductSort.DEFAULT, 1, 2);
            var second = queries.find(query, ProductSort.DEFAULT, 2, 2);
            assertThat(first.items()).extracting(card -> card.id()).containsExactly(90002L, 90001L);
            assertThat(second.items()).extracting(card -> card.id()).containsExactly(90003L, 90004L);
            assertThat(first.totalElements()).isEqualTo(12);
            assertThat(second.totalElements()).isEqualTo(12);
            assertThat(second.filterOptions()).isNull();
            assertThat(queries.find(query, ProductSort.DEFAULT, 100, 2).items()).isEmpty();
        }
    }

    @Test
    @DisplayName("가격 정렬은 가장 싼 옵션이 아닌 첫 순번 옵션의 가격을 사용한다")
    void priceSortKeepsRepresentativeVariant() {
        fixture.update("update product_variant set display_order = 7, price = 5000 where product_id = 90001");
        fixture.update("""
            insert into product_variant(id, product_id, display_order, price, volume_value, volume_unit, status)
            values (90099, 90001, 9, 1, 100, 'ml', 'active')
            """);
        ProductQuery query = new ProductQuery(
            null,
            null,
            List.of(90000L),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false,
            null
        );
        for (String mode : List.of("force_custom_plan", "force_generic_plan")) {
            fixture.execute("set local plan_cache_mode = " + mode);
            var page = queries.find(query, ProductSort.PRICE_ASC, 1, 20);
            assertThat(page.items().getLast().id()).isEqualTo(90001L);
            assertThat(page.items().getLast().price()).isEqualTo(5000L);
            assertThat(page.totalElements()).isEqualTo(12);
        }
    }

    @Test
    @DisplayName("선택지 집계는 자기 필터만 제외하고 다른 필터와 마크 조건을 유지한다")
    void facetsKeepTheirOwnEligibility() {
        fixture.update("update product set brand_id = 90001 where id in (90002, 90004)");
        fixture.update("update product set category_id = 3 where id in (90003, 90004)");
        fixture.update("""
            insert into product_mark(product_id, mark_code)
            values (90002, 'DAISO'), (90003, 'DAISO'), (90004, 'DAISO')
            """);
        ProductQuery query = new ProductQuery(
            null,
            List.of(2L),
            List.of(90000L),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false,
            List.of(Mark.DAISO)
        );
        for (String mode : List.of("force_custom_plan", "force_generic_plan")) {
            fixture.execute("set local plan_cache_mode = " + mode);
            var page = queries.find(query, ProductSort.DEFAULT, 1, 20);
            assertThat(page.items()).extracting(card -> card.id()).containsExactly(90001L);
            assertThat(page.totalElements()).isEqualTo(1);
            assertThat(page.filterOptions().brands()).extracting(BrandProductCount::id)
                .containsExactlyInAnyOrder(90000L, 90001L);
            assertThat(page.filterOptions().brands()).extracting(BrandProductCount::productCount)
                .containsOnly(1L);
            var categories = page.filterOptions().categories().stream()
                .flatMap(category -> category.children().stream()).toList();
            assertThat(categories).extracting(CategoryProductCount::id).containsExactlyInAnyOrder(2L, 3L);
            assertThat(categories).allSatisfy(category -> assertThat(category.productCount()).isEqualTo(1));
        }
    }

    @Test
    @DisplayName("활성 제외 조건이 있으면 성분 제외 검사는 유지한다")
    void activeExclusionRemains() {
        clearInvocations(jdbc);
        queries.count(query(List.of(90001L)));
        assertThat(selects()).isNotEmpty().allMatch(sql -> sql.contains("any(:excluded)"));
    }

    private ProductQuery query(List<Long> excluded) {
        return query(excluded, List.of());
    }

    private ProductQuery query(List<Long> excluded, List<Long> selectedBrands) {
        return new ProductQuery(
            "검증토너",
            null,
            selectedBrands,
            null,
            null,
            null,
            excluded,
            null,
            null,
            null,
            null,
            false,
            List.of()
        );
    }

    @Test
    @Transactional(isolation = Isolation.SERIALIZABLE)
    void markQueriesDoNotGrowWithPageSize() {
        fixture.update("update product set category_id = 14 where id in (90001, 90002)");
        fixture.update("""
            insert into product_mark(product_id, mark_code)
            select id, 'MINERAL' from product where id in (90001, 90002)
            """);
        ProductQuery query = new ProductQuery(
            "검증토너",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            false,
            List.of(Mark.MINERAL)
        );
        clearInvocations(jdbc);
        assertThat(queries.find(query, ProductSort.DEFAULT, 1, 1).items()).hasSize(1);
        int smallPageQueries = selects().size();
        clearInvocations(jdbc);
        assertThat(queries.find(query, ProductSort.DEFAULT, 1, 20).items()).hasSize(2);
        assertThat(selects()).hasSize(smallPageQueries);
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
