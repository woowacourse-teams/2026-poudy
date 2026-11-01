package com.poudy.product.controller;

import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import com.poudy.user.support.UserNicknameTestFixture;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Sql("/db/search-test-data.sql")
class MarkQueryTest {
    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private UserRepository users;

    @BeforeEach
    void addMarks() {
        jdbc.update(
            "insert into product_mark(product_id, mark_code) values (90001, 'DAISO'), (90002, 'DAISO')"
        );
    }

    @Test
    void returnsActualMarksAndEmptyArraysInDetails() throws Exception {
        jdbc.update("update product set category_id = 14 where id = 90001");
        jdbc.update("insert into product_mark(product_id, mark_code) values (90001, 'MINERAL')");
        mvc.perform(get("/api/products/90001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.marks[*].code").value(contains("MINERAL", "DAISO")))
            .andExpect(jsonPath("$.marks[*].name").value(contains("무기자차", "다이소")));
        mvc.perform(get("/api/products/90003"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.marks").isArray())
            .andExpect(jsonPath("$.marks").isEmpty());
    }

    @Test
    void includesMarksInSuggestionsAndRankings() throws Exception {
        mvc.perform(get("/api/products/suggestions").param("keyword", "검증토너"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.id == 90001)].marks[*].code").value(contains("DAISO")));
        jdbc.update("delete from product_daily_view");
        jdbc.update(
            "insert into product_daily_view(view_date, product_id, view_count) values (?, 90001, 9999)",
            LocalDate.now(ZoneId.of("Asia/Seoul"))
        );
        mvc.perform(get("/api/products/rankings"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].product.id").value(90001))
            .andExpect(jsonPath("$.items[0].product.marks[*].code").value(contains("DAISO")));
    }

    @Test
    void excludesMarksFromCurationProducts() throws Exception {
        jdbc.update("""
            update curation set blocks = '[
              {"id":"00000000-0000-4000-8000-000000000001","type":"PRODUCTS",
                "spacingTop":0,"spacingBottom":16,"productIds":[90001,90003]},
              {"id":"00000000-0000-4000-8000-000000000002","type":"PRODUCTS_BY_FILTER",
                "spacingTop":0,"spacingBottom":16,
                "filters":[{"id":"00000000-0000-4000-8000-000000000003","label":"추천"}],
                "products":[
                  {"productId":90001,"filterIds":["00000000-0000-4000-8000-000000000003"]},
                  {"productId":90003,"filterIds":["00000000-0000-4000-8000-000000000003"]}
                ]}
            ]'::jsonb where id = 12
            """);
        mvc.perform(get("/api/curations/12"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.blocks[0].products[*].id").value(contains(90001, 90003)))
            .andExpect(jsonPath("$.blocks[0].products[0].marks").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.blocks[0].products[1].marks").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.blocks[1].products[*].product.id").value(contains(90001, 90003)))
            .andExpect(jsonPath("$.blocks[1].products[0].product.marks").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.blocks[1].products[1].product.marks").doesNotHaveJsonPath());
    }

    @Test
    void includesMarksInSimilarProducts() throws Exception {
        jdbc.update(
            "insert into product_component(id, product_id, display_order) overriding system value values (90001, 90001, 0), (90002, 90002, 0)"
        );
        jdbc.update("insert into product_similarity values (90001, 90002, 0.9)");
        mvc.perform(get("/api/products/90001/similarities"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(90002))
            .andExpect(jsonPath("$.items[0].marks[0].code").value("DAISO"));
    }

    @Test
    void includesMarksInWishlistProducts() throws Exception {
        var user = users
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "badge-member", "badge@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();
        jdbc.update("insert into user_wishlist_product(user_id, product_id) values (?, 90001)", user.id());
        mvc.perform(
            get("/api/users/me/wishlist/products").with(authentication(new LoginMember(user.id()).toAuthentication()))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].marks[*].code").value(contains("DAISO")));
    }

    @Test
    void searchesByMarkNameButNotCode() throws Exception {
        mvc.perform(get("/api/products").param("keyword", "DAISO"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pagination.totalElements").value(0));
        mvc.perform(get("/api/products/count").param("keyword", "DAISO"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
        mvc.perform(get("/api/products/suggestions").param("keyword", "DAISO"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pagination.totalElements").value(0));
        mvc.perform(get("/api/products").param("keyword", "다이소"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90001, 90002)));
        mvc.perform(get("/api/products/count").param("keyword", "다이소"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
        mvc.perform(get("/api/products/suggestions").param("keyword", "다이소"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].match.field").value("MARK"))
            .andExpect(jsonPath("$.items[0].match.text").value("다이소"));
    }

    @Test
    void includesMarksInShelfProducts() throws Exception {
        var user = users
            .save(
                UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "badge-shelf", "shelf@example.com", true)),
                UserNicknameTestFixture.nickname()
            ).orElseThrow();
        mvc.perform(
            post("/api/users/me/shelf/products")
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":90001,\"usageStatus\":\"IN_USE\"}")
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.product.marks[*].code").value(contains("DAISO")));
        mvc.perform(
            get("/api/users/me/shelf/products")
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].product.marks[*].code").value(contains("DAISO")));
    }

}
