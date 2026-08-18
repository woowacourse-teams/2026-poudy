package com.poudy.common.json;

import com.poudy.exception.InfrastructureException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Collections;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JacksonModule;
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
    private final Path dataDirectory;

    public JsonDataReader(ResourceLoader resourceLoader) {
        this(resourceLoader, (Path) null);
    }

    @Autowired
    public JsonDataReader(ResourceLoader resourceLoader, @Value("${poudy.data-dir:}") String dataDirectory) {
        this(resourceLoader, toPath(dataDirectory));
    }

    JsonDataReader(ResourceLoader resourceLoader, Path dataDirectory) {
        this.resourceLoader = resourceLoader;
        this.dataDirectory = dataDirectory;
    }

    public <T> List<T> readList(String fileName, Class<T> elementType) {
        return readList(fileName, elementType, MAPPER);
    }

    public <T> List<T> readList(String fileName, Class<T> elementType, JacksonModule resolution) {
        return readList(fileName, elementType, MAPPER.rebuild().addModule(resolution).build());
    }

    private <T> List<T> readList(String fileName, Class<T> elementType, ObjectMapper mapper) {
        String rootField = StringUtils.stripFilenameExtension(fileName);

        try (InputStream source = openDataStream(fileName)) {
            List<T> values = mapper.readerForListOf(elementType).at("/" + rootField).readValue(source);
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

    private InputStream openDataStream(String fileName) throws IOException {
        if (dataDirectory == null) {
            return resourceLoader.getResource(DATA_LOCATION + fileName).getInputStream();
        }

        Path file = dataDirectory.resolve(fileName).normalize();
        if (!file.startsWith(dataDirectory)) {
            throw new IOException("데이터 파일 경로가 허용된 디렉터리를 벗어났습니다: " + fileName);
        }
        return Files.newInputStream(file);
    }

    private static Path toPath(String dataDirectory) {
        if (!StringUtils.hasText(dataDirectory)) {
            return null;
        }
        return Path.of(dataDirectory).toAbsolutePath().normalize();
    }
}
