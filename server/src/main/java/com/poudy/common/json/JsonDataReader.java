package com.poudy.common.json;

import com.poudy.exception.InfrastructureException;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.PropertyNamingStrategies;
import tools.jackson.databind.json.JsonMapper;

@Component
public class JsonDataReader {

    // 데이터 파일을 두는 위치. 클래스패스 루트이므로 src/main/resources 바로 아래를 가리킨다.
    private static final String DATA_LOCATION = ResourceLoader.CLASSPATH_URL_PREFIX;

    // 데이터 파일은 오프라인에서 변환한 산출물이라 필드가 snake_case 다. HTTP 응답에 쓰는
    // ObjectMapper 에 같은 설정을 걸면 API 계약이 바뀌므로 데이터 전용 매퍼를 따로 둔다.
    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();

    private final ResourceLoader resourceLoader;

    public JsonDataReader(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    /**
     * {@code {"ingredients": [ … ]}} 형태의 데이터 파일을 읽어 도메인 객체 목록으로 만든다.
     * 최상위 필드 이름은 확장자를 뗀 파일 이름과 같다고 본다.
     */
    public <T> List<T> readList(String fileName, Class<T> elementType) {
        String rootField = StringUtils.stripFilenameExtension(fileName);

        // 데이터가 없거나 형식이 깨졌으면 조회 시점이 아니라 기동 시점에 실패해야 원인을 찾기 쉽다.
        try (InputStream source = resourceLoader.getResource(DATA_LOCATION + fileName).getInputStream()) {
            return MAPPER.readerForListOf(elementType).at("/" + rootField).readValue(source);
        } catch (IOException | JacksonException e) {
            throw new InfrastructureException(
                    "데이터 파일을 읽지 못했습니다: %s (최상위 필드 \"%s\" 를 찾는다)".formatted(fileName, rootField),
                    e);
        }
    }
}
