package com.poudy.shelf.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("파우치 평가 미리보기 API")
class ShelfRatingPreviewControllerTest {

    private static final String PRODUCTS_PATH = "/api/users/me/shelf/products";
    private static final String ANALYSIS_PATH = "/api/users/me/shelf/ingredient-analysis";
    private static final String PREVIEW_PATH = ANALYSIS_PATH + "/preview";

    private final ObjectMapper mapper = new ObjectMapper();

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private User user;

    @BeforeEach
    void signUp() {
        user = userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "5678", "preview@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow();
    }

    @ParameterizedTest
    @CsvSource(value = {"withoutRating,NULL", "ratedGood,GOOD", "ratedBad,BAD"}, nullValues = "NULL")
    @DisplayName("피부 타입이 있는 회원은 파우치에 없는 제품의 세 미리보기가 저장 후 분석과 같다")
    void previewsAddingProductAsSaved(String resultField, String preference) throws Exception {
        jdbcTemplate.update("update \"user\" set skin_type = 'DRY' where id = ?", user.id());
        add("""
            {"productId": 1, "usageStatus": "IN_USE", "preference": "BAD"}
            """);

        JsonNode preview = read(preview(15));
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": %s}
            """.formatted(preferenceJson(preference)));

        assertThat(preview.get(resultField)).isEqualTo(analysis());
    }

    @ParameterizedTest
    @CsvSource(value = {"withoutRating,NULL", "ratedGood,GOOD", "ratedBad,BAD"}, nullValues = "NULL")
    @DisplayName("피부 타입이 있는 회원은 담은 제품의 세 미리보기가 평가 변경 후 분석과 같다")
    void previewsChangingRatingAsSaved(String resultField, String preference) throws Exception {
        jdbcTemplate.update("update \"user\" set skin_type = 'DRY' where id = ?", user.id());
        add("""
            {"productId": 1, "usageStatus": "IN_USE", "preference": "BAD"}
            """);
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD"}
            """);
        JsonNode current = analysis();

        JsonNode preview = read(preview(15));
        assertThat(preview.get("ratedBad")).isEqualTo(current);

