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
class ProductAttributeQueryTest {

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void attributes() {
        jdbc.update("""
            insert into category_attribute(category_id, attribute_id, display_order)
            select c.id, a.id, case a.code when 'UV_FILTER_TYPE' then 0 when 'WASHABILITY' then 1 else 2 end
            from category c cross join attribute a where c.id in (1, 13)
            """);
        assign(90001, "UV_FILTER_TYPE", "MINERAL");
        assign(90001, "WASHABILITY", "EASY_WASH");
        assign(90002, "UV_FILTER_TYPE", "ORGANIC");
        assign(90002, "WASHABILITY", "EASY_WASH");
        assign(90003, "UV_FILTER_TYPE", "HYBRID");
        assign(90004, "UV_FILTER_TYPE", "MINERAL");
        assign(90004, "WATER_RESISTANCE", "WATERPROOF");
        jdbc.execute("set constraints all immediate");
    }

    @Test
    void combinesValuesWithinGroupAndGroupsWithSearch() throws Exception {
        mvc.perform(
            get("/api/products").param("keyword", "검증토너")
                .param("attributes", "UV_FILTER_TYPE:MINERAL", "UV_FILTER_TYPE:ORGANIC")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id").value(containsInAnyOrder(90001, 90002, 90004)))
            .andExpect(jsonPath("$.pagination.totalElements").value(3));
        mvc.perform(
            get("/api/products/count").param("keyword", "검증토너")
                .param("attributes", "UV_FILTER_TYPE:MINERAL", "WASHABILITY:EASY_WASH")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
        mvc.perform(
            get("/api/products").param("keyword", "검증토너")
                .param("attributes", "UV_FILTER_TYPE:MINERAL", "WASHABILITY:EASY_WASH")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90001)));
    }

    @Test
    void excludesOnlyItsOwnAttributeGroupFromOptions() throws Exception {
        mvc.perform(
            get("/api/products").param("size", "1").param("categoryIds", "1")
                .param("attributes", "UV_FILTER_TYPE:MINERAL", "WASHABILITY:EASY_WASH")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.filterOptions.attributes[0].attributeCode").value("UV_FILTER_TYPE"))
            .andExpect(
                jsonPath("$.filterOptions.attributes[0].values[*].valueCode").value(contains("MINERAL", "ORGANIC"))
            )
            .andExpect(jsonPath("$.filterOptions.attributes[0].values[*].productCount").value(contains(1, 1)))
            .andExpect(jsonPath("$.filterOptions.attributes[1].attributeCode").value("WASHABILITY"))
            .andExpect(jsonPath("$.filterOptions.attributes[1].values[0].productCount").value(1));
    }

    @Test
    void keepsZeroSelectionAndOmitsOptionsOnLaterPages() throws Exception {
        mvc.perform(get("/api/products").param("categoryIds", "13").param("attributes", "UV_FILTER_TYPE:MINERAL"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
            .andExpect(jsonPath("$.filterOptions.attributes[0].values[0].valueCode").value("MINERAL"))
            .andExpect(jsonPath("$.filterOptions.attributes[0].values[0].productCount").value(0));
        mvc.perform(
            get("/api/products").param("page", "2").param("size", "1")
                .param("attributes", "UV_FILTER_TYPE:MINERAL")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.filterOptions").doesNotExist());
    }

    @Test
    void sharesDefinitionsAcrossCategoriesWithoutDuplicatingCounts() throws Exception {
        jdbc.update("update product set category_id = 14 where id = 90002");
        mvc.perform(get("/api/products").param("categoryIds", "1", "13").param("attributes", "WASHABILITY:EASY_WASH"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.pagination.totalElements").value(2))
            .andExpect(
                jsonPath("$.filterOptions.attributes[?(@.attributeCode == 'WASHABILITY')].values[0].productCount")
                    .value(contains(2))
            );
    }

    @Test
    void filtersByAttributesButDisplaysOnlyMarks() throws Exception {
        jdbc.update("insert into badge(code, name) values ('DAISO', '다이소')");
        jdbc.update("insert into product_badge(product_id, badge_code) values (90001, 'DAISO')");
        mvc.perform(get("/api/products/90001")).andExpect(status().isOk())
            .andExpect(jsonPath("$.marks[*].code").value(contains("DAISO")))
            .andExpect(jsonPath("$.marks[0].name").value("다이소"));
        mvc.perform(get("/api/products").param("attributes", "UV_FILTER_TYPE:MINERAL", "WASHABILITY:EASY_WASH"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].marks[*].code").value(contains("DAISO")))
            .andExpect(jsonPath("$.filterOptions.marks").doesNotExist());
        mvc.perform(get("/api/products").param("attributes", "WATER_RESISTANCE:WATERPROOF"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(90004))
            .andExpect(jsonPath("$.items[0].marks").isEmpty());
        mvc.perform(get("/api/products/count").param("keyword", "이지워시"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "WASHABILITY",
            "WASHABILITY:",
            "UNKNOWN:EASY_WASH",
            "WASHABILITY:MINERAL",
            "WASHABILITY:EASY_WASH:EXTRA",
            "washability:EASY_WASH"})
    void rejectsInvalidSelections(String selection) throws Exception {
        mvc.perform(get("/api/products").param("attributes", selection)).andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    @Test
    void countRejectsUnknownAttributeValues() throws Exception {
        mvc.perform(get("/api/products/count").param("attributes", "WASHABILITY:MINERAL"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    @Test
    void rejectsRepeatedPair() throws Exception {
        mvc.perform(get("/api/products").param("attributes", "WASHABILITY:EASY_WASH", "WASHABILITY:EASY_WASH"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    @Test
    void combinesAttributesWithSkinOrAndIngredientFilters() throws Exception {
        jdbc.update("update product set is_sensitive_skin = true where id = 90001");
        jdbc.update("insert into product_skin_type(product_id, skin_type_code) values (90002, 'DRY')");
        jdbc.update("insert into product_component(product_id, display_order, name) values (90002, 0, '검증 구성품')");
        jdbc.update("""
            insert into product_ingredient(component_id, ingredient_id, display_order)
            select id, 90001, 0 from product_component where product_id = 90002
            """);
        mvc.perform(
            get("/api/products").param("attributes", "WASHABILITY:EASY_WASH")
                .param("skinType", "DRY").param("sensitiveSkin", "true").param("excludeIngredientIds", "90001")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.items[*].id").value(contains(90001)));
        mvc.perform(
            get("/api/products/count").param("attributes", "WASHABILITY:EASY_WASH")
                .param("skinType", "DRY").param("sensitiveSkin", "true").param("includeIngredientIds", "90001")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(1));
    }

    private void assign(long product, String attribute, String value) {
        jdbc.update("""
            insert into product_attribute_value(product_id, attribute_id, value_code)
            select ?, id, ? from attribute where code = ?
            """, product, value, attribute);
    }
}
