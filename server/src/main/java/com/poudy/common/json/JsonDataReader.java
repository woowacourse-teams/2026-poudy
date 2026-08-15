package com.poudy.common.json;

import com.poudy.exception.InfrastructureException;
import java.io.IOException;
import java.io.InputStream;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.ObjectMapper;

@Component
public class JsonDataReader {

    private final ObjectMapper objectMapper;

    public JsonDataReader(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public <T> T read(String path, Class<T> type) {
        try (InputStream source = new ClassPathResource(path).getInputStream()) {
            return objectMapper.readValue(source, type);
        } catch (IOException | JacksonException e) {
            throw new InfrastructureException("데이터 파일을 읽지 못했습니다: " + path, e);
        }
    }
}
