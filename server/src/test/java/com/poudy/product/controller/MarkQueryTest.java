package com.poudy.product.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.product.domain.Mark;
import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import com.poudy.security.domain.OAuthAccount;
import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.session.LoginMember;
import com.poudy.user.domain.UserSignup;
import com.poudy.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
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
    private ProductRepository products;
    @Autowired
    private UserRepository users;

    @BeforeEach
    void addMarks() {
        jdbc.update("insert into badge(code, name) values ('OTHER', '다이소'), ('DAISO', '다이소')");
        jdbc.update(
            "insert into product_badge(product_id, badge_code) values (90001, 'OTHER'), (90001, 'DAISO'), (90002, 'DAISO')"
        );
    }

    @Test
    void returnsEmptyOrMultipleMarksWithoutChangingBrand() throws Exception {
        mvc.perform(get("/api/products/90001"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.brand.name").value("검증브랜드"))
            .andExpect(jsonPath("$.marks[*].code").value(contains("DAISO", "OTHER")))
            .andExpect(jsonPath("$.marks[*].name").value(contains("다이소", "다이소")));
        mvc.perform(get("/api/products/90003"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.marks").isArray())
            .andExpect(jsonPath("$.marks").isEmpty());
    }

    @Test
    void preservesPagesCountsAndIdResolution() throws Exception {
        mvc.perform(get("/api/products").param("keyword", "검증토너").param("sort", "CREATED_ASC").param("size", "1"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
            .andExpect(jsonPath("$.items[0].id").value(90001))
            .andExpect(jsonPath("$.items[0].marks[*].code").value(contains("DAISO", "OTHER")))
            .andExpect(jsonPath("$.pagination.totalElements").value(5));
        mvc.perform(
            get("/api/products").param("keyword", "검증토너").param("sort", "CREATED_ASC").param("size", "1")
                .param("page", "2")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(90002));
        mvc.perform(get("/api/products/count").param("keyword", "검증토너"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(5));

        List<Product> found = products.findAllById(List.of(90002L, 90001L, 90002L, 999999L));
        assertThat(found).extracting(Product::id).containsExactly(90002L, 90001L, 90002L);
        assertThat(found.getFirst().marks()).extracting(Mark::code).containsExactly("DAISO");
        assertThat(products.findAllById(List.of())).isEmpty();
    }

    @Test
    void readsRenamedDefinitionWithoutChangingAttachments() throws Exception {
        jdbc.update("update badge set name = '新표시명' where code = 'DAISO'");
        for (long id : List.of(90001L, 90002L)) {
            mvc.perform(get("/api/products/" + id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.marks[0].code").value("DAISO"))
                .andExpect(jsonPath("$.marks[0].name").value("新표시명"));
        }
        assertThat(jdbc.queryForObject("select count(*) from product_badge where badge_code = 'DAISO'", Long.class))
            .isEqualTo(2);
    }

    @Test
    void includesMarksInSuggestionsAndRankings() throws Exception {
        mvc.perform(get("/api/products/suggestions").param("keyword", "검증토너"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[?(@.id == 90001)].marks[*].code").value(contains("DAISO", "OTHER")));
        jdbc.update("delete from product_daily_view");
        jdbc.update(
            "insert into product_daily_view(view_date, product_id, view_count) values (?, 90001, 9999)",
            LocalDate.now(ZoneId.of("Asia/Seoul"))
        );
        mvc.perform(get("/api/products/rankings"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].product.id").value(90001))
            .andExpect(jsonPath("$.items[0].product.marks[*].code").value(contains("DAISO", "OTHER")));
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
        jdbc.update("insert into product_similarity_calculation values (90001)");
        jdbc.update("insert into product_similarity values (90001, 90002, 0.9)");
        mvc.perform(get("/api/products/90001/similarities"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(90002))
            .andExpect(jsonPath("$.items[0].marks[0].code").value("DAISO"));
    }

    @Test
    void includesMarksInWishlistProducts() throws Exception {
        var user = users
            .save(UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "badge-member", "badge@example.com", true)));
        jdbc.update("insert into user_wishlist_product(user_id, product_id) values (?, 90001)", user.id());
        mvc.perform(
            get("/api/users/me/wishlist/products").with(authentication(new LoginMember(user.id()).toAuthentication()))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].marks[*].code").value(contains("DAISO", "OTHER")));
    }

    @Test
    void searchesByMarkNameButNotCode() throws Exception {
        jdbc.update("insert into badge(code, name) values ('ONLY_BADGE_SEARCH_716', '표식전용문구716')");
        jdbc.update("insert into product_badge(product_id, badge_code) values (90001, 'ONLY_BADGE_SEARCH_716')");
        mvc.perform(get("/api/products").param("keyword", "ONLY_BADGE_SEARCH_716"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pagination.totalElements").value(0));
        mvc.perform(get("/api/products/count").param("keyword", "ONLY_BADGE_SEARCH_716"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
        mvc.perform(get("/api/products/suggestions").param("keyword", "ONLY_BADGE_SEARCH_716"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pagination.totalElements").value(0));
        mvc.perform(get("/api/products").param("keyword", "표식전용문구716"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90001)));
        mvc.perform(get("/api/products/count").param("keyword", "표식전용문구716"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mvc.perform(get("/api/products/suggestions").param("keyword", "표식전용문구716"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].match.field").value("MARK"))
            .andExpect(jsonPath("$.items[0].match.text").value("표식전용문구716"));
    }

    @Test
    void includesMarksInShelfProducts() throws Exception {
        var user = users
            .save(UserSignup.from(new OAuthAccount(OAuthProvider.KAKAO, "badge-shelf", "shelf@example.com", true)));
        mvc.perform(
            post("/api/users/me/shelf/products")
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":90001,\"usageStatus\":\"IN_USE\"}")
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.product.marks[*].code").value(contains("DAISO", "OTHER")));
        mvc.perform(
            get("/api/users/me/shelf/products")
                .with(authentication(new LoginMember(user.id()).toAuthentication()))
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].product.marks[*].code").value(contains("DAISO", "OTHER")));
    }

    @Test
    void documentsRequiredMarkArraysAndFields() throws Exception {
        var result = mvc.perform(get("/v3/api-docs")).andExpect(status().isOk());
        for (String schema : List.of(
            "ProductResponse",
            "ProductDetailResponse",
            "ProductRankingProductResponse",
            "SimilarProductResponse",
            "ProductSuggestionResponse",
            "ShelfProductInfoResponse"
        )) {
            result.andExpect(jsonPath("$.components.schemas." + schema + ".required", hasItem("marks")))
                .andExpect(jsonPath("$.components.schemas." + schema + ".properties.badges").doesNotHaveJsonPath())
                .andExpect(jsonPath("$.components.schemas." + schema + ".properties.marks.type").value("array"))
                .andExpect(
                    jsonPath("$.components.schemas." + schema + ".properties.marks.items.$ref")
                        .value("#/components/schemas/MarkResponse")
                );
        }
        result.andExpect(jsonPath("$.components.schemas.MarkResponse.required").value(contains("code", "name")));
        result
            .andExpect(jsonPath("$.components.schemas.CurationProductResponse.properties.marks").doesNotHaveJsonPath())
            .andExpect(jsonPath("$.components.schemas.CurationProductResponse.required", not(hasItem("marks"))));
    }
}
