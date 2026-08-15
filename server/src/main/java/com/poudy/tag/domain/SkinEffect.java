package com.poudy.tag.domain;

import java.util.Arrays;
import java.util.Optional;

public enum SkinEffect {

    ACNE_RELATED(101L, "여드름 관련"),
    ANTIMICROBIAL_RELATED(102L, "항균 작용 관련"),
    ANTI_INFLAMMATORY_RELATED(103L, "항염 관련"),
    ANTIOXIDANT_RELATED(104L, "항산화 관련"),
    BARRIER_SUPPORT_RELATED(105L, "피부 장벽 관련"),
    BRIGHTENING_RELATED(106L, "미백 관련"),
    EXFOLIATION_RELATED(107L, "각질 관리 관련"),
    HYDRATION_RELATED(108L, "수분 공급 관련"),
    PIGMENTATION_RELATED(109L, "색소 침착 관련"),
    SEBUM_CONTROL_RELATED(110L, "피지 조절 관련"),
    SOOTHING_RELATED(111L, "진정 관련"),
    WRINKLE_RELATED(112L, "주름 관련");

    private final Long id;
    private final String displayName;

    SkinEffect(Long id, String displayName) {
        this.id = id;
        this.displayName = displayName;
    }

    public static Optional<SkinEffect> from(String name) {
        return Arrays.stream(values()).filter(effect -> effect.name().equals(name)).findFirst();
    }

    public Long id() {
        return id;
    }

    public String displayName() {
        return displayName;
    }
}
