package com.poudy.product.controller;

import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doCallRealMethod;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.youtube.repository.YouTubeProductRecommendationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProductYouTubeRecommendationsTest {
    @Autowired
    private MockMvc mvc;
    @Autowired
    private JdbcTemplate jdbc;
    @MockitoSpyBean
    private YouTubeProductRecommendationRepository recommendations;

    @Test
    void includesEachRecommendingChannelWithOnlyItsLatestVideo() throws Exception {
        jdbc.update("""
            insert into youtube_channel(id,name,metadata_checked_at)
            values('a','유튜버 A',now()),('b','유튜버 B',now())
            """);
        video("abcdefghij1", "a", -3, "old.jpg");
        video("abcdefghij2", "a", -1, "latest.jpg");
        video("abcdefghij3", "b", -2, null);

        mvc.perform(get("/api/products/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.youtubeRecommendations.length()").value(2))
            .andExpect(jsonPath("$.youtubeRecommendations[0].channelId").value("a"))
            .andExpect(jsonPath("$.youtubeRecommendations[0].channelName").value("유튜버 A"))
            .andExpect(jsonPath("$.youtubeRecommendations[0].recommendedVideoCount").value(2))
            .andExpect(jsonPath("$.youtubeRecommendations[0].latestVideo.id").value("abcdefghij2"))
            .andExpect(jsonPath("$.youtubeRecommendations[0].latestVideo.title").value("영상 abcdefghij2"))
            .andExpect(jsonPath("$.youtubeRecommendations[0].latestVideo.thumbnailUrl").value("latest.jpg"))
            .andExpect(jsonPath("$.youtubeRecommendations[0].latestVideo.mentions").doesNotExist())
            .andExpect(jsonPath("$.youtubeRecommendations[0].videos").doesNotExist())
            .andExpect(jsonPath("$.youtubeRecommendations[1].channelId").value("b"))
            .andExpect(jsonPath("$.youtubeRecommendations[1].recommendedVideoCount").value(1))
            .andExpect(jsonPath("$.youtubeRecommendations[1].latestVideo.id").value("abcdefghij3"))
            .andExpect(
                jsonPath("$.youtubeRecommendations[1].latestVideo.thumbnailUrl")
                    .value(org.hamcrest.Matchers.nullValue())
            );
    }

    @Test
    void returnsAnEmptyArrayWithoutRecommendations() throws Exception {
        mvc.perform(get("/api/products/1"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.youtubeRecommendations").isArray())
            .andExpect(jsonPath("$.youtubeRecommendations").isEmpty());
    }

    @Test
    void preservesUnknownProductAndInvalidPartErrors() throws Exception {
        mvc.perform(get("/api/products/999999"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.code").value("PRODUCT_NOT_FOUND"));
        mvc.perform(get("/api/products/1").param("partId", "999999"))
            .andExpect(status().isNotFound());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void rollsBackOnlyRecommendationSqlFailureAndCommitsTheDetailRead() throws Exception {
        doAnswer(invocation -> {
            jdbc.queryForObject("select 1/0", Integer.class);
            return invocation.callRealMethod();
        }).when(recommendations).findFor(1);
        try {
            mvc.perform(get("/api/products/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.productParts").isNotEmpty())
                .andExpect(jsonPath("$.youtubeRecommendations").isEmpty());
        } finally {
            doCallRealMethod().when(recommendations).findFor(1);
        }
        mvc.perform(get("/api/products/1"))
            .andExpect(status().isOk());
    }

    private void video(String id, String channel, int days, String thumbnail) {
        jdbc.update(
            """
                insert into youtube_video(id,channel_id,title,thumbnail_url,duration_ms,published_at,metadata_checked_at,visible)
                values(?,?,?,?,10000,(now() AT TIME ZONE 'Asia/Seoul')+?*interval '1 day',now(),true)
                """,
            id,
            channel,
            "영상 " + id,
            thumbnail,
            days
        );
        jdbc.update(
            "insert into youtube_video_product(video_id,product_id,recommendation) values(?,1,'recommended')",
            id
        );
        jdbc.update("""
            insert into youtube_product_mention(video_id,source_ordinal,product_id,spoken_name,start_ms,summary,
                recommendation,source_batch_hash) values(?,1,1,'제품 발언',0,'추천 근거','recommended',?)
            """, id, "a".repeat(64));
    }
}
