package com.poudy.youtube.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.poudy.product.domain.ProductYouTubeRecommendation;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class YouTubeProductRecommendationRepositoryTest {
    @Autowired
    private YouTubeProductRecommendationRepository repository;
    @Autowired
    private YouTubeRepository youtube;
    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void channels() {
        jdbc.update("""
            insert into youtube_channel(id,name,display_order,metadata_checked_at)
            values('a','유튜버 A',2,now()),('b','유튜버 B',1,now()),('empty','추천 없음',0,now())
            """);
    }

    @Test
    void groupsByChannelAndKeepsWholeCountWhenSelectingLatestVideo() {
        video(1, "a", 1, -10, true, "recommended", "recommended", "old.jpg");
        video(2, "a", 1, -2, true, "recommended", "recommended", "latest.jpg");
        mention(2, 2, 1, "recommended");
        video(3, "b", 1, -3, true, "recommended", "recommended", null);
        video(4, "a", 7, -1, true, "recommended", "recommended", null);
        var found = repository.findFor(1);
        assertThat(found).extracting(ProductYouTubeRecommendation::channelId).containsExactly("b", "a");
        assertThat(found.get(0).channelName()).isEqualTo("유튜버 B");
        assertThat(found.get(0).recommendedVideoCount()).isEqualTo(1);
        assertThat(found.get(0).latestVideo().thumbnailUrl()).isNull();
        assertThat(found.get(1).recommendedVideoCount()).isEqualTo(2);
        assertThat(found.get(1).latestVideo().id()).isEqualTo(id(2));
        assertThat(found.get(1).latestVideo().title()).isEqualTo("영상 2");
        assertThat(found.get(1).latestVideo().thumbnailUrl()).isEqualTo("latest.jpg");
    }

    @Test
    void countsAllVideosBeyondExistingPageLimits() {
        for (int i = 1; i <= 55; i++) {
            video(i, "a", 1, -i, true, "recommended", "recommended", null);
        }
        var found = repository.findFor(1).getFirst();
        assertThat(found.recommendedVideoCount()).isEqualTo(55);
        assertThat(found.latestVideo().id()).isEqualTo(id(1));
    }

    @ParameterizedTest
    @ValueSource(strings = {"mixed", "not_recommended", "neutral", "uncertain"})
    void ignoresNewerVideosWithoutAnUnambiguousRecommendation(String rating) {
        video(1, "a", 1, -10, true, "recommended", "recommended", null);
        video(2, "a", 1, -1, true, rating, "recommended", null);
        video(3, "a", 1, -2, true, "recommended", rating, null);
        if (!rating.equals("neutral")) {
            mention(3, 2, 1, "recommended");
        }
        var found = repository.findFor(1).getFirst();
        assertThat(found.recommendedVideoCount()).isEqualTo(1);
        assertThat(found.latestVideo().id()).isEqualTo(id(1));
        assertThat(youtube.products("a").getFirst().recommendedVideoCount()).isEqualTo(1);
        assertThat(youtube.videos("a", 1L, 1, 0).getFirst().mentions().getFirst().recommendedVideoCount()).isEqualTo(1);
    }

    @Test
    void excludesHiddenOldFutureAndUnsubstantiatedVideos() {
        video(1, "a", 1, -3, true, "recommended", "recommended", null);
        video(2, "a", 1, -1, false, "recommended", "recommended", null);
        video(3, "a", 1, -400, true, "recommended", "recommended", null);
        video(4, "a", 1, 1, true, "recommended", "recommended", null);
        video(5, "a", 1, -2, true, "recommended", "recommended", null);
        jdbc.update("delete from youtube_product_mention where video_id=?", id(5));
        var found = repository.findFor(1).getFirst();
        assertThat(found.recommendedVideoCount()).isEqualTo(1);
        assertThat(found.latestVideo().id()).isEqualTo(id(1));
    }

    @Test
    void breaksPublicationTiesByVideoIdAndChannelOrderTiesByChannelId() {
        jdbc.update("update youtube_channel set display_order=0");
        video(2, "a", 1, -1, true, "recommended", "recommended", null);
        video(1, "a", 1, -1, true, "recommended", "recommended", null);
        video(3, "b", 1, -1, true, "recommended", "recommended", null);
        var found = repository.findFor(1);
        assertThat(found).extracting(ProductYouTubeRecommendation::channelId).containsExactly("a", "b");
        assertThat(found.getFirst().latestVideo().id()).isEqualTo(id(1));
    }

    @Test
    void returnsEmptyForProductsWithoutRecommendations() {
        video(1, "a", 7, -1, true, "neutral", "neutral", null);
        assertThat(repository.findFor(1)).isEmpty();
        assertThat(repository.findFor(7)).isEmpty();
    }

    private void video(
        int number,
        String channel,
        long productId,
        int days,
        boolean visible,
        String videoRating,
        String mentionRating,
        String thumbnail
    ) {
        jdbc.update(
            """
                insert into youtube_video(id,channel_id,title,thumbnail_url,duration_ms,published_at,metadata_checked_at,visible)
                values(?,?,?,?,10000,(now() AT TIME ZONE 'Asia/Seoul')+?*interval '1 day',now(),?)
                """,
            id(number),
            channel,
            "영상 " + number,
            thumbnail,
            days,
            visible
        );
        jdbc.update(
            "insert into youtube_video_product(video_id,product_id,recommendation) values(?,?,?)",
            id(number),
            productId,
            videoRating
        );
        mention(number, 1, productId, mentionRating);
    }

    private void mention(int video, int ordinal, long productId, String rating) {
        jdbc.update("""
            insert into youtube_product_mention(video_id,source_ordinal,product_id,spoken_name,start_ms,summary,
                recommendation,source_batch_hash) values(?,?,?,'제품 발언',0,'추천 근거',?,?)
            """, id(video), ordinal, productId, rating, "a".repeat(64));
    }

    private String id(int number) {
        return "%011d".formatted(number);
    }
}
