package com.poudy.member.domain;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.SocialSignInResult;

public final class Member {

    private final long id;
    private final OAuthProvider provider;
    private final String email;
    private final Gender gender;
    private final AgeRange ageRange;
    private final MemberSkinType skinType;
    private final MemberStatus status;

    public Member(
        long id,
        OAuthProvider provider,
        String email,
        Gender gender,
        AgeRange ageRange,
        MemberSkinType skinType,
        MemberStatus status
    ) {
        this.id = id;
        this.provider = provider;
        this.email = email;
        this.gender = gender;
        this.ageRange = ageRange;
        this.skinType = skinType;
        this.status = status;
    }

    public SocialSignInResult signInResult() {
        return new SocialSignInResult(id, status.signInStatus());
    }

    public long id() {
        return id;
    }

    public OAuthProvider provider() {
        return provider;
    }

    public String email() {
        return email;
    }

    public Gender gender() {
        return gender;
    }

    public AgeRange ageRange() {
        return ageRange;
    }

    public MemberSkinType skinType() {
        return skinType;
    }
}
