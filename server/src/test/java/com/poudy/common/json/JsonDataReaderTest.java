package com.poudy.common.json;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;

import com.poudy.exception.InfrastructureException;
import com.poudy.ingredient.domain.Ingredient;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.DefaultResourceLoader;

@DisplayName("JSON 데이터 읽기")
class JsonDataReaderTest {

    private static final String SAMPLE_FILE = "json-data-reader-sample.json";

    private final JsonDataReader jsonDataReader = new JsonDataReader(new DefaultResourceLoader());

    record Sample(Long id, String koreanName, List<Tag> tagMappings, OffsetDateTime createdAt) {

        record Tag(String name) {
        }
    }

    @Test
    @DisplayName("파일 이름과 같은 최상위 필드를 벗겨 도메인 객체 목록으로 만든다")
    void readsRootFieldNamedAfterFile() {
        List<Sample> samples = jsonDataReader.readList(SAMPLE_FILE, Sample.class);

        assertThat(samples).extracting(Sample::id, Sample::koreanName)
                .containsExactly(tuple(1L, "글리세린"), tuple(2L, "부틸렌글라이콜"));
    }

    @Test
    @DisplayName("snake_case 필드와 중첩 목록, 시각을 애너테이션 없이 채운다")
    void mapsSnakeCaseFieldsWithoutAnnotations() {
        Sample first = jsonDataReader.readList(SAMPLE_FILE, Sample.class).get(0);

        assertThat(first.koreanName()).isEqualTo("글리세린");
        assertThat(first.tagMappings()).extracting(Sample.Tag::name).containsExactly("HUMECTANT");
        assertThat(first.createdAt()).isEqualTo(OffsetDateTime.parse("2026-08-13T08:28:29.301Z"));
    }

    @Test
    @DisplayName("도메인에 없는 필드는 무시한다")
    void ignoresFieldsMissingFromDomain() {
        assertThat(jsonDataReader.readList(SAMPLE_FILE, Sample.class)).hasSize(2);
    }

    @Test
    @DisplayName("돌려준 목록은 밖에서 고칠 수 없다")
    void returnsUnmodifiableList() {
        List<Sample> samples = jsonDataReader.readList(SAMPLE_FILE, Sample.class);

        assertThatThrownBy(() -> samples.add(new Sample(99L, "침입", List.of(), null)))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    @DisplayName("최상위 필드가 null 이면 기동 시점에 인프라 예외로 실패한다")
    void wrapsNullRootField() {
        assertThatThrownBy(() -> jsonDataReader.readList("json-data-reader-null-root.json", Sample.class))
                .isInstanceOf(InfrastructureException.class).hasMessageContaining("json-data-reader-null-root");
    }

    @Test
    @DisplayName("파일이 없으면 인프라 예외로 감싸고 어떤 파일인지 남긴다")
    void wrapsMissingFile() {
        assertThatThrownBy(() -> jsonDataReader.readList("json-data-reader-missing.json", Sample.class))
                .isInstanceOf(InfrastructureException.class).hasMessageContaining("json-data-reader-missing.json")
                .hasCauseInstanceOf(IOException.class);
    }

    @Test
    @DisplayName("형식이 깨졌으면 인프라 예외로 감싼다")
    void wrapsMalformedFile() {
        assertThatThrownBy(() -> jsonDataReader.readList("json-data-reader-broken.json", Sample.class))
                .isInstanceOf(InfrastructureException.class).hasMessageContaining("json-data-reader-broken.json");
    }

    @Test
    @DisplayName("두 번째 이후 근거가 태그 보류면 로딩에 실패한다")
    void rejectsDeferredTagEvidenceAfterValidEvidence() {
        assertThatThrownBy(() -> jsonDataReader.readList("json-data-reader-deferred-tags.json", Ingredient.class))
                .isInstanceOf(InfrastructureException.class)
                .hasMessageContaining("json-data-reader-deferred-tags.json");
    }

    @Test
    @DisplayName("최상위 필드가 파일 이름과 다르면 무엇을 찾았는지 남기고 실패한다")
    void wrapsRootFieldNotNamedAfterFile() {
        assertThatThrownBy(() -> jsonDataReader.readList("json-data-reader-wrong-root.json", Sample.class))
                .isInstanceOf(InfrastructureException.class).hasMessageContaining("json-data-reader-wrong-root");
    }
}
