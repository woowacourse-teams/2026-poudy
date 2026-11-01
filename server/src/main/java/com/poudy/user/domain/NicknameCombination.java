package com.poudy.user.domain;

import java.util.concurrent.ThreadLocalRandom;

public final class NicknameCombination {

    public static final int FIRST_NUMBER = 1_000;
    public static final int LAST_NUMBER = 999_999;

    private static final NicknameAdjective[] ADJECTIVES = NicknameAdjective.values();
    private static final NicknameNoun[] NOUNS = NicknameNoun.values();

    private final NicknameAdjective adjective;
    private final NicknameNoun noun;

    public NicknameCombination(NicknameAdjective adjective, NicknameNoun noun) {
        this.adjective = adjective;
        this.noun = noun;
    }

    public static NicknameCombination random() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        return new NicknameCombination(
            ADJECTIVES[random.nextInt(ADJECTIVES.length)],
            NOUNS[random.nextInt(NOUNS.length)]
        );
    }

    public String nicknameOf(int number) {
        return adjective.word() + " " + noun.word() + " " + number;
    }

    public String adjectiveWord() {
        return adjective.word();
    }

    public String nounWord() {
        return noun.word();
    }
}
