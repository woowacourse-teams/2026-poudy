package com.poudy.shelf.domain;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

// 진단 후보 중 성분군에 없는 성분. 값은 서비스 내부 성분 ID다.
final class SkinCautionIngredients {

    // 향료 알레르기 유발 성분 25종 중 향료/알레르기 성분군에 없는 것
    static final Set<Long> FRAGRANCE_ALLERGENS = ids(
        1539L, // 신나밀알코올
        1668L, // 아밀신나밀알코올
        1608L, // 아니스알코올
        1540L, // 신남알
        4603L, // 하이드록시시트로넬알
        2504L, // 아이소유제놀
        524L, // 벤질신나메이트
        3445L, // 파네솔
        203L, // 메틸2-옥티노에이트
        2779L, // 참나무이끼추출물
        1906L // 나무이끼추출물
    );

    // 향료 알레르기 유발 성분 25종 중 방부제·용제로도 쓰여 양성률이 가장 낮은 것
    static final Set<Long> MULTIPURPOSE_FRAGRANCE_ALLERGENS = ids(
        527L, // 벤질알코올
        522L // 벤질벤조에이트
    );

    static final Set<Long> PERU_BALSAM = ids(
        11754L, // 발삼페루수지
        20904L, // 발삼페루수지추출물
        6191L // 발삼페루오일
    );

    static final Set<Long> PROPOLIS = ids(
        3956L, // 프로폴리스추출물
        3955L, // 프로폴리스왁스
        21690L, // 프로폴리스수
        21230L // 프로폴리스소포
    );

    static final Set<Long> LANOLIN = ids(
        5257L, // 라놀린
        5258L // 라놀린알코올
    );

    // 향을 내는 원료라 향료로 본다
    static final Set<Long> COOLING_AGENTS = ids(
        244L, // 멘톨
        21893L, // 엘-멘톨
        2974L // 캠퍼
    );

    // 향을 내는 정유라 향료로 본다. 바우만은 페퍼민트오일과 유칼립투스오일을 직접 든다.
    static final Set<Long> ESSENTIAL_OILS = ids(
        // 라벤더
        5274L,
        8757L,
        17579L,
        21703L,
        5267L,
        18625L,
        19245L,
        20617L,
        9004L,
        20829L,
        // 페퍼민트
        3574L,
        18821L,
        // 유칼립투스
        2403L,
        14418L,
        20958L,
        2401L,
        2709L,
        2711L,
        2712L,
        5436L,
        19196L,
        15324L,
        19721L,
        19727L,
        20091L,
        20204L,
        20205L,
        20206L,
        // 티트리
        3440L,
        18824L,
        16190L,
        5439L,
        // 로즈마리
        5471L,
        19279L,
        8895L,
        // 일랑일랑
        2577L,
        10254L,
        // 제라늄
        1015L,
        5770L,
        9297L,
        18761L,
        2682L,
        9705L,
        19025L,
        // 레몬그라스와 같은 속 식물
        6508L,
        18820L,
        6780L,
        9525L,
        18822L,
        1522L,
        8632L,
        5419L,
        3512L,
        // 감귤 껍질
        2140L,
        5427L,
        101L,
        2311L,
        2593L,
        6871L,
        5719L,
        5516L,
        6822L,
        7053L,
        7525L,
        8475L,
        8560L,
        8566L,
        9066L,
        9782L,
        14817L,
        16474L,
        17942L,
        18546L,
        19589L,
        19820L,
        21220L,
        21468L,
        22007L,
        // 시나몬과 같은 속 식물(녹나무 포함)
        5797L,
        10139L,
        5119L,
        18369L,
        18257L,
        19250L,
        21558L,
        2554L,
        7245L,
        8498L,
        16485L,
        18669L,
        21162L,
        7258L,
        // 정향
        3173L,
        3175L,
        3176L,
        3177L,
        // 시나몬·정향·로즈마리·타임 혼합
        18379L
    );

    static final Set<Long> ALLERGENIC_PRESERVATIVES = ids(
        206L, // 메칠이소치아졸리논
        210L, // 메칠클로로이소치아졸리논
        2427L, // 이미다졸리디닐우레아
        5112L, // 디아졸리디닐우레아
        3110L, // 쿼터늄-15
        1263L, // 소듐하이드록시메칠글리시네이트
        631L, // 2-브로모-2-나이트로프로판-1,3-디올
        5147L, // 디엠디엠하이단토인
        229L, // 메텐아민
        17904L // 벤질헤미포름알
    );

