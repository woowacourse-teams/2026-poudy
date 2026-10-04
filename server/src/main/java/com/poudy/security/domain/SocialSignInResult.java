package com.poudy.security.domain;

public final class SocialSignInResult {

    private enum Status {
        SIGNED_IN,
        WITHDRAWN,
        RESTORE_REQUESTED
    }

    private final long memberId;
    private final Status status;

    private SocialSignInResult(long memberId, Status status) {
        this.memberId = memberId;
        this.status = status;
    }

    public static SocialSignInResult signedIn(long memberId) {
        return new SocialSignInResult(memberId, Status.SIGNED_IN);
    }

    public static SocialSignInResult withdrawn(long memberId) {
        return new SocialSignInResult(memberId, Status.WITHDRAWN);
    }

    public static SocialSignInResult restoreRequested(long memberId) {
        return new SocialSignInResult(memberId, Status.RESTORE_REQUESTED);
    }

    public boolean isWithdrawn() {
        return status == Status.WITHDRAWN;
    }

    public boolean isRestoreRequested() {
        return status == Status.RESTORE_REQUESTED;
    }

    public long memberId() {
        return memberId;
    }
}
