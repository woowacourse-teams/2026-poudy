package com.poudy.banner.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.banner.domain.BannerTarget;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class BannerTargetCodecTest {
    private final BannerTargetCodec codec = new BannerTargetCodec();

    @Test
    void decodesAllTargetsWithoutProducingInternalUrls() {
        assertThat(codec.decode("{\"type\":\"CURATION\",\"curationId\":12}"))
            .isInstanceOfSatisfying(
                BannerTarget.Curation.class,
                target -> assertThat(target.curationId()).isEqualTo(12)
            );
        assertThat(codec.decode("{\"type\":\"EXTERNAL\",\"url\":\"https://example.com/event?q=1#top\"}"))
            .isInstanceOfSatisfying(
                BannerTarget.External.class,
                target -> assertThat(target.url()).isEqualTo("https://example.com/event?q=1#top")
            );
        BannerTarget.ProductList target = (BannerTarget.ProductList) codec.decode("""
            {"type":"PRODUCT_LIST","query":{"keyword":null,"brandIds":[1],"categoryIds":[],
             "includeIngredientIds":[],"includeGroupCodes":[]}}
            """);
        assertThat(target.query().brandIds()).containsExactly(1L);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {
            "",
            "null",
            "[]",
            "{}",
            "{\"type\":\"UNKNOWN\"}",
            "{\"type\":\"CURATION\"}",
            "{\"type\":\"CURATION\",\"curationId\":null}",
            "{\"type\":\"CURATION\",\"curationId\":\"12\"}",
            "{\"type\":\"CURATION\",\"curationId\":1.5}",
            "{\"type\":\"CURATION\",\"curationId\":0}",
            "{\"type\":\"CURATION\",\"curationId\":9223372036854775808}",
            "{\"type\":\"CURATION\",\"curationId\":12,\"href\":\"/x\"}",
            "{\"type\":\"CURATION\",\"type\":\"EXTERNAL\",\"curationId\":12}",
            "{\"type\":\"CURATION\",\"curationId\":12} {}",
            "{\"type\":\"PRODUCT_LIST\",\"query\":{}}",
            "{\"type\":\"PRODUCT_LIST\",\"query\":{\"keyword\":null,\"brandIds\":[],\"categoryIds\":[],\"includeIngredientIds\":[],\"includeGroupCodes\":[]}}",
            "{\"type\":\"PRODUCT_LIST\",\"query\":{\"keyword\":null,\"brandIds\":[1,1],\"categoryIds\":[],\"includeIngredientIds\":[],\"includeGroupCodes\":[]}}",
            "{\"type\":\"EXTERNAL\",\"url\":null}"})
    void rejectsMalformedTargets(String document) {
        assertThatThrownBy(() -> codec.decode(document)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "javascript:alert(1)",
            "data:text/plain,x",
            "ftp://example.com",
            "/products",
            "//example.com",
            "https:",
            "http:///path",
            "https://user:pass@example.com",
            "https://example.com/has space"})
    void rejectsNonHttpOrNonAbsoluteExternalUrls(String url) {
        assertThatThrownBy(() -> new BannerTarget.External(url)).isInstanceOf(IllegalArgumentException.class);
    }
}
