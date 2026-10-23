package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.myfilter.repository.MyFilterRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginChannel;
import com.poudy.security.session.LoginMember;
import com.poudy.security.session.LoginSession;
import com.poudy.security.session.WebSessionPolicy;
import com.poudy.shelf.domain.Rating;
import com.poudy.shelf.domain.ShelfUsageStatus;
import com.poudy.shelf.repository.ShelfProductRepository;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.wishlist.repository.WishlistProductRepository;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@DisplayName("제품 상세와 회원 저장 상태의 분리")
class ProductDetailSaveStatusTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private UserRepository users;
    @Autowired
    private WishlistProductRepository wishlist;
    @Autowired
    private ShelfProductRepository shelf;
    @Autowired
    private LoginSession loginSession;
    @Autowired
    private MyFilterRepository myFilter;
    @Autowired
    private NamedParameterJdbcTemplate jdbc;
    private long userId;

    @BeforeEach
    void signUp() {
        userId = createUser("detail-save");
    }

    @Test
    @DisplayName("공통 제품 상세에는 저장 상태와 캐시 금지 헤더가 없다")
    void anonymousDetail() throws Exception {
        mockMvc.perform(get("/api/products/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.wishlisted").doesNotExist())
            .andExpect(jsonPath("$.shelved").doesNotExist())
            .andExpect(header().doesNotExist("Cache-Control"));
    }

    @ParameterizedTest
    @CsvSource({"false, false", "true, false", "false, true", "true, true"})
    @DisplayName("회원 본인의 해당 제품 저장함·선반 여부를 각각 반환한다")
    void memberDetail(boolean wishlisted, boolean shelved) throws Exception {
        if (wishlisted) {
            wishlist.save(userId, 1L);
        }
        if (shelved) {
            addToShelf(userId, 1L);
        }
        mockMvc.perform(get("/api/users/me/products/1").session(signedInSession(userId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.wishlisted").value(wishlisted))
            .andExpect(jsonPath("$.shelved").value(shelved))
            .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    @DisplayName("나만의 필터가 비어 있으면 비어 있다고 알리고 안 맞는 성분은 빈 배열이다")
    void emptyMyFilter() throws Exception {
        mockMvc.perform(get("/api/users/me/products/1").session(signedInSession(userId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.myFilterEmpty").value(true))
            .andExpect(jsonPath("$.unsuitableIngredients").isEmpty());
    }

    @Test
    @DisplayName("고른 구성품에 든 나만의 필터 성분만 안 맞는 성분으로 준다")
    void unsuitableIngredients() throws Exception {
        Long partId = firstPartIdOfProduct1();
        List<Long> partIngredientIds = ingredientIdsOf(partId);
        Long ingredientId = partIngredientIds.getFirst();
        myFilter.add(userId, List.of(ingredientId));
        myFilter.add(createUser("detail-filter-other"), List.of(partIngredientIds.getLast()));

        mockMvc.perform(
            get("/api/users/me/products/1").param("partId", partId.toString()).session(signedInSession(userId))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.myFilterEmpty").value(false))
            .andExpect(jsonPath("$.unsuitableIngredients[*].id").value(contains(ingredientId.intValue())));
    }

    @Test
    @DisplayName("나만의 필터 성분이 제품에 없으면 안 맞는 성분은 빈 배열이다")
    void noUnsuitableIngredients() throws Exception {
        List<Long> partIngredientIds = ingredientIdsOf(firstPartIdOfProduct1());
        Long absentIngredientId = jdbc.queryForObject(
            "select min(id) from ingredient where id <> all(:ids)",
            new MapSqlParameterSource("ids", partIngredientIds.toArray(Long[]::new)),
            Long.class
        );
        myFilter.add(userId, List.of(absentIngredientId));

        mockMvc.perform(get("/api/users/me/products/1").session(signedInSession(userId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.myFilterEmpty").value(false))
            .andExpect(jsonPath("$.unsuitableIngredients").isEmpty());
    }

    @Test
    @DisplayName("제품에 없는 구성품을 고르면 404이다")
    void missingPart() throws Exception {
        mockMvc.perform(
            get("/api/users/me/products/1").param("partId", "999999999").session(signedInSession(userId))
        )
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_PART_NOT_FOUND"));
    }

    @Test
    @DisplayName("다른 회원이나 다른 제품의 저장 상태는 섞이지 않고 삭제가 반영된다")
    void isolatesAndReflectsRemoval() throws Exception {
        long other = createUser("detail-other");
        wishlist.save(other, 1L);
        addToShelf(other, 1L);
        wishlist.save(userId, 15L);
        addToShelf(userId, 15L);
        MockHttpSession session = signedInSession(userId);
        mockMvc.perform(get("/api/users/me/products/1").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.wishlisted").value(false))
            .andExpect(jsonPath("$.shelved").value(false));
        wishlist.delete(userId, 15L);
        shelf.delete(userId, 15L);
        mockMvc.perform(get("/api/users/me/products/15").session(session))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.wishlisted").value(false))
            .andExpect(jsonPath("$.shelved").value(false));
    }

    @Test
    @DisplayName("알 수 없거나 만료된 세션 ID를 제시하면 401이다")
    void rejectsUnknownSessionId() throws Exception {
        mockMvc.perform(get("/api/users/me/products/1").with(request -> {
            request.setRequestedSessionId("expired-session");
            request.setRequestedSessionIdFromCookie(true);
            return request;
        }))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
            .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    @DisplayName("로그인하지 않은 세션을 제시해도 401이다")
    void rejectsUnauthenticatedSession() throws Exception {
        mockMvc.perform(get("/api/users/me/products/1").session(new MockHttpSession()))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("절대 만료된 세션은 비회원으로 내리지 않고 종료 후 401이다")
    void rejectsAbsoluteExpiry() throws Exception {
        MockHttpSession session = signedInSession(userId);
        new WebSessionPolicy(Duration.ofMinutes(30), Duration.ofDays(7), Clock.fixed(Instant.EPOCH, ZoneOffset.UTC))
            .start(session);
        mockMvc.perform(get("/api/users/me/products/1").session(session))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    @DisplayName("관리자 세션으로 회원 저장 상태를 조회할 수 없다")
    void rejectsAdmin() throws Exception {
        mockMvc
            .perform(
                get("/api/users/me/products/1")
                    .with(authentication(new LoginAdmin("admin").toAuthentication()))
            )
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.code").value("FORBIDDEN"));
    }

    @Test
    @DisplayName("제품 목록에는 저장 여부를 포함하지 않는다")
    void listHasNoSaveStatus() throws Exception {
        wishlist.save(userId, 1L);
        addToShelf(userId, 1L);
        mockMvc.perform(get("/api/products").session(signedInSession(userId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isNotEmpty())
            .andExpect(jsonPath("$.items[*].wishlisted").isEmpty())
            .andExpect(jsonPath("$.items[*].shelved").isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"wishlist", "shelf"})
    @DisplayName("저장함·선반 ID 조회 API는 제거한다")
    void removedIdEndpoints(String feature) throws Exception {
        mockMvc.perform(
            get("/api/users/me/" + feature + "/product-ids")
                .with(authentication(new LoginMember(userId).toAuthentication()))
        )
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("ENDPOINT_NOT_FOUND"));
    }

    @Test
    @DisplayName("저장 상태는 세션 없이 조회할 수 없다")
    void requiresSession() throws Exception {
        mockMvc.perform(get("/api/users/me/products/1"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
            .andExpect(header().string("Cache-Control", "no-store"));
    }

    @Test
    @DisplayName("없는 제품의 저장 상태는 404이다")
    void missingProduct() throws Exception {
        mockMvc.perform(get("/api/users/me/products/999999").session(signedInSession(userId)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
    }

    @Test
    @DisplayName("잘못된 회원 세션도 공개 제품 상세를 막지 않는다")
    void publicDetailIgnoresSession() throws Exception {
        mockMvc.perform(get("/api/products/1").session(signedInSession(Long.MAX_VALUE)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.wishlisted").doesNotExist())
            .andExpect(jsonPath("$.shelved").doesNotExist());
    }

    private Long firstPartIdOfProduct1() {
        return jdbc.queryForObject(
            "select id from product_component where product_id = 1 order by display_order, id limit 1",
            new MapSqlParameterSource(),
            Long.class
        );
    }

    private List<Long> ingredientIdsOf(Long partId) {
        return jdbc.queryForList(
            "select ingredient_id from product_ingredient where component_id = :partId order by display_order",
            new MapSqlParameterSource("partId", partId),
            Long.class
        );
    }

    private long createUser(String name) {
        return users.save(UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, name, name + "@example.com", true)))
            .id();
    }

    private void addToShelf(long ownerId, long productId) {
        shelf.add(ownerId, productId, ShelfUsageStatus.IN_USE, new Rating(null, null, null));
    }

    private MockHttpSession signedInSession(long id) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        loginSession.signIn(id, LoginChannel.WEB, request, new MockHttpServletResponse());
        SecurityContextHolder.clearContext();
        return (MockHttpSession) request.getSession();
    }
}
