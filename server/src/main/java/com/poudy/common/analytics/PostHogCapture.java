package com.poudy.common.analytics;

import jakarta.annotation.PreDestroy;
import java.net.URI;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.Executor;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

@Component
public class PostHogCapture {

    private final RestClient client;
    private final Executor executor;
    private final String token;
    private final String host;
    private final String environment;

    @Autowired
    public PostHogCapture(
        @Value("${poudy.analytics.posthog.token:}") String token,
        @Value("${poudy.analytics.posthog.host:}") String host,
        @Value("${poudy.analytics.environment:development}") String environment
    ) {
        this(client(), executor(), token, host, environment);
    }

    PostHogCapture(RestClient client, Executor executor, String token, String host, String environment) {
        this.client = client;
        this.executor = executor;
        this.token = token;
        this.host = host;
        this.environment = environment;
    }

    public void capture(String event, String distinctId, Map<String, Object> properties) {
        if (!StringUtils.hasText(token) || !StringUtils.hasText(host)) {
            return;
        }
        Map<String, Object> enriched = new HashMap<>(properties);
        enriched.put("environment", environment);
        enriched.put("analytics_schema_version", 4);
        enriched.put("capture_source", "server");
        Map<String, Object> payload = Map.of(
            "api_key",
            token,
            "distinct_id",
            distinctId,
            "event",
            event,
            "properties",
            enriched,
            "timestamp",
            Instant.now().toString()
        );
        try {
            executor.execute(() -> send(payload));
        } catch (RuntimeException ignored) {
            // 큐가 가득 차거나 종료 중이어도 이미 커밋한 사용자 요청은 성공한다.
        }
    }

    private void send(Map<String, Object> payload) {
        try {
            client.post().uri(URI.create(host).resolve("/i/v0/e/"))
                .contentType(MediaType.APPLICATION_JSON).body(payload).retrieve().toBodilessEntity();
        } catch (RuntimeException ignored) {
            // 분석 전송 실패는 제품 기능의 실패가 아니다. 본문과 토큰을 로그에 남기지 않는다.
        }
    }

    @PreDestroy
    public void close() {
        if (executor instanceof ExecutorService service) {
            service.shutdown();
        }
    }

    private static RestClient client() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(1));
        factory.setReadTimeout(Duration.ofSeconds(1));
        return RestClient.builder().requestFactory(factory).build();
    }

    private static Executor executor() {
        return new ThreadPoolExecutor(
            1,
            1,
            0,
            TimeUnit.SECONDS,
            new ArrayBlockingQueue<>(32),
            Thread.ofPlatform().daemon().name("posthog-capture").factory(),
            new ThreadPoolExecutor.DiscardPolicy()
        );
    }
}
