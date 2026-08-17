package com.poudy.offline.sensorysource;

import static com.poudy.offline.sensorysource.ApplicationTypeDecision.Resolution.CONFLICTING;
import static com.poudy.offline.sensorysource.ApplicationTypeDecision.Resolution.EXACT;
import static com.poudy.offline.sensorysource.ApplicationTypeDecision.Resolution.REVIEWED;
import static com.poudy.offline.sensorysource.ApplicationTypeDecision.Resolution.UNRESOLVED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.MissingReason;
import com.poudy.offline.source.StableId;
import com.poudy.offline.source.ValueOrMissing;
import com.poudy.product.domain.ApplicationType;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("application type 원천 판정")
class ApplicationTypeDecisionTest {

    private static final StableId RULE_ID = StableId.namespaced("application-type-rule", "official-usage");
    private static final ValueOrMissing<String> EVIDENCE = ValueOrMissing.present("공식 사용법 2문단");
    private static final ValueOrMissing<String> NO_LIMITATION = ValueOrMissing.missing(MissingReason.NOT_APPLICABLE);

    @Test
    @DisplayName("공식 근거가 있는 leave-on과 rinse-off 판정을 보존한다")
    void acceptsSupportedApplicationTypes() {
        ApplicationTypeDecision leaveOn = decision(ApplicationType.LEAVE_ON, EVIDENCE, EXACT, NO_LIMITATION);
        ApplicationTypeDecision rinseOff = decision(ApplicationType.RINSE_OFF, EVIDENCE, REVIEWED, NO_LIMITATION);

        assertThat(leaveOn.value()).isEqualTo(ApplicationType.LEAVE_ON);
        assertThat(leaveOn.evidenceLocation()).isEqualTo(EVIDENCE);
        assertThat(leaveOn.decisionRuleId()).isEqualTo(RULE_ID);
        assertThat(leaveOn.decisionRuleVersion()).isEqualTo("application-type-decision-v1");
        assertThat(leaveOn.resolution()).isEqualTo(EXACT);
        assertThat(leaveOn.limitationNote()).isEqualTo(NO_LIMITATION);
        assertThat(rinseOff.resolution()).isEqualTo(REVIEWED);
    }

    @Test
    @DisplayName("공식 근거가 없거나 상충하면 unknown 판정으로 보존한다")
    void acceptsUnknownDecisions() {
        ApplicationTypeDecision unresolved = decision(
                ApplicationType.UNKNOWN,
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                UNRESOLVED,
                ValueOrMissing.present("공식 정상 사용 절차가 공개되지 않음"));
        ApplicationTypeDecision conflicting = decision(
                ApplicationType.UNKNOWN,
                ValueOrMissing.present("공식 사용법 2문단과 4문단"),
                CONFLICTING,
                ValueOrMissing.present("제거 지침이 서로 상충함"));
        ApplicationTypeDecision inconclusive = decision(
                ApplicationType.UNKNOWN,
                ValueOrMissing.present("공식 사용법 2문단"),
                UNRESOLVED,
                ValueOrMissing.present("제거 여부를 확정할 수 없는 문구임"));

        assertThat(unresolved.resolution()).isEqualTo(UNRESOLVED);
        assertThat(conflicting.resolution()).isEqualTo(CONFLICTING);
        assertThat(inconclusive.evidenceLocation()).isEqualTo(ValueOrMissing.present("공식 사용법 2문단"));
    }

    @Test
    @DisplayName("leave-on과 rinse-off는 근거 위치가 없으면 거부한다")
    void rejectsSupportedTypesWithoutEvidence() {
        for (ApplicationType applicationType : List.of(ApplicationType.LEAVE_ON, ApplicationType.RINSE_OFF)) {
            assertThatThrownBy(
                    () -> decision(
                            applicationType,
                            ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                            EXACT,
                            NO_LIMITATION))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    @DisplayName("leave-on과 rinse-off는 미해결 또는 상충 상태일 수 없다")
    void rejectsUnsupportedResolutionForKnownApplicationType() {
        for (ApplicationType applicationType : List.of(ApplicationType.LEAVE_ON, ApplicationType.RINSE_OFF)) {
            for (ApplicationTypeDecision.Resolution resolution : List.of(UNRESOLVED, CONFLICTING)) {
                assertThatThrownBy(() -> decision(applicationType, EVIDENCE, resolution, NO_LIMITATION))
                        .isInstanceOf(IllegalArgumentException.class);
            }
        }
    }

    @Test
    @DisplayName("unknown은 정확 일치 또는 검수 완료 상태일 수 없다")
    void rejectsResolvedUnknownApplicationType() {
        for (ApplicationTypeDecision.Resolution resolution : List.of(EXACT, REVIEWED)) {
            assertThatThrownBy(
                    () -> decision(
                            ApplicationType.UNKNOWN,
                            EVIDENCE,
                            resolution,
                            ValueOrMissing.present("판정값과 해석 상태가 일치하지 않음")))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    @DisplayName("상충 상태는 근거 위치가 없으면 거부한다")
    void rejectsConflictingDecisionWithoutEvidenceLocation() {
        assertThatThrownBy(
                () -> decision(
                        ApplicationType.UNKNOWN,
                        ValueOrMissing.missing(MissingReason.CONFLICTING_SOURCES),
                        CONFLICTING,
                        ValueOrMissing.present("공식 지침이 서로 상충함")))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    @DisplayName("unknown은 미확정 이유가 없으면 거부한다")
    void rejectsUnknownDecisionWithoutLimitation() {
        for (ApplicationTypeDecision.Resolution resolution : List.of(UNRESOLVED, CONFLICTING)) {
            assertThatThrownBy(() -> decision(ApplicationType.UNKNOWN, EVIDENCE, resolution, NO_LIMITATION))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    @DisplayName("모든 필수 판정 값과 tagged limitation을 검증한다")
    void validatesRequiredValues() {
        assertThatThrownBy(() -> decision(null, EVIDENCE, EXACT, NO_LIMITATION))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> decision(ApplicationType.LEAVE_ON, null, EXACT, NO_LIMITATION))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new ApplicationTypeDecision(
                        ApplicationType.LEAVE_ON,
                        EVIDENCE,
                        null,
                        "application-type-decision-v1",
                        EXACT,
                        NO_LIMITATION))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new ApplicationTypeDecision(
                        ApplicationType.LEAVE_ON,
                        EVIDENCE,
                        RULE_ID,
                        " ",
                        EXACT,
                        NO_LIMITATION))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> decision(ApplicationType.LEAVE_ON, EVIDENCE, null, NO_LIMITATION))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> decision(ApplicationType.LEAVE_ON, EVIDENCE, EXACT, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    private static ApplicationTypeDecision decision(
            ApplicationType value,
            ValueOrMissing<String> evidenceLocation,
            ApplicationTypeDecision.Resolution resolution,
            ValueOrMissing<String> limitationNote) {
        return new ApplicationTypeDecision(
                value,
                evidenceLocation,
                RULE_ID,
                "application-type-decision-v1",
                resolution,
                limitationNote);
    }
}
