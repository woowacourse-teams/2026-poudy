package com.poudy.productrequest.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.productrequest.domain.ProductRequest;
import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;

@DisplayName("Discord 제품 등록 요청 알림")
class DiscordProductRequestNotifierTest {

    private final HttpClient httpClient = mock(HttpClient.class);
    private final HttpResponse<Void> response = mock();
    private final ObjectMapper objectMapper = mock(ObjectMapper.class);

    @Test
    @DisplayName("제품명과 선택한 브랜드명을 webhook으로 전송한다")
    void sendsProductAndBrandName() throws Exception {
        given(response.statusCode()).willReturn(204);
        given(httpClient.send(any(HttpRequest.class), anyDiscardingHandler())).willReturn(response);
        given(objectMapper.writeValueAsString(any())).willReturn("{}");
        DiscordProductRequestNotifier notifier = notifier("https://discord.example/webhook/secret");

        notifier.notify(request("브랜드"));

        ArgumentCaptor<HttpRequest> request = ArgumentCaptor.forClass(HttpRequest.class);
        verify(httpClient).send(request.capture(), anyDiscardingHandler());
        assertThat(request.getValue().uri().toString()).isEqualTo("https://discord.example/webhook/secret");
        assertThat(request.getValue().headers().firstValue("Content-Type")).contains("application/json");
        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(objectMapper).writeValueAsString(payload.capture());
        assertThat(payload.getValue()).isInstanceOf(Map.class);
        assertThat(((Map<?, ?>) payload.getValue()).get("content"))
                .isEqualTo("신규 제품 등록 요청\n제품명: 제품\n브랜드명: 브랜드");
        assertThat(((Map<?, ?>) payload.getValue()).get("allowed_mentions"))
                .isEqualTo(Map.of("parse", java.util.List.of()));
    }

    @Test
    @DisplayName("브랜드명을 생략한 요청도 알린다")
    void sendsRequestWithoutBrand() throws Exception {
        given(response.statusCode()).willReturn(200);
        given(httpClient.send(any(HttpRequest.class), anyDiscardingHandler())).willReturn(response);
        given(objectMapper.writeValueAsString(any())).willReturn("{}");

        notifier("https://discord.example/webhook/secret").notify(request(null));

        verify(httpClient).send(any(HttpRequest.class), anyDiscardingHandler());
    }

    @Test
    @DisplayName("Discord 오류에는 webhook 비밀값을 노출하지 않는다")
    void hidesWebhookFromFailure() throws Exception {
        given(httpClient.send(any(HttpRequest.class), anyDiscardingHandler()))
                .willThrow(new IOException("https://discord.example/webhook/secret"));
        given(objectMapper.writeValueAsString(any())).willReturn("{}");

        assertThatThrownBy(() -> notifier("https://discord.example/webhook/secret").notify(request("브랜드")))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageNotContaining("secret");
    }

    @SuppressWarnings("unchecked")
    private static HttpResponse.BodyHandler<Void> anyDiscardingHandler() {
        return any(HttpResponse.BodyHandler.class);
    }

    private DiscordProductRequestNotifier notifier(String webhookUrl) {
        return new DiscordProductRequestNotifier(httpClient, objectMapper, webhookUrl);
    }

    private static ProductRequest request(String brandName) {
        return new ProductRequest(
                1,
                UUID.fromString("00000000-0000-0000-0000-000000000001"),
                "제품",
                brandName,
                OffsetDateTime.parse("2026-08-23T12:34:56Z"));
    }
}
