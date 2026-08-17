package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.StableId;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("exact formula signature v1")
class ExactFormulaSignatureBuilderTest {

    @Test
    @DisplayName("입력 순서와 원문 이름 및 resolver provenance는 signature를 바꾸지 않는다")
    void ignoresLineageAndInputOrder() {
        List<RawMaterialInput> first = List.of(
                knownInput("water", "Water", "60", resolved(1L, "ID", "resolver-v1")),
                knownInput("oil", "Oil", "40", resolved(2L, "NAME", "resolver-v1")));
        List<RawMaterialInput> second = List.of(
                knownInput("oil", "Published Oil Name", "40.0", resolved(2L, "ALIAS", "resolver-v2")),
                knownInput("water", "Aqua", "60.00", resolved(1L, "NAME", "resolver-v2")));

        ExactFormulaSignature firstSignature = ExactFormulaSignatureBuilder.build(first);
        ExactFormulaSignature secondSignature = ExactFormulaSignatureBuilder.build(second);

        assertThat(firstSignature).isEqualTo(secondSignature);
        assertThat(firstSignature.formulaDeduplicationVersion())
                .isEqualTo(ExactFormulaSignatureBuilder.VERSION);
        assertThat(firstSignature.sha256()).isInstanceOf(ExactFormulaSignatureSha256.class);
    }

    @Test
    @DisplayName("같은 canonical raw material의 분할 투입과 0% lineage는 signature를 바꾸지 않는다")
    void combinesSplitInputsAndIgnoresZeroMassLineage() {
        RawMaterialComposition water = knownComposition(resolved(1L));
        List<RawMaterialInput> split = List.of(
                input("water", "Water phase 1", "30", water),
                input("water", "Water phase 2", "30", water),
                knownInput("oil", "Oil", "40", resolved(2L)));
        List<RawMaterialInput> combined = List.of(
                input("water", "Water", "60", water),
                knownInput("oil", "Oil", "40", resolved(2L)),
                knownInput("zero-lineage", "Unused", "0", unresolved()));

        assertThat(ExactFormulaSignatureBuilder.build(split))
                .isEqualTo(ExactFormulaSignatureBuilder.build(combined));
    }

    @Test
    @DisplayName("질량, raw material ID 또는 composition 내용이 바뀌면 signature도 바뀐다")
    void changesForFormulaContent() {
        List<RawMaterialInput> base = List.of(
                knownInput("water", "Water", "60", resolved(1L)),
                knownInput("oil", "Oil", "40", resolved(2L)));
        List<RawMaterialInput> changedMass = List.of(
                knownInput("water", "Water", "61", resolved(1L)),
                knownInput("oil", "Oil", "39", resolved(2L)));
        List<RawMaterialInput> changedRawMaterial = List.of(
                knownInput("water-v2", "Water", "60", resolved(1L)),
                knownInput("oil", "Oil", "40", resolved(2L)));
        List<RawMaterialInput> changedComposition = List.of(
                knownInput("water", "Water", "60", resolved(3L)),
                knownInput("oil", "Oil", "40", resolved(2L)));

        ExactFormulaSignature signature = ExactFormulaSignatureBuilder.build(base);

        assertThat(ExactFormulaSignatureBuilder.build(changedMass)).isNotEqualTo(signature);
        assertThat(ExactFormulaSignatureBuilder.build(changedRawMaterial)).isNotEqualTo(signature);
        assertThat(ExactFormulaSignatureBuilder.build(changedComposition)).isNotEqualTo(signature);
    }

    @Test
    @DisplayName("known fraction 순서와 unquantified 성분 순서는 canonical ID로 정규화한다")
    void canonicalizesCompositionOrder() {
        RawMaterialComposition firstKnown = new RawMaterialComposition.KnownComposition(
                List.of(
                        knownComponent(2L, "B", "0.4"),
                        knownComponent(1L, "A", "0.6")));
        RawMaterialComposition secondKnown = new RawMaterialComposition.KnownComposition(
                List.of(
                        knownComponent(1L, "Published A", "0.60"),
                        knownComponent(2L, "Published B", "0.40")));
        RawMaterialComposition firstUnquantified = new RawMaterialComposition.UnquantifiedComposition(
                List.of(unquantifiedComponent(4L, "D"), unquantifiedComponent(3L, "C")));
        RawMaterialComposition secondUnquantified = new RawMaterialComposition.UnquantifiedComposition(
                List.of(
                        unquantifiedComponent(3L, "Published C"),
                        unquantifiedComponent(4L, "Published D")));

        List<RawMaterialInput> first = List.of(
                input("blend", "Blend", "80", firstKnown),
                input("preservative", "Preservative", "20", firstUnquantified));
        List<RawMaterialInput> second = List.of(
                input("preservative", "Other name", "20", secondUnquantified),
                input("blend", "Other blend name", "80", secondKnown));

        assertThat(ExactFormulaSignatureBuilder.build(first))
                .isEqualTo(ExactFormulaSignatureBuilder.build(second));
    }

