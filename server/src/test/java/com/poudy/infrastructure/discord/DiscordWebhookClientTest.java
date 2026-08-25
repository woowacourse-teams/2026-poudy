package com.poudy.infrastructure.discord;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.net.URI;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@DisplayName("Discord webhook 공통 클라이언트")
class DiscordWebhookClientTest {

    private final DiscordWebhookTransport transport = mock(DiscordWebhookTransport.class);
    private final ObjectMapper objectMapper = mock(ObjectMapper.class);
    private final DiscordWebhookClient client = new DiscordWebhookClient(transport, objectMapper);

    @Test
    @DisplayName("payload를 JSON으로 직렬화해 전송하고 상태를 반환한다")
    void postsSerializedPayload() throws Exception {
        URI uri = URI.create("https://discord.example/webhook");
        Map<String, Object> payload = Map.of("content", "알림");
        given(objectMapper.writeValueAsString(payload)).willReturn("{\"content\":\"알림\"}");
        given(transport.post(uri, "{\"content\":\"알림\"}")).willReturn(302);

        int status = client.post(uri, payload);

        assertThat(status).isEqualTo(302);
        verify(objectMapper).writeValueAsString(payload);
        verify(transport).post(uri, "{\"content\":\"알림\"}");
    }

    @Test
    @DisplayName("JSON 직렬화 실패를 구분한다")
    void distinguishesSerializationFailure() throws Exception {
        given(objectMapper.writeValueAsString(org.mockito.ArgumentMatchers.any()))
                .willThrow(mock(JacksonException.class));

        assertThatThrownBy(() -> client.post(URI.create("https://discord.example/webhook"), Map.of()))
                .isInstanceOf(DiscordWebhookException.class)
                .extracting(exception -> ((DiscordWebhookException) exception).failure())
                .isEqualTo(DiscordWebhookException.Failure.JSON_SERIALIZATION);
    }
}
