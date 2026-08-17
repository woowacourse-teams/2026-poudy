package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.InputManifest;
import com.poudy.offline.source.InputManifestBuilder;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("normalized observation batch metadata")
class NormalizedObservationBatchMetadataTest {

    @Test
    @DisplayName("계약의 모든 독립 버전과 강타입 input manifest hash를 보존한다")
    void preservesEveryVersionAndManifestHash() {
        InputManifest manifest = manifest();

        NormalizedObservationBatchMetadata metadata = metadata(manifest);

        assertThat(metadata.sourceDataContractVersion())
                .isEqualTo("sensory-source-data-contract-v1");
        assertThat(metadata.ingredientResolverVersion()).isEqualTo("ingredient-resolver-v1");
        assertThat(metadata.categoryMappingVersion()).isEqualTo("category-mapping-v1");
        assertThat(metadata.applicationTypeDecisionRuleVersion())
                .isEqualTo("application-type-rule-v1");
        assertThat(metadata.usageFormMappingVersion()).isEqualTo("usage-form-mapping-v1");
        assertThat(metadata.formulationMappingVersion()).isEqualTo("formulation-mapping-v1");
        assertThat(metadata.formulaDeduplicationVersion())
                .isEqualTo("formula-deduplication-v1");
        assertThat(metadata.dataBuilderVersion()).isEqualTo("data-builder-v1");
        assertThat(metadata.inputManifestSha256()).isEqualTo(manifest.manifestSha256());
    }

    @Test
    @DisplayName("버전 또는 input manifest hash가 없으면 거부한다")
    void rejectsMissingVersionsAndManifestHash() {
        InputManifest manifest = manifest();

        assertThatThrownBy(
                () -> new NormalizedObservationBatchMetadata(
                        " ",
                        "ingredient-resolver-v1",
                        "category-mapping-v1",
                        "application-type-rule-v1",
                        "usage-form-mapping-v1",
                        "formulation-mapping-v1",
                        "formula-deduplication-v1",
                        "data-builder-v1",
                        manifest.manifestSha256()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new NormalizedObservationBatchMetadata(
                        "sensory-source-data-contract-v1",
                        "ingredient-resolver-v1",
                        "category-mapping-v1",
                        "application-type-rule-v1",
                        "usage-form-mapping-v1",
                        "formulation-mapping-v1",
                        "formula-deduplication-v1",
                        "data-builder-v1",
                        null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static NormalizedObservationBatchMetadata metadata(InputManifest manifest) {
        return new NormalizedObservationBatchMetadata(
                "sensory-source-data-contract-v1",
                "ingredient-resolver-v1",
                "category-mapping-v1",
                "application-type-rule-v1",
                "usage-form-mapping-v1",
                "formulation-mapping-v1",
                "formula-deduplication-v1",
                "data-builder-v1",
                manifest.manifestSha256());
    }

    private static InputManifest manifest() {
        return new InputManifestBuilder()
                .addLogicalFileInput(
                        "source.json",
                        "source".getBytes(StandardCharsets.UTF_8))
                .build();
    }
}
