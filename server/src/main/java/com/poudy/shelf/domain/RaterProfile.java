package com.poudy.shelf.domain;

import com.poudy.user.domain.User;

// 평가한 순간의 프로필. 프로필 코드가 나중에 바뀌어도 과거 기록을 읽을 수 있게 당시 코드를 문자열 그대로 둔다.
public record RaterProfile(String gender, String ageRange, String skinType, Boolean sensitiveSkin) {

    public static RaterProfile of(User user) {
        return new RaterProfile(
            nameOf(user.gender()),
            nameOf(user.ageRange()),
            nameOf(user.skinType()),
            user.sensitiveSkin()
        );
    }

    private static String nameOf(Enum<?> value) {
        if (value == null) {
            return null;
        }
        return value.name();
    }
}
