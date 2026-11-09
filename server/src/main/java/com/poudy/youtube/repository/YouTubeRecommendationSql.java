package com.poudy.youtube.repository;

final class YouTubeRecommendationSql {
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
