package com.poudy.youtube.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class YouTubeControllerTest {
    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcTemplate jdbc;

    @BeforeEach
    void prepare() {
        jdbc.update("""
            insert into youtube_channel(id,name,metadata_checked_at)
            values('channel','유튜버',(now() AT TIME ZONE 'Asia/Seoul')),('empty','빈 채널',(now() AT TIME ZONE 'Asia/Seoul'))
            """);
        jdbc.update(
            """
                insert into youtube_video(id,channel_id,title,duration_ms,published_at,metadata_checked_at,visible)
                values('abcdefghij1','channel','첫 영상',10000,(now() AT TIME ZONE 'Asia/Seoul')-interval '1 day',(now() AT TIME ZONE 'Asia/Seoul'),true),
                      ('abcdefghij2','channel','둘째 영상',10000,(now() AT TIME ZONE 'Asia/Seoul')-interval '2 days',(now() AT TIME ZONE 'Asia/Seoul'),true),
                      ('abcdefghij3','channel','비공개',10000,(now() AT TIME ZONE 'Asia/Seoul')-interval '3 days',(now() AT TIME ZONE 'Asia/Seoul'),false),
                      ('abcdefghij4','empty','발언 없음',10000,(now() AT TIME ZONE 'Asia/Seoul')-interval '4 days',(now() AT TIME ZONE 'Asia/Seoul'),true)
                """
        );
        jdbc.update("""
            insert into youtube_video_product(video_id,product_id,recommendation)
            values('abcdefghij1',1,'recommended'),('abcdefghij2',1,'recommended'),
                  ('abcdefghij3',1,'recommended'),('abcdefghij1',7,'neutral')
            """);
        mention("abcdefghij1", 1, 1, "recommended");
        mention("abcdefghij1", 2, 1, "recommended");
        mention("abcdefghij1", 3, 7, "neutral");
        mention("abcdefghij2", 1, 1, "recommended");
        mention("abcdefghij3", 1, 1, "recommended");
    }

    @Test
    void listsOnlyChannelsWithVisibleProductMentions() throws Exception {
        mvc.perform(get("/api/youtube/channels"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value("channel"))
            .andExpect(jsonPath("$[0].videoCount").value(2))
            .andExpect(jsonPath("$[0].productCount").value(2));
    }

    @Test
    void returnsSegmentsAndCountsDistinctVideosAcrossPages() throws Exception {
        mvc.perform(get("/api/youtube/channels/channel/videos").param("limit", "1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value("abcdefghij1"))
            .andExpect(jsonPath("$[0].mentions.length()").value(3))
            .andExpect(jsonPath("$[0].mentions[0].spokenName").value("발언명"))
            .andExpect(jsonPath("$[0].mentions[0].recommendedVideoCount").value(2))
            .andExpect(jsonPath("$[0].mentions[0].sourceBatchHash").doesNotExist());
    }

    @Test
    void productEndpointReturnsOnlyRequestedProduct() throws Exception {
        mvc.perform(get("/api/products/7/youtube-mentions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].mentions.length()").value(1))
            .andExpect(jsonPath("$[0].mentions[0].productId").value(7))
            .andExpect(jsonPath("$[0].mentions[0].recommendedVideoCount").value(0));
    }

    @ParameterizedTest
    @ValueSource(strings = {"mixed", "not_recommended", "uncertain"})
    void opposingSegmentStopsRecommendationEvenIfStoredVideoAssessmentIsStale(String rating) throws Exception {
        jdbc.update("""
            update youtube_product_mention set recommendation=? where video_id='abcdefghij1' and source_ordinal=2
            """, rating);
        mvc.perform(get("/api/products/1/youtube-mentions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].mentions[0].recommendedVideoCount").value(1))
            .andExpect(jsonPath("$[0].mentions.length()").value(2));
    }

    @Test
    void readsCurrentProductName() throws Exception {
        jdbc.update("update product set product_name='현재 정식명' where id=1");
        mvc.perform(get("/api/products/1/youtube-mentions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].mentions[0].productName").value("현재 정식명"));
    }

    @Test
    void unknownProductIsNotFoundAndUnknownChannelIsEmpty() throws Exception {
        mvc.perform(get("/api/products/999999/youtube-mentions"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        mvc.perform(get("/api/youtube/channels/unknown/videos"))
            .andExpect(status().isOk()).andExpect(jsonPath("$").isEmpty());
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "-1", "51", "invalid"})
    void boundsPageSize(String limit) throws Exception {
        mvc.perform(get("/api/youtube/channels").param("limit", limit)).andExpect(status().isBadRequest());
    }

    @Test
    void excludesOldAndFutureVideosFromAllCounts() throws Exception {
        jdbc.update(
            "update youtube_video set published_at=(now() AT TIME ZONE 'Asia/Seoul')-interval '2 years' where id='abcdefghij1'"
        );
        mvc.perform(get("/api/youtube/channels/channel/products"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].recommendedVideoCount").value(1));
        jdbc.update(
            "update youtube_video set published_at=(now() AT TIME ZONE 'Asia/Seoul')+interval '1 day' where id='abcdefghij2'"
        );
        mvc.perform(get("/api/youtube/channels")).andExpect(jsonPath("$").isEmpty());
    }

    @Test
    @org.springframework.security.test.context.support.WithMockUser(roles = "ADMIN")
    void adminOrderPersistsAndOrdersPublicChannels() throws Exception {
        jdbc.update("update youtube_video set channel_id='empty' where id='abcdefghij2'");
        mvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .patch("/api/admin/youtube/channels/channel/order")
                .contentType("application/json").content("{\"displayOrder\":9}")
        )
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/youtube/channels"))
            .andExpect(jsonPath("$[0].id").value("empty"))
            .andExpect(jsonPath("$[1].id").value("channel"));
        mvc.perform(get("/api/admin/youtube/channels"))
            .andExpect(jsonPath("$[1].displayOrder").value(9));
        mvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .patch("/api/admin/youtube/channels/channel/order")
                .contentType("application/json").content("{\"displayOrder\":-1}")
        )
            .andExpect(status().isBadRequest());
    }

    @Test
    void anonymousCannotChangeOrder() throws Exception {
        mvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .patch("/api/admin/youtube/channels/channel/order")
                .contentType("application/json").content("{\"displayOrder\":9}")
        )
            .andExpect(status().isUnauthorized());
    }

    private void mention(String video, int ordinal, long product, String rating) {
        jdbc.update("""
            insert into youtube_product_mention(video_id,source_ordinal,product_id,spoken_name,start_ms,
                end_ms,summary,recommendation,source_batch_hash)
            values(?,?,?,'발언명',?,?,'요약',?,?)
            """, video, ordinal, product, ordinal * 1000, ordinal * 1000 + 500, rating, "a".repeat(64));
    }
}
