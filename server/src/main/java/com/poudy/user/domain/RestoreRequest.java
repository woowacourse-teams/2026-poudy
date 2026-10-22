package com.poudy.user.domain;

import com.poudy.security.domain.OAuthProvider;
import java.time.OffsetDateTime;

public record RestoreRequest(
    long userId,
    OAuthProvider provider,
    String email,
    OffsetDateTime withdrawnAt,
    OffsetDateTime requestedAt) {
}
