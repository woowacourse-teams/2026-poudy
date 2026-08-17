package com.poudy.offline.sensorysource;

import com.poudy.offline.source.ValueOrMissing;

public record PhysicalPropertyMeasurement(
        String propertyNameAsPublished,
        String valueExpressionAsPublished,
        ValueOrMissing<String> unitAsPublished,
        ValueOrMissing<String> measurementMethod,
        ValueOrMissing<String> equipment,
        ValueOrMissing<String> conditions) {

    public PhysicalPropertyMeasurement {
        propertyNameAsPublished = requireNonBlank(
                propertyNameAsPublished,
                "물성 이름");
        valueExpressionAsPublished = requireNonBlank(
                valueExpressionAsPublished,
                "물성 값 원문");
        requireTaggedValue(unitAsPublished, "물성 단위");
        requireTaggedValue(measurementMethod, "물성 측정법");
        requireTaggedValue(equipment, "물성 측정 장비");
        requireTaggedValue(conditions, "물성 측정 조건");
    }

    private static String requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + "이 필요합니다.");
        }
        return value;
    }

    private static void requireTaggedValue(ValueOrMissing<String> value, String name) {
        if (value == null) {
            throw new IllegalArgumentException(name + " 또는 결측 이유가 필요합니다.");
        }
    }
}
