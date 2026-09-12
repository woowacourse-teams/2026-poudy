package com.poudy.productview.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.productview.domain.ProductViews;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class ProductViewControllerTest {

    @TempDir
    static Path directory;

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ProductViews views;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("poudy.product-views.file", () -> directory.resolve("views.json").toString());
    }

    @Test
    void repeatedUnauthenticatedRequestsRecordEachViewAndReturnEmpty204() throws Exception {
        long before = views.totals(null).getOrDefault(1L, 0L);
        for (int request = 0; request < 2; request++) {
            mvc.perform(post("/api/products/1/views"))
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        }
        assertThat(views.totals(null)).containsEntry(1L, before + 2);
    }

    @Test
    void nonexistentAndMalformedProductIdsDoNotRecordViews() throws Exception {
        Map<Long, Long> before = views.totals(null);
        mvc.perform(post("/api/products/999999/views"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        mvc.perform(post("/api/products/invalid/views"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
        assertThat(views.totals(null)).isEqualTo(before);
    }

    @Test
    void readApisDoNotRecordViews() throws Exception {
        Map<Long, Long> before = views.totals(null);
        mvc.perform(get("/api/products/1")).andExpect(status().isOk());
        mvc.perform(get("/api/products/1")).andExpect(status().isOk());
        mvc.perform(get("/api/products")).andExpect(status().isOk());
        mvc.perform(get("/api/products/count")).andExpect(status().isOk());
        mvc.perform(get("/api/products/suggestions").param("keyword", "토너"))
            .andExpect(status().isOk());
        assertThat(views.totals(null)).isEqualTo(before);
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
