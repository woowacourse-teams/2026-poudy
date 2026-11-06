package com.poudy.shelf.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
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
@DisplayName("비로그인 선반 API")
class GuestShelfControllerTest {

    private static final String GUEST_ANALYSIS_PATH = "/api/shelf/ingredient-analysis";
    private static final String IMPORT_PATH = "/api/users/me/shelf/products/import";
    private static final String MEMBER_PRODUCTS_PATH = "/api/users/me/shelf/products";
    private static final String MEMBER_ANALYSIS_PATH = "/api/users/me/shelf/ingredient-analysis";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("로그인하지 않아도 보낸 평가로 성분 분석과 안 맞을 수 있는 제품을 계산한다")
    void analyzesGuestRatingsWithoutLogin() throws Exception {
        analyze("""
            {"items": [
              {"productId": 15, "preference": "BAD"},
              {"productId": 1, "preference": "BAD"},
              {"productId": 13, "preference": null}
            ]}
            """)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.badProductCount").value(2))
            .andExpect(jsonPath("$.items[*].id").value(contains(20, 4815, 9)))
            .andExpect(jsonPath("$.items[0].products[*].id").value(contains(15)))
            .andExpect(jsonPath("$.items[*].inFilter").value(contains(false, false, false)))
            .andExpect(jsonPath("$.items[*].isNew").value(contains(false, false, false)))
            .andExpect(jsonPath("$.possiblyUnsuitableProductIds").value(contains(15, 1, 13)));
    }

    @Test
    @DisplayName("피부 정보가 없으므로 건성·지성·민감성 주의 성분을 모두 후보로 두고 근거를 나눠 준다")
    void analyzesEverySkinCautionWithReasons() throws Exception {
        jdbcTemplate.update(
            "insert into ingredient (id, korean_name, english_name, description, updated_at)"
                + " values (3663, '포타슘코코에이트', 'Potassium Cocoate', '비누 성분', now())"
        );
        jdbcTemplate.update(
            "insert into product_ingredient (component_id, ingredient_id, display_order)"
                + " select id, 3663, 2 from product_component where product_id = 15"
        );

        analyze("""
            {"items": [{"productId": 15, "preference": "BAD"}]}
            """)
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.badProductCount").value(1))
            .andExpect(jsonPath("$.items[?(@.id == 3663)].reasons[*].code").value(contains("DRY_SKIN")))
            .andExpect(
                jsonPath("$.items[?(@.id == 9)].reasons[*].code").value(contains("QUICK_EXCLUDE", "SENSITIVE_SKIN"))
            )
            .andExpect(
                jsonPath("$.items[?(@.id == 20)].reasons[*].code").value(contains("QUICK_EXCLUDE", "SENSITIVE_SKIN"))
            );
    }

    @Test
    @DisplayName("잘 맞았어요로 평가한 제품에도 든 성분은 회원 선반처럼 후보에서 뺀다")
    void offsetsIngredientsBySuitedProducts() throws Exception {
        analyze("""
            {"items": [
              {"productId": 15, "preference": "BAD"},
              {"productId": 1, "preference": "BAD"},
              {"productId": 7, "preference": "GOOD"}
            ]}
            """)
            .andExpect(jsonPath("$.items[*].id").value(contains(20, 9)));
    }

