package com.poudy.user.domain;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.RegisteredAccount;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.skintype.domain.SkinType;
import java.util.Objects;

public final class User {

    private final long id;
    private final OAuthProvider provider;
    private final String email;
    private final Gender gender;
    private final AgeRange ageRange;
    private final SkinType skinType;
    private final Boolean sensitiveSkin;
    private final UserStatus status;

    public User(
        long id,
        OAuthProvider provider,
        String email,
        Gender gender,
        AgeRange ageRange,
        SkinType skinType,
        Boolean sensitiveSkin,
        UserStatus status
    ) {
        this.id = id;
        this.provider = provider;
        this.email = email;
        this.gender = gender;
        this.ageRange = ageRange;
        this.skinType = skinType;
        this.sensitiveSkin = sensitiveSkin;
        this.status = status;
    }

    public SocialLoginResult loginResult() {
        return new SocialLoginResult(id, status.loginStatus());
    }

    public RegisteredAccount registeredAccount() {
        return new RegisteredAccount(provider, email);
    }

    public boolean hasSameSkinAs(User other) {
        return skinType == other.skinType && Objects.equals(sensitiveSkin, other.sensitiveSkin);
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

    public SkinType skinType() {
        return skinType;
    }

    public Boolean sensitiveSkin() {
        return sensitiveSkin;
    }
}
