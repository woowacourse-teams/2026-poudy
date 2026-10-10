package com.poudy.security.domain;

import java.util.Locale;
import java.util.Map;

public enum OAuthProvider {

    KAKAO {
        @Override
        public OAuthAccount parseAccount(Map<String, Object> attributes) {
            Map<?, ?> kakaoAccount = nestedMap(attributes, "kakao_account");
            return new OAuthAccount(
                this,
                textValue(attributes, "id"),
                textValue(kakaoAccount, "email"),
                isTrue(kakaoAccount, "is_email_valid") && isTrue(kakaoAccount, "is_email_verified")
            );
        }
    },
    GOOGLE {
        @Override
        public OAuthAccount parseAccount(Map<String, Object> attributes) {
            return new OAuthAccount(
                this,
                textValue(attributes, "sub"),
                textValue(attributes, "email"),
                isTrue(attributes, "email_verified")
            );
        }
    };

    public static OAuthProvider from(String registrationId) {
        return valueOf(registrationId.toUpperCase(Locale.ROOT));
    }

    public abstract OAuthAccount parseAccount(Map<String, Object> attributes);

    private static Map<?, ?> nestedMap(Map<?, ?> attributes, String key) {
        if (attributes.get(key) instanceof Map<?, ?> value) {
            return value;
        }
        return Map.of();
    }

    private static String textValue(Map<?, ?> attributes, String key) {
        Object value = attributes.get(key);
        if (value == null) {
            return null;
        }
        return String.valueOf(value);
    }

    private static boolean isTrue(Map<?, ?> attributes, String key) {
        return Boolean.TRUE.equals(attributes.get(key));
    }
}
