package com.poudy.security.auth.admin.service;

import com.poudy.security.auth.admin.ratelimit.AdminLoginRateLimiter;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class AdminLoginService {

    private final String expectedUsername;
    private final String expectedPassword;
    private final AdminLoginRateLimiter rateLimiter;

    public AdminLoginService(
        @Value("${poudy.admin.username:}") String expectedUsername,
        @Value("${poudy.admin.password:}") String expectedPassword,
        AdminLoginRateLimiter rateLimiter
    ) {
        this.expectedUsername = expectedUsername;
        this.expectedPassword = expectedPassword;
        this.rateLimiter = rateLimiter;
    }

    public boolean matches(String username, String password, String clientId) {
        rateLimiter.requireAllowed(clientId);
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
