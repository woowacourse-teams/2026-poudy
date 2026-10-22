package com.poudy.shelf.domain;

import com.poudy.user.domain.User;
import java.util.Objects;

// 평가한 순간의 프로필. 프로필 코드가 나중에 바뀌어도 과거 기록을 읽을 수 있게 당시 코드를 문자열 그대로 둔다.
public final class RaterProfile {

    private final String gender;
    private final String ageRange;
    private final String skinType;
    private final Boolean sensitiveSkin;

    public RaterProfile(String gender, String ageRange, String skinType, Boolean sensitiveSkin) {
        this.gender = gender;
        this.ageRange = ageRange;
        this.skinType = skinType;
        this.sensitiveSkin = sensitiveSkin;
    }

    public static RaterProfile of(User user) {
        return new RaterProfile(
            nameOf(user.gender()),
            nameOf(user.ageRange()),
            nameOf(user.skinType()),
            user.sensitiveSkin()
        );
    }

    public boolean hasSameValuesAs(RaterProfile other) {
        return Objects.equals(gender, other.gender)
            && Objects.equals(ageRange, other.ageRange)
            && Objects.equals(skinType, other.skinType)
            && Objects.equals(sensitiveSkin, other.sensitiveSkin);
    }

    public String gender() {
        return gender;
    }

    public String ageRange() {
        return ageRange;
    }

    public String skinType() {
        return skinType;
    }

    public Boolean sensitiveSkin() {
        return sensitiveSkin;
    }

    private static String nameOf(Enum<?> value) {
        if (value == null) {
            return null;
        }
        return value.name();
    }
}
