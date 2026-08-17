package com.poudy.offline.sensorysource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.poudy.offline.source.MissingReason;
import com.poudy.offline.source.ValueOrMissing;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

@DisplayName("처방 물성 원문 관측값")
class PhysicalPropertyMeasurementTest {

    @Test
    @DisplayName("한정자가 있는 값과 공개된 측정 조건을 손실 없이 보존한다")
    void preservesPublishedValueAndConditions() {
        PhysicalPropertyMeasurement measurement = new PhysicalPropertyMeasurement(
                "Viscosity",
                "< 1,000",
                ValueOrMissing.present("mPa·s"),
                ValueOrMissing.present("Brookfield"),
                ValueOrMissing.present("RVT spindle 2 / 20 rpm"),
                ValueOrMissing.present("25 °C, 24 h after manufacturing"));

        assertThat(measurement.valueExpressionAsPublished()).isEqualTo("< 1,000");
        assertThat(measurement.unitAsPublished())
                .isEqualTo(ValueOrMissing.present("mPa·s"));
        assertThat(measurement.equipment())
                .isEqualTo(ValueOrMissing.present("RVT spindle 2 / 20 rpm"));
        assertThat(measurement.conditions())
                .isEqualTo(ValueOrMissing.present("25 °C, 24 h after manufacturing"));
    }

    @Test
    @DisplayName("단위·측정법·장비·조건의 비공개 상태를 각각 보존한다")
    void preservesMissingMeasurementMetadata() {
        PhysicalPropertyMeasurement measurement = new PhysicalPropertyMeasurement(
                "pH",
                "5.0-5.5",
                ValueOrMissing.missing(MissingReason.NOT_APPLICABLE),
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED),
                ValueOrMissing.missing(MissingReason.NOT_PUBLISHED));

        assertThat(measurement.valueExpressionAsPublished()).isEqualTo("5.0-5.5");
        assertThat(measurement.unitAsPublished())
                .isEqualTo(ValueOrMissing.missing(MissingReason.NOT_APPLICABLE));
    }

    @Test
    @DisplayName("원문 값과 tagged 측정 metadata의 누락을 거부한다")
    void rejectsMissingRequiredValues() {
        ValueOrMissing<String> missing = ValueOrMissing.missing(MissingReason.NOT_PUBLISHED);

        assertThatThrownBy(
                () -> new PhysicalPropertyMeasurement(
                        " ",
                        "10",
                        missing,
                        missing,
                        missing,
                        missing))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new PhysicalPropertyMeasurement(
                        "Viscosity",
                        " ",
                        missing,
                        missing,
                        missing,
                        missing))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new PhysicalPropertyMeasurement(
                        "Viscosity",
                        "10",
                        null,
                        missing,
                        missing,
                        missing))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new PhysicalPropertyMeasurement(
                        "Viscosity",
                        "10",
                        missing,
                        null,
                        missing,
                        missing))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new PhysicalPropertyMeasurement(
                        "Viscosity",
                        "10",
                        missing,
                        missing,
                        null,
                        missing))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                () -> new PhysicalPropertyMeasurement(
                        "Viscosity",
                        "10",
                        missing,
                        missing,
                        missing,
                        null))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
