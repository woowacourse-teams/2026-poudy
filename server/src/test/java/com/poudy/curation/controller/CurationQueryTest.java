package com.poudy.curation.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.product.domain.Product;
import com.poudy.product.repository.ProductRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class CurationQueryTest {
    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ProductRepository products;

    @Test
    void returnsPublicBannerInConfiguredOrder() throws Exception {
        mockMvc.perform(get("/api/curations"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[*].id", contains(12)))
            .andExpect(jsonPath("$.items[*].slug").doesNotExist())
            .andExpect(jsonPath("$.items[*].status").isEmpty())
            .andExpect(jsonPath("$.items[*].bannerVisible").isEmpty())
            .andExpect(jsonPath("$.items[0].title").value("환절기 장벽 케어"))
            .andExpect(jsonPath("$.items[0].description").value("환절기를 위한 제품 모음"))
            .andExpect(jsonPath("$.items[0].thumbnailImageUrl").value("https://cdn.example.com/curations/banner.png"))
            .andExpect(jsonPath("$.items[0].imageUrl").doesNotExist());
    }

    @Test
    void returnsVisibleBlocksFiltersAndProductsInSavedOrder() throws Exception {
        Product first = products.findById(15L).orElseThrow();
        mockMvc.perform(get("/api/curations/12"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.title").value("환절기 장벽 케어"))
            .andExpect(jsonPath("$.description").value("환절기를 위한 제품 모음"))
            .andExpect(jsonPath("$.blocks[*].id", contains(uuid(1), uuid(3), uuid(5), uuid(6))))
            .andExpect(jsonPath("$.blocks[0].type").value("IMAGE"))
            .andExpect(jsonPath("$.blocks[0].imageUrl").value("https://cdn.example.com/curations/12/detail-1.png"))
            .andExpect(jsonPath("$.blocks[0].spacingTop").value(8))
            .andExpect(jsonPath("$.blocks[0].spacingBottom").value(24))
            .andExpect(jsonPath("$.blocks[0].filters").doesNotExist())
            .andExpect(jsonPath("$.blocks[0].products").doesNotExist())
            .andExpect(jsonPath("$.blocks[1].type").value("PRODUCTS_BY_FILTER"))
            .andExpect(jsonPath("$.blocks[1].imageUrl").doesNotExist())
            .andExpect(jsonPath("$.blocks[1].filters[*].id", contains(uuid(12), uuid(11))))
            .andExpect(jsonPath("$.blocks[1].filters[*].label", contains("보습", "진정")))
            .andExpect(jsonPath("$.blocks[1].products[*].product.id", contains(15, 10, 7, 1)))
            .andExpect(jsonPath("$.blocks[1].products[0].filterIds", contains(uuid(12), uuid(11))))
            .andExpect(jsonPath("$.blocks[1].products[2].filterIds", contains(uuid(12))))
            .andExpect(jsonPath("$.blocks[1].products[0].product.name").value(first.name()))
            .andExpect(jsonPath("$.blocks[1].products[0].product.brandName").value(first.brand().koreanName()))
            .andExpect(jsonPath("$.blocks[1].products[0].product.imageUrl").value(first.imageUrl()))
            .andExpect(jsonPath("$.blocks[1].products[0].product.price").value(first.representativeVariant().price()))
            .andExpect(
                jsonPath("$.blocks[1].products[0].product.volumeValue")
                    .value(first.representativeVariant().volumeValue().doubleValue())
            )
            .andExpect(
                jsonPath("$.blocks[1].products[0].product.volumeUnit").value(first.representativeVariant().volumeUnit())
            )
            .andExpect(jsonPath("$.blocks[1].products[0].product.moistureLevel").value(first.moistureLevel()))
            .andExpect(jsonPath("$.blocks[1].products[0].product.oilLevel").value(first.oilLevel()))
            .andExpect(jsonPath("$.blocks[3].type").value("PRODUCTS"))
            .andExpect(jsonPath("$.blocks[3].filters").doesNotExist())
            .andExpect(jsonPath("$.blocks[3].products[0].id").value(10))
            .andExpect(jsonPath("$.blocks[3].products[0].filterIds").doesNotExist())
            .andExpect(jsonPath("$.imageUrls").doesNotExist())
            .andExpect(jsonPath("$.categories").doesNotExist())
            .andExpect(jsonPath("$.status").doesNotExist())
            .andExpect(jsonPath("$.blocks[*].status").isEmpty())
            .andExpect(jsonPath("$.blocks[*].imageId").isEmpty())
            .andExpect(jsonPath("$.blocks[*].position").isEmpty());
    }

    @Test
    void returnsEmptyBlocksWhenAllReferencedProductsAreMissing() throws Exception {
        mockMvc.perform(get("/api/curations/4")).andExpect(status().isOk())
            .andExpect(jsonPath("$.blocks", hasSize(0)));
    }

    @ParameterizedTest
    @ValueSource(longs = {20L, 30L, 40L, 999L})
    void unavailableCurationReturns404(Long id) throws Exception {
        mockMvc.perform(get("/api/curations/{id}", id))
            .andExpect(status().isNotFound())
            .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
            .andExpect(jsonPath("$.code").value("CURATION_NOT_FOUND"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "abc", "1.5", "9223372036854775808"})
    void invalidPathReturns400(String id) throws Exception {
        mockMvc.perform(get("/api/curations/{id}", id)).andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.code").value("INVALID_QUERY_PARAMETER"));
    }

    @Test
    void removesSeparateProductEndpoint() throws Exception {
        mockMvc.perform(get("/api/curations/12/products")).andExpect(status().isNotFound());
    }

    private static String uuid(int number) {
        return "00000000-0000-4000-8000-%012d".formatted(number);
    }
}
