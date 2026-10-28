package com.poudy.product.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.jdbc.Sql;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional(isolation = Isolation.SERIALIZABLE)
@Sql("/db/search-test-data.sql")
class ProductMarkFilterTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void marks() {
        jdbc.update("update product set category_id = 14 where id between 90001 and 90004");
        assign(90001, "MINERAL");
        assign(90001, "EASY_WASH");
        assign(90002, "ORGANIC");
        assign(90002, "EASY_WASH");
        assign(90003, "HYBRID");
        assign(90004, "MINERAL");
        assign(90004, "WATERPROOF");
        jdbc.execute("set constraints all immediate");
    }

    @Test
    void combinesValuesWithinGroupAndGroupsWithSearch() throws Exception {
        mvc.perform(
            get("/api/products").param("keyword", "검증토너")
                .param("marks", "MINERAL", "ORGANIC")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(90001, 90002, 90004)))
            .andExpect(jsonPath("$.pagination.totalElements").value(3));
        mvc.perform(
            get("/api/products/count").param("keyword", "검증토너")
                .param("marks", "MINERAL", "EASY_WASH")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mvc.perform(
            get("/api/products").param("keyword", "검증토너")
                .param("marks", "MINERAL", "EASY_WASH")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90001)));
    }

    @Test
    void excludesOnlyItsOwnMarkGroupFromOptions() throws Exception {
        mvc.perform(
            get("/api/products").param("size", "1").param("categoryIds", "13")
                .param("marks", "MINERAL", "EASY_WASH")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.filterOptions.markGroups[0].code").value("UV_FILTER_TYPE"))
            .andExpect(
                jsonPath("$.filterOptions.markGroups[0].options[*].code").value(contains("MINERAL", "ORGANIC"))
            )
            .andExpect(jsonPath("$.filterOptions.markGroups[0].options[*].productCount").value(contains(1, 1)))
            .andExpect(jsonPath("$.filterOptions.markGroups[1].code").value("WASHABILITY"))
            .andExpect(jsonPath("$.filterOptions.markGroups[1].options[0].productCount").value(1));
    }

    @Test
    void keepsZeroSelectionAndOmitsOptionsOnLaterPages() throws Exception {
        mvc.perform(get("/api/products").param("categoryIds", "1").param("marks", "MINERAL"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.filterOptions.markGroups[0].options[0].code").value("MINERAL"))
            .andExpect(jsonPath("$.filterOptions.markGroups[0].options[0].productCount").value(0));
        mvc.perform(
            get("/api/products").param("page", "2").param("size", "1")
                .param("marks", "MINERAL")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.filterOptions").doesNotExist());
    }

    @Test
    void filtersByMarksButDisplaysOnlyDaiso() throws Exception {
        jdbc.update("insert into product_mark(product_id, mark_code) values (90001, 'DAISO')");
        mvc.perform(get("/api/products").param("marks", "MINERAL", "EASY_WASH")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].marks[*].code").value(contains("DAISO")))
            .andExpect(jsonPath("$.items[0].marks[0].name").value("다이소"));
        mvc.perform(get("/api/products").param("marks", "WATERPROOF"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(90004))
            .andExpect(jsonPath("$.items[0].marks").isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", " ", "UNKNOWN", "DAISO"})
    void rejectsInvalidSelections(String selection) throws Exception {
        for (String route : java.util.List.of("/api/products", "/api/products/count")) {
            mvc.perform(get(route).param("marks", selection)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
            mvc.perform(get(route).param("marks", "MINERAL", selection)).andExpect(status().isBadRequest());
        }
    }

    @Test
    void deduplicatesRepeatedMarksForListCountAndOptions() throws Exception {
        mvc.perform(get("/api/products").param("marks", "EASY_WASH", "EASY_WASH"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pagination.totalElements").value(2))
            .andExpect(jsonPath("$.filterOptions.markGroups[1].options[0].productCount").value(2));
        mvc.perform(get("/api/products/count").param("marks", "EASY_WASH", "EASY_WASH"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(2));
    }

    @Test
    void combinesMarksWithSkinOrAndIngredientFilters() throws Exception {
        jdbc.update("update product set is_sensitive_skin = true where id = 90001");
        jdbc.update("insert into product_skin_type(product_id, skin_type_code) values (90002, 'DRY')");
        jdbc.update("insert into product_component(product_id, display_order, name) values (90002, 0, '검증 구성품')");
        jdbc.update("""
            insert into product_ingredient(component_id, ingredient_id, display_order)
            select id, 90001, 0 from product_component where product_id = 90002
            """);
        mvc.perform(
            get("/api/products").param("marks", "EASY_WASH")
                .param("skinType", "DRY").param("sensitiveSkin", "true").param("excludeIngredientIds", "90001")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90001)));
        mvc.perform(
            get("/api/products/count").param("marks", "EASY_WASH")
                .param("skinType", "DRY").param("sensitiveSkin", "true").param("includeIngredientIds", "90001")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
    }

    private void assign(long product, String value) {
        jdbc.update("insert into product_mark(product_id, mark_code) values (?, ?)", product, value);
    }
}
