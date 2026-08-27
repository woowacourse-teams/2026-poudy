package com.poudy.feedback.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.feedback.service.FeedbackImageUploadService;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
        "spring.servlet.multipart.max-file-size=1KB",
        "spring.servlet.multipart.max-request-size=2KB"
})
@DisplayName("의견 이미지 실제 multipart 상한")
class FeedbackImageUploadLimitTest {

    @LocalServerPort
    private int port;

    @MockitoBean
    private FeedbackImageUploadService imageUploadService;

    @Test
    @DisplayName("embedded server가 파일 상한 초과를 ProblemDetail 413으로 반환한다")
    void returnsProblemDetailForOversizedFile() throws Exception {
        String boundary = "poudy-boundary";
        byte[] body = multipartBody(boundary, new byte[1_100]);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("http://localhost:" + port + "/api/feedback/images"))
            .header("Content-Type", "multipart/form-data; boundary=" + boundary)
            .POST(HttpRequest.BodyPublishers.ofByteArray(body))
            .build();

        HttpResponse<String> response = HttpClient.newHttpClient()
            .send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

        assertThat(response.statusCode()).isEqualTo(413);
        assertThat(response.headers().firstValue("Content-Type").orElse(""))
            .startsWith("application/problem+json");
        assertThat(response.body()).contains("\"code\":\"PAYLOAD_TOO_LARGE\"");
    }

    private static byte[] multipartBody(String boundary, byte[] file) {
        byte[] header = ("--" + boundary + "\r\n"
            + "Content-Disposition: form-data; name=\"images\"; filename=\"image.png\"\r\n"
            + "Content-Type: image/png\r\n\r\n")
            .getBytes(StandardCharsets.UTF_8);
        byte[] footer = ("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8);
        byte[] body = new byte[header.length + file.length + footer.length];
        System.arraycopy(header, 0, body, 0, header.length);
        System.arraycopy(file, 0, body, header.length, file.length);
        System.arraycopy(footer, 0, body, header.length + file.length, footer.length);
        return body;
    }
}
