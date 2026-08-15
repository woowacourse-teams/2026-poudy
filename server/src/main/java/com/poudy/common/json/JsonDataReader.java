package com.poudy.common.json;

import com.poudy.exception.InfrastructureException;
import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
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

    private static final String DATA_LOCATION = ResourceLoader.CLASSPATH_URL_PREFIX;

    private static final ObjectMapper MAPPER = JsonMapper.builder()
            .propertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE)
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES).build();

    private final ResourceLoader resourceLoader;

    public JsonDataReader(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    public <T> List<T> readList(String fileName, Class<T> elementType) {
        String rootField = StringUtils.stripFilenameExtension(fileName);

        try (InputStream source = resourceLoader.getResource(DATA_LOCATION + fileName).getInputStream()) {
            List<T> values = MAPPER.readerForListOf(elementType).at("/" + rootField).readValue(source);
            if (values == null) {
                throw new InfrastructureException(
                        "데이터 파일의 최상위 필드가 비어 있습니다: %s (\"%s\")".formatted(fileName, rootField));
            }

            return Collections.unmodifiableList(values);
        } catch (IOException | JacksonException e) {
            throw new InfrastructureException(
                    "데이터 파일을 읽지 못했습니다: %s (최상위 필드 \"%s\" 를 찾는다)".formatted(fileName, rootField),
                    e);
        }
    }
}