        mockMvc.perform(
            put(PRODUCTS_PATH + "/15").with(signedIn()).contentType(MediaType.APPLICATION_JSON).content("""
                {"usageStatus": "IN_USE", "preference": %s}
                """.formatted(preferenceJson(preference)))
        ).andExpect(status().isOk());
        assertThat(preview.get(resultField)).isEqualTo(analysis());
    }

    @Test
    @DisplayName("미리보기는 파우치와 직전 결과를 바꾸지 않는다")
    void doesNotChangeShelf() throws Exception {
        add("""
            {"productId": 1, "usageStatus": "IN_USE", "preference": "BAD"}
            """);
        jdbcTemplate.update(
            "insert into user_my_filter_ingredient (user_id, ingredient_id) values (?, 9)",
            user.id()
        );
        JsonNode before = analysis();
        List<Map<String, Object>> products = jdbcTemplate
            .queryForList("select * from user_shelf_product where user_id = ?", user.id());
        List<Map<String, Object>> snapshot = jdbcTemplate.queryForList(
            "select * from user_shelf_analysis_ingredient where user_id = ? order by ingredient_id",
            user.id()
        );
        List<Map<String, Object>> filter = jdbcTemplate.queryForList(
            "select * from user_my_filter_ingredient where user_id = ?",
            user.id()
        );
        List<Map<String, Object>> history = jdbcTemplate.queryForList(
            "select * from user_shelf_product_history where user_id = ? order by id",
            user.id()
        );

        JsonNode firstPreview = read(preview(15));
        assertThat(read(preview(15))).isEqualTo(firstPreview);

        assertThat(analysis()).isEqualTo(before);
        assertThat(jdbcTemplate.queryForList("select * from user_shelf_product where user_id = ?", user.id()))
            .isEqualTo(products);
        assertThat(
            jdbcTemplate.queryForList(
                "select * from user_shelf_analysis_ingredient where user_id = ? order by ingredient_id",
                user.id()
            )
        ).isEqualTo(snapshot);
        assertThat(jdbcTemplate.queryForList("select * from user_my_filter_ingredient where user_id = ?", user.id()))
            .isEqualTo(filter);
        assertThat(
            jdbcTemplate.queryForList(
                "select * from user_shelf_product_history where user_id = ? order by id",
                user.id()
            )
        ).isEqualTo(history);
        mockMvc.perform(get(PRODUCTS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].product.id").value(contains(1)));
    }

    @Test
    @DisplayName("미리보기의 새 성분과 나만의 필터 표시는 현재 저장된 결과와 필터를 기준으로 판단한다")
    void previewsNewIngredientsAndFilter() throws Exception {
        jdbcTemplate.update(
            "insert into user_my_filter_ingredient (user_id, ingredient_id) values (?, 9)",
            user.id()
        );

        preview(15)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.ratedBad.items[?(@.id == 9)].inFilter").value(contains(true)))
            .andExpect(jsonPath("$.ratedBad.items[?(@.id == 9)].isNew").value(contains(false)))
            .andExpect(jsonPath("$.ratedBad.items[?(@.id == 20)].inFilter").value(contains(false)))
            .andExpect(jsonPath("$.ratedBad.items[?(@.id == 20)].isNew").value(contains(true)));
    }

    @ParameterizedTest
    @CsvSource(value = {
            "NULL,false,QUICK_EXCLUDE,QUICK_EXCLUDE|DRY_SKIN|OILY_SKIN|SENSITIVE_SKIN",
            "NULL,true,QUICK_EXCLUDE|SENSITIVE_SKIN,QUICK_EXCLUDE|DRY_SKIN|OILY_SKIN|SENSITIVE_SKIN",
            "DRY,true,QUICK_EXCLUDE|DRY_SKIN|SENSITIVE_SKIN,QUICK_EXCLUDE|DRY_SKIN|SENSITIVE_SKIN",
            "OILY,false,QUICK_EXCLUDE|OILY_SKIN,QUICK_EXCLUDE|OILY_SKIN",
            "COMBINATION,false,QUICK_EXCLUDE|DRY_SKIN|OILY_SKIN,QUICK_EXCLUDE|DRY_SKIN|OILY_SKIN"
    }, nullValues = "NULL")
    @DisplayName("피부 타입·민감성에 맞는 분석과 주의 성분을 주고 피부 타입이 없을 때만 모든 피부 후보를 넓혀 준다")
    void widensSkinCautionsOnlyWithoutSkinType(
        String skinType,
        boolean sensitiveSkin,
        String analysisReasons,
        String cautionReasons
    )
        throws Exception {
        jdbcTemplate.update("""
            insert into ingredient (id, korean_name, english_name, description, updated_at)
            values (3663, '포타슘코코에이트', 'Potassium Cocoate', '비누 성분', now()),
                   (317, '미네랄오일', 'Mineral Oil', '밀폐 성분', now())
            on conflict (id) do nothing
            """);
        jdbcTemplate.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select id, 3663, 2 from product_component where product_id = 15
            union all
            select id, 317, 3 from product_component where product_id = 15
            """);
        jdbcTemplate.update(
            "update \"user\" set skin_type = ?, is_sensitive_skin = ? where id = ?",
            skinType,
            sensitiveSkin,
            user.id()
        );

        JsonNode response = read(preview(15));

        assertThat(reasonCodes(response.get("ratedBad").get("items")))
            .containsExactlyInAnyOrder(analysisReasons.split("\\|"));
        assertThat(reasonCodes(response.get("productCautionIngredients")))
            .containsExactlyInAnyOrder(cautionReasons.split("\\|"));
        if (skinType == null) {
            assertThat(response.get("ratedBadAcrossSkinTypes").get("badProductCount").asInt()).isEqualTo(1);
            assertThat(reasonCodes(response.get("ratedBadAcrossSkinTypes").get("items")))
                .containsExactlyInAnyOrder("QUICK_EXCLUDE", "DRY_SKIN", "OILY_SKIN", "SENSITIVE_SKIN");
        } else {
            assertThat(response.get("ratedBadAcrossSkinTypes").isNull()).isTrue();
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    @DisplayName("피부 타입 없는 회원은 기존 후보와 평가 결과를 전체 피부 기준으로 비교한다")
    void comparesUnknownSkinRatingsOnSameBasis(boolean containsSkinCaution) throws Exception {
        jdbcTemplate.update("update \"user\" set skin_type = null, is_sensitive_skin = false where id = ?", user.id());
        jdbcTemplate.update("""
            insert into ingredient (id, korean_name, english_name, description, updated_at)
            values (3663, '포타슘코코에이트', 'Potassium Cocoate', '비누 성분', now())
            on conflict (id) do nothing
            """);
        jdbcTemplate.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select id, 3663, 999 from product_component where product_id = 1
            """);
        jdbcTemplate.update("""
            delete from product_ingredient
            where component_id in (select id from product_component where product_id = 15)
            """);
        long ingredientId = 1;
        if (containsSkinCaution) {
            ingredientId = 3663;
        }
        jdbcTemplate.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select id, ?, 1 from product_component where product_id = 15
            """, ingredientId);
        add("""
            {"productId": 1, "usageStatus": "IN_USE", "preference": "BAD"}
            """);

        JsonNode response = read(preview(15));
        List<Long> baselineIds = elements(response.get("withoutRating").get("items"))
            .map(item -> item.get("id").asLong()).toList();
        assertThat(baselineIds).contains(3663L);
        assertThat(reasonCodes(response.get("withoutRating").get("items"))).contains("DRY_SKIN");
        if (containsSkinCaution) {
            assertThat(elements(response.get("ratedGood").get("items")).map(item -> item.get("id").asLong()))
                .doesNotContain(3663L);
            assertThat(
                elements(response.get("ratedBadAcrossSkinTypes").get("items"))
                    .filter(item -> item.get("id").asLong() == 3663).findFirst().orElseThrow().get("products").size()
            )
                .isEqualTo(2);
        } else {
            assertThat(response.get("productCautionIngredients").size()).isZero();
            assertThat(response.get("ratedGood").get("items")).isEqualTo(response.get("withoutRating").get("items"));
            assertThat(response.get("ratedBadAcrossSkinTypes").get("items"))
                .isEqualTo(response.get("withoutRating").get("items"));
        }
    }

    @Test
    @DisplayName("잘 맞았어요로 공통 성분이 분석에서 빠져도 제품 자체의 주의 성분에는 남는다")
    void offsetsSuitedIngredientsButKeepsProductCautions() throws Exception {
        jdbcTemplate.update("""
            insert into product_ingredient (component_id, ingredient_id, display_order)
            select id, 4815, 2 from product_component where product_id = 15
            """);
        add("""
            {"productId": 1, "usageStatus": "IN_USE", "preference": "BAD"}
            """);

        preview(15)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.withoutRating.items[*].id").value(hasItems(4815)))
            .andExpect(jsonPath("$.ratedGood.items[?(@.id == 4815)]").isEmpty())
            .andExpect(jsonPath("$.productCautionIngredients[*].id").value(hasItems(4815, 20, 9)))
            .andExpect(
                jsonPath("$.productCautionIngredients[?(@.id == 9)].reasons[*].code")
                    .value(contains("QUICK_EXCLUDE", "SENSITIVE_SKIN"))
            )
            .andExpect(jsonPath("$.productCautionIngredients[?(@.id == 9)].koreanName").isNotEmpty());
    }

    @Test
    @DisplayName("없는 제품이면 404, 제품을 빠뜨리면 400, 로그인하지 않으면 401 로 응답한다")
    void rejectsInvalidMemberPreview() throws Exception {
        preview(999999999)
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        mockMvc.perform(get(PREVIEW_PATH).with(signedIn()))
            .andExpect(status().isBadRequest());
        mockMvc.perform(get(PREVIEW_PATH).param("productId", "15"))
            .andExpect(status().isUnauthorized());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "not-a-number"})
    @DisplayName("회원 미리보기의 잘못된 제품 ID는 쿼리 오류로 거절한다")
    void rejectsInvalidMemberProductId(String productId) throws Exception {
        mockMvc.perform(get(PREVIEW_PATH).with(signedIn()).param("productId", productId))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    private String preferenceJson(String preference) {
        return mapper.writeValueAsString(preference);
    }

    private List<String> reasonCodes(JsonNode ingredients) {
        return elements(ingredients)
            .flatMap(ingredient -> elements(ingredient.get("reasons")))
            .map(reason -> reason.get("code").asString())
            .distinct()
            .toList();
    }

    private Stream<JsonNode> elements(JsonNode array) {
        return StreamSupport.stream(array.spliterator(), false);
    }

    private void add(String body) throws Exception {
        mockMvc.perform(post(PRODUCTS_PATH).with(signedIn()).contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated());
    }

    private ResultActions preview(long productId) throws Exception {
        return mockMvc.perform(get(PREVIEW_PATH).with(signedIn()).param("productId", String.valueOf(productId)));
    }

    private JsonNode analysis() throws Exception {
        return read(mockMvc.perform(get(ANALYSIS_PATH).with(signedIn())));
    }

    private JsonNode read(ResultActions result) throws Exception {
        return mapper.readTree(
            result.andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
        );
    }

    private RequestPostProcessor signedIn() {
        return authentication(new LoginMember(user.id()).toAuthentication());
    }
}
