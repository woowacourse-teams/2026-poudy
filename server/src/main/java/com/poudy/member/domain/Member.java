package com.poudy.member.domain;

import com.poudy.security.domain.OAuthProvider;

public final class Member {

    private final long id;
    private final OAuthProvider provider;
    private final String email;
    private final Gender gender;
    private final AgeRange ageRange;
    private final MemberSkinType skinType;

    public Member(
        long id,
        OAuthProvider provider,
        String email,
        Gender gender,
        AgeRange ageRange,
        MemberSkinType skinType
    ) {
        this.id = id;
        this.provider = provider;
        this.email = email;
        this.gender = gender;
        this.ageRange = ageRange;
        this.skinType = skinType;
    }

    public boolean isProfileCompleted() {
        return gender != null && ageRange != null && skinType != null;
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