    static final Set<Long> SULFITES = ids(
        1126L, // 소듐설파이트
        1098L, // 소듐메타바이설파이트
        1109L, // 소듐바이설파이트
        18738L // 포타슘메타바이설파이트
    );

    static final Set<Long> HYDROLYZED_WHEAT_PROTEIN = ids(
        4707L // 하이드롤라이즈드밀단백질
    );

    static final Set<Long> WEAK_EVIDENCE = ids(
        1938L, // 나이아신아마이드
        2070L, // 에틸헥실글리세린
        995L, // 세틸알코올
        973L, // 세테아릴알코올
        1472L // 스테아릴알코올
    );

    static final Set<Long> PRESERVATIVES = ids(
        1747L // 아이오도프로피닐부틸카바메이트
    );

    static final Set<Long> ALKYL_GLUCOSIDES = ids(
        3559L, // 데실글루코사이드
        2903L, // 카프릴릴/카프릴글루코사이드
        1631L, // 아라키딜글루코사이드
        968L, // 세테아릴글루코사이드
        3015L, // 코코-글루코사이드
        5333L, // 라우릴글루코사이드
        337L, // 미리스틸글루코사이드
        2899L, // 카프릴릴글루코사이드
        13172L, // 운데실글루코사이드
        8023L, // 팜커넬/코코글루코사이드
        20744L // 카프릴릴/카프릴글루코사이드/자일로사이드
    );

    // 바우만이 따가움을 일으킨다고 든 성분
    static final Set<Long> STINGING_INGREDIENTS = ids(
        506L, // 벤조익애씨드
        811L, // 살리실릭애씨드
        1298L, // 소르빅애씨드
        1079L, // 소듐라우릴설페이트
        594L // 부틸메톡시디벤조일메탄(아보벤존)
    );

    static final Set<Long> PHOTOALLERGENS = ids(
        511L // 벤조페논-3
    );

    // 캡사이신과 캡사이신이 든 고추 원료. 매운맛이 적은 파프리카는 뺀다.
    static final Set<Long> CAPSICUM = ids(
        9685L, // 캡사이신
        5242L, // 고추수지
        13660L, // 고추열매
        5209L, // 고추열매가루
        16910L, // 고추열매즙
        5264L, // 고추열매추출물
        5253L, // 고추추출물
        13875L // 하바네로열매추출물
    );

    static final Set<Long> GLYCOLS = ids(
        3959L // 프로필렌글라이콜
    );

    // 토너에 쓰이는 수렴 성분
    static final Set<Long> WITCH_HAZEL = ids(2365L, 2367L, 2366L, 2364L, 6402L, 2363L, 5567L, 6063L);

    // 거품 세안제의 세정 성분 중 설페이트 성분군에 없는 것
    static final Set<Long> CLEANSING_AGENTS = ids(
        1173L, // 소듐C14-16올레핀설포네이트
        1199L, // 소듐코코-설페이트
        1103L, // 소듐미레스설페이트
        40L, // 마그네슘라우레스설페이트
        3419L, // 티이에이-라우릴설페이트
        1043L // 소듐도데실벤젠설포네이트
    );

    // 비누를 이루는 지방산염
    static final Set<Long> SOAPS = ids(
        3663L,
        1235L,
        1241L,
        3642L,
        3649L,
        3636L,
        3672L,
        1063L,
        1137L,
        1237L,
        1104L,
        1174L,
        1204L,
        1224L,
        3656L,
        3671L,
        3673L,
        5774L,
        6234L,
        11147L
    );

    // 두꺼운 크림과 콜드크림의 밀폐 성분
    static final Set<Long> OCCLUSIVES = ids(
        317L, // 미네랄오일
        3572L, // 페트롤라툼
        5257L, // 라놀린
        1694L, // 아세틸레이티드라놀린
        2872L // 카카오씨버터
    );

    private SkinCautionIngredients() {
    }

    @SafeVarargs
    static Set<Long> union(Set<Long>... sets) {
        return Arrays.stream(sets).flatMap(Set::stream).collect(Collectors.toUnmodifiableSet());
    }

    private static Set<Long> ids(Long... ids) {
        return Set.of(ids);
    }
}
