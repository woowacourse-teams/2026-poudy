package com.poudy.admin.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class EnvironmentAdminCredentialVerifier implements AdminCredentialVerifier {

    private final String expectedUsername;
    private final String expectedPassword;

    public EnvironmentAdminCredentialVerifier(
        @Value("${poudy.admin.username:}") String expectedUsername,
        @Value("${poudy.admin.password:}") String expectedPassword
    ) {
        this.expectedUsername = expectedUsername;
        this.expectedPassword = expectedPassword;
    }

    @Override
    public boolean verify(String username, String password) {
        boolean usernameMatches = constantTimeEquals(expectedUsername, username);
        boolean passwordMatches = constantTimeEquals(expectedPassword, password);
        return usernameMatches & passwordMatches;
    }

    private boolean constantTimeEquals(String expected, String actual) {
        if (expected == null || actual == null) {
            return false;
        }

        return MessageDigest.isEqual(
            expected.getBytes(StandardCharsets.UTF_8),
            actual.getBytes(StandardCharsets.UTF_8)
        );
    }
}