    @Test
    @DisplayName("100%가 아닌 처방은 signature를 만들지 않는다")
    void rejectsFormulaWithoutExactMassBalance() {
        assertThatThrownBy(
                () -> ExactFormulaSignatureBuilder.build(
                        List.of(knownInput("water", "Water", "99.99", resolved(1L)))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("100");
    }

    @Test
    @DisplayName("미해결 또는 모호한 canonical 성분 identity를 자동 선택하지 않는다")
    void rejectsUnresolvedCompositionIdentity() {
        List<RawMaterialInput> unresolvedFormula = List.of(
                knownInput("water", "Water", "100", unresolved()));
        List<RawMaterialInput> ambiguousFormula = List.of(
                knownInput(
                        "water",
                        "Water",
                        "100",
                        new IngredientResolution.Ambiguous(
                                List.of(1L, 2L),
                                "둘 이상의 exact 후보",
                                "resolver-v1")));

        assertThatThrownBy(() -> ExactFormulaSignatureBuilder.build(unresolvedFormula))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("해석 완료");
        assertThatThrownBy(() -> ExactFormulaSignatureBuilder.build(ambiguousFormula))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("해석 완료");
    }

    @Test
    @DisplayName("같은 composition의 canonical 성분 중복과 raw material ID 충돌을 거부한다")
    void rejectsDuplicateOrConflictingCanonicalContent() {
        RawMaterialComposition duplicateComponents = new RawMaterialComposition.UnquantifiedComposition(
                List.of(unquantifiedComponent(1L, "Water"), unquantifiedComponent(1L, "Aqua")));
        RawMaterialComposition water = knownComposition(resolved(1L));
        RawMaterialComposition oil = knownComposition(resolved(2L));

        assertThatThrownBy(
                () -> ExactFormulaSignatureBuilder.build(
                        List.of(input("blend", "Blend", "100", duplicateComponents))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("중복");
        assertThatThrownBy(
                () -> ExactFormulaSignatureBuilder.build(
                        List.of(
                                input("same", "First", "50", water),
                                input("same", "Second", "50", oil))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("서로 다른 composition");
    }

    @Test
    @DisplayName("v1 binary encoding의 golden signature를 유지한다")
    void preservesVersionOneGoldenSignature() {
        ExactFormulaSignature signature = ExactFormulaSignatureBuilder.build(
                List.of(
                        knownInput("water", "Water", "60", resolved(1L)),
                        knownInput("oil", "Oil", "40", resolved(2L))));

        assertThat(signature.sha256().value())
                .isEqualTo("a2125f9a86cc9ae3dc5a81329c4815fab014ba4bcadbcb5617e39b9e39563d95");
    }

    @Test
    @DisplayName("signature 값은 버전과 64자리 SHA-256을 모두 요구한다")
    void validatesSignatureValue() {
        assertThatThrownBy(
                () -> new ExactFormulaSignature(
                        " ",
                        new ExactFormulaSignatureSha256("ab".repeat(32))))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ExactFormulaSignature("formula-deduplication-v1", null))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new ExactFormulaSignatureSha256("not-a-digest"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThat(new ExactFormulaSignatureSha256("AB".repeat(32)).value())
                .isEqualTo("ab".repeat(32));
    }

    private RawMaterialInput knownInput(
            String rawMaterialId,
            String publishedName,
            String amount,
            IngredientResolution resolution) {
        return input(
                rawMaterialId,
                publishedName,
                amount,
                knownComposition(resolution));
    }

    private RawMaterialInput input(
            String rawMaterialId,
            String publishedName,
            String amount,
            RawMaterialComposition composition) {
        return new RawMaterialInput(
                StableId.namespaced("raw-material", rawMaterialId),
                publishedName,
                MassPercent.parse(amount),
                composition);
    }

    private RawMaterialComposition knownComposition(IngredientResolution resolution) {
        return new RawMaterialComposition.KnownComposition(
                List.of(
                        new RawMaterialComposition.KnownComponent(
                                resolution,
                                "published component",
                                ComponentFraction.parse("1"))));
    }

    private RawMaterialComposition.KnownComponent knownComponent(
            long ingredientId,
            String publishedName,
            String fraction) {
        return new RawMaterialComposition.KnownComponent(
                resolved(ingredientId),
                publishedName,
                ComponentFraction.parse(fraction));
    }

    private RawMaterialComposition.UnquantifiedComponent unquantifiedComponent(
            long ingredientId,
            String publishedName) {
        return new RawMaterialComposition.UnquantifiedComponent(
                resolved(ingredientId),
                publishedName);
    }

    private IngredientResolution.Resolved resolved(long ingredientId) {
        return resolved(ingredientId, "CANONICAL_ID_DIRECT", "resolver-v1");
    }

    private IngredientResolution.Resolved resolved(
            long ingredientId,
            String matchRule,
            String resolverVersion) {
        return new IngredientResolution.Resolved(ingredientId, matchRule, resolverVersion);
    }

    private IngredientResolution.Unresolved unresolved() {
        return new IngredientResolution.Unresolved("카탈로그에 없음", "resolver-v1");
    }
}
