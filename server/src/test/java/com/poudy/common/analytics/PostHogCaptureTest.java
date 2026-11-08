package com.poudy.common.analytics;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class PostHogCaptureTest {

    @Test
    void sendsProjectTokenAndStableIdentity() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://posthog.example/i/v0/e/"))
            .andExpect(jsonPath("$.api_key").value("project-token"))
            .andExpect(jsonPath("$.distinct_id").value("member:7"))
            .andExpect(jsonPath("$.event").value("routine_change_committed"))
            .andExpect(jsonPath("$.properties.environment").value("staging"))
            .andExpect(jsonPath("$.properties.capture_source").value("server"))
            .andRespond(withSuccess());
        PostHogCapture capture = new PostHogCapture(
            builder.build(),
            Runnable::run,
            "project-token",
            "https://posthog.example",
            "staging"
        );

        capture.capture("routine_change_committed", "member:7", Map.of("routine_id", 12));

        server.verify();
    }

    @Test
    void disabledCaptureDoesNotSendRequests() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        PostHogCapture capture = new PostHogCapture(
            builder.build(),
            Runnable::run,
            "",
            "https://posthog.example",
            "staging"
        );

        capture.capture("routine_change_committed", "member:7", Map.of());

        server.verify();
    }

    @Test
    void networkFailureDoesNotChangeCommittedOperation() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("https://posthog.example/i/v0/e/")).andRespond(withServerError());
        PostHogCapture capture = new PostHogCapture(
            builder.build(),
            Runnable::run,
            "project-token",
            "https://posthog.example",
            "staging"
        );

        assertThatCode(() -> capture.capture("routine_change_committed", "member:7", Map.of()))
            .doesNotThrowAnyException();
        server.verify();
    }
}
