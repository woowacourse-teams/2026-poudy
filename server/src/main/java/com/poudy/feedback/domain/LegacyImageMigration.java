package com.poudy.feedback.domain;

import java.util.List;

public final class LegacyImageMigration {

    private final List<LegacyFeedbackImage> toMove;
    private final List<LegacyFeedbackImage> toDiscard;

    public LegacyImageMigration(List<LegacyFeedbackImage> toMove, List<LegacyFeedbackImage> toDiscard) {
        this.toMove = List.copyOf(toMove);
        this.toDiscard = List.copyOf(toDiscard);
    }

    public List<LegacyFeedbackImage> toMove() {
        return toMove;
    }

    public List<LegacyFeedbackImage> toDiscard() {
        return toDiscard;
    }

    public long failedAmong(long moved, long discarded) {
        return toMove.size() + toDiscard.size() - moved - discarded;
    }
}
