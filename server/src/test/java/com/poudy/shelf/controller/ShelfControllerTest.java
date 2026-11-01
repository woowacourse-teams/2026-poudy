package com.poudy.shelf.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import org.hamcrest.Matcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("선반 API")
class ShelfControllerTest {

    private static final String PATH = "/api/users/me/shelf";
    private static final String PRODUCTS_PATH = PATH + "/products";
    private static final String ANALYSIS_PATH = PATH + "/ingredient-analysis";

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
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "user@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow();
    }

    @Test
    @DisplayName("담은 제품을 201 로 돌려주고 평가는 비워 둘 수 있다")
    void addsProductWithOptionalRating() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD", "moistureLevel": 1.5, "oilLevel": null}
            """)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.product.id").value(15L))
            .andExpect(jsonPath("$.product.name").value("PH 컨디션 토너"))
            .andExpect(jsonPath("$.product.brandName").isString())
            .andExpect(jsonPath("$.product.imageUrl").isString())
            .andExpect(jsonPath("$.usageStatus").value("IN_USE"))
            .andExpect(jsonPath("$.rating.preference").value("BAD"))
            .andExpect(jsonPath("$.rating.moistureLevel").value(1.5))
            .andExpect(jsonPath("$.rating.oilLevel").value(nullValue()))
            .andExpect(jsonPath("$.possiblyUnsuitable").value(true))
            .andExpect(jsonPath("$.registeredAt").isString());

        add("""
            {"productId": 1, "usageStatus": "USED"}
            """)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.rating.preference").value(nullValue()))
            .andExpect(jsonPath("$.rating.moistureLevel").value(nullValue()))
            .andExpect(jsonPath("$.possiblyUnsuitable").value(false));
    }

    @Test
    @DisplayName("평가와 상관없이 안 맞을 수 있는 성분이 든 선반 제품을 표시한다")
    void marksPossiblyUnsuitableProducts() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD"}
            """).andExpect(status().isCreated());
        add("""
            {"productId": 13, "usageStatus": "IN_USE"}
            """).andExpect(status().isCreated());

        mockMvc.perform(get(PRODUCTS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].product.id").value(contains(13, 15)))
            .andExpect(jsonPath("$.items[*].possiblyUnsuitable").value(contains(false, true)));

        add("""
            {"productId": 1, "usageStatus": "USED", "preference": "BAD"}
            """).andExpect(status().isCreated());

        mockMvc.perform(get(PRODUCTS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].product.id").value(contains(1, 13, 15)))
            .andExpect(jsonPath("$.items[*].possiblyUnsuitable").value(contains(true, true, true)));
    }

    @Test
    @DisplayName("선반 전부를 최근 등록순으로 주고 사용 상태 탭별 개수를 함께 준다")
    void findsShelfWithUsageCounts() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "USED", "preference": "GOOD"}
            """).andExpect(status().isCreated());
        add("""
            {"productId": 1, "usageStatus": "IN_USE"}
            """).andExpect(status().isCreated());
        jdbcTemplate.update(
            "update user_shelf_product set created_at = created_at - interval '1 minute' where product_id = 15"
        );

        mockMvc.perform(get(PRODUCTS_PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.usages.length()").value(3))
            .andExpect(jsonPath("$.usages[0].code").value("ALL"))
            .andExpect(jsonPath("$.usages[0].name").value("전체"))
            .andExpect(jsonPath("$.usages[0].count").value(2))
            .andExpect(jsonPath("$.usages[1].code").value("IN_USE"))
            .andExpect(jsonPath("$.usages[1].name").value("사용 중"))
            .andExpect(jsonPath("$.usages[1].count").value(1))
            .andExpect(jsonPath("$.usages[2].code").value("USED"))
            .andExpect(jsonPath("$.usages[2].name").value("사용했던"))
            .andExpect(jsonPath("$.usages[2].count").value(1))
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].product.id").value(1L))
            .andExpect(jsonPath("$.items[0].usageStatus").value("IN_USE"))
            .andExpect(jsonPath("$.items[1].product.id").value(15L))
            .andExpect(jsonPath("$.items[1].usageStatus").value("USED"));

    }

    @Test
    @DisplayName("이미 담은 제품은 400 SHELF_PRODUCT_ALREADY_EXISTS 로 거절한다")
    void rejectsDuplicateProduct() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE"}
            """).andExpect(status().isCreated());

        add("""
            {"productId": 15, "usageStatus": "USED"}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("SHELF_PRODUCT_ALREADY_EXISTS"));
        assertThat(shelfCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("없는 제품, 빠진 필수 값, 0.5 단위가 아닌 평가는 400 INVALID_REQUEST_BODY 로 거절한다")
    void rejectsInvalidAddRequest() throws Exception {
        add("""
            {"productId": 999, "usageStatus": "IN_USE"}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        add("""
            {"productId": 15}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "moistureLevel": 1.2}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        assertThat(shelfCount()).isZero();
    }

    @Test
    @DisplayName("수정은 사용 상태와 평가를 통째로 바꾸고 바뀐 선반 제품을 돌려준다")
    void updatesProduct() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "GOOD", "moistureLevel": 2, "oilLevel": 1}
            """).andExpect(status().isCreated());

        mockMvc.perform(
            put(PRODUCTS_PATH + "/15").with(signedIn())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"usageStatus": "USED", "preference": "BAD"}
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.product.id").value(15L))
            .andExpect(jsonPath("$.usageStatus").value("USED"))
            .andExpect(jsonPath("$.rating.preference").value("BAD"))
            .andExpect(jsonPath("$.rating.moistureLevel").value(nullValue()))
            .andExpect(jsonPath("$.rating.oilLevel").value(nullValue()));
    }

    @Test
    @DisplayName("선반에 없는 제품은 404 SHELF_PRODUCT_NOT_FOUND 로 수정을 거절한다")
    void rejectsUpdatingMissingProduct() throws Exception {
        mockMvc.perform(
            put(PRODUCTS_PATH + "/15").with(signedIn())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"usageStatus": "USED"}
                    """)
        )
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("SHELF_PRODUCT_NOT_FOUND"));
    }

    @Test
    @DisplayName("선반에서 빼기는 없는 제품이어도 204 로 성공한다")
    void removesIdempotently() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE"}
            """).andExpect(status().isCreated());

        mockMvc.perform(delete(PRODUCTS_PATH + "/15").with(signedIn())).andExpect(status().isNoContent());
        mockMvc.perform(delete(PRODUCTS_PATH + "/15").with(signedIn())).andExpect(status().isNoContent());
        assertThat(shelfCount()).isZero();
    }

    @Test
    @DisplayName("뺀 제품은 선반 조회와 제품 상세에서 빠지고 수정할 수 없으며, 행은 뺀 시각만 남긴다")
    void removesSoftly() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "GOOD"}
            """).andExpect(status().isCreated());
        add("""
            {"productId": 1, "usageStatus": "IN_USE"}
            """).andExpect(status().isCreated());

        mockMvc.perform(delete(PRODUCTS_PATH + "/15").with(signedIn())).andExpect(status().isNoContent());

        mockMvc.perform(get(PRODUCTS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].product.id").value(contains(1)))
            .andExpect(jsonPath("$.usages[0].count").value(1));
        mockMvc.perform(get("/api/users/me/products/15").with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.shelved").value(false));
        mockMvc.perform(
            put(PRODUCTS_PATH + "/15").with(signedIn())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"usageStatus": "USED"}
                    """)
        ).andExpect(status().isNotFound());
        assertThat(shelfCount()).isEqualTo(1);
        assertThat(storedCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("뺀 제품을 되돌리면 사용 상태와 평가, 담은 시각 그대로 원래 자리로 돌아간다")
    void restoresRemovedProductToItsPlace() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "USED", "preference": "GOOD", "moistureLevel": 1.5}
            """).andExpect(status().isCreated());
        add("""
            {"productId": 1, "usageStatus": "IN_USE"}
            """).andExpect(status().isCreated());
        jdbcTemplate.update(
            "update user_shelf_product set created_at = created_at - interval '1 minute' where product_id = 15"
        );
        mockMvc.perform(delete(PRODUCTS_PATH + "/15").with(signedIn())).andExpect(status().isNoContent());

        restore(15).andExpect(status().isNoContent());

        mockMvc.perform(get(PRODUCTS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].product.id").value(contains(1, 15)))
            .andExpect(jsonPath("$.items[1].usageStatus").value("USED"))
            .andExpect(jsonPath("$.items[1].rating.preference").value("GOOD"))
            .andExpect(jsonPath("$.items[1].rating.moistureLevel").value(1.5));
    }

    @Test
    @DisplayName("뺀 제품을 다시 담으면 요청한 사용 상태와 평가로 지금 담은 것으로 둔다")
    void addsRemovedProductAsNew() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "USED", "preference": "GOOD"}
            """).andExpect(status().isCreated());
        add("""
            {"productId": 1, "usageStatus": "IN_USE"}
            """).andExpect(status().isCreated());
        jdbcTemplate.update(
            "update user_shelf_product set created_at = created_at - interval '1 minute' where user_id = ?",
            user.id()
        );
        mockMvc.perform(delete(PRODUCTS_PATH + "/15").with(signedIn())).andExpect(status().isNoContent());

        add("""
            {"productId": 15, "usageStatus": "IN_USE"}
            """)
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.usageStatus").value("IN_USE"))
            .andExpect(jsonPath("$.rating.preference").value(nullValue()));

        mockMvc.perform(get(PRODUCTS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].product.id").value(contains(15, 1)));
        assertThat(storedCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("선반에 있는 제품을 되돌리면 204 로 그대로 둔다")
    void keepsShelvedProductOnRestore() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "USED", "preference": "GOOD"}
            """).andExpect(status().isCreated());

        restore(15).andExpect(status().isNoContent());

        mockMvc.perform(get(PRODUCTS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].product.id").value(contains(15)))
            .andExpect(jsonPath("$.items[0].rating.preference").value("GOOD"));
    }

    @Test
    @DisplayName("담은 적 없는 제품은 404 SHELF_PRODUCT_NOT_FOUND 로 되돌리기를 거절한다")
    void rejectsRestoringUnknownProduct() throws Exception {
        restore(15)
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("SHELF_PRODUCT_NOT_FOUND"));
        assertThat(storedCount()).isZero();
    }

    @Test
    @DisplayName("되돌리면 성분 분석을 다시 계산한다")
    void refreshesAnalysisOnRestore() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD"}
            """).andExpect(status().isCreated());
        mockMvc.perform(delete(PRODUCTS_PATH + "/15").with(signedIn())).andExpect(status().isNoContent());
        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn())).andExpect(jsonPath("$.items").isEmpty());

        restore(15).andExpect(status().isNoContent());

        expectAnalysis(contains(20, 9), contains(true, true));
    }

    @Test
    @DisplayName("성분 분석은 안 맞은 제품에 든 주의 성분을 점수 순으로 주고, 잘 맞은 제품으로 상쇄된 성분은 뺀다")
    void analyzesIngredients() throws Exception {
        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.badProductCount").value(0))
            .andExpect(jsonPath("$.items.length()").value(0));

        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD"}
            """).andExpect(status().isCreated());
        add("""
            {"productId": 1, "usageStatus": "USED", "preference": "BAD"}
            """).andExpect(status().isCreated());
        jdbcTemplate.update(
            "insert into user_my_filter_ingredient (user_id, ingredient_id) values (?, 20)",
            user.id()
        );

        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.badProductCount").value(2))
            .andExpect(jsonPath("$.items[*].id").value(contains(20, 4815, 9)))
            .andExpect(jsonPath("$.items[0].koreanName").value("리모넨"))
            .andExpect(jsonPath("$.items[0].formulationRoles[*].code").value(contains("PERFUMING")))
            .andExpect(jsonPath("$.items[0].groupCodes").value(contains("FRAGRANCE_ALLERGENS")))
            .andExpect(jsonPath("$.items[0].products[*].id").value(contains(15)))
            .andExpect(jsonPath("$.items[0].products[0].name").value("PH 컨디션 토너"))
            .andExpect(jsonPath("$.items[0].products[0].imageUrl").isString())
            .andExpect(jsonPath("$.items[0].inFilter").value(true))
            .andExpect(jsonPath("$.items[1].products[*].id").value(contains(1)))
            .andExpect(jsonPath("$.items[1].inFilter").value(false));

        add("""
            {"productId": 7, "usageStatus": "IN_USE", "preference": "GOOD"}
            """).andExpect(status().isCreated());

        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(contains(20, 9)));
    }

    @Test
    @DisplayName("평가가 바뀌어 직전 결과에 없던 성분이 생기면 새 성분으로 표시하고, 필터에 있는 성분은 표시하지 않는다")
    void marksNewIngredients() throws Exception {
        jdbcTemplate.update(
            "insert into user_my_filter_ingredient (user_id, ingredient_id) values (?, 20)",
            user.id()
        );
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD"}
            """).andExpect(status().isCreated());

        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].id").value(contains(20, 9)))
            .andExpect(jsonPath("$.items[*].isNew").value(contains(false, true)));

        add("""
            {"productId": 1, "usageStatus": "USED", "preference": "BAD"}
            """).andExpect(status().isCreated());
        mockMvc.perform(put(PRODUCTS_PATH + "/15").with(signedIn()).contentType(MediaType.APPLICATION_JSON).content("""
            {"usageStatus": "IN_USE", "preference": "BAD", "moistureLevel": 2}
            """)).andExpect(status().isOk());

        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].id").value(contains(20, 4815, 9)))
            .andExpect(jsonPath("$.items[*].isNew").value(contains(false, true, false)));

        mockMvc.perform(delete(PRODUCTS_PATH + "/1").with(signedIn())).andExpect(status().isNoContent());

        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].id").value(contains(20, 9)))
            .andExpect(jsonPath("$.items[*].isNew").value(contains(false, false)));
    }

    @Test
    @DisplayName("제품을 담거나 빼거나 호불호를 바꾸면 이전 새 성분 표시를 지우고 직전 결과에 없던 성분에만 표시한다")
    void remarksNewIngredientsOnRatingChanges() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD"}
            """).andExpect(status().isCreated());
        expectAnalysis(contains(20, 9), contains(true, true));

        add("""
            {"productId": 1, "usageStatus": "USED"}
            """).andExpect(status().isCreated());
        expectAnalysis(contains(20, 9), contains(false, false));

        updateProduct(1, """
            {"usageStatus": "USED", "preference": "BAD"}
            """);
        expectAnalysis(contains(20, 4815, 9), contains(false, true, false));

        updateProduct(1, """
            {"usageStatus": "USED"}
            """);
        expectAnalysis(contains(20, 9), contains(false, false));

        updateProduct(1, """
            {"usageStatus": "USED", "preference": "BAD"}
            """);
        mockMvc.perform(delete(PRODUCTS_PATH + "/15").with(signedIn())).andExpect(status().isNoContent());
        expectAnalysis(contains(4815), contains(false));
    }

    @Test
    @DisplayName("사용 상태나 수분감·유분감만 바꾸거나 선반에 없는 제품을 빼면 새 성분 표시를 유지한다")
    void keepsNewIngredientsWithoutRatingChanges() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD"}
            """).andExpect(status().isCreated());

        updateProduct(15, """
            {"usageStatus": "USED", "preference": "BAD", "moistureLevel": 1, "oilLevel": 2.5}
            """);
        mockMvc.perform(delete(PRODUCTS_PATH + "/1").with(signedIn())).andExpect(status().isNoContent());

        expectAnalysis(contains(20, 9), contains(true, true));
    }

    @Test
    @DisplayName("피부 타입과 민감성에 따른 주의 성분은 후보에 더하고 같은 조건의 다른 성분보다 앞에 둔다")
    void addsSkinTypeCautions() throws Exception {
        jdbcTemplate.update(
            "insert into ingredient (id, korean_name, english_name, description, updated_at)"
                + " values (3663, '포타슘코코에이트', 'Potassium Cocoate', '비누 성분', now())"
        );
        jdbcTemplate.update(
            "insert into product_ingredient (component_id, ingredient_id, display_order)"
                + " select id, 3663, 2 from product_component where product_id = 15"
        );
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD"}
            """).andExpect(status().isCreated());

        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].id").value(contains(20, 9)));

        jdbcTemplate.update("update \"user\" set skin_type = 'DRY' where id = ?", user.id());

        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].id").value(contains(3663, 20, 9)));

        jdbcTemplate.update("update \"user\" set is_sensitive_skin = true where id = ?", user.id());

        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(jsonPath("$.items[*].id").value(contains(20, 9, 3663)));
    }

    @Test
    @DisplayName("회원 세션이 없으면 401, 관리자 세션이면 403 으로 거절한다")
    void requiresUserSession() throws Exception {
        mockMvc.perform(get(PRODUCTS_PATH)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(PRODUCTS_PATH).with(authentication(new LoginAdmin("admin").toAuthentication())))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("회원 행을 지우면 선반도 함께 지운다")
    void deletesShelfWithUser() throws Exception {
        add("""
            {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD"}
            """).andExpect(status().isCreated());

        jdbcTemplate.update("delete from \"user\" where id = ?", user.id());

        assertThat(storedCount()).isZero();
        assertThat(
            jdbcTemplate.queryForObject(
                "select count(*) from user_shelf_analysis_ingredient where user_id = ?",
                Integer.class,
                user.id()
            )
        ).isZero();
    }

    private ResultActions add(String body) throws Exception {
        return mockMvc.perform(
            post(PRODUCTS_PATH).with(signedIn()).contentType(MediaType.APPLICATION_JSON).content(body)
        );
    }

    private ResultActions restore(long productId) throws Exception {
        return mockMvc.perform(post(PRODUCTS_PATH + "/" + productId + "/restore").with(signedIn()));
    }

    private void updateProduct(long productId, String body) throws Exception {
        mockMvc.perform(
            put(PRODUCTS_PATH + "/" + productId).with(signedIn()).contentType(MediaType.APPLICATION_JSON).content(body)
        ).andExpect(status().isOk());
    }

    private void expectAnalysis(Matcher<?> ingredientIds, Matcher<?> newFlags) throws Exception {
        mockMvc.perform(get(ANALYSIS_PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(ingredientIds))
            .andExpect(jsonPath("$.items[*].isNew").value(newFlags));
    }

    private RequestPostProcessor signedIn() {
        return authentication(new LoginMember(user.id()).toAuthentication());
    }

    private Integer shelfCount() {
        return jdbcTemplate.queryForObject(
            "select count(*) from user_shelf_product where user_id = ? and deleted_at is null",
            Integer.class,
            user.id()
        );
    }

    private Integer storedCount() {
        return jdbcTemplate.queryForObject(
            "select count(*) from user_shelf_product where user_id = ?",
            Integer.class,
            user.id()
        );
    }
}
