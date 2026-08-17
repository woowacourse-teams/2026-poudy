package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.ContentSha256;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("category mapping table metadata")
class CategoryMappingTableMetadataTest {

    private static final ContentSha256 VOCABULARY_SHA256 = new ContentSha256("ab".repeat(32));
    private static final LocalDate REVIEWED_DATE = LocalDate.of(2026, 8, 18);

    @Test
    @DisplayName("입력 vocabulary digest와 검수 provenance를 보존한다")
    void preservesVocabularyAndReviewProvenance() {
        CategoryMappingTableMetadata metadata = metadata(
                VOCABULARY_SHA256,
                "category-mapping-v1",
                "reviewer-1",
                REVIEWED_DATE);

        assertThat(metadata.inputCategoryVocabularySha256()).isEqualTo(VOCABULARY_SHA256);
        assertThat(metadata.mappingVersion()).isEqualTo("category-mapping-v1");
        assertThat(metadata.reviewer()).isEqualTo("reviewer-1");
        assertThat(metadata.reviewedDate()).isEqualTo(REVIEWED_DATE);
    }

    @Test
    @DisplayName("필수 digest와 검수 provenance가 없으면 거부한다")
    void rejectsMissingMetadata() {
        assertThatThrownBy(
                () -> metadata(
                        null,
                        "category-mapping-v1",
                        "reviewer-1",
                        REVIEWED_DATE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> metadata(
                        VOCABULARY_SHA256,
                        " ",
                        "reviewer-1",
                        REVIEWED_DATE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> metadata(
                        VOCABULARY_SHA256,
                        "category-mapping-v1",
                        " ",
                        REVIEWED_DATE))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> metadata(
                        VOCABULARY_SHA256,
                        "category-mapping-v1",
                        "reviewer-1",
                        null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static CategoryMappingTableMetadata metadata(
            ContentSha256 vocabularySha256,
            String mappingVersion,
            String reviewer,
            LocalDate reviewedDate) {
        return new CategoryMappingTableMetadata(
                vocabularySha256,
                mappingVersion,
                reviewer,
                reviewedDate);
    }
}
