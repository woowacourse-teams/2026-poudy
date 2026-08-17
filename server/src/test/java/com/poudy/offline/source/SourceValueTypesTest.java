package com.poudy.offline.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("원천 관측 공통 값")
class SourceValueTypesTest {

    @Test
    @DisplayName("안정 식별자는 locator와 구분되는 namespace와 local value로 만든다")
    void rejectsInvalidStableIdentifiers() {
        StableId sourceId = StableId.namespaced("source", "1");

        assertThat(sourceId.value()).isEqualTo("source:1");
        assertThatThrownBy(() -> StableId.namespaced("https", "vendor.example"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> StableId.namespaced("source", "../controlled/formula.pdf"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> StableId.namespaced("source", "C:\\formula.pdf"))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(StableId.namespaced("patent-family", "WO2024/123456").value())
                .isEqualTo("patent-family:WO2024/123456");
        assertThat(StableId.namespaced("doi", "10.1234/formula.42").value())
                .isEqualTo("doi:10.1234/formula.42");
        assertThat(StableId.namespaced("supplier-revision", "line-a/revision-7").value())
                .isEqualTo("supplier-revision:line-a/revision-7");
    }

    @Test
    @DisplayName("SHA-256은 64자리 16진수만 받고 소문자로 정규화한다")
    void validatesContentSha256() {
        ContentSha256 digest = new ContentSha256("AB".repeat(32));

        assertThat(digest.value()).isEqualTo("ab".repeat(32));
        assertThatThrownBy(() -> new ContentSha256("not-a-digest"))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("값과 결측 이유는 tagged union으로 구분한다")
    void separatesPresentAndMissingValues() {
        ValueOrMissing<String> present = ValueOrMissing.present("revision-1");
        ValueOrMissing<String> missing = ValueOrMissing.missing(MissingReason.NOT_PUBLISHED);
        ValueOrMissing<String> other = ValueOrMissing.other("발행처가 날짜를 제공하지 않음");

        assertThat(present).isEqualTo(new ValueOrMissing.Present<>("revision-1"));
        assertThat(missing)
                .isEqualTo(new ValueOrMissing.Missing<>(MissingReason.NOT_PUBLISHED, null));
        assertThat(other)
                .isEqualTo(
                        new ValueOrMissing.Missing<>(
                                MissingReason.OTHER_WITH_NOTE,
                                "발행처가 날짜를 제공하지 않음"));
    }

    @Test
    @DisplayName("OTHER_WITH_NOTE만 nonblank 설명을 가진다")
    void validatesMissingReasonNote() {
        assertThatThrownBy(
                () -> new ValueOrMissing.Missing<>(MissingReason.OTHER_WITH_NOTE, " "))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new ValueOrMissing.Missing<>(MissingReason.NOT_COLLECTED, "설명"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValueOrMissing.present(null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ValueOrMissing.present(" "))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
