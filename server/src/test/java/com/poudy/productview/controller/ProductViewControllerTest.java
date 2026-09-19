package com.poudy.productview.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.productview.service.ProductViewService;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ProductViewControllerTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ProductViewService productViewService;

    @Test
    void repeatedUnauthenticatedRequestsIncreaseEachViewAndReturnEmpty204() throws Exception {
        long before = productViewService.sumViewCounts(null).getOrDefault(1L, 0L);
        for (int request = 0; request < 2; request++) {
            mvc.perform(post("/api/products/1/views"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        }
        assertThat(productViewService.sumViewCounts(null)).containsEntry(1L, before + 2);
    }

    @Test
    void nonexistentAndMalformedProductIdsDoNotIncreaseViews() throws Exception {
        Map<Long, Long> before = productViewService.sumViewCounts(null);
        mvc.perform(post("/api/products/999999/views"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        mvc.perform(post("/api/products/invalid/views"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
        assertThat(productViewService.sumViewCounts(null)).isEqualTo(before);
    }

    @Test
    void readApisDoNotIncreaseViews() throws Exception {
        Map<Long, Long> before = productViewService.sumViewCounts(null);
        mvc.perform(get("/api/products/1")).andExpect(status().isOk());
        mvc.perform(get("/api/products/1")).andExpect(status().isOk());
        mvc.perform(get("/api/products")).andExpect(status().isOk());
        mvc.perform(get("/api/products/count")).andExpect(status().isOk());
        mvc.perform(get("/api/products/suggestions").param("keyword", "토너"))
            .andExpect(status().isOk());
        mvc.perform(get("/api/products/rankings")).andExpect(status().isOk());
        assertThat(productViewService.sumViewCounts(null)).isEqualTo(before);
    }

    @Test
    void returnsCategoryFilteredRankingsWithoutDisclosingViewCounts() throws Exception {
        for (int request = 0; request < 10; request++) {
            mvc.perform(post("/api/products/15/views")).andExpect(status().isNoContent());
        }

        mvc.perform(
            get("/api/products/rankings")
                .param("categoryIds", "2")
                .param("categoryIds", "14")
                .param("days", "1")
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(4))
            .andExpect(jsonPath("$.items[0].product.id").value(15L))
            .andExpect(jsonPath("$.items[0].product.name").value("PH 컨디션 토너"))
            .andExpect(jsonPath("$.items[0].product.brandName").value("나 브랜드"))
            .andExpect(jsonPath("$.items[0].product.imageUrl").value("https://cdn.example.com/products/15.png"))
            .andExpect(jsonPath("$.items[0].product.price").value(15000L))
            .andExpect(jsonPath("$.items[0].product.moistureLevel").isNumber())
            .andExpect(jsonPath("$.items[0].product.oilLevel").isNumber())
            .andExpect(jsonPath("$.items[0].product.viewCount").doesNotExist());
    }

    @Test
    void returnsEmptyRankingWhenOnlyUnknownCategoriesAreRequested() throws Exception {
        mvc.perform(get("/api/products/rankings").param("categoryIds", "999999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "1.5", "invalid"})
    void rejectsNonPositiveAndNonIntegerDays(String days) throws Exception {
        mvc.perform(get("/api/products/rankings").param("days", days))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    @Test
    void rejectsEmptyCategoryIdAmongRepeatedParameters() throws Exception {
        mvc.perform(get("/api/products/rankings").param("categoryIds", "2", ""))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    @Test
    void openApiDocumentsNoContentAndExistingNotFoundContract() throws Exception {
        mvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.paths['/api/products/{productId}/views'].post.responses['204']").exists())
            .andExpect(
                jsonPath("$.paths['/api/products/{productId}/views'].post.responses['204'].content").doesNotExist()
            )
            .andExpect(jsonPath("$.paths['/api/products/{productId}/views'].post.responses['404']").exists());
    }
}
