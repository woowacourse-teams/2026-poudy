package com.poudy.curation.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CurationProductLinkQueryTest {
    private static final String QUERY = """
        {"keyword":null,"brandIds":[],"categoryIds":[],"includeIngredientIds":[],"includeGroupCodes":[]}
        """;
    private static final String LINK = """
        {"id":"00000000-0000-4000-8000-000000000091","type":"PRODUCT_LINK",
         "spacingTop":8,"spacingBottom":24,"label":"조건에 맞는 제품 보러가기","query":%s}
        """;
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void addGroup() {
        jdbc.update(
            "insert into ingredient_group (code, display_name, description) values ('LINK_TEST', '링크 성분군', '테스트')"
        );
        jdbc.update(
            "insert into ingredient_group_ingredient (group_code, ingredient_id, display_order) values ('LINK_TEST', 3551, 0), ('LINK_TEST', 1005, 1)"
        );
    }

    @ParameterizedTest
    @ValueSource(strings = {"brandIds", "categoryIds", "includeIngredientIds", "includeGroupCodes", "keyword"})
    void returnsEachSupportedSearchCondition(String field) throws Exception {
        String value = switch (field) {
            case "keyword" -> "\"토너\"";
            case "includeGroupCodes" -> "[\"LINK_TEST\"]";
            case "includeIngredientIds" -> "[3551]";
            default -> "[1]";
        };
        storeQuery(
            QUERY
                .replace("\"" + field + "\":" + (field.equals("keyword") ? "null" : "[]"), "\"" + field + "\":" + value)
        );

        org.hamcrest.Matcher<?> expected = switch (field) {
            case "keyword" -> org.hamcrest.Matchers.is("토너");
            case "includeGroupCodes" -> contains("LINK_TEST");
            case "includeIngredientIds" -> contains(3551);
            default -> contains(1);
        };

        mockMvc.perform(get("/api/curations/4"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.blocks", hasSize(1)))
            .andExpect(jsonPath("$.blocks[0].type").value("PRODUCT_LINK"))
            .andExpect(jsonPath("$.blocks[0].label").value("조건에 맞는 제품 보러가기"))
            .andExpect(jsonPath("$.blocks[0].spacingTop").value(8))
            .andExpect(jsonPath("$.blocks[0].spacingBottom").value(24))
            .andExpect(jsonPath("$.blocks[0].query." + field).value(expected));
    }

    @Test
    void preservesCombinedConditionsAndExistingProductSearchSemantics() throws Exception {
        storeQuery("""
            {"keyword":null,"brandIds":[1],"categoryIds":[1],
             "includeIngredientIds":[3551,1005],"includeGroupCodes":["LINK_TEST"]}
            """);
        mockMvc.perform(get("/api/curations/4"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.blocks[0].query.keyword").value(nullValue()))
            .andExpect(jsonPath("$.blocks[0].query.keyword").hasJsonPath())
            .andExpect(jsonPath("$.blocks[0].query.includeIngredientIds", contains(3551, 1005)))
            .andExpect(jsonPath("$.blocks[0].query.includeGroupCodes", contains("LINK_TEST")))
            .andExpect(jsonPath("$.blocks[0].href").doesNotExist());
        Long expected = jdbc.queryForObject("""
            select count(*) from product p where p.brand_id = 1 and p.category_id = 1
              and exists (select 1 from product_component pc join product_ingredient pi on pi.component_id = pc.id
                          where pc.product_id = p.id and pi.ingredient_id = 3551)
              and exists (select 1 from product_component pc join product_ingredient pi on pi.component_id = pc.id
                          where pc.product_id = p.id and pi.ingredient_id = 1005)
            """, Long.class);
        mockMvc.perform(
            get("/api/products/count").param("brandIds", "1").param("categoryIds", "1")
                .param("includeIngredientIds", "3551", "1005").param("includeGroupCodes", "LINK_TEST")
        )
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(expected));
    }

    @Test
    void keepsValidLinksWithNoMatchingProductsAndReturnsEmptyArrays() throws Exception {
        storeQuery(QUERY.replace("\"keyword\":null", "\"keyword\":\"존재하지않는제품검색어\""));
        mockMvc.perform(get("/api/curations/4"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.blocks", hasSize(1)))
            .andExpect(jsonPath("$.blocks[0].query.brandIds", hasSize(0)))
            .andExpect(jsonPath("$.blocks[0].query.categoryIds", hasSize(0)))
            .andExpect(jsonPath("$.blocks[0].query.includeIngredientIds", hasSize(0)))
            .andExpect(jsonPath("$.blocks[0].query.includeGroupCodes", hasSize(0)));
        mockMvc.perform(get("/api/products/count").param("keyword", "존재하지않는제품검색어"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.count").value(0));
    }

    @ParameterizedTest
    @ValueSource(strings = {"brandIds", "categoryIds", "includeIngredientIds", "includeGroupCodes"})
    void omitsEntireInvalidLinkWhileKeepingOtherBlocks(String field) throws Exception {
        String value = field.equals("includeGroupCodes") ? "[\"UNKNOWN_GROUP\"]" : "[999999999]";
        String query = QUERY.replace("\"keyword\":null", "\"keyword\":\"토너\"")
            .replace("\"" + field + "\":[]", "\"" + field + "\":" + value);
        storeQuery(query);
        jdbc.update("""
            update curation set blocks = blocks ||
              '[{"id":"00000000-0000-4000-8000-000000000092","type":"IMAGE",
                "spacingTop":0,"spacingBottom":0,"imageUrl":"image.png","altText":null,"bodyText":null}]'::jsonb
            where id = 4
            """);
        mockMvc.perform(get("/api/curations/4"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.blocks", hasSize(1)))
            .andExpect(jsonPath("$.blocks[0].type").value("IMAGE"));
        org.assertj.core.api.Assertions
            .assertThat(
                jdbc.queryForObject("select jsonb_array_length(blocks) from curation where id = 4", Integer.class)
            )
            .isEqualTo(2);
    }

    @Test
    void omitsQuickExcludeGroupsAndRechecksCurrentReferencesOnEveryRead() throws Exception {
        storeQuery(QUERY.replace("\"includeGroupCodes\":[]", "\"includeGroupCodes\":[\"HARSH_PRESERVATIVES\"]"));
        mockMvc.perform(get("/api/curations/4"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.blocks", hasSize(0)));

        storeQuery(QUERY.replace("\"includeGroupCodes\":[]", "\"includeGroupCodes\":[\"LINK_TEST\"]"));
        mockMvc.perform(get("/api/curations/4"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.blocks", hasSize(1)));
        jdbc.update("delete from ingredient_group_ingredient where group_code = 'LINK_TEST'");
        jdbc.update("delete from ingredient_group where code = 'LINK_TEST'");
        mockMvc.perform(get("/api/curations/4"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.blocks", hasSize(0)));
    }

    private void storeQuery(String query) {
        jdbc.update("update curation set blocks = cast(? as jsonb) where id = 4", "[" + LINK.formatted(query) + "]");
    }
}
