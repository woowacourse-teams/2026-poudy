package com.poudy.user.domain;

public enum NicknameNoun {

    SQUIRREL("다람쥐"),
    RED_SQUIRREL("청설모"),
    CAT("고양이"),
    PUPPY("강아지"),
    RABBIT("토끼"),
    HAMSTER("햄스터"),
    OTTER("수달"),
    PANDA("판다"),
    PENGUIN("펭귄"),
    KOALA("코알라"),
    FOX("여우"),
    RACCOON("너구리"),
    HEDGEHOG("고슴도치"),
    DUCK("오리"),
    CHICK("병아리"),
    SPARROW("참새"),
    OWL("부엉이"),
    DOLPHIN("돌고래"),
    SEA_OTTER("해달"),
    ALPACA("알파카"),
    GIRAFFE("기린"),
    ELEPHANT("코끼리"),
    DEER("사슴"),
    SEAL("물개"),
    TURTLE("거북이"),
    TIGER("호랑이"),
    WHALE("고래"),
    BUTTERFLY("나비"),
    BEE("꿀벌"),
    FIREFLY("반딧불이"),
    POLAR_BEAR("북극곰"),
    LION("사자"),
    ZEBRA("얼룩말"),
    KANGAROO("캥거루"),
    MEERKAT("미어캣"),
    CHINCHILLA("친칠라"),
    PARROT("앵무새"),
    MOLE("두더지"),
    HIPPO("하마"),
    SHEEP("양"),
    FOAL("망아지"),
    CALF("송아지"),
    WATER_DEER("고라니"),
    SEAHORSE("해마"),
    BEAVER("비버"),
    CAPYBARA("카피바라"),
    RED_PANDA("레서판다"),
    QUOKKA("쿼카"),
    CAMEL("낙타"),
    MARTEN("담비");

    private final String word;

    NicknameNoun(String word) {
        this.word = word;
    }

    public String word() {
        return word;
    }
}