    @Test
    @DisplayName("같은 제품이 두 번 오거나 없는 제품이면 400 으로 거절한다")
    void rejectsInvalidItems() throws Exception {
        analyze("""
            {"items": [{"productId": 15, "preference": "BAD"}, {"productId": 15, "preference": "GOOD"}]}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));

        analyze("""
            {"items": [{"productId": 999999999, "preference": "BAD"}]}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
    }

    @Test
    @DisplayName("옮길 항목의 담은 시각이 서버 시각보다 늦으면 지금 담은 것으로 둔다")
    void clampsFutureRegisteredAt() throws Exception {
        User user = signUp();
        importGuestShelf(user, """
            {"items": [{"productId": 15, "usageStatus": "IN_USE", "registeredAt": "2999-01-01T10:00:00+09:00"}]}
            """).andExpect(status().isNoContent());

        mockMvc.perform(get(MEMBER_PRODUCTS_PATH).with(signedIn(user)))
            .andExpect(jsonPath("$.items[0].registeredAt").value(startsWith("20")))
            .andExpect(jsonPath("$.items[0].registeredAt").value(not(startsWith("2999"))));
    }

    @Test
    @DisplayName("선반 제품 검색 제안은 로그인하지 않아도 쓸 수 있다")
    void suggestsProductsWithoutLogin() throws Exception {
        mockMvc.perform(get("/api/shelf/product-suggestions").param("keyword", "토너"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isArray());
    }

    @Test
    @DisplayName("로그인하면 비로그인 선반을 담은 시각 순서대로 옮기고, 이미 담긴 제품은 회원 쪽을 남긴다")
    void importsGuestShelf() throws Exception {
        User user = signUp();
        mockMvc.perform(
            post(MEMBER_PRODUCTS_PATH).with(signedIn(user)).contentType(MediaType.APPLICATION_JSON).content("""
                {"productId": 1, "usageStatus": "IN_USE", "preference": "GOOD"}
                """)
        ).andExpect(status().isCreated());

        mockMvc.perform(
            post(MEMBER_PRODUCTS_PATH).with(signedIn(user)).contentType(MediaType.APPLICATION_JSON).content("""
                {"productId": 7, "usageStatus": "USED"}
                """)
        ).andExpect(status().isCreated());

        importGuestShelf(
            user,
            """
                {"items": [
                  {"productId": 15, "usageStatus": "IN_USE", "preference": "BAD", "registeredAt": "2026-11-01T10:00:00+09:00"},
                  {"productId": 13, "usageStatus": "USED", "registeredAt": "2026-11-02T10:00:00+09:00"},
                  {"productId": 1, "usageStatus": "USED", "preference": "BAD", "registeredAt": "2026-11-03T10:00:00+09:00"}
                ]}
                """
        ).andExpect(status().isNoContent());

        mockMvc.perform(get(MEMBER_PRODUCTS_PATH).with(signedIn(user)))
            .andExpect(jsonPath("$.items[*].product.id").value(contains(1, 7, 13, 15)))
            .andExpect(jsonPath("$.items[0].usageStatus").value("IN_USE"))
            .andExpect(jsonPath("$.items[0].rating.preference").value("GOOD"))
            .andExpect(jsonPath("$.items[1].usageStatus").value("USED"))
            .andExpect(jsonPath("$.items[2].usageStatus").value("USED"))
            .andExpect(jsonPath("$.items[3].rating.preference").value("BAD"))
            .andExpect(jsonPath("$.items[3].registeredAt").value("2026-11-01T10:00:00+09:00"));
        mockMvc.perform(get(MEMBER_ANALYSIS_PATH).with(signedIn(user)))
            .andExpect(jsonPath("$.badProductCount").value(1))
            .andExpect(jsonPath("$.items").isNotEmpty())
            .andExpect(jsonPath("$.items[*].isNew").value(everyItem(is(true))));
    }

    @Test
    @DisplayName("로그인하지 않으면 비로그인 선반을 옮길 수 없다")
    void rejectsImportWithoutLogin() throws Exception {
        mockMvc.perform(post(IMPORT_PATH).contentType(MediaType.APPLICATION_JSON).content("""
            {"items": []}
            """))
            .andExpect(status().isUnauthorized());
    }

    private ResultActions analyze(String body) throws Exception {
        return mockMvc.perform(post(GUEST_ANALYSIS_PATH).contentType(MediaType.APPLICATION_JSON).content(body));
    }

    private ResultActions importGuestShelf(User user, String body) throws Exception {
        return mockMvc.perform(
            post(IMPORT_PATH).with(signedIn(user)).contentType(MediaType.APPLICATION_JSON).content(body)
        );
    }

    private User signUp() {
        return userRepository.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "8765", "guest@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow();
    }

    private RequestPostProcessor signedIn(User user) {
        return authentication(new LoginMember(user.id()).toAuthentication());
    }
}
