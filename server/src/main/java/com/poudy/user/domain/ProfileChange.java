package com.poudy.user.domain;

public class ProfileChange {

    private final User previous;
    private final User updated;

    public ProfileChange(User previous, User updated) {
        this.previous = previous;
        this.updated = updated;
    }

    public boolean changesSkin() {
        return !updated.hasSameSkinAs(previous);
    }

    public User updated() {
        return updated;
    }
}
