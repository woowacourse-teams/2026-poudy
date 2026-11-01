package com.poudy.product.controller;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.myfilter.repository.MyFilterRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginChannel;
import com.poudy.security.session.LoginSession;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql("/db/search-test-data.sql")
@DisplayName("회원별 추천 제품 나만의 필터 성분 포함 여부")
class UserProductSimilarityTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private UserRepository users;
    @Autowired
    private MyFilterRepository myFilter;
    @Autowired
    private LoginSession loginSession;
    private long userId;

    @BeforeEach
    void setUp() {
        jdbc.update("""
            insert into product_component (id, product_id, display_order, name) overriding system value
            select id, id, 0, '1제' from product where id between 90001 and 90008
            """);
        jdbc.update("""
            insert into product_component (id, product_id, display_order, name) overriding system value
            values (91001, 90001, 1, '2제')
            """);
        jdbc.update(
            "insert into product_ingredient (component_id, ingredient_id, display_order) values (90003, 90001, 0)"
        );
        userId = users
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "similar", "similar@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow()
            .id();
    }

    @Test
    @DisplayName("추천 제품마다 대상 구성품에 나만의 필터 성분이 들었는지 준다")
    void marksSimilarProductsContainingMyFilterIngredient() throws Exception {
        match(90001, 90002, 0.8);
        match(90001, 90003, 0.7);
        myFilter.add(userId, List.of(90001L));

        mockMvc.perform(get("/api/users/me/products/90001").session(signedInSession()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.similarProducts[*].id", contains(90002, 90003)))
            .andExpect(jsonPath("$.similarProducts[*].containsMyFilterIngredient", contains(false, true)));
    }

    @Test
    @DisplayName("나만의 필터가 비어 있으면 모든 추천 제품이 포함하지 않음이다")
    void emptyMyFilter() throws Exception {
        match(90001, 90003, 0.7);

        mockMvc.perform(get("/api/users/me/products/90001").session(signedInSession()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.similarProducts[*].containsMyFilterIngredient", contains(false)));
    }

    @Test
    @DisplayName("partId 로 고른 구성품의 추천 제품을 기준으로 한다")
    void usesSelectedPart() throws Exception {
        match(90001, 90002, 0.8);
        match(91001, 90003, 0.7);

        mockMvc.perform(get("/api/users/me/products/90001").param("partId", "91001").session(signedInSession()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.similarProducts[*].id", contains(90003)));
    }

    @Test
    @DisplayName("제품에 없는 구성품을 고르면 404이다")
    void missingPart() throws Exception {
        mockMvc.perform(get("/api/users/me/products/90001").param("partId", "90002").session(signedInSession()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_PART_NOT_FOUND"));
    }

    private void match(long source, long target, double score) {
        jdbc.update("insert into product_similarity values (?, ?, ?)", source, target, score);
    }

    private MockHttpSession signedInSession() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        loginSession.signIn(userId, LoginChannel.WEB, request, new MockHttpServletResponse());
        SecurityContextHolder.clearContext();
        return (MockHttpSession) request.getSession();
    }
}
