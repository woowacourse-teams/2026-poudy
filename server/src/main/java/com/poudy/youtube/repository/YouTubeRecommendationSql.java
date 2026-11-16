package com.poudy.youtube.repository;

final class YouTubeRecommendationSql {
    /** 게시 기간은 제한하지 않는다. 게시일이 아직 오지 않은 영상만 뺀다. */
    static final String PUBLISHED = "v.published_at <= (now() AT TIME ZONE 'Asia/Seoul')";

    static final String RECOMMENDED = """
        vp.recommendation='recommended'
        and exists(select 1 from youtube_product_mention m where m.video_id=v.id
            and m.product_id=vp.product_id and m.recommendation='recommended')
        and not exists(select 1 from youtube_product_mention m where m.video_id=v.id
            and m.product_id=vp.product_id and m.recommendation in ('mixed','not_recommended','uncertain'))
        """;

    private YouTubeRecommendationSql() {
    }
}
