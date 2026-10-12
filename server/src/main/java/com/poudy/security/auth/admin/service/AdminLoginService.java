package com.poudy.security.auth.admin.service;

import com.poudy.security.auth.admin.ratelimit.AdminLoginRateLimiter;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminLoginService {

    private static final Pattern BCRYPT_HASH = Pattern.compile("\\$2[aby]?\\$\\d\\d\\$[./0-9A-Za-z]{53}");

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final String expectedUsername;
    private final String expectedPasswordHash;
    private final AdminLoginRateLimiter rateLimiter;

    public AdminLoginService(
        @Value("${poudy.admin.username:}") String expectedUsername,
        @Value("${poudy.admin.password-hash:}") String expectedPasswordHash,
        AdminLoginRateLimiter rateLimiter
    ) {
        if (!expectedPasswordHash.isEmpty() && !BCRYPT_HASH.matcher(expectedPasswordHash).matches()) {
            throw new IllegalArgumentException("관리자 비밀번호 해시가 BCrypt 형식이 아닙니다.");
        }
        this.expectedUsername = expectedUsername;
        this.expectedPasswordHash = expectedPasswordHash;
        this.rateLimiter = rateLimiter;
    }

    public boolean matches(String username, String password, String clientId) {
        rateLimiter.requireAllowed(clientId);
        boolean usernameMatches = constantTimeEquals(expectedUsername, username);
        boolean passwordMatches = passwordEncoder.matches(password, expectedPasswordHash);
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
