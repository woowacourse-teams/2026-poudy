package com.poudy.banner.controller;

import static org.hamcrest.Matchers.contains;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
class BannerQueryTest {
    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void separatesPromotionFromCurationAndDoesNotLoadItsBody() throws Exception {
        jdbc.update("update banner set title = '홍보 제목', description = '홍보 설명' where id = 101");
        mvc.perform(get("/api/banners").param("slot", "MAIN")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(101)))
            .andExpect(jsonPath("$.items[0].title").value("홍보 제목"))
            .andExpect(jsonPath("$.items[0].description").value("홍보 설명"))
            .andExpect(jsonPath("$.items[0].imageUrl").value("https://cdn.example.com/curations/banner.png"))
            .andExpect(jsonPath("$.items[0].target.type").value("CURATION"))
            .andExpect(jsonPath("$.items[0].target.curationId").value(12))
            .andExpect(jsonPath("$.items[0].visible").doesNotExist())
            .andExpect(jsonPath("$.items[0].displayOrder").doesNotExist());
        mvc.perform(get("/api/curations/12")).andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("환절기 장벽 케어"))
            .andExpect(jsonPath("$.description").value("환절기를 위한 제품 모음"));
        jdbc.update("update curation set blocks = '[{}]' where id = 12");
        mvc.perform(get("/api/banners").param("slot", "MAIN")).andExpect(status().isOk());
    }

    @Test
    void selectsSlotAndVisibleTargetsInStableOrder() throws Exception {
        insert(201, "MAIN", 0, true, "{\"type\":\"EXTERNAL\",\"url\":\"https://example.com/event\"}");
        insert(202, "MAIN", 1, true, """
            {"type":"PRODUCT_LIST","query":{"keyword":"no matching products","brandIds":[1],"categoryIds":[],
            "includeIngredientIds":[],"includeGroupCodes":[]}}
            """);
        insert(203, "STRIP", 0, true, "{\"type\":\"EXTERNAL\",\"url\":\"https://example.com/strip\"}");
        insert(204, "MAIN", 0, false, "{\"type\":\"UNKNOWN\"}");
        mvc.perform(get("/api/banners").param("slot", "MAIN")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(101, 201, 202)))
            .andExpect(jsonPath("$.items[1].target.url").value("https://example.com/event"))
            .andExpect(jsonPath("$.items[2].target.query.brandIds", contains(1)));
        mvc.perform(get("/api/banners").param("slot", "STRIP")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(203)));
    }

    @Test
    void excludesUnpublishedDeletedAndMissingProductReferences() throws Exception {
        insert(201, "MAIN", 3, true, "{\"type\":\"CURATION\",\"curationId\":20}");
        jdbc.update(
            "insert into curation(id,title,description,publication_status,blocks) values(30,'제목','설명','PUBLISHED','[]')"
        );
        insert(202, "MAIN", 4, true, "{\"type\":\"CURATION\",\"curationId\":30}");
        jdbc.update("delete from curation where id = 30");
        long nextId = 210;
        for (String condition : new String[] {
                "\"brandIds\":[999999]",
                "\"categoryIds\":[999999]",
                "\"includeIngredientIds\":[999999]",
                "\"includeGroupCodes\":[\"UNKNOWN\"]",
                "\"includeGroupCodes\":[\"ALCOHOL\"]"}) {
            String query = "{\"keyword\":null,\"brandIds\":[],\"categoryIds\":[],\"includeIngredientIds\":[],\"includeGroupCodes\":[]}";
            String key = condition.substring(0, condition.indexOf(':'));
            query = query.replace(key + ":[]", condition);
            insert(nextId++, "MAIN", 5, true, "{\"type\":\"PRODUCT_LIST\",\"query\":" + query + "}");
        }
        mvc.perform(get("/api/banners").param("slot", "MAIN")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(101)));
        jdbc.update("update curation set publication_status = 'UNPUBLISHED' where id = 12");
        mvc.perform(get("/api/banners").param("slot", "MAIN")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/curations/12")).andExpect(status().isNotFound());
    }

    @Test
    void returnsEmptySlotAndRequiresSlot() throws Exception {
        mvc.perform(get("/api/banners").param("slot", "STRIP")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/banners")).andExpect(status().isBadRequest());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "main", "OTHER"})
    void rejectsInvalidSlot(String slot) throws Exception {
        mvc.perform(get("/api/banners").param("slot", slot)).andExpect(status().isBadRequest());
    }

    @Test
    void rejectsCorruptVisibleTargetsInsteadOfSilentlyReturningEmptyList() throws Exception {
        insert(201, "MAIN", 3, true, "{\"type\":\"EXTERNAL\",\"url\":\"javascript:alert(1)\"}");
        mvc.perform(get("/api/banners").param("slot", "MAIN")).andExpect(status().isInternalServerError());
    }

    private void insert(long id, String slot, int order, boolean visible, String target) {
        jdbc.update("""
            insert into banner(id,slot,title,description,image_url,target,display_order,visible)
            values(?,?,'제목','설명','https://example.com/banner.png',cast(? as jsonb),?,?)
            """, id, slot, target, order, visible);
    }
}
