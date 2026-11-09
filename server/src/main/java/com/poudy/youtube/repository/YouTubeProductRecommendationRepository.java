package com.poudy.youtube.repository;

import com.poudy.product.domain.ProductYouTubeRecommendation;
import com.poudy.product.domain.ProductYouTubeVideo;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class YouTubeProductRecommendationRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public YouTubeProductRecommendationRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ProductYouTubeRecommendation> findFor(long productId) {
        return jdbc.query(
            """
                with ranked as (
                    select v.id,v.title,v.thumbnail_url,v.channel_id,
                        count(*) over(partition by v.channel_id) recommended_video_count,
                        row_number() over(partition by v.channel_id order by v.published_at desc,v.id) position
                    from youtube_video_product vp join youtube_video v on v.id=vp.video_id
                    where vp.product_id=:productId and v.visible
                        and v.published_at between (now() AT TIME ZONE 'Asia/Seoul') - interval '1 year'
                            and (now() AT TIME ZONE 'Asia/Seoul')
                        and %s
                )
                select c.id channel_id,c.name channel_name,r.recommended_video_count,
                    r.id,r.title,r.thumbnail_url
                from ranked r join youtube_channel c on c.id=r.channel_id
                where r.position=1
                order by c.display_order,c.id
                """.formatted(YouTubeRecommendationSql.RECOMMENDED),
            Map.of("productId", productId),
            (rs, row) -> new ProductYouTubeRecommendation(
                rs.getString("channel_id"),
                rs.getString("channel_name"),
                rs.getLong("recommended_video_count"),
                new ProductYouTubeVideo(rs.getString("id"), rs.getString("title"), rs.getString("thumbnail_url"))
            )
        );
    }
}
