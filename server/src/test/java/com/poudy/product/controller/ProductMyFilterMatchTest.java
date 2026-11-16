package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.myfilter.repository.MyFilterRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginAdmin;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.LongStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql("/db/search-test-data.sql")
@DisplayName("제품별 나만의 필터 해당 여부")
class ProductMyFilterMatchTest {

    private static final String PATH = "/api/products/my-filter-matches";

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private UserRepository users;
    @Autowired
    private MyFilterRepository myFilters;

    private final ObjectMapper mapper = new ObjectMapper();
    private long userId;

    @BeforeEach
    void setUp() {
        jdbc.update(
            """
                insert into product_component (id, product_id, display_order, name, moisture_level, oil_level) overriding system value
                select id, id, 0, '1제', 1, 1 from product where id between 90001 and 90003
                """
        );
        jdbc.update(
            """
                insert into product_component (id, product_id, display_order, name, moisture_level, oil_level) overriding system value
                values (91001, 90001, 1, '2제', 1, 1)
                """
        );
        jdbc.update(
            "insert into product_ingredient (component_id, ingredient_id, display_order) values (91001, 90001, 0)"
        );
        jdbc.update(
            "insert into product_ingredient (component_id, ingredient_id, display_order) values (90003, 90001, 0)"
        );
        userId = users.save(
            UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "match-1231", "match@example.com", true)),
            UserNicknameTestFixture.nickname()
        ).orElseThrow().id();
    }

    @Test
    @DisplayName("어느 구성품에든 나만의 필터 성분이 든 제품만 요청 순서대로 준다")
    void returnsMatchedProductsInRequestOrder() throws Exception {
        myFilters.add(userId, List.of(90001L));

        mockMvc.perform(get(PATH).with(signedIn()).param("productIds", "90003,90002,90001,99999"))
            .andExpect(status().isOk())
            .andExpect(header().string("Cache-Control", "no-store"))
            .andExpect(jsonPath("$.matchedProductIds", contains(90003, 90001)));
    }

    @Test
    @DisplayName("myFilter=true 목록에서 빠지는 제품과 같은 기준이다")
    void agreesWithMyFilterExclusion() throws Exception {
        myFilters.add(userId, List.of(9L, 20L, 90001L));
        List<Long> baseline = allProductIds(false);
        Set<Long> kept = new HashSet<>(allProductIds(true));
        List<Long> expected = baseline.stream().filter(id -> !kept.contains(id)).toList();
        assertThat(expected).isNotEmpty();

        List<Long> matched = new ArrayList<>();
        for (int from = 0; from < baseline.size(); from += 100) {
            List<Long> chunk = baseline.subList(from, Math.min(from + 100, baseline.size()));
            matched.addAll(matches(signedIn(), chunk));
        }
        assertThat(matched).containsExactlyElementsOf(expected);
    }

    @Test
    @DisplayName("비로그인·관리자 세션·빈 나만의 필터는 빈 목록이다")
    void emptyWithoutMemberFilter() throws Exception {
        List<Long> ids = List.of(90001L, 90003L);
        assertThat(matches(signedIn(), ids)).isEmpty();

        myFilters.add(userId, List.of(90001L));
        for (RequestPostProcessor session : List.<RequestPostProcessor>of(
            request -> request,
            authentication(new LoginAdmin("admin-test").toAuthentication())
        )) {
            mockMvc.perform(get(PATH).with(session).param("productIds", "90001,90003"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.matchedProductIds", empty()));
        }
    }

    @Test
    @DisplayName("활성 회원이 아닌 세션은 401이다")
    void rejectsInactiveMember() throws Exception {
        mockMvc.perform(
            get(PATH).with(authentication(new LoginMember(Long.MAX_VALUE).toAuthentication()))
                .param("productIds", "90001")
        )
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("제품 ID가 없거나 100개를 넘거나 중복·0 이하이면 400이다")
    void rejectsInvalidProductIds() throws Exception {
        String tooMany = LongStream.rangeClosed(1, 101).mapToObj(Long::toString).collect(Collectors.joining(","));
        List<String> invalid = List.of("", tooMany, "90001,90001", "0", "abc");
        mockMvc.perform(get(PATH).with(signedIn()))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
        for (String value : invalid) {
            mockMvc.perform(get(PATH).with(signedIn()).param("productIds", value))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
        }
    }

    private List<Long> allProductIds(boolean myFilter) throws Exception {
        List<Long> ids = new ArrayList<>();
        for (int page = 1;; page++) {
            JsonNode body = mapper.readTree(
                mockMvc.perform(
                    get("/api/products").with(signedIn())
                        .param("myFilter", Boolean.toString(myFilter))
                        .param("page", Integer.toString(page))
                        .param("size", "100")
                ).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
            );
            JsonNode content = body.path("items");
            if (content.isEmpty()) {
                return ids;
            }
            content.forEach(product -> ids.add(product.path("id").asLong()));
        }
    }

    private List<Long> matches(RequestPostProcessor session, List<Long> productIds) throws Exception {
        JsonNode body = mapper.readTree(
            mockMvc.perform(
                get(PATH).with(session)
                    .param("productIds", productIds.stream().map(String::valueOf).collect(Collectors.joining(",")))
            ).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()
        );
        List<Long> ids = new ArrayList<>();
        body.path("matchedProductIds").forEach(id -> ids.add(id.asLong()));
        return ids;
    }

    private RequestPostProcessor signedIn() {
        return authentication(new LoginMember(userId).toAuthentication());
    }
}
