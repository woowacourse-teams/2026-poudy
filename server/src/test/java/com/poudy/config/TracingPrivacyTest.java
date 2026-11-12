package com.poudy.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import io.micrometer.common.KeyValue;
import io.micrometer.observation.Observation;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.micrometer.tracing.test.autoconfigure.AutoConfigureTracing;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.test.web.servlet.MockMvc;

// staging 과 같이 트레이스를 켜고(샘플링 1.0, SQL 프록시) 실제로 내보내지는 span 을 받아 검사한다.
@SpringBootTest(properties = {
        "management.tracing.sampling.probability=1.0",
        "jdbc.datasource-proxy.enabled=true"
})
@AutoConfigureMockMvc
@AutoConfigureTracing
@DisplayName("트레이스 개인정보 보호")
class TracingPrivacyTest {

    private static final String KEYWORD = "트레이스검색어확인용";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private SdkTracerProvider tracerProvider;

    @Autowired
    private CapturingSpanExporter exporter;

    @BeforeEach
    void clear() {
        tracerProvider.forceFlush().join(10, TimeUnit.SECONDS);
        exporter.spans.clear();
    }

    @Test
    @DisplayName("검색 요청의 HTTP span 과 SQL span 에 검색어가 남지 않는다")
    void searchKeywordDoesNotReachSpans() throws Exception {
        mockMvc.perform(get("/api/products").param("keyword", KEYWORD))
            .andExpect(status().isOk());
        mockMvc.perform(get("/api/products/related-keywords").param("keyword", KEYWORD))
            .andExpect(status().isOk());

        List<SpanData> spans = exportedSpans();

        assertThat(spans).anySatisfy(
            span -> assertThat(span.getAttributes().asMap().keySet())
                .anySatisfy(key -> assertThat(key.getKey()).isEqualTo("http.url"))
        );
        assertThat(spans).anySatisfy(
            span -> assertThat(span.getAttributes().asMap().keySet())
                .anySatisfy(key -> assertThat(key.getKey()).startsWith("jdbc.query"))
        );
        assertThat(spans).allSatisfy(span -> {
            assertThat(span.getName()).doesNotContain(KEYWORD);
            assertNoKeyword(span.getAttributes());
            span.getEvents().forEach(event -> {
                assertThat(event.getName()).doesNotContain(KEYWORD);
                assertNoKeyword(event.getAttributes());
            });
        });
    }

    @Test
    @DisplayName("SQL span 은 바인딩 값을 담지 않는다")
    void sqlSpansDoNotCarryParameterValues() throws Exception {
        mockMvc.perform(get("/api/products").param("keyword", KEYWORD))
            .andExpect(status().isOk());

        assertThat(exportedSpans()).allSatisfy(
            span -> assertThat(span.getAttributes().asMap().keySet())
                .noneSatisfy(key -> assertThat(key.getKey()).startsWith("jdbc.params"))
        );
    }

    @Test
    @DisplayName("관측 태그의 URL 에서 쿼리 문자열을 지운다")
    void removesQueryFromUrlTags() {
        Observation.Context context = new Observation.Context();
        context.addLowCardinalityKeyValue(KeyValue.of("uri", "/api/products?keyword=a"));
        context.addHighCardinalityKeyValue(KeyValue.of("http.url", "/api/products?keyword=a"));
        context.addHighCardinalityKeyValue(KeyValue.of("url.query", "keyword=a"));

        TracingConfig.removeUrlQuery(context);

        assertThat(context.getLowCardinalityKeyValue("uri").getValue()).isEqualTo("/api/products");
        assertThat(context.getHighCardinalityKeyValue("http.url").getValue()).isEqualTo("/api/products");
        assertThat(context.getHighCardinalityKeyValue("url.query")).isNull();
    }

    private List<SpanData> exportedSpans() {
        tracerProvider.forceFlush().join(10, TimeUnit.SECONDS);
        assertThat(exporter.spans).isNotEmpty();
        return List.copyOf(exporter.spans);
    }

    private static void assertNoKeyword(Attributes attributes) {
        attributes.forEach(
            (key, value) -> assertThat(String.valueOf(value))
                .as("attribute %s", key.getKey())
                .doesNotContain(KEYWORD)
        );
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class SpanCapture {

        @Bean
        CapturingSpanExporter capturingSpanExporter() {
            return new CapturingSpanExporter();
        }
    }

    static class CapturingSpanExporter implements SpanExporter {

        private final List<SpanData> spans = new CopyOnWriteArrayList<>();

        @Override
        public CompletableResultCode export(Collection<SpanData> batch) {
            spans.addAll(batch);
            return CompletableResultCode.ofSuccess();
        }

        @Override
        public CompletableResultCode flush() {
            return CompletableResultCode.ofSuccess();
        }

        @Override
        public CompletableResultCode shutdown() {
            return CompletableResultCode.ofSuccess();
        }
    }
}
