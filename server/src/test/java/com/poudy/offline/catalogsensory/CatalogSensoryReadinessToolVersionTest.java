package com.poudy.offline.catalogsensory;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URISyntaxException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("카탈로그 감각 준비도 도구 버전")
public class CatalogSensoryReadinessToolVersionTest {

    private static final List<String> BEHAVIOR_FIXTURES = List.of("valid", "quality-issues");
    private static final Map<String, String> EXPECTED_BEHAVIOR_SHA256 = Map.of(
            "catalog-sensory-readiness-tool-v1",
            "16a9a563ad2b380ba7cb3ba0d2f8c4f05aa9d69bd29ca4faf83178d42a4227cd");

    private final CatalogSensoryReadinessAnalyzer analyzer = new CatalogSensoryReadinessAnalyzer();
    private final CatalogSensoryReadinessReportWriter writer = new CatalogSensoryReadinessReportWriter();

    @Test
    @DisplayName("fixture 생성 결과가 바뀌면 도구 버전도 함께 바뀌어야 한다")
    public void bindsToolVersionToGeneratedBehavior() throws Exception {
        String expected = EXPECTED_BEHAVIOR_SHA256.get(CatalogSensoryReadinessReport.TOOL_VERSION);

        assertThat(expected)
                .as("새 도구 버전의 fixture 생성 결과 SHA-256을 등록해야 합니다.")
                .isNotNull();
        assertThat(generatedBehaviorSha256())
                .as("생성 규칙이 바뀌면 도구 버전을 올리고 외부 보고서를 다시 생성해야 합니다.")
                .isEqualTo(expected);
    }

    private String generatedBehaviorSha256() throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        for (String fixtureName : BEHAVIOR_FIXTURES) {
            updateLengthPrefixed(digest, fixtureName.getBytes(StandardCharsets.UTF_8));
            String json = writer.renderJson(analyzer.analyze(fixture(fixtureName)));
            updateLengthPrefixed(digest, json.getBytes(StandardCharsets.UTF_8));
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private Path fixture(String name) throws URISyntaxException {
        return Path.of(
                Objects.requireNonNull(
                        getClass().getResource("/catalog-sensory-readiness/" + name))
                        .toURI());
    }

    private static void updateLengthPrefixed(MessageDigest digest, byte[] value) {
        digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(value.length).array());
        digest.update(value);
    }
}
