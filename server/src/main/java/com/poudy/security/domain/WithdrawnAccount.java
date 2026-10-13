package com.poudy.security.domain;

import java.time.OffsetDateTime;

public record WithdrawnAccount(
    OAuthProvider provider,
    String email,
    OffsetDateTime withdrawnAt,
    OffsetDateTime restorableUntil) {
}
