package com.poudy.user.domain;

import com.poudy.exception.ErrorCode;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

public final class Nickname {

    private static final Pattern ALLOWED = Pattern.compile("[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+(?: [가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+)*");
    private static final List<String> FORBIDDEN_WORDS = List.of(
        "관리자",
        "운영자",
        "어드민",
        "admin",
        "moderator"
    );

    private final String value;

    public Nickname(String value) {
        if (value == null || value.isEmpty()) {
            throw new InvalidNicknameException(ErrorCode.INVALID_NICKNAME);
        }
        if (value.length() < 2) {
            throw new InvalidNicknameException(ErrorCode.NICKNAME_TOO_SHORT);
        }
        if (value.length() > 20) {
            throw new InvalidNicknameException(ErrorCode.NICKNAME_TOO_LONG);
        }
        if (!ALLOWED.matcher(value).matches()) {
            throw new InvalidNicknameException(ErrorCode.INVALID_NICKNAME_FORMAT);
        }
        String compact = value.replace(" ", "").toLowerCase(Locale.ROOT);
        if (FORBIDDEN_WORDS.stream().anyMatch(compact::contains)) {
            throw new InvalidNicknameException(ErrorCode.RESERVED_NICKNAME);
        }
        this.value = value;
    }

    public String value() {
        return value;
    }
}
