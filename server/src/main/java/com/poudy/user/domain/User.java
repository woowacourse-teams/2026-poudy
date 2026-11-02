package com.poudy.user.domain;

import com.poudy.security.domain.OAuthProvider;
import com.poudy.security.domain.RegisteredAccount;
import com.poudy.security.domain.SocialLoginResult;
import com.poudy.skintype.domain.SkinType;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

public final class User {

    private final long id;
    private final OAuthProvider provider;
    private final String email;
    private final String nickname;
    private final UUID profileImageId;
    private final Gender gender;
    private final AgeRange ageRange;
    private final SkinType skinType;
    private final Boolean sensitiveSkin;
    private final UserStatus status;
    private final boolean profileSetupCompleted;

    public User(
        long id,
        OAuthProvider provider,
        String email,
        String nickname,
        UUID profileImageId,
        Gender gender,
        AgeRange ageRange,
        SkinType skinType,
        Boolean sensitiveSkin,
        UserStatus status
    ) {
        this(id, provider, email, nickname, profileImageId, gender, ageRange, skinType, sensitiveSkin, status, true);
    }

    public User(
        long id,
        OAuthProvider provider,
        String email,
        String nickname,
        UUID profileImageId,
        Gender gender,
        AgeRange ageRange,
        SkinType skinType,
        Boolean sensitiveSkin,
        UserStatus status,
        boolean profileSetupCompleted
    ) {
        this.id = id;
        this.provider = provider;
        this.email = email;
        this.nickname = nickname;
        this.profileImageId = profileImageId;
        this.gender = gender;
        this.ageRange = ageRange;
        this.skinType = skinType;
        this.sensitiveSkin = sensitiveSkin;
        this.status = status;
        this.profileSetupCompleted = profileSetupCompleted;
    }

    public boolean profileSetupCompleted() {
        return profileSetupCompleted;
    }

    public boolean profileSetupCompletedAfter(boolean completionRequested) {
        return profileSetupCompleted || completionRequested;
    }

    public SocialLoginResult loginResult() {
        return new SocialLoginResult(id, status.loginStatus());
    }

    public RegisteredAccount registeredAccount() {
        return new RegisteredAccount(provider, email);
    }

    public boolean changesProfileImageTo(UUID requestedImageId) {
        return requestedImageId != null && !requestedImageId.equals(profileImageId);
    }

    public Optional<UUID> profileImageReplacedBy(UUID requestedImageId) {
        if (profileImageId == null || profileImageId.equals(requestedImageId)) {
            return Optional.empty();
        }
        return Optional.of(profileImageId);
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

    public String nickname() {
        return nickname;
    }

    public Optional<UUID> profileImageId() {
        return Optional.ofNullable(profileImageId);
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
