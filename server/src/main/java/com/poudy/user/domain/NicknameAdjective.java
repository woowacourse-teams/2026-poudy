package com.poudy.user.domain;

public enum NicknameAdjective {

    COZY("포근한"),
    GENTLE("상냥한"),
    AFFECTIONATE("다정한"),
    FRESH("산뜻한"),
    VERDANT("싱그러운"),
    SPIRITED("씩씩한"),
    BRAVE("용감한"),
    RELAXED("느긋한"),
    DILIGENT("부지런한"),
    JOYFUL("즐거운"),
    HAPPY("행복한"),
    SHY("수줍은"),
    QUIRKY("엉뚱한"),
    RELIABLE("든든한"),
    WARM("따뜻한"),
    COOL("시원한"),
    FRAGRANT("향긋한"),
    SWEET("달콤한"),
    ZESTY("상큼한"),
    CUTE("귀여운"),
    ADORABLE("깜찍한"),
    SMART("똑똑한"),
    WISE("슬기로운"),
    CALM("차분한"),
    LIVELY("활기찬"),
    CHEERFUL("명랑한"),
    MATURE("의젓한"),
    CONFIDENT("당당한"),
    GENEROUS("너그러운"),
    PRECIOUS("소중한"),
    METICULOUS("꼼꼼한"),
    SINCERE("성실한"),
    WELCOME("반가운"),
    STURDY("단단한"),
    ADMIRABLE("기특한"),
    LOVELY("사랑스러운"),
    GRATEFUL("고마운"),
    REFRESHING("상쾌한"),
    KIND("친절한"),
    PURE("순수한"),
    MYSTERIOUS("신비로운"),
    GALLANT("늠름한"),
    DEPENDABLE("듬직한"),
    SNUG("아늑한"),
    PEACEFUL("평화로운"),
    FRIENDLY("정다운"),
    PLEASANT("유쾌한"),
    BUBBLY("발랄한"),
    MILD("온화한"),
    HUMBLE("겸손한");

    private final String word;

    NicknameAdjective(String word) {
        this.word = word;
    }

    public String word() {
        return word;
    }
}
