package com.poudy.skinfilter.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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
@DisplayName("나만의 필터 API")
class SkinFilterControllerTest {

    private static final String PATH = "/api/users/me/skin-filter";
    private static final String INGREDIENTS_PATH = PATH + "/ingredients";

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
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "4321", "user@example.com", true))
        );
    }

    @Test
    @DisplayName("담은 성분을 최근 추가순으로 이름과 태그와 함께 돌려준다")
    void findsIngredientsByRecentAddition() throws Exception {
        add("""
            {"ingredientIds": [9]}
            """).andExpect(status().isNoContent());
        add("""
            {"ingredientIds": [20]}
            """).andExpect(status().isNoContent());
        jdbcTemplate.update(
            "update user_skin_filter_ingredient set created_at = created_at - interval '1 minute' where ingredient_id = 9"
        );

        mockMvc.perform(get(PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(20L))
            .andExpect(jsonPath("$.items[0].koreanName").value("리모넨"))
            .andExpect(jsonPath("$.items[0].formulationRoles").isArray())
            .andExpect(jsonPath("$.items[0].skinEffects").isArray())
            .andExpect(jsonPath("$.items[0].englishName").doesNotExist())
            .andExpect(jsonPath("$.items[1].id").value(9L));
    }

    @Test
    @DisplayName("성분마다 속한 제외 성분군 정보를 주고, 해당하지 않으면 빈 배열을 준다")
    void includesExcludeCodes() throws Exception {
        add("""
            {"ingredientIds": [2]}
            """).andExpect(status().isNoContent());
        add("""
            {"ingredientIds": [20]}
            """).andExpect(status().isNoContent());
        jdbcTemplate.update(
            "update user_skin_filter_ingredient set created_at = created_at - interval '1 minute' where ingredient_id = 2"
        );

        mockMvc.perform(get(PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(20L))
            .andExpect(jsonPath("$.items[0].excludeCodes").value(contains("FRAGRANCE_ALLERGENS")))
            .andExpect(jsonPath("$.items[1].id").value(2L))
            .andExpect(jsonPath("$.items[1].excludeCodes").value(empty()));
    }

    @Test
    @DisplayName("성분별 제외 성분군 코드만 주고 일반 성분군은 제외한다")
    void includesOnlyExcludeCodeValues() throws Exception {
        jdbcTemplate.update(
            "insert into ingredient_group (code, display_name, description) values ('TEST_GENERAL', '일반 성분군', '일반 설명')"
        );
        jdbcTemplate.update(
            "insert into ingredient_group_ingredient (group_code, ingredient_id, display_order)"
                + " values ('TEST_GENERAL', 20, 0), ('HARSH_PRESERVATIVES', 20, 1000)"
        );
        add("""
            {"ingredientIds": [20, 2]}
            """).andExpect(status().isNoContent());
        jdbcTemplate.update(
            "update user_skin_filter_ingredient set created_at = created_at - interval '1 minute' where ingredient_id = 2"
        );

        mockMvc.perform(get(PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(20L))
            .andExpect(
                jsonPath("$.items[0].excludeCodes").value(contains("FRAGRANCE_ALLERGENS", "HARSH_PRESERVATIVES"))
            )
            .andExpect(jsonPath("$.items[0].groupCodes").doesNotExist())
            .andExpect(jsonPath("$.items[0].formulationRoles").isArray())
            .andExpect(jsonPath("$.items[0].skinEffects").isArray())
            .andExpect(jsonPath("$.items[1].id").value(2L))
            .andExpect(jsonPath("$.items[1].excludeCodes").value(empty()));
    }

    @Test
    @DisplayName("담은 성분이 없으면 빈 목록을 준다")
    void findsEmptyFilter() throws Exception {
        mockMvc.perform(get(PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").value(empty()));
    }

    @Test
    @DisplayName("이미 있는 성분을 다시 더하거나 없는 성분을 빼도 204 로 그대로 둔다")
    void addsAndRemovesIdempotently() throws Exception {
        add("""
            {"ingredientIds": [9, 20]}
            """).andExpect(status().isNoContent());
        add("""
            {"ingredientIds": [9]}
            """).andExpect(status().isNoContent());
        assertThat(filterCount()).isEqualTo(2);

        mockMvc.perform(delete(INGREDIENTS_PATH).with(signedIn()).param("ingredientIds", "9", "2"))
            .andExpect(status().isNoContent());
        mockMvc.perform(delete(INGREDIENTS_PATH).with(signedIn()).param("ingredientIds", "9"))
            .andExpect(status().isNoContent());
        assertThat(filterCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("없는 성분, 빈 배열, 중복 ID 는 400 으로 거절한다")
    void rejectsInvalidIngredientIds() throws Exception {
        add("""
            {"ingredientIds": [9, 999999]}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        add("""
            {"ingredientIds": []}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        add("""
            {"ingredientIds": [9, 9]}
            """)
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_REQUEST_BODY"));
        mockMvc.perform(delete(INGREDIENTS_PATH).with(signedIn()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
        assertThat(filterCount()).isZero();
    }

    @Test
    @DisplayName("회원 행을 지우면 나만의 필터도 함께 지운다")
    void deletesFilterWithUser() throws Exception {
        add("""
            {"ingredientIds": [9]}
            """).andExpect(status().isNoContent());

        jdbcTemplate.update("delete from \"user\" where id = ?", user.id());

        assertThat(filterCount()).isZero();
    }

    private ResultActions add(String body) throws Exception {
        return mockMvc.perform(
            post(INGREDIENTS_PATH).with(signedIn()).contentType(MediaType.APPLICATION_JSON).content(body)
        );
    }

    private RequestPostProcessor signedIn() {
        return authentication(new LoginMember(user.id()).toAuthentication());
    }

    private Integer filterCount() {
        return jdbcTemplate.queryForObject(
            "select count(*) from user_skin_filter_ingredient where user_id = ?",
            Integer.class,
            user.id()
        );
    }
}
