package com.poudy.user.domain;

import com.poudy.security.domain.OAuthProvider;
import java.time.OffsetDateTime;

public record RecoveryAccount(
    long userId,
    OAuthProvider provider,
    String maskedEmail,
    OffsetDateTime withdrawnAt,
    OffsetDateTime requestedAt,
    OffsetDateTime purgeEligibleAt,
    OffsetDateTime restoredAt,
    boolean canRestore,
    String status) {
}
