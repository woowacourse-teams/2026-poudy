package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.ErrorCode;
import com.poudy.product.domain.ProductQuery;
import com.poudy.product.domain.ProductSort;
import com.poudy.product.repository.ProductQueryRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql("/db/search-test-data.sql")
@DisplayName("상품 API DB 조회")
class ProductDatabaseQueryTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ProductQueryRepository repository;

    @Test
    @DisplayName("검색 후 DB 필터를 적용하고 페이지를 자르며 목록·count와 선택지의 집계가 일치한다")
    void filtersBeforePaging() throws Exception {
        jdbc.update("update product set moisture_level = 2 where id in (90002, 90004)");
        mockMvc.perform(
            get("/api/products").param("keyword", "검증토너").param("moistureLevel", "2")
                .param("sort", "DEFAULT").param("page", "2").param("size", "1")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90002)))
            .andExpect(jsonPath("$.pagination.totalElements").value(2))
            .andExpect(jsonPath("$.categories[0].productCount").value(2))
            .andExpect(jsonPath("$.filterOptions").doesNotExist());
        mockMvc.perform(get("/api/products/count").param("keyword", "검증토너").param("moistureLevel", "2"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
    }

    @Test
    @DisplayName("검색어가 있으면 기본순이 DB 관련도 순서를 필터와 페이지 이후에도 보존한다")
    void defaultsToSearchRank() throws Exception {
        jdbc.update("update product set moisture_level = 2 where id in (90001, 90004)");
        for (String sort : List.of("", "DEFAULT")) {
            var request = get("/api/products").param("keyword", "검증토너")
                .param("moistureLevel", "2").param("size", "1");
            if (!sort.isEmpty()) {
                request.param("sort", sort);
            }
            mockMvc.perform(request)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id").value(contains(90001)))
                .andExpect(jsonPath("$.pagination.totalElements").value(2));
            mockMvc.perform(request.param("page", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].id").value(contains(90004)));
        }
    }

    @Test
    @DisplayName("검색어 없는 기본순은 한국 시간 어제까지 30일 조회수로 필터 후 페이지를 정한다")
    void defaultsToThirtyCompletedDaysOfViews() throws Exception {
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Seoul"));
        jdbc.update("delete from product_daily_view");
        jdbc.update(
            "insert into product_daily_view (view_date, product_id, view_count) values (?, 90001, 2)",
            today.minusDays(30)
        );
        jdbc.update(
            "insert into product_daily_view (view_date, product_id, view_count) values (?, 90004, 2)",
            today.minusDays(1)
        );
        jdbc.update(
            "insert into product_daily_view (view_date, product_id, view_count) values (?, 90002, 10000)",
            today.minusDays(31)
        );
        jdbc.update(
            "insert into product_daily_view (view_date, product_id, view_count) values (?, 90003, 10000)",
            today
        );

        for (int page = 1; page <= 3; page++) {
            long expected = switch (page) {
                case 1 -> 90001L;
                case 2 -> 90004L;
                default -> 90002L;
            };
            mockMvc.perform(
                get("/api/products").param("brandIds", "90000")
                    .param("page", String.valueOf(page)).param("size", "1")
            )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(expected));
        }
    }

    @Test
    @DisplayName("단가는 대표 옵션의 ml·g 수치를 비교하고 ea·0은 양방향 모두 ID순으로 뒤에 둔다")
    void sortsByRepresentativeUnitPrice() throws Exception {
        jdbc.update(
            "update product_variant set price = 1000, volume_value = 10, volume_unit = 'ml' where product_id = 90001"
        );
        jdbc.update(
            "update product_variant set price = 2000, volume_value = 20, volume_unit = 'g' where product_id = 90002"
        );
        jdbc.update(
            "update product_variant set price = 3000, volume_value = 10, volume_unit = 'g' where product_id = 90003"
        );
        jdbc.update(
            "update product_variant set price = 100, volume_value = 1, volume_unit = 'ea' where product_id = 90004"
        );
        jdbc.update(
            "update product_variant set price = 100, volume_value = 0, volume_unit = 'ml' where product_id = 90008"
        );

        mockMvc.perform(get("/api/products").param("keyword", "검증토너").param("sort", "UNIT_PRICE_ASC"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90001, 90002, 90003, 90004, 90008)));
        mockMvc.perform(get("/api/products").param("keyword", "검증토너").param("sort", "UNIT_PRICE_DESC"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90003, 90001, 90002, 90004, 90008)));
        mockMvc.perform(
            get("/api/products").param("keyword", "검증토너").param("sort", "UNIT_PRICE_ASC")
                .param("page", "2").param("size", "2")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(90003, 90004)));
    }

    @ParameterizedTest
    @CsvSource({"NAME_ASC", "NAME_DESC", "UNKNOWN"})
    @DisplayName("새 계약에 없는 정렬값은 요청 검증 오류로 거절한다")
    void rejectsUnsupportedSort(String sort) throws Exception {
        mockMvc.perform(get("/api/products").param("sort", sort))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value(ErrorCode.INVALID_QUERY_PARAMETER.name()));
    }

    @Test
    @DisplayName("복합 검색 목록과 count는 모든 토큰이 일치하는 상품만 포함한다")
    void requiresAllSearchTokens() throws Exception {
        mockMvc.perform(get("/api/products").param("keyword", "라운드랩 검증독도"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90006)))
            .andExpect(jsonPath("$.pagination.totalElements").value(1));
        mockMvc.perform(get("/api/products/count").param("keyword", "라운드랩 검증독도"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mockMvc.perform(get("/api/products").param("keyword", "검증토너 없는단어"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    @DisplayName("상품 제안은 DB 검색 순위와 페이지 밖에서도 전체 개수를 유지한다")
    void usesSearchRankAndTotal() throws Exception {
        mockMvc.perform(get("/api/products/suggestions").param("keyword", "검증토너").param("size", "3"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90001, 90004, 90002)))
            .andExpect(jsonPath("$.pagination.totalElements").value(5));
        mockMvc.perform(
            get("/api/products/suggestions").param("keyword", "검증토너")
                .param("page", "2147483647").param("size", "20")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.pagination.totalElements").value(5));
    }

    @ParameterizedTest
    @CsvSource({"PDRN,90005,0,4", "ㅍㄷㅇㅇ,90005,0,4", "검증스내일,90012,0,5", "검증젤,90013,2,5"})
    @DisplayName("영문·초성·교정과 보조 문자의 강조 구간은 DB 계산을 그대로 반환한다")
    void mapsDatabaseHighlight(String keyword, long id, int start, int end) throws Exception {
        mockMvc.perform(get("/api/products/suggestions").param("keyword", keyword))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(id))
            .andExpect(jsonPath("$.items[0].match.field").value("PRODUCT_NAME"))
            .andExpect(jsonPath("$.items[0].match.startIndex").value(start))
            .andExpect(jsonPath("$.items[0].match.endIndexExclusive").value(end));
    }

    @Test
    @DisplayName("최저가와 판매 상태가 아닌 첫 옵션 가격으로 정렬하고 동률은 ID로 정렬한다")
    void sortsByRepresentativeVariant() throws Exception {
        jdbc.update("update product_variant set price = 2000, status = 'discontinued' where product_id = 90001");
        jdbc.update("""
            insert into product_variant (id, product_id, display_order, price, volume_value, volume_unit, status)
            values (99001, 90001, 1, 100, 10, 'ml', 'active')
            """);
        mockMvc.perform(get("/api/products").param("keyword", "검증토너").param("sort", "PRICE_DESC").param("size", "2"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90001, 90002)))
            .andExpect(jsonPath("$.items[0].price").value(2000));
        mockMvc.perform(get("/api/products").param("keyword", "검증토너").param("sort", "PRICE_ASC").param("size", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(90002));
    }

    @Test
    @DisplayName("여러 구성품의 중복 성분은 상품 개수를 늘리지 않고 전성분 순서는 보존한다")
    void preservesIngredientOrderAndCountsProducts() throws Exception {
        addIngredients();
        ProductQuery query = new ProductQuery(
            null,
            null,
            null,
            null,
            null,
            List.of(90001L, 90002L),
            null,
            null,
            null
        );
        var page = repository.find(query, ProductSort.DEFAULT, 1, 1);
        assertThat(page.totalElements()).isEqualTo(1);
        assertThat(repository.count(query)).isEqualTo(1);
        assertThat(page.items().getFirst().ingredients().values()).extracting("id")
            .containsExactly(90002L, 90001L, 90002L);
        mockMvc.perform(
            get("/api/products/count").param("includeIngredientIds", "90001")
                .param("excludeIngredientIds", "90002")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
    }

    @Test
    @DisplayName("DB에서 변경한 제외 성분군 매핑을 필터와 충돌 검사에 함께 반영한다")
    void readsCurrentExcludeGroup() throws Exception {
        addIngredients();
        jdbc.update("""
            insert into exclude_code_ingredient (exclude_code, ingredient_id, display_order)
            select 'SULFATES', 90002, coalesce(max(display_order), -1) + 1
            from exclude_code_ingredient where exclude_code = 'SULFATES'
            """);
        mockMvc.perform(get("/api/products/count").param("keyword", "검증토너").param("excludeCodes", "SULFATES"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(4));
        for (String path : List.of("/api/products", "/api/products/count")) {
            mockMvc.perform(get(path).param("includeIngredientIds", "90002").param("excludeCodes", "SULFATES"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("CONFLICTING_INGREDIENT_FILTER"));
        }
    }

    @Test
    @DisplayName("목록이 비어도 자기 조건을 풀어 계산한 필터 선택지는 유지된다")
    void keepsOptionsForEmptyResult() throws Exception {
        mockMvc.perform(get("/api/products").param("keyword", "검증토너").param("brandIds", "999999"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.brands").isEmpty())
            .andExpect(jsonPath("$.filterOptions.brands[*].id").value(contains(90000)))
            .andExpect(jsonPath("$.filterOptions.categories").isEmpty())
            .andExpect(jsonPath("$.filterOptions.skinTypes").isEmpty());
    }

    private void addIngredients() {
        jdbc.update("""
            insert into product_component (product_id, display_order, name)
            values (90001, 0, '첫 구성품'), (90001, 1, '둘째 구성품')
            """);
        jdbc.update("""
            insert into product_ingredient (component_id, display_order, ingredient_id)
            select pc.id, mapping.ingredient_order, mapping.ingredient_id
            from (values
                (90001::bigint, 0, 0, 90002::bigint),
                (90001::bigint, 0, 1, 90001::bigint),
                (90001::bigint, 1, 0, 90002::bigint)
            ) mapping(product_id, component_order, ingredient_order, ingredient_id)
            join product_component pc
              on pc.product_id = mapping.product_id
             and pc.display_order = mapping.component_order
            """);
    }
}
