package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.User;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
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
@Sql("/db/related-keyword-test-data.sql")
@DisplayName("연관검색어와 선반 검색 제안 API")
class RelatedKeywordsApiTest {
    private static final String RELATED = "/api/products/related-keywords";
    private static final String SHELF = "/api/users/me/shelf/product-suggestions";
    private final ObjectMapper mapper = new ObjectMapper();
    @Autowired
    private MockMvc mvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    @DisplayName("제품명 5개와 실제 강조 구간만 제공하며 전체 개수와 요청 limit는 받지 않는다")
    void returnsMatchesWithoutCount() throws Exception {
        mvc.perform(get(RELATED).param("keyword", "연관토너").param("limit", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalElements").doesNotExist())
            .andExpect(jsonPath("$.items.length()").value(5))
            .andExpect(jsonPath("$.items[0].keyword").value("수분 연관토너"))
            .andExpect(jsonPath("$.items[0].matches.length()").value(1))
            .andExpect(jsonPath("$.items[0].matches[0].startIndex").value(3))
            .andExpect(jsonPath("$.items[0].matches[0].endIndexExclusive").value(7));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   "})
    @DisplayName("기존 KeywordRequest와 같은 입력 검증을 적용한다")
    void validatesKeyword(String keyword) throws Exception {
        mvc.perform(get(RELATED).param("keyword", keyword)).andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"---", "😀"})
    @DisplayName("정규화하면 비는 입력은 빈 목록을 반환한다")
    void normalizedEmptyKeyword(String keyword) throws Exception {
        mvc.perform(get(RELATED).param("keyword", keyword)).andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    @DisplayName("검색어가 없거나 너무 길면 거절한다")
    void requiresValidKeyword() throws Exception {
        mvc.perform(get(RELATED)).andExpect(status().isBadRequest());
        mvc.perform(get(RELATED).param("keyword", "가".repeat(101))).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("긴 공백 입력도 제품명으로 매칭하고 원문의 위치를 반환한다")
    void matchesSpacedInput() throws Exception {
        String keyword = "수분" + " ".repeat(94) + "연관토너";
        mvc.perform(get(RELATED).param("keyword", keyword))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].keyword").value("수분 연관토너"))
            .andExpect(jsonPath("$.items[0].matches[0].startIndex").value(0))
            .andExpect(jsonPath("$.items[0].matches[0].endIndexExclusive").value(7));
    }

    @Test
    @DisplayName("검색어로 다시 입력할 수 없는 긴 제품명은 UTF-16 길이로 제외한다")
    void excludesNamesBeyondApiLengthLimit() throws Exception {
        jdbc.update("update product set product_name = ? where id = 91013", "😀".repeat(49) + "연관독점");
        jdbc.execute("refresh materialized view product_search_document");

        mvc.perform(get(RELATED).param("keyword", "연관독점"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    @DisplayName("선반 제품 제안은 같은 페이지의 기존 제품 제안 응답을 유지한다")
    void shelfReusesSuggestions() throws Exception {
        User user = users
            .save(UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "related-test", "test@example.com", true)));
        for (int page : new int[] {1, 2, 100}) {
            String existing = mvc.perform(
                get("/api/products/suggestions")
                    .param("keyword", "연관토너").param("page", String.valueOf(page)).param("size", "2")
            )
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            String shelf = mvc.perform(
                get(SHELF).with(authentication(new LoginMember(user.id()).toAuthentication()))
                    .param("keyword", "연관토너").param("page", String.valueOf(page)).param("size", "2")
            )
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
            assertThat(mapper.readTree(shelf)).isEqualTo(mapper.readTree(existing));
        }
    }

    @Test
    @DisplayName("선반 제품 제안은 다른 선반 API와 같은 비로그인 오류를 반환한다")
    void shelfRequiresLogin() throws Exception {
        String existing = mvc.perform(get("/api/users/me/shelf/products"))
            .andExpect(status().isUnauthorized()).andReturn().getResponse().getContentAsString();
        String suggested = mvc.perform(get(SHELF).param("keyword", "연관토너"))
            .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
            .andReturn().getResponse().getContentAsString();
        JsonNode existingError = mapper.readTree(existing);
        JsonNode suggestedError = mapper.readTree(suggested);
        for (String field : new String[] {"status", "code", "title", "detail"}) {
            assertThat(suggestedError.get(field)).isEqualTo(existingError.get(field));
        }
    }
}
