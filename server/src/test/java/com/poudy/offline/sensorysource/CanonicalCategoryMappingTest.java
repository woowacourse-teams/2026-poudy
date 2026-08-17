package com.poudy.offline.sensorysource;

import static com.poudy.offline.sensorysource.CanonicalMappingResolution.AMBIGUOUS;
import static com.poudy.offline.sensorysource.CanonicalMappingResolution.EXACT;
import static com.poudy.offline.sensorysource.CanonicalMappingResolution.REVIEWED;
import static com.poudy.offline.sensorysource.CanonicalMappingResolution.UNRESOLVED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.MissingReason;
import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValueOrMissing;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("canonical category mapping")
class CanonicalCategoryMappingTest {

    private static final StableId RULE_ID = StableId.namespaced("category-mapping", "catalog-category-id");

    @Test
    @DisplayName("관측값과 exact 또는 reviewed canonical category ID를 보존한다")
    void preservesResolvedCategoryMapping() {
        CanonicalCategoryMapping exact = mapping("스킨/토너", ValueOrMissing.present(2L), EXACT);
        CanonicalCategoryMapping reviewed = mapping("toner", ValueOrMissing.present(2L), REVIEWED);

        assertThat(exact.observedValue()).isEqualTo("스킨/토너");
        assertThat(exact.canonicalCategoryId()).isEqualTo(ValueOrMissing.present(2L));
        assertThat(exact.mappingRuleId()).isEqualTo(RULE_ID);
        assertThat(exact.mappingVersion()).isEqualTo("category-mapping-v1");
        assertThat(exact.resolution()).isEqualTo(EXACT);
        assertThat(reviewed.resolution()).isEqualTo(REVIEWED);
    }

    @Test
    @DisplayName("미해결과 모호한 category는 ID를 추측하지 않고 결측으로 보존한다")
    void preservesUnresolvedCategoryMapping() {
        CanonicalCategoryMapping unresolved = mapping(
                "treatment",
                ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                UNRESOLVED);
        CanonicalCategoryMapping ambiguous = mapping(
                "essence lotion",
                ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                AMBIGUOUS);

        assertThat(unresolved.canonicalCategoryId())
                .isEqualTo(ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY));
        assertThat(ambiguous.resolution()).isEqualTo(AMBIGUOUS);
    }

    @Test
    @DisplayName("canonical category ID는 양수여야 한다")
    void rejectsNonPositiveCategoryId() {
        assertThatThrownBy(() -> mapping("toner", ValueOrMissing.present(0L), EXACT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("양수");
        assertThatThrownBy(() -> mapping("toner", ValueOrMissing.present(-1L), EXACT))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("양수");
    }

    @Test
    @DisplayName("확정 상태에는 canonical ID가 필요하다")
    void rejectsResolvedStateWithoutCategoryId() {
        for (CanonicalMappingResolution resolution : new CanonicalMappingResolution[] {EXACT, REVIEWED}) {
            assertThatThrownBy(
                    () -> mapping(
                            "toner",
                            ValueOrMissing.missing(MissingReason.UNRESOLVED_IDENTITY),
                            resolution))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("canonical ID");
        }
    }

    @Test
    @DisplayName("미확정 상태에는 canonical ID를 둘 수 없다")
    void rejectsUnresolvedStateWithCategoryId() {
        for (CanonicalMappingResolution resolution : new CanonicalMappingResolution[] {UNRESOLVED, AMBIGUOUS}) {
            assertThatThrownBy(() -> mapping("toner", ValueOrMissing.present(2L), resolution))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("canonical ID");
        }
    }

    @Test
    @DisplayName("모든 필수 값과 빈 문자열을 거부한다")
    void rejectsMissingRequiredValues() {
        assertThatThrownBy(() -> mapping(" ", ValueOrMissing.present(2L), EXACT))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> mapping("toner", null, EXACT))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new CanonicalCategoryMapping(
                        "toner",
                        ValueOrMissing.present(2L),
                        null,
                        "category-mapping-v1",
                        EXACT))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new CanonicalCategoryMapping(
                        "toner",
                        ValueOrMissing.present(2L),
                        RULE_ID,
                        " ",
                        EXACT))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> mapping("toner", ValueOrMissing.present(2L), null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static CanonicalCategoryMapping mapping(
            String observedValue,
            ValueOrMissing<Long> canonicalCategoryId,
            CanonicalMappingResolution resolution) {
        return new CanonicalCategoryMapping(
                observedValue,
                canonicalCategoryId,
                RULE_ID,
                "category-mapping-v1",
                resolution);
    }
}
