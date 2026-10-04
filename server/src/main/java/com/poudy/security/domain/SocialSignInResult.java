package com.poudy.security.domain;

public record SocialSignInResult(long memberId, SignInStatus status) {
}
