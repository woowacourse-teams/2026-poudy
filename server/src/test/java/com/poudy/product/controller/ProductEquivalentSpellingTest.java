package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.product.repository.ProductRepository;
import com.poudy.product.service.ProductKeywordSearch;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql({"/db/search-test-data.sql", "/db/product-equivalent-spelling-test-data.sql"})
@DisplayName("선크림·썬크림 동등 표기 검색")
class ProductEquivalentSpellingTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private ProductRepository products;

    @Autowired
    private ProductKeywordSearch keywords;

    @Autowired
    private UserRepository users;

    private long userId;

    @BeforeEach
    void signIn() {
        userId = users.save(UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "797-test", "797@example.com", true)))
            .id();
    }

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    @DisplayName("기존 core와 page에서도 동등 표기를 처리해 같은 전체 후보를 사용한다")
    void sharesCoreAndPageForEquivalentSpellings() {
        for (String query : List.of("선크림", "썬크림")) {
            assertThat(
                jdbc.queryForList("select product_id from search_products_core(?) where tier <= 2", Long.class, query)
            )
                .containsExactlyInAnyOrder(90100L, 90101L, 90102L, 90103L, 90104L, 90105L, 90106L);
            assertThat(jdbc.queryForObject("select total from search_products_page(?, 0, 100, 2)", Long.class, query))
                .isEqualTo(7);
        }
    }

    @Test
    @DisplayName("규칙 한 행 추가와 문서 갱신만으로 다른 길이의 표기도 같은 검색과 강조를 사용한다")
    void addsRuleWithoutChangingSearch() throws Exception {
        String core = jdbc
            .queryForObject("select pg_get_functiondef('search_products_core(text)'::regprocedure)", String.class);
        String commonCore = jdbc.queryForObject(
            "select pg_get_functiondef('search_product_hits(text,boolean)'::regprocedure)",
            String.class
        );
        jdbc.update("update product set product_name = '검증짧' where id = 90107");
        jdbc.update("update product set product_name = '검증긴표기' where id = 90108");
        jdbc.execute("""
            create or replace function search_product_spelling_rules()
                returns text[][] language sql immutable parallel safe
                return array[['썬크림','선크림'], ['검증짧','검증긴표기']]
            """);
        jdbc.execute("refresh materialized view product_search_document");
        assertBothRoutes("닥터지 검증짧", List.of(90107L, 90108L));
        assertBothRoutes("닥터지검증긴표기", List.of(90107L, 90108L));
        assertBothRoutes("선크림", List.of(90100L, 90101L, 90102L, 90103L, 90104L, 90105L, 90106L));
        JsonNode result = response("/api/products/suggestions", "검증긴표기", 1, "DEFAULT", false);
        JsonNode match = result.at("/items/0/match");
        assertThat(match.path("text").asString()).isEqualTo("검증짧");
        assertThat(match.path("startIndex").asInt()).isZero();
        assertThat(match.path("endIndexExclusive").asInt()).isEqualTo(3);
        assertThat(
            jdbc.queryForObject("select pg_get_functiondef('search_products_core(text)'::regprocedure)", String.class)
        ).isEqualTo(core);
        assertThat(
            jdbc.queryForObject(
                "select pg_get_functiondef('search_product_hits(text,boolean)'::regprocedure)",
                String.class
            )
        ).isEqualTo(commonCore);
    }

    @Test
    @DisplayName("미등록 부분 입력은 원래 표기만 찾고 완성 표기와 함께 써도 조건을 유지한다")
    void retainsLiteralPartialInput() throws Exception {
        assertBothRoutes("선크", List.of(90100L, 90102L, 90103L, 90105L));
        assertBothRoutes("썬크", List.of(90101L, 90102L, 90104L, 90106L));
        assertBothRoutes("선크림 썬크", List.of(90101L, 90102L, 90104L, 90106L));
        assertBothRoutes("썬크림 썬크", List.of(90101L, 90102L, 90104L, 90106L));
        assertThat(
            jdbc.queryForMap("select product_norm, product_key from product_search_document where product_id=90101")
        )
            .containsEntry("product_norm", "수분썬크림차단").containsEntry("product_key", "수분선크림차단");
        jdbc.update("update product set product_name = '썬크림썬크림' where id=90107");
        jdbc.execute("refresh materialized view product_search_document");
        assertBothRoutes("선크림 선크", List.of(90100L, 90102L, 90103L, 90105L));
        assertBothRoutes("썬크림 선크", List.of(90100L, 90102L, 90103L, 90105L));
    }

    @Test
    @DisplayName("표준형으로 찾은 상품도 속성·표식 조건을 모두 만족한다")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.SERIALIZABLE)
    void retainsMetadataConditions() throws Exception {
        jdbc.update(
            "insert into product_attribute_value(product_id,attribute_id,value_code) select 90101,id,'MINERAL' from attribute where code='UV_FILTER_TYPE'"
        );
        jdbc.update("insert into badge(code,name) values ('CHECK797','검증표식')");
        jdbc.update("insert into product_badge(product_id,badge_code) values (90101,'CHECK797'),(90107,'CHECK797')");
        assertBothRoutes("닥터지 선크림 무기자차 검증표식", List.of(90101L));
        assertBothRoutes("닥터지 썬크림 무기자차 검증표식", List.of(90101L));
        assertBothRoutes("닥터지 썬크림 유기자차 검증표식", List.of());
    }

    @ParameterizedTest
    @ValueSource(strings = {"선크림", "썬크림", "선크림 썬크림", "썬크림 선크림"})
    @DisplayName("직접 일치가 양쪽에 있어도 두 표기의 전체 후보와 개수가 같다")
    void includesBothSpellings(String query) throws Exception {
        assertBothRoutes(query, List.of(90100L, 90101L, 90102L, 90103L, 90104L, 90105L, 90106L));
    }

    @ParameterizedTest
    @ValueSource(strings = {"닥터지 선크림", "닥터지 썬크림", "닥터지선크림", "닥터지썬크림", "썬크림닥터지", "DR.G 썬크림"})
    @DisplayName("브랜드와 붙여 쓴 입력에서도 다른 브랜드와 다른 제품을 제외한다")
    void retainsBrand(String query) throws Exception {
        assertBothRoutes(query, List.of(90100L, 90101L, 90102L, 90105L, 90106L));
    }

    @ParameterizedTest
    @ValueSource(strings = {"수분선크림", "수분썬크림", "수분 선크림", "수분 썬크림"})
    @DisplayName("붙여 쓴 제품 조건을 유지한다")
    void retainsProductCondition(String query) throws Exception {
        assertBothRoutes(query, List.of(90100L, 90101L, 90103L, 90104L));
    }

    @ParameterizedTest
    @ValueSource(strings = {"DEFAULT", "PRICE_ASC", "PRICE_DESC", "UNIT_PRICE_ASC", "UNIT_PRICE_DESC", "CREATED_ASC"})
    @DisplayName("필터 적용 후 모든 페이지에 중복·누락이 없고 목록·count·집계가 일치한다")
    void filtersAndPages(String sort) throws Exception {
        for (String query : List.of("선크림", "썬크림")) {
            List<Long> ids = new ArrayList<>();
            for (int page = 1; page <= 3; page++) {
                JsonNode result = response("/api/products", query, page, sort, true);
                assertThat(result.at("/pagination/totalElements").asLong()).isEqualTo(2);
                ids.addAll(ids(result));
                if (page == 1) {
                    assertThat(result.at("/categories/0/productCount").asLong()).isEqualTo(2);
                    assertThat(result.at("/filterOptions/categories/0/productCount").asLong()).isEqualTo(2);
                    assertThat(result.at("/brands/0/id").asLong()).isEqualTo(90002);
                    assertThat(result.at("/filterOptions/brands").size()).isEqualTo(2);
                }
            }
            assertThat(ids).containsExactlyInAnyOrder(90100L, 90101L);
            assertThat(ids).doesNotHaveDuplicates();
            if (!sort.equals("DEFAULT")) {
                assertThat(ids).containsExactlyElementsOf(
                    sort.endsWith("DESC") ? List.of(90101L, 90100L) : List.of(90100L, 90101L)
                );
            }
            assertThat(response("/api/products/count", query, 1, sort, true).path("count").asLong()).isEqualTo(2);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/products/suggestions", "/api/users/me/shelf/product-suggestions"})
    @DisplayName("추천 페이지도 전체 후보를 한 번씩 반환하고 실제 일치한 원문을 강조한다")
    void pagesSuggestionsAndHighlightsOriginalSpelling(String route) throws Exception {
        for (String query : List.of("선크림", "썬크림")) {
            List<Long> ids = new ArrayList<>();
            for (int page = 1; page <= 8; page++) {
                JsonNode result = response(route, query, page, "DEFAULT", false);
                assertThat(result.at("/pagination/totalElements").asLong()).isEqualTo(7);
                ids.addAll(ids(result));
                for (JsonNode item : result.path("items")) {
                    JsonNode match = item.path("match");
                    String text = match.path("text").asString();
                    assertThat(text).isEqualTo(item.path("name").asString());
                    assertThat(
                        text.substring(match.path("startIndex").asInt(), match.path("endIndexExclusive").asInt())
                    )
                        .isIn("선크림", "썬크림");
                }
            }
            assertThat(ids).containsExactlyInAnyOrder(90100L, 90101L, 90102L, 90103L, 90104L, 90105L, 90106L);
        }
    }

    @Test
    @DisplayName("모르는 토큰만 교정하고 교정 뒤에도 브랜드와 제품 조건을 모두 지킨다")
    void correctsOnlyUnknownTokens() throws Exception {
        assertBothRoutes("닥터지 검증스내일 썬크림", List.of(90105L, 90106L));
        assertThat(
            jdbc.queryForObject(
                "select corrected_query from search_products(?, 0, 5, 2)",
                String.class,
                "닥터지 검증스내일 썬크림"
            )
        ).isEqualTo("닥터지 검증스네일 썬크림");
        assertBothRoutes("라운드랩 검증스내일 썬크림", List.of());
        assertThat(jdbc.queryForObject("select search_correct_query(?, 'PRODUCT')", String.class, "없는브랜드 수분썬크림"))
            .isEqualTo("없는브랜드 수분썬크림");
        assertThat(
            jdbc.queryForObject("select corrected_query from search_products(?, 0, 5, 2)", String.class, "없는브랜드 썬크림")
        )
            .isNull();
    }

    @Test
    @DisplayName("카탈로그에 토큰 전체가 없어도 완성 표현을 포함한 토큰은 유사 어휘로 교정하지 않는다")
    void protectsRegisteredExpressionInsideUnknownToken() {
        jdbc.update("update product set product_name = '수분선크림즈' where id = 90107");
        jdbc.execute("refresh materialized view product_search_document");
        jdbc.execute("refresh materialized view search_vocabulary");
        assertThat(jdbc.queryForObject("select search_correct_query(?, 'PRODUCT')", String.class, "없는브랜드 수분썬크림즈"))
            .isEqualTo("없는브랜드 수분썬크림즈");
    }

    @Test
    @DisplayName("표기 확장으로만 찾는 경우에도 인기 검색어의 결과 존재 판단에 반영한다")
    void usesExpansionForKeywordEligibility() {
        jdbc.update("update product set product_name = '독점 선크림' where id = 90100");
        jdbc.execute("refresh materialized view product_search_document");
        assertThat(products.hasSearchResults("독점 썬크림")).isTrue();
        assertThat(keywords.hasResults("독점 썬크림")).isTrue();
        assertThat(keywords.hasResults("독점 썬크림 앰플")).isFalse();
    }

    @Test
    @DisplayName("미완성 입력·선케어 분류·다른 단어를 동등 표기로 확장하지 않는다")
    void boundsExpansion() throws Exception {
        for (String query : List.of("썬크리", "썬크리ㅁ", "선세럼", "선물")) {
            assertThat(
                jdbc.queryForList(
                    "select product_id from search_products_core(?) where tier <= 2",
                    Long.class,
                    query
                )
            )
                .doesNotContain(90100L, 90103L, 90105L);
        }
        assertBothRoutes("닥터지 썬크림 앰플", List.of());
        assertThat(jdbc.queryForList("select product_id from search_product_names('수분썬크림')", Long.class))
            .containsExactlyInAnyOrder(90101L, 90104L);
    }

    @Test
    @DisplayName("같은 표기의 반복 출현도 위치별로 확장하고 토큰 비율을 부풀리지 않는다")
    void expandsRepeatedOccurrences() {
        jdbc.update("update product set product_name = '수분선크림 진정썬크림' where id = 90100");
        jdbc.execute("refresh materialized view product_search_document");
        for (String query : List.of("수분선크림진정선크림", "수분썬크림진정썬크림", "수분선크림 진정썬크림")) {
            assertThat(
                jdbc.queryForList(
                    "select product_id from search_products_core(?) where tier <= 2",
                    Long.class,
                    query
                )
            )
                .containsExactly(90100L);
        }
        assertThat(
            jdbc.queryForObject(
                "select token_ratio from search_products_core('선크림 썬크림') where product_id=90100",
                Float.class
            )
        )
            .isEqualTo(1.0F);
    }

    @Test
    @DisplayName("영문 읽기와 동등 표기를 함께 찾은 강조 구간도 원문 전체를 가리킨다")
    void highlightsReadingWithEquivalentSpelling() throws Exception {
        jdbc.update("update product set product_name = '😀PDRN 선크림' where id = 90100");
        jdbc.execute("refresh materialized view product_search_document");
        JsonNode result = mapper.readTree(
            mvc.perform(
                get("/api/products/suggestions")
                    .param("keyword", "피디알엔썬크림")
            ).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
        );
        assertThat(ids(result)).containsExactly(90100L);
        assertThat(result.at("/items/0/match/startIndex").asInt()).isEqualTo(2);
        assertThat(result.at("/items/0/match/endIndexExclusive").asInt()).isEqualTo(10);
    }

    @Test
    @DisplayName("기존 함수의 1~4인자 호출과 반환 모양을 유지한다")
    void preservesFunctionCalls() {
        for (String args : List.of("'썬크림'", "'썬크림', 0", "'썬크림', 0, 100", "'썬크림', 0, 100, 2")) {
            assertThat(jdbc.queryForMap("select * from search_products(" + args + ")"))
                .containsKeys("total", "corrected_query", "items").containsEntry("total", 7L);
        }
    }

    private void assertBothRoutes(String query, List<Long> expected) throws Exception {
        for (String route : List
            .of("/api/products", "/api/products/suggestions", "/api/users/me/shelf/product-suggestions")) {
            JsonNode result = mapper.readTree(
                mvc.perform(
                    get(route).with(authentication(new LoginMember(userId).toAuthentication())).param("keyword", query)
                        .param("size", "100")
                )
                    .andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
            );
            assertThat(ids(result)).containsExactlyInAnyOrderElementsOf(expected);
            assertThat(result.at("/pagination/totalElements").asLong()).isEqualTo(expected.size());
        }
        JsonNode count = response("/api/products/count", query, 1, "DEFAULT", false);
        assertThat(count.path("count").asLong()).isEqualTo(expected.size());
        assertThat(products.hasSearchResults(query)).isEqualTo(!expected.isEmpty());
    }

    private JsonNode response(String route, String query, int page, String sort, boolean filtered) throws Exception {
        var request = get(route).param("keyword", query).param("size", "1").param("page", String.valueOf(page));
        if (route.startsWith("/api/users/me/")) {
            request.with(authentication(new LoginMember(userId).toAuthentication()));
        }
        if (route.equals("/api/products")) {
            request.param("sort", sort);
        }
        if (filtered) {
            request.param("brandIds", "90002").param("moistureLevel", "2").param("categoryIds", "2");
        }
        return mapper
            .readTree(mvc.perform(request).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }

    private List<Long> ids(JsonNode result) {
        List<Long> ids = new ArrayList<>();
        for (JsonNode item : result.path("items")) {
            ids.add(item.path("id").asLong());
        }
        return ids;
    }
}
