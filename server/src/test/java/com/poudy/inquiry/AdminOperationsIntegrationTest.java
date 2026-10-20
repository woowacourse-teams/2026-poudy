package com.poudy.inquiry;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@org.springframework.test.annotation.DirtiesContext(classMode = org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
@AutoConfigureMockMvc
@Transactional
@WithMockUser(roles = "ADMIN")
class AdminOperationsIntegrationTest {
    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;
    @Test
    void inquiryLegacyUpdatesMemosAndDeletionShareAtomicHistory() throws Exception {
        var id = UUID.randomUUID();
        jdbc.update(
            "insert into feedback(id,subject_type,content,status_changed_at) values(?, 'OTHER','통합 문의 내용 확인해 주세요',(now() AT TIME ZONE 'Asia/Seoul'))",
            id
        );
        mvc.perform(get("/api/admin/inquiries").param("q", "통합 문의 내용 확인해 주세요")).andExpect(status().isOk())
            .andExpect(jsonPath("$.pagination.totalElements").value(1));
        mvc.perform(
            patch("/api/admin/feedbacks/" + id + "/status").contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"REVIEW_PLANNED\"}")
        ).andExpect(status().isOk());
        mvc.perform(
            patch("/api/admin/inquiries/FEEDBACK/" + id + "/assignee").contentType(MediaType.APPLICATION_JSON)
                .content("{\"assigned\":true}")
        ).andExpect(status().isNoContent());
        mvc.perform(
            post("/api/admin/inquiries/FEEDBACK/" + id + "/memos").contentType(MediaType.APPLICATION_JSON)
                .content("{\"content\":\"관리자 전용 메모\"}")
        ).andExpect(status().isCreated());
        mvc.perform(get("/api/admin/inquiries/FEEDBACK/" + id)).andExpect(status().isOk())
            .andExpect(jsonPath("$.inquiry.status").value("REVIEW_PLANNED"))
            .andExpect(jsonPath("$.inquiry.assigned").value(true))
            .andExpect(jsonPath("$.memos[0].content").value("관리자 전용 메모"))
            .andExpect(jsonPath("$.events.length()").value(3));
        jdbc.update("delete from feedback where id=?", id);
        assertThat(jdbc.queryForObject("select count(*) from admin_inquiry_event where feedback_id=?", Long.class, id))
            .isZero();
        assertThat(jdbc.queryForObject("select count(*) from admin_inquiry_memo where feedback_id=?", Long.class, id))
            .isZero();
    }

    @Test
    void noticeVisibilityDeletionAndViewsRespectPublication() throws Exception {
        mvc.perform(post("/api/admin/notices").contentType(MediaType.APPLICATION_JSON).content(body("PRIVATE")))
            .andExpect(status().isCreated());
        var id = jdbc.queryForObject("select id from notice where title='테스트 공지'", UUID.class);
        mvc.perform(get("/api/notices/" + id)).andExpect(status().isNotFound());
        mvc.perform(post("/api/notices/" + id + "/views")).andExpect(status().isNotFound());
        mvc.perform(put("/api/admin/notices/" + id).contentType(MediaType.APPLICATION_JSON).content(body("PUBLISHED")))
            .andExpect(status().isOk());
        mvc.perform(get("/api/notices/" + id)).andExpect(status().isOk()).andExpect(jsonPath("$.viewCount").value(0));
        mvc.perform(get("/api/admin/notices/" + id)).andExpect(status().isOk());
        mvc.perform(post("/api/notices/" + id + "/views")).andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("select view_count from notice where id=?", Long.class, id)).isEqualTo(1);
        mvc.perform(delete("/api/admin/notices/" + id)).andExpect(status().isConflict());
        mvc.perform(put("/api/admin/notices/" + id).contentType(MediaType.APPLICATION_JSON).content(body("PRIVATE")))
            .andExpect(status().isOk());
        mvc.perform(get("/api/notices/" + id)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/admin/notices/" + id)).andExpect(status().isNoContent());
    }

    @Test
    void bannersCapAtTenWithoutHidingOtherPublishedNotices() throws Exception {
        for (int i = 0; i < 11; i++) {
            mvc.perform(post("/api/admin/notices").contentType(MediaType.APPLICATION_JSON).content(body("PUBLISHED")))
                .andExpect(status().isCreated());
        }
        mvc.perform(get("/api/notices/banners")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items.length()").value(10));
        mvc.perform(get("/api/notices")).andExpect(status().isOk())
            .andExpect(jsonPath("$.pagination.totalElements").value(11));
    }

    @Test
    void recoveryRequiresRequestAndRespectsDeadline() throws Exception {
        long id = jdbc.queryForObject(
            "insert into \"user\"(oauth_provider,oauth_provider_id,email,deleted_at) values('GOOGLE','admin-recovery-test','recovery@example.com',(now() AT TIME ZONE 'Asia/Seoul')) returning id",
            Long.class
        );
        mvc.perform(post("/api/admin/users/" + id + "/restore")).andExpect(status().isNotFound());
        jdbc.update("update \"user\" set restore_requested_at=now() AT TIME ZONE 'Asia/Seoul' where id=?", id);
        mvc.perform(get("/api/admin/users/" + id + "/restore-preview")).andExpect(status().isOk())
            .andExpect(jsonPath("$.account.maskedEmail").value("re***@example.com"));
        mvc.perform(post("/api/admin/users/" + id + "/restore")).andExpect(status().isNoContent());
        assertThat(
            jdbc.queryForObject(
                "select count(*) from user_withdrawal_history where user_id=? and restored_at is not null",
                Long.class,
                id
            )
        ).isEqualTo(1);
        mvc.perform(post("/api/admin/users/" + id + "/restore")).andExpect(status().isNotFound());
        jdbc.update(
            "update \"user\" set deleted_at=(now() AT TIME ZONE 'Asia/Seoul')-interval '31 days',restore_requested_at=now() AT TIME ZONE 'Asia/Seoul' where id=?",
            id
        );
        mvc.perform(post("/api/admin/users/" + id + "/restore")).andExpect(status().isNotFound());
    }

    @Test
    void neighborsFollowTheSameFilterAcrossPageBoundaries() throws Exception {
        for (int i = 0; i < 21; i++) {
            jdbc.update(
                "insert into feedback(id,subject_type,content,status_changed_at) values(?,'OTHER','다음 문의 페이지 경계 검증',(now() AT TIME ZONE 'Asia/Seoul'))",
                UUID.randomUUID()
            );
        }
        var id = jdbc.queryForObject(
            "select id from feedback where content='다음 문의 페이지 경계 검증' order by created_at desc,id desc offset 19 limit 1",
            UUID.class
        );
        mvc.perform(get("/api/admin/inquiries/FEEDBACK/" + id + "/neighbors").param("q", "다음 문의 페이지 경계 검증"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.position").value(20))
            .andExpect(jsonPath("$.total").value(21)).andExpect(jsonPath("$.next.id").isNotEmpty());
    }

    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void bulkUpdateRollsBackWhenOneTargetIsMissing() throws Exception {
        var id = UUID.fromString("00000000-0000-0000-0000-000000000868");
        jdbc.update(
            "insert into feedback(id,subject_type,content,status_changed_at) values(?,'OTHER','일괄 처리 원자성 검증',(now() AT TIME ZONE 'Asia/Seoul'))",
            id
        );
        try {
            mvc.perform(
                patch("/api/admin/inquiries/status").contentType(MediaType.APPLICATION_JSON).content(
                    "{\"targets\":[{\"kind\":\"FEEDBACK\",\"id\":\"" + id
                        + "\"},{\"kind\":\"FEEDBACK\",\"id\":\"7fffffff-ffff-ffff-ffff-ffffffffffff\"}],\"status\":\"COMPLETED\"}"
                )
            )
                .andExpect(status().isNotFound());
            assertThat(jdbc.queryForObject("select status from feedback where id=?", String.class, id))
                .isEqualTo("RECEIVED");
            assertThat(
                jdbc.queryForObject("select count(*) from admin_inquiry_event where feedback_id=?", Long.class, id)
            ).isZero();
        } finally {
            jdbc.update("delete from feedback where id=?", id);
        }
    }

    @Test
    void adminNoticeOrderingIncludesPrivateDraftsByCreationTime() throws Exception {
        var older = UUID.randomUUID();
        var newer = UUID.randomUUID();
        jdbc.update(
            "insert into notice(id,title,content,status,created_at,updated_at) values(?,'오래된 공지','본문','PRIVATE',(now() AT TIME ZONE 'Asia/Seoul')-interval '1 day',now() AT TIME ZONE 'Asia/Seoul')",
            older
        );
        jdbc.update(
            "insert into notice(id,title,content,status,created_at,updated_at) values(?,'새 공지','본문','PRIVATE',now() AT TIME ZONE 'Asia/Seoul',now() AT TIME ZONE 'Asia/Seoul')",
            newer
        );
        mvc.perform(get("/api/admin/notices")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(newer.toString()));
        mvc.perform(get("/api/admin/notices").param("oldest", "true")).andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].id").value(older.toString()));
    }

    private static String body(String status) {
        return "{\"title\":\"테스트 공지\",\"content\":\"본문 https://example.com\",\"status\":\"" + status
            + "\",\"bannerEnabled\":true,\"bannerText\":\"띠\",\"imageIds\":[]}";
    }
}
