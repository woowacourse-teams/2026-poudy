package com.poudy.productrequest.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.infrastructure.discord.DiscordWebhookClient;
import com.poudy.infrastructure.discord.DiscordWebhookException;
import com.poudy.productrequest.domain.ProductRequest;
import java.net.URI;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

@DisplayName("Discord 제품 등록 요청 알림")
class DiscordProductRequestNotifierTest {

    private final DiscordWebhookClient webhookClient = mock(DiscordWebhookClient.class);

    @Test
    @DisplayName("제품명과 선택한 브랜드명을 webhook으로 전송한다")
    void sendsProductAndBrandName() {
        given(webhookClient.post(any(URI.class), any())).willReturn(204);
        DiscordProductRequestNotifier notifier = notifier("https://discord.example/webhook/secret");

        notifier.notify(request("브랜드"));

        ArgumentCaptor<URI> uri = ArgumentCaptor.forClass(URI.class);
        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(webhookClient).post(uri.capture(), payload.capture());
        assertThat(uri.getValue().toString()).isEqualTo("https://discord.example/webhook/secret");
        assertThat(payload.getValue()).isInstanceOf(Map.class);
        assertThat(((Map<?, ?>) payload.getValue()).get("content"))
                .isEqualTo("신규 제품 등록 요청\n제품명: 제품\n브랜드명: 브랜드");
        assertThat(((Map<?, ?>) payload.getValue()).get("allowed_mentions"))
                .isEqualTo(Map.of("parse", java.util.List.of()));
    }

    @Test
    @DisplayName("브랜드명을 생략한 요청도 알린다")
    void sendsRequestWithoutBrand() {
        given(webhookClient.post(any(URI.class), any())).willReturn(200);

        notifier("https://discord.example/webhook/secret").notify(request(null));

        verify(webhookClient).post(any(URI.class), any());
    }

    @Test
    @DisplayName("Discord 3xx 응답은 기존 오류 문구로 실패 처리한다")
    void rejectsRedirectResponse() {
        given(webhookClient.post(any(URI.class), any())).willReturn(300);

        assertThatThrownBy(() -> notifier("https://discord.example/webhook/secret").notify(request("브랜드")))
                .isInstanceOf(InfrastructureException.class)
                .hasMessage("제품 등록 요청 Discord 알림이 실패했습니다. status=300");
    }

    @Test
    @DisplayName("설정되지 않은 webhook은 기존 오류 문구로 거절한다")
    void rejectsMissingWebhook() {
        assertThatThrownBy(() -> notifier("  ").notify(request("브랜드")))
                .isInstanceOf(InfrastructureException.class)
                .hasMessage("제품 등록 요청 Discord webhook이 설정되지 않았습니다.");
    }

    @Test
    @DisplayName("JSON 직렬화 실패를 기존 오류 문구로 변환한다")
    void translatesSerializationFailure() {
        given(webhookClient.post(any(URI.class), any())).willThrow(DiscordWebhookException.serializationFailure());

        assertThatThrownBy(() -> notifier("https://discord.example/webhook/secret").notify(request("브랜드")))
                .isInstanceOf(InfrastructureException.class)
                .hasMessage("제품 등록 요청 Discord 알림 JSON을 만들지 못했습니다.");
    }

    @Test
    @DisplayName("중단된 전송을 기존 오류 문구로 변환한다")
    void translatesInterruptedFailure() {
        given(webhookClient.post(any(URI.class), any())).willThrow(DiscordWebhookException.interruptedFailure());

        assertThatThrownBy(() -> notifier("https://discord.example/webhook/secret").notify(request("브랜드")))
                .isInstanceOf(InfrastructureException.class)
                .hasMessage("제품 등록 요청 Discord 알림이 중단되었습니다.");
    }

    @Test
    @DisplayName("Discord 전송 오류에는 webhook 비밀값을 노출하지 않는다")
    void hidesWebhookFromFailure() {
        given(webhookClient.post(any(URI.class), any()))
                .willThrow(DiscordWebhookException.transportFailure("IOException"));

        assertThatThrownBy(() -> notifier("https://discord.example/webhook/secret").notify(request("브랜드")))
                .isInstanceOf(InfrastructureException.class)
                .hasMessage("제품 등록 요청 Discord 알림을 전송하지 못했습니다. cause=IOException")
                .hasMessageNotContaining("secret");
    }

    private DiscordProductRequestNotifier notifier(String webhookUrl) {
        return new DiscordProductRequestNotifier(webhookClient, webhookUrl);
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
