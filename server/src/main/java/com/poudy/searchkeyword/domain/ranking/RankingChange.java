package com.poudy.searchkeyword.domain.ranking;

import java.util.Objects;

public final class RankingChange {

    public enum Movement {
        NEW,
        UP,
        DOWN,
        SAME,
        NONE
    }

    private final Movement movement;
    private final int steps;

    private RankingChange(Movement movement, int steps) {
        this.movement = movement;
        this.steps = steps;
    }

    public static RankingChange unknown() {
        return new RankingChange(Movement.NONE, 0);
    }

    public static RankingChange entered() {
        return new RankingChange(Movement.NEW, 0);
    }

    public static RankingChange moved(int previousRank, int rank) {
        if (previousRank == rank) {
            return new RankingChange(Movement.SAME, 0);
        }
        if (previousRank > rank) {
            return new RankingChange(Movement.UP, previousRank - rank);
        }
        return new RankingChange(Movement.DOWN, rank - previousRank);
    }

    public boolean isKnown() {
        return movement != Movement.NONE;
    }

    public String movementName() {
        return movement.name();
    }

    public int steps() {
        return steps;
    }

    @Override
    public boolean equals(Object other) {
        return this == other || other instanceof RankingChange compared
            && movement == compared.movement
            && steps == compared.steps;
    }

    @Override
    public int hashCode() {
        return Objects.hash(movement, steps);
    }

    @Override
    public String toString() {
        return "RankingChange[" + movement + ", steps=" + steps + "]";
    }
}
