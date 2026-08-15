package com.poudy.common.json;

import com.poudy.exception.InfrastructureException;
import java.io.IOException;
import java.io.InputStream;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class JsonDataReader {

    // 데이터 파일을 두는 위치. 클래스패스 루트이므로 src/main/resources 바로 아래를 가리킨다.
    private static final String DATA_LOCATION = ResourceLoader.CLASSPATH_URL_PREFIX;

    private final ObjectMapper objectMapper;
    private final ResourceLoader resourceLoader;

    public JsonDataReader(ObjectMapper objectMapper, ResourceLoader resourceLoader) {
        this.objectMapper = objectMapper;
        this.resourceLoader = resourceLoader;
    }

    public <T> T read(String fileName, Class<T> type) {
        try (InputStream source = resourceLoader.getResource(DATA_LOCATION + fileName).getInputStream()) {
            return objectMapper.readValue(source, type);
        } catch (IOException | JacksonException e) {
            throw new InfrastructureException("데이터 파일을 읽지 못했습니다: " + fileName, e);
        }
    }
}
