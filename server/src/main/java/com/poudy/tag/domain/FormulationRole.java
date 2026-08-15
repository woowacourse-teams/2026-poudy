package com.poudy.tag.domain;

import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

public enum FormulationRole {

    ABRASIVE(1L, "연마제"),
    ABSORBENT(2L, "흡수제"),
    ANTICAKING(3L, "케이킹 방지제"),
    ANTIMICROBIAL(4L, "항균제"),
    ANTIOXIDANT(5L, "산화방지제"),
    ANTISEBORRHEIC(6L, "지루 방지제"),
    ANTISTATIC(7L, "정전기 방지제"),
    BINDING(8L, "결합제"),
    BUFFERING(9L, "완충제"),
    BULKING(10L, "증량제"),
    CLEANSING(11L, "세정제"),
    COLORANT(12L, "착색제"),
    EMOLLIENT(13L, "유연제"),
    EMULSION_STABILISING(14L, "유화 안정제"),
    FILM_FORMING(15L, "피막 형성제"),
    FRAGRANCE_FUNCTIONAL(16L, "착향제"),
    HAIR_CONDITIONING(17L, "헤어 컨디셔닝제"),
    HUMECTANT(18L, "습윤제"),
    KERATOLYTIC(19L, "각질 제거제"),
    MOISTURISING(20L, "보습제"),
    OPACIFYING(21L, "불투명화제"),
    PERFUMING(22L, "향료"),
    PRESERVATIVE(23L, "보존제"),
    SKIN_CONDITIONING(24L, "피부 컨디셔닝제"),
    SOLVENT(25L, "용제"),
    SURFACTANT(26L, "계면활성제"),
    SURFACTANT_FOAM_BOOSTING(27L, "거품 증진제"),
    VISCOSITY_CONTROLLING(28L, "점도 조절제");

    private final Long id;
    private final String displayName;

    FormulationRole(Long id, String displayName) {
        this.id = id;
        this.displayName = displayName;
    }

    private static final Map<String, FormulationRole> BY_NAME = Arrays.stream(values())
            .collect(Collectors.toUnmodifiableMap(Enum::name, Function.identity()));

    public static Optional<FormulationRole> from(String name) {
        return Optional.ofNullable(BY_NAME.get(name));
    }

    public Long id() {
        return id;
    }

    public String displayName() {
        return displayName;
    }
}
