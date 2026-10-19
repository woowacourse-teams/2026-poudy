package com.poudy.wishlist.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("위시리스트 API")
class WishlistControllerTest {

    private static final String PATH = "/api/users/me/wishlist";
    private static final String PRODUCTS_PATH = PATH + "/products";

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
    @DisplayName("위시리스트 제품을 최근 담은 순으로 ID 와 표시 정보로 돌려준다")
    void findsWishlistByRecentAddition() throws Exception {
        mockMvc.perform(put(PATH + "/products/15").with(signedIn())).andExpect(status().isNoContent());
        mockMvc.perform(put(PATH + "/products/1").with(signedIn())).andExpect(status().isNoContent());
        jdbcTemplate.update(
            "update user_wishlist_product set created_at = created_at - interval '1 minute' where product_id = 15"
        );

        mockMvc.perform(get(PRODUCTS_PATH).with(signedIn()))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(2))
            .andExpect(jsonPath("$.items[0].id").value(1L))
            .andExpect(jsonPath("$.items[0].name").value("블랙 스네일 토너"))
            .andExpect(jsonPath("$.items[1].id").value(15L))
            .andExpect(jsonPath("$.items[1].name").value("PH 컨디션 토너"));
    }

    @Test
    @DisplayName("같은 제품을 다시 담거나 담지 않은 제품을 빼도 204 로 그대로 둔다")
    void addsAndRemovesIdempotently() throws Exception {
        mockMvc.perform(put(PATH + "/products/1").with(signedIn())).andExpect(status().isNoContent());
        mockMvc.perform(put(PATH + "/products/1").with(signedIn())).andExpect(status().isNoContent());
        assertThat(wishlistCount()).isEqualTo(1);

        mockMvc.perform(delete(PATH + "/products/1").with(signedIn())).andExpect(status().isNoContent());
        mockMvc.perform(delete(PATH + "/products/1").with(signedIn())).andExpect(status().isNoContent());
        assertThat(wishlistCount()).isZero();
    }

    @Test
    @DisplayName("없는 제품은 담지 않고 404 로 거절한다")
    void rejectsUnknownProduct() throws Exception {
        mockMvc.perform(put(PATH + "/products/999").with(signedIn()))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        assertThat(wishlistCount()).isZero();
    }

    @Test
    @DisplayName("회원 세션이 없으면 401, 관리자 세션이면 403 으로 거절한다")
    void requiresUserSession() throws Exception {
        mockMvc.perform(get(PRODUCTS_PATH)).andExpect(status().isUnauthorized());
        mockMvc.perform(put(PATH + "/products/1")).andExpect(status().isUnauthorized());
        mockMvc.perform(get(PRODUCTS_PATH).with(authentication(new LoginAdmin("admin").toAuthentication())))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("회원 행을 지우면 위시리스트도 함께 지운다")
    void deletesWishlistWithUser() throws Exception {
        mockMvc.perform(put(PATH + "/products/1").with(signedIn())).andExpect(status().isNoContent());

        jdbcTemplate.update("delete from \"user\" where id = ?", user.id());

        assertThat(wishlistCount()).isZero();
    }

    private RequestPostProcessor signedIn() {
        return authentication(new LoginMember(user.id()).toAuthentication());
    }

    private Integer wishlistCount() {
        return jdbcTemplate.queryForObject(
            "select count(*) from user_wishlist_product where user_id = ?",
            Integer.class,
            user.id()
        );
    }
}
