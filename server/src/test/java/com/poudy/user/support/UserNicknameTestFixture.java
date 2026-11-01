package com.poudy.user.support;

import java.util.UUID;

public final class UserNicknameTestFixture {

    private UserNicknameTestFixture() {
    }

    public static String nickname() {
        return "테스트 " + UUID.randomUUID().toString().substring(0, 8);
    }
}
