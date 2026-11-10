package com.poudy.youtube.repository;

import com.poudy.youtube.domain.YouTubeChannel;
import com.poudy.youtube.domain.YouTubeChannelOrder;
import com.poudy.youtube.domain.YouTubeMention;
import com.poudy.youtube.domain.YouTubeProduct;
import com.poudy.youtube.domain.YouTubeVideo;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class YouTubeRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public YouTubeRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<YouTubeChannel> channels(int limit, int offset) {
        return channels(null, limit, offset);
    }

    public List<YouTubeChannel> channels(String channelId, int limit, int offset) {
        return jdbc.query(
            """
                    select c.*,count(distinct v.id) video_count,count(distinct m.product_id) product_count,
                        (select coalesce(sum(all_v.view_count),0) from youtube_video all_v
                         where all_v.channel_id=c.id
                           and all_v.published_at <= (now() AT TIME ZONE 'Asia/Seoul')) total_view_count
                    from youtube_channel c join youtube_video v on v.channel_id=c.id and v.visible
                    join youtube_product_mention m on m.video_id=v.id
                    join product p on p.id=m.product_id
                    where v.published_at between (now() AT TIME ZONE 'Asia/Seoul') - interval '1 year' and (now() AT TIME ZONE 'Asia/Seoul')
                and (cast(:channelId as text) is null or c.id=:channelId)
                group by c.id order by c.display_order,c.id limit :limit offset :offset
                    """,
            new MapSqlParameterSource().addValue("channelId", channelId).addValue("limit", limit)
                .addValue("offset", offset),
            (rs, row) -> new YouTubeChannel(
                rs.getString("id"),
                rs.getString("name"),
                rs.getObject("subscriber_count", Long.class),
                rs.getString("profile_image_url"),
                rs.getString("banner_image_url"),
                rs.getLong("video_count"),
                rs.getLong("product_count"),
                rs.getLong("total_view_count"),
                rs.getString("handle"),
                rs.getObject("metadata_checked_at", LocalDateTime.class).atOffset(ZoneOffset.ofHours(9))
            )
        );
    }

    public List<YouTubeVideo> videos(String channelId, Long productId, int limit, int offset) {
        var params = new MapSqlParameterSource().addValue("channelId", channelId).addValue("productId", productId)
            .addValue("limit", limit).addValue("offset", offset);
        List<YouTubeVideo> videos = jdbc.query(
            """
                    select v.*,c.name channel_name from youtube_video v join youtube_channel c on c.id=v.channel_id
                    where v.visible and v.published_at between (now() AT TIME ZONE 'Asia/Seoul') - interval '1 year' and (now() AT TIME ZONE 'Asia/Seoul')
                and (cast(:channelId as text) is null or v.channel_id=:channelId)
                    and exists(select 1 from youtube_product_mention m join product p on p.id=m.product_id
                        where m.video_id=v.id and (cast(:productId as bigint) is null or m.product_id=:productId))
                    order by v.published_at desc,v.id limit :limit offset :offset
                    """,
            params,
            (rs, row) -> new YouTubeVideo(
                rs.getString("id"),
                rs.getString("channel_id"),
                rs.getString("channel_name"),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("thumbnail_url"),
                rs.getLong("duration_ms"),
                rs.getObject("published_at", LocalDateTime.class).atOffset(ZoneOffset.ofHours(9)),
                rs.getObject("view_count", Long.class),
                List.of()
            )
        );
        if (videos.isEmpty()) {
            return videos;
        }
        params.addValue("videoIds", videos.stream().map(YouTubeVideo::id).toList());
        record VideoMention(String videoId, YouTubeMention mention) {
        }
        var rows = jdbc.query(
            """
                with recommendations as (
                    select v.channel_id,vp.product_id,count(*) recommended_video_count
                    from youtube_video_product vp join youtube_video v on v.id=vp.video_id
                    where v.visible and v.published_at between (now() AT TIME ZONE 'Asia/Seoul') - interval '1 year' and (now() AT TIME ZONE 'Asia/Seoul')
                and %s
                    group by v.channel_id,vp.product_id
                )
                select m.*,p.product_name,p.image_url,b.korean_name brand_name,
                    vp.recommendation video_recommendation,coalesce(r.recommended_video_count,0) recommended_video_count
                from youtube_product_mention m
                join youtube_video v on v.id=m.video_id
                join youtube_video_product vp on vp.video_id=m.video_id and vp.product_id=m.product_id
                join product p on p.id=m.product_id join brand b on b.id=p.brand_id
                left join recommendations r on r.channel_id=v.channel_id and r.product_id=m.product_id
                where m.video_id in (:videoIds) and (cast(:productId as bigint) is null or m.product_id=:productId)
                order by m.video_id,m.start_ms,m.source_ordinal
                """
                .formatted(YouTubeRecommendationSql.RECOMMENDED),
            params,
            (rs, row) -> new VideoMention(
                rs.getString("video_id"),
                new YouTubeMention(
                    rs.getInt("source_ordinal"),
                    rs.getLong("product_id"),
                    rs.getString("product_name"),
                    rs.getString("brand_name"),
                    rs.getString("image_url"),
                    rs.getString("spoken_name"),
                    rs.getLong("start_ms"),
                    rs.getObject("end_ms", Long.class),
                    rs.getString("summary"),
                    rs.getString("recommendation"),
                    rs.getString("recommendation_condition"),
                    rs.getString("video_recommendation"),
                    rs.getLong("recommended_video_count")
                )
            )
        );
        var mentions = rows.stream().collect(
            Collectors.groupingBy(
                VideoMention::videoId,
                Collectors.mapping(VideoMention::mention, Collectors.toList())
            )
        );
        return videos.stream().map(
            v -> new YouTubeVideo(
                v.id(),
                v.channelId(),
                v.channelName(),
                v.title(),
                v.description(),
                v.thumbnailUrl(),
                v.durationMs(),
                v.publishedAt(),
                v.viewCount(),
                mentions.getOrDefault(v.id(), List.of())
            )
        ).toList();
    }

    public List<YouTubeProduct> products(String channelId) {
        return jdbc.query(
            """
                select p.id,p.product_name,b.korean_name,p.image_url,max(v.published_at) last_mentioned_at,
                  count(*) video_count,
                  count(*) filter(where %s) recommended_video_count
                from youtube_video_product vp join youtube_video v on v.id=vp.video_id
                join product p on p.id=vp.product_id join brand b on b.id=p.brand_id
                where v.visible and v.channel_id=:channelId
                  and v.published_at between (now() AT TIME ZONE 'Asia/Seoul') - interval '1 year' and (now() AT TIME ZONE 'Asia/Seoul')
                  and exists(select 1 from youtube_product_mention m where m.video_id=v.id and m.product_id=p.id)
                group by p.id,b.korean_name order by recommended_video_count desc,last_mentioned_at desc,p.id
                """
                .formatted(YouTubeRecommendationSql.RECOMMENDED),
            Map.of("channelId", channelId),
            (rs, row) -> new YouTubeProduct(
                rs.getLong("id"),
                rs.getString("product_name"),
                rs.getString("korean_name"),
                rs.getString("image_url"),
                rs.getLong("recommended_video_count"),
                rs.getLong("video_count"),
                rs.getObject("last_mentioned_at", LocalDateTime.class).atOffset(ZoneOffset.ofHours(9))
            )
        );
    }

    public List<YouTubeChannelOrder> channelOrder() {
        return jdbc.query(
            "select id,name,display_order from youtube_channel order by display_order,id",
            Map.of(),
            (rs, row) -> new YouTubeChannelOrder(rs.getString("id"), rs.getString("name"), rs.getInt("display_order"))
        );
    }

    public boolean updateOrder(String channelId, int order) {
        return jdbc.update(
            "update youtube_channel set display_order=:position where id=:id",
            Map.of("position", order, "id", channelId)
        ) == 1;
    }

}
