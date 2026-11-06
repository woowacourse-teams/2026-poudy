package com.poudy.youtube.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class YouTubeSchemaTest {

    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void prepareVideo() {
        jdbc.update("insert into youtube_channel(id,name,metadata_checked_at) values('channel','채널',now())");
        jdbc.update("""
            insert into youtube_video(id,channel_id,title,duration_ms,published_at,metadata_checked_at)
            values('abcdefghijk','channel','영상',10000,now(),now())
            """);
        jdbc.update("""
            insert into youtube_video_product(video_id,product_id,recommendation)
            values('abcdefghijk',1,'recommended')
            """);
    }

    @Test
    void allowsRepeatedMentionsWithOneVideoProductLinkAndPreservesSpokenName() {
        mention(1, 1, 1000, 2000L);
        mention(2, 1, 3000, null);
        assertThat(jdbc.queryForObject("select count(*) from youtube_video_product", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from youtube_product_mention", Integer.class)).isEqualTo(2);
        assertThat(jdbc.queryForObject("select visible from youtube_video", Boolean.class)).isFalse();
        assertThat(jdbc.queryForObject("""
            select spoken_name from youtube_product_mention where source_ordinal=1
            """, String.class)).isEqualTo("실제 발언명");
    }

    @Test
    void rejectsProductAbsentFromService() {
        assertThatThrownBy(() -> jdbc.update("""
            insert into youtube_video_product values('abcdefghijk',999999,'recommended')
            """)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsMentionForAnotherProductWithoutVideoMapping() {
        assertThatThrownBy(() -> mention(1, 2, 1000, 2000L))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsDuplicateSourceOrdinal() {
        mention(1, 1, 1000, 2000L);
        assertThatThrownBy(() -> mention(1, 1, 3000, 4000L))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsDuplicateVideoProduct() {
        assertThatThrownBy(() -> jdbc.update("""
            insert into youtube_video_product values('abcdefghijk',1,'recommended')
            """)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(longs = {-1, 10000, 10001})
    void rejectsInvalidStart(long start) {
        assertThatThrownBy(() -> mention(1, 1, start, null)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(longs = {999, 1000, 10001})
    void rejectsInvalidEnd(long end) {
        assertThatThrownBy(() -> mention(1, 1, 1000, end)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void rejectsDurationReductionThatCutsAnExistingMention() {
        mention(1, 1, 1000, 2000L);
        assertThatThrownBy(() -> jdbc.update("update youtube_video set duration_ms=1500"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"mixed", "not_recommended", "neutral", "uncertain"})
    void storesInformationalAssessments(String assessment) {
        mention(1, 1, 1000, 2000L);
        jdbc.update("update youtube_video_product set recommendation=?", assessment);
        jdbc.update("update youtube_product_mention set recommendation=?", assessment);
        assertThat(jdbc.queryForObject("select recommendation from youtube_video_product", String.class))
            .isEqualTo(assessment);
    }

    @Test
    void rejectsUnknownAssessment() {
        assertThatThrownBy(() -> jdbc.update("update youtube_video_product set recommendation='guess'"))
            .isInstanceOf(DataIntegrityViolationException.class);
    }

    private void mention(int ordinal, long productId, long start, Long end) {
        jdbc.update("""
            insert into youtube_product_mention(video_id,source_ordinal,product_id,spoken_name,
                start_ms,end_ms,summary,recommendation,source_batch_hash)
            values('abcdefghijk',?,?, '실제 발언명',?,?,'요약','recommended',?)
            """, ordinal, productId, start, end, "a".repeat(64));
    }
}
