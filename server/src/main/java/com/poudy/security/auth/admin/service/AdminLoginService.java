package com.poudy.security.auth.admin.service;

import com.poudy.security.auth.admin.ratelimit.AdminLoginRateLimiter;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminLoginService {

    private static final Logger log = LoggerFactory.getLogger(AdminLoginService.class);
    private static final Pattern BCRYPT_HASH = Pattern.compile("\\$2[aby]?\\$\\d\\d\\$[./0-9A-Za-z]{53}");

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final String expectedUsername;
    private final String expectedPasswordHash;
    private final boolean passwordHashConfigured;
    private final AdminLoginRateLimiter rateLimiter;

    public AdminLoginService(
        @Value("${poudy.admin.username:}") String expectedUsername,
        @Value("${poudy.admin.password-hash:}") String expectedPasswordHash,
        AdminLoginRateLimiter rateLimiter
    ) {
        this.expectedUsername = expectedUsername;
        this.expectedPasswordHash = expectedPasswordHash;
        this.passwordHashConfigured = BCRYPT_HASH.matcher(expectedPasswordHash).matches();
        this.rateLimiter = rateLimiter;
        if (!passwordHashConfigured) {
            log.error("event=admin_login_disabled reason=password_hash_missing_or_not_bcrypt");
        }
    }

    public boolean matches(String username, String password, String clientId) {
        rateLimiter.requireAllowed(clientId);
        if (!passwordHashConfigured) {
            return false;
        }
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
