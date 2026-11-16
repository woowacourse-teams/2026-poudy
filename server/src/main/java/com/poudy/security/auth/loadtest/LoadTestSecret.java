package com.poudy.security.auth.loadtest;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ForbiddenRequestException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

public class LoadTestSecret {

    private static final int MIN_LENGTH = 32;

    private final byte[] value;

    public LoadTestSecret(String value) {
        if (value == null || value.strip().length() < MIN_LENGTH) {
            throw new IllegalStateException("부하 시험 로그인 비밀값은 " + MIN_LENGTH + "자 이상이어야 합니다.");
        }
        this.value = value.getBytes(StandardCharsets.UTF_8);
    }

    public void verify(String presented) {
        if (presented == null || !MessageDigest.isEqual(value, presented.getBytes(StandardCharsets.UTF_8))) {
            throw new ForbiddenRequestException(ErrorCode.FORBIDDEN);
        }
    }
}
