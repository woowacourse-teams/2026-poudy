package com.poudy.common.json;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.exception.InfrastructureException;
import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;
import tools.jackson.databind.ObjectMapper;

@DisplayName("JSON 데이터 읽기")
class JsonDataReaderTest {

    private final JsonDataReader jsonDataReader = new JsonDataReader(new ObjectMapper(), new DefaultResourceLoader());

    record SampleFile(List<Sample> samples) {

        record Sample(Long id, String name) {
        }
    }

    @Test
    @DisplayName("파일 이름만으로 리소스를 찾아 지정한 타입으로 만든다")
    void readsFileIntoGivenType() {
        SampleFile file = jsonDataReader.read("json-data-reader-sample.json", SampleFile.class);

        assertThat(file.samples()).extracting(SampleFile.Sample::id, SampleFile.Sample::name)
                .containsExactly(tuple(1L, "글리세린"), tuple(2L, "부틸렌글라이콜"));
    }

    @Test
    @DisplayName("파일이 없으면 인프라 예외로 감싸고 어떤 파일인지 남긴다")
    void wrapsMissingFile() {
        assertThatThrownBy(() -> jsonDataReader.read("json-data-reader-missing.json", SampleFile.class))
                .isInstanceOf(InfrastructureException.class).hasMessageContaining("json-data-reader-missing.json")
                .hasCauseInstanceOf(IOException.class);
    }

    @Test
    @DisplayName("형식이 깨졌으면 인프라 예외로 감싼다")
    void wrapsMalformedFile() {
        assertThatThrownBy(() -> jsonDataReader.read("json-data-reader-broken.json", SampleFile.class))
                .isInstanceOf(InfrastructureException.class).hasMessageContaining("json-data-reader-broken.json");
    }
}
