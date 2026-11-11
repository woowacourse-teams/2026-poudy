package com.poudy.config;

import io.micrometer.common.KeyValue;
import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationFilter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 트레이스에 검색어가 남지 않게 한다. 검색어는 쿼리 문자열(keyword)로 오므로, span 속성이 되는 관측 태그에서 URL 의 쿼리 부분을 지운다.
 * 서버 요청의 기본 태그는 쿼리 없는 경로만 담지만, 바뀌거나 클라이언트 관측이 추가돼도 새지 않도록 한곳에서 막는다.
 */
@Configuration(proxyBeanMethods = false)
public class TracingConfig {

    private static final Set<String> URL_KEYS = Set.of("http.url", "url.full", "uri");
    private static final Set<String> QUERY_KEYS = Set.of("url.query", "http.query");

    @Bean
    public ObservationFilter urlQueryRemovingObservationFilter() {
        return TracingConfig::removeUrlQuery;
    }

    static Observation.Context removeUrlQuery(Observation.Context context) {
        List<KeyValue> low = new ArrayList<>();
        context.getLowCardinalityKeyValues().forEach(low::add);
        low.forEach(keyValue -> sanitize(keyValue, context, true));

        List<KeyValue> high = new ArrayList<>();
        context.getHighCardinalityKeyValues().forEach(high::add);
        high.forEach(keyValue -> sanitize(keyValue, context, false));
        return context;
    }

    private static void sanitize(KeyValue keyValue, Observation.Context context, boolean lowCardinality) {
        String key = keyValue.getKey();
        if (QUERY_KEYS.contains(key)) {
            if (lowCardinality) {
                context.removeLowCardinalityKeyValue(key);
            } else {
                context.removeHighCardinalityKeyValue(key);
            }
            return;
        }
        if (!URL_KEYS.contains(key)) {
            return;
        }
        String value = keyValue.getValue();
        int query = value.indexOf('?');
        if (query < 0) {
            return;
        }
        KeyValue stripped = KeyValue.of(key, value.substring(0, query));
        if (lowCardinality) {
            context.addLowCardinalityKeyValue(stripped);
        } else {
            context.addHighCardinalityKeyValue(stripped);
        }
    }
}
