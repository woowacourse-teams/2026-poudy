package com.poudy.security;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Collectors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
        "server.forward-headers-strategy=native",
        "poudy.cors.allowed-origins="
})
@DirtiesContext
@DisplayName("운영 프록시 뒤 같은 출처 판정")
class ProxiedSameOriginTest {

    private static final String SITE = "poudy.site";
    private static final String SITE_ORIGIN = "https://" + SITE;

    @LocalServerPort
    private int port;

    @Test
    @DisplayName("nginx가 넘긴 Host와 X-Forwarded-Proto로 같은 출처를 알아보고 통과시킨다")
    void passesSameOriginBehindProxy() throws IOException {
        String response = postLogout(
            "Host: " + SITE,
            "X-Forwarded-For: 203.0.113.10",
            "X-Forwarded-Proto: https",
            "Origin: " + SITE_ORIGIN
        );

        assertThat(response).startsWith("HTTP/1.1 401").contains("\"code\":\"UNAUTHORIZED\"");
    }

    @Test
    @DisplayName("프록시 뒤에서도 다른 출처의 상태 변경 요청은 거절한다")
    void rejectsForeignOriginBehindProxy() throws IOException {
        String response = postLogout(
            "Host: " + SITE,
            "X-Forwarded-For: 203.0.113.10",
            "X-Forwarded-Proto: https",
            "Origin: https://evil.example.com"
        );

        assertThat(response).startsWith("HTTP/1.1 403").contains("\"code\":\"FORBIDDEN_ORIGIN\"");
    }

    @Test
    @DisplayName("X-Forwarded-Proto가 빠지면 https 출처를 같은 출처로 보지 않는다")
    void rejectsSameHostWithoutForwardedProto() throws IOException {
        String response = postLogout(
            "Host: " + SITE,
            "X-Forwarded-For: 203.0.113.10",
            "Origin: " + SITE_ORIGIN
        );

        assertThat(response).startsWith("HTTP/1.1 403").contains("\"code\":\"FORBIDDEN_ORIGIN\"");
    }

    private String postLogout(String... headers) throws IOException {
        String request = "POST /api/members/logout HTTP/1.1\r\n"
            + Arrays.stream(headers).map(header -> header + "\r\n").collect(Collectors.joining())
            + "Content-Length: 0\r\n"
            + "Connection: close\r\n"
            + "\r\n";
        try (Socket socket = new Socket("127.0.0.1", port)) {
            socket.getOutputStream().write(request.getBytes(StandardCharsets.US_ASCII));
            return new String(socket.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
