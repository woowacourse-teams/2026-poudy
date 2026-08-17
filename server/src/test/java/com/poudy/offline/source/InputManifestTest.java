package com.poudy.offline.source;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("normalized 감각 원천 입력 manifest")
class InputManifestTest {

    @Test
    @DisplayName("읽은 byte의 크기와 SHA-256만 보존하고 원문 byte는 보관하지 않는다")
    void recordsByteSizeAndContentDigest() {
        byte[] content = "abc".getBytes(StandardCharsets.UTF_8);

        InputManifest manifest = new InputManifestBuilder()
                .addLogicalFileInput("ingredients.json", content)
                .build();
        content[0] = 'z';

        InputManifestEntry entry = manifest.entries().getFirst();
        assertThat(entry.inputReference())
                .isEqualTo(
                        new InputManifestEntry.InputReference.LogicalFileName(
                                "ingredients.json"));
        assertThat(entry.byteSize()).isEqualTo(3);
        assertThat(entry.contentSha256().value())
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    }

    @Test
    @DisplayName("빈 파일도 실제 byte 입력으로 보존한다")
    void recordsEmptyByteInput() {
        InputManifest manifest = new InputManifestBuilder()
                .addLogicalFileInput("empty-overrides.json", new byte[0])
                .build();

        InputManifestEntry entry = manifest.entries().getFirst();
        assertThat(entry.byteSize()).isZero();
        assertThat(entry.contentSha256().value())
                .isEqualTo("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }

    @Test
    @DisplayName("content SHA-256 factory는 일반 byte와 빈 byte의 표준 digest를 반환한다")
    void digestsContentBytesDirectly() {
        assertThat(ContentSha256.digest(bytes("abc")).value())
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assertThat(ContentSha256.digest(new byte[0]).value())
                .isEqualTo("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    }

    @Test
    @DisplayName("입력 추가 순서와 무관하게 항목 순서와 manifest hash가 같다")
    void canonicalizesInputOrder() {
        StableId mappingId = StableId.namespaced("mapping", "category-v1");
        byte[] mapping = "mapping".getBytes(StandardCharsets.UTF_8);
        byte[] vocabulary = "vocabulary".getBytes(StandardCharsets.UTF_8);

        InputManifest first = new InputManifestBuilder()
                .addStableInput(mappingId, mapping)
                .addLogicalFileInput("ingredient-vocabulary.json", vocabulary)
                .build();
        InputManifest second = new InputManifestBuilder()
                .addLogicalFileInput("ingredient-vocabulary.json", vocabulary)
                .addStableInput(mappingId, mapping)
                .build();

        assertThat(first.entries()).isEqualTo(second.entries());
        assertThat(first.manifestSha256()).isEqualTo(second.manifestSha256());
        assertThat(first.manifestSha256()).isInstanceOf(InputManifestSha256.class);
        assertThat(first.entries())
                .extracting(InputManifestEntry::inputReference)
                .containsExactly(
                        new InputManifestEntry.InputReference.LogicalFileName(
                                "ingredient-vocabulary.json"),
                        new InputManifestEntry.InputReference.StableIdentifier(mappingId));
    }

    @Test
    @DisplayName("v1 manifest binary hash encoding의 golden 값을 유지한다")
    void preservesVersionOneManifestHashEncoding() {
        InputManifest manifest = new InputManifestBuilder()
                .addStableInput(
                        StableId.namespaced("mapping", "category-v1"),
                        bytes("mapping"))
                .addLogicalFileInput(
                        "ingredient-vocabulary.json",
                        bytes("vocabulary"))
                .build();

        assertThat(manifest.manifestSha256().value())
                .isEqualTo("a01186ec7f4b814e5078ea8508fbebc1c510f5f1837d03dc64cb8ffa84021ef1");
    }

    @Test
    @DisplayName("원천, mapping, 규칙, vocabulary, override와 evidence를 같은 byte 입력으로 포함한다")
    void includesEveryBuilderDependencyWithoutSpecialCases() {
        InputManifest manifest = new InputManifestBuilder()
                .addStableInput(
                        StableId.namespaced("source", "formula-1"),
                        bytes("source"))
                .addStableInput(
                        StableId.namespaced("mapping", "category-v1"),
                        bytes("category mapping"))
                .addStableInput(
                        StableId.namespaced("rule", "application-type-v1"),
                        bytes("application rule"))
                .addStableInput(
                        StableId.namespaced("vocabulary", "ingredient-v1"),
                        bytes("ingredient vocabulary"))
                .addStableInput(
                        StableId.namespaced("override", "ingredient-v1"),
                        bytes("manual override"))
                .addStableInput(
                        StableId.namespaced("evidence", "assessment-v1"),
                        bytes("evidence assessment"))
                .build();

        assertThat(manifest.entries()).hasSize(6);
        assertThat(manifest.entries())
                .extracting(InputManifestTest::stableIdValue)
                .containsExactly(
                        "evidence:assessment-v1",
                        "mapping:category-v1",
                        "override:ingredient-v1",
                        "rule:application-type-v1",
                        "source:formula-1",
                        "vocabulary:ingredient-v1");
    }

    @Test
    @DisplayName("같은 식별자의 중복과 서로 다른 내용 충돌을 모두 거부한다")
    void rejectsDuplicateAndConflictingReferences() {
        StableId ruleId = StableId.namespaced("rule", "application-type-v1");

        assertThatThrownBy(
                () -> new InputManifestBuilder()
                        .addStableInput(ruleId, bytes("same"))
                        .addStableInput(ruleId, bytes("same")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("두 번");
        assertThatThrownBy(
                () -> new InputManifestBuilder()
                        .addStableInput(ruleId, bytes("first"))
                        .addStableInput(ruleId, bytes("second")))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("서로 다른 byte");
        assertThatThrownBy(
                () -> new InputManifest(
                        List.of(
                                entry("rules.json", "first"),
                                entry("rules.json", "second"))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("서로 다른 내용");
    }

    @Test
    @DisplayName("내용, 크기 또는 논리 식별자가 바뀌면 manifest hash도 바뀐다")
    void changesManifestHashForEveryEntryProperty() {
        InputManifest base = manifest("rules.json", "abc");
        InputManifest changedContent = manifest("rules.json", "abd");
        InputManifest changedName = manifest("rules-v2.json", "abc");

        assertThat(changedContent.manifestSha256()).isNotEqualTo(base.manifestSha256());
        assertThat(changedName.manifestSha256()).isNotEqualTo(base.manifestSha256());

        InputManifest changedSize = new InputManifest(
                List.of(
                        new InputManifestEntry(
                                base.entries().getFirst().inputReference(),
                                4,
                                base.entries().getFirst().contentSha256())));
        assertThat(changedSize.manifestSha256()).isNotEqualTo(base.manifestSha256());
    }

    @Test
    @DisplayName("빈 manifest와 경로 또는 절대 위치처럼 보이는 논리 파일명을 거부한다")
    void rejectsMissingInputsAndPathLikeNames() {
        assertThatThrownBy(() -> new InputManifestBuilder().build())
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new InputManifestBuilder()
                        .addLogicalFileInput("C:\\controlled\\rules.json", bytes("rules")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new InputManifestBuilder()
                        .addLogicalFileInput("mapping/rules.json", bytes("rules")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new InputManifestBuilder()
                        .addLogicalFileInput("../rules.json", bytes("rules")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("논리 파일명은 replacement byte로 축약되지 않는 올바른 Unicode여야 한다")
    void rejectsMalformedUnicodeLogicalFileNames() {
        assertThat(new InputManifestEntry.InputReference.LogicalFileName("원천-🧴.json").value())
                .isEqualTo("원천-🧴.json");
        assertThatThrownBy(
                () -> new InputManifestEntry.InputReference.LogicalFileName("\uD800.json"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unicode");
        assertThatThrownBy(
                () -> new InputManifestEntry.InputReference.LogicalFileName("\uD801.json"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unicode");
        assertThatThrownBy(
                () -> new InputManifestEntry.InputReference.LogicalFileName("file-\uDC00.json"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Unicode");
    }

    @Test
    @DisplayName("완성된 manifest 항목은 변경할 수 없고 builder도 다시 사용할 수 없다")
    void keepsBuiltManifestImmutableAndSealsBuilder() {
        InputManifestBuilder builder = new InputManifestBuilder()
                .addLogicalFileInput("source.json", bytes("source"));
        InputManifest manifest = builder.build();

        assertThat(manifest.entries()).hasSize(1);
        assertThatThrownBy(() -> manifest.entries().clear())
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(
                () -> builder.addLogicalFileInput("mapping.json", bytes("mapping")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("다시 사용할 수 없습니다");
        assertThatThrownBy(builder::build)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("다시 사용할 수 없습니다");
    }

    private static InputManifest manifest(String fileName, String content) {
        return new InputManifestBuilder()
                .addLogicalFileInput(fileName, bytes(content))
                .build();
    }

    private static InputManifestEntry entry(String fileName, String content) {
        return new InputManifestBuilder()
                .addLogicalFileInput(fileName, bytes(content))
                .build()
                .entries()
                .getFirst();
    }

    private static byte[] bytes(String value) {
        return value.getBytes(StandardCharsets.UTF_8);
    }

    private static String stableIdValue(InputManifestEntry entry) {
        return ((InputManifestEntry.InputReference.StableIdentifier) entry.inputReference())
                .value()
                .value();
    }

}
