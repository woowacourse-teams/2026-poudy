package com.poudy.member.domain;

import com.poudy.security.domain.OAuthProvider;
import java.time.OffsetDateTime;

public record RestoreRequest(
    long memberId,
    OAuthProvider provider,
    String email,
    OffsetDateTime withdrawnAt,
    OffsetDateTime requestedAt) {
}
