package com.poudy.notice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willReturn;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.poudy.exception.InfrastructureException;
import com.poudy.feedback.domain.image.FeedbackImageFormat;
import com.poudy.feedback.domain.image.ProcessedImage;
import com.poudy.notice.domain.InvalidNoticeException;
import com.poudy.notice.domain.NoticeStatus;
import com.poudy.notice.repository.NoticeImageRepository;
import com.poudy.notice.service.NoticeService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectResponse;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@SpringBootTest(properties = "poudy.notice.image-s3.bucket=private-notice-test")
@org.springframework.test.annotation.DirtiesContext(classMode = org.springframework.test.annotation.DirtiesContext.ClassMode.AFTER_CLASS)
@AutoConfigureMockMvc
@Transactional
@WithMockUser(roles = "ADMIN")
class NoticeImagesIntegrationTest {
    @Autowired
    MockMvc mvc;
    @Autowired
    JdbcTemplate jdbc;
    @MockitoBean
    S3Client s3;
    @Autowired
    NoticeImageRepository images;
    @Autowired
    NoticeService notices;

    @Test
    void privateImagesRequireAdminAndCannotBeClaimedByAnotherNotice() throws Exception {
        var out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(2, 2, BufferedImage.TYPE_INT_RGB), "png", out);
        byte[] png = out.toByteArray();
        given(s3.getObjectAsBytes(any(GetObjectRequest.class)))
            .willReturn(ResponseBytes.fromByteArray(GetObjectResponse.builder().build(), png));
        mvc.perform(
            multipart("/api/admin/notices/images").file(new MockMultipartFile("images", "image.png", "image/png", png))
        ).andExpect(status().isCreated());
        UUID image = jdbc.queryForObject("select image_id from notice_image", UUID.class);
        mvc.perform(get("/api/admin/notices/images/" + image).with(anonymous())).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/admin/notices/images/" + image)).andExpect(status().isOk());
        mvc.perform(post("/api/admin/notices").contentType(MediaType.APPLICATION_JSON).content(body(image, "PRIVATE")))
            .andExpect(status().isCreated());
        UUID notice = jdbc.queryForObject("select notice_id from notice_image where image_id=?", UUID.class, image);
        mvc.perform(get("/api/notices/" + notice + "/images/" + image).with(anonymous()))
            .andExpect(status().isNotFound());
        mvc.perform(
            put("/api/admin/notices/" + notice).contentType(MediaType.APPLICATION_JSON)
                .content(body(image, "PUBLISHED"))
        ).andExpect(status().isOk());
        mvc.perform(get("/api/notices/" + notice + "/images/" + image).with(anonymous())).andExpect(status().isOk());
        mvc.perform(post("/api/admin/notices").contentType(MediaType.APPLICATION_JSON).content(body(image, "PRIVATE")))
            .andExpect(status().isBadRequest());
        assertThat(jdbc.queryForObject("select notice_id from notice_image where image_id=?", UUID.class, image))
            .isEqualTo(notice);
        mvc.perform(
            put("/api/admin/notices/" + notice).contentType(MediaType.APPLICATION_JSON).content(body(image, "PRIVATE"))
        ).andExpect(status().isOk());
        mvc.perform(get("/api/notices/" + notice + "/images/" + image).with(anonymous()))
            .andExpect(status().isNotFound());
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void failedUploadAndFailedCompensationRemainDiscoverableForCleanupRetry() {
        var unavailable = S3Exception.builder().statusCode(503).message("일시적 저장소 장애").build();
        given(s3.putObject(any(PutObjectRequest.class), any(RequestBody.class))).willThrow(unavailable);
        given(s3.deleteObject(any(DeleteObjectRequest.class)))
            .willThrow(S3Exception.builder().statusCode(503).message("일시적 삭제 장애").build());
        try {
            assertThatThrownBy(() -> images.upload(processed())).isInstanceOf(InfrastructureException.class);
            var request = ArgumentCaptor.forClass(PutObjectRequest.class);
            verify(s3).putObject(request.capture(), any(RequestBody.class));
            String key = request.getValue().key();
            assertThat(
                jdbc.queryForObject(
                    "select count(*) from notice_image where object_key=? and notice_id is null",
                    Long.class,
                    key
                )
            ).isEqualTo(1);
            jdbc.update(
                "update notice_image set expires_at=(now() AT TIME ZONE 'Asia/Seoul')-interval '1 second' where object_key=?",
                key
            );
            willReturn(DeleteObjectResponse.builder().build()).given(s3).deleteObject(any(DeleteObjectRequest.class));
            images.cleanup();
            assertThat(jdbc.queryForObject("select count(*) from notice_image where object_key=?", Long.class, key))
                .isZero();
            verify(s3, times(2))
                .deleteObject(DeleteObjectRequest.builder().bucket("private-notice-test").key(key).build());
        } finally {
            jdbc.update("delete from notice_image");
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void failedCleanupRollsBackMetadataAndCanRetryAlreadyDeletedObjects() {
        var first = images.upload(processed());
        var second = images.upload(processed());
        jdbc.update(
            "update notice_image set expires_at=(now() AT TIME ZONE 'Asia/Seoul')-interval '1 second' where image_id in (?,?)",
            first,
            second
        );
        var unavailable = S3Exception.builder().statusCode(503).build();
        given(s3.deleteObject(any(DeleteObjectRequest.class)))
            .willReturn(DeleteObjectResponse.builder().build()).willThrow(unavailable);
        try {
            assertThatThrownBy(() -> images.cleanup()).isInstanceOf(S3Exception.class);
            assertThat(
                jdbc.queryForObject(
                    "select count(*) from notice_image where image_id in (?,?)",
                    Long.class,
                    first,
                    second
                )
            ).isEqualTo(2);
            willReturn(DeleteObjectResponse.builder().build()).given(s3).deleteObject(any(DeleteObjectRequest.class));
            clearInvocations(s3);
            images.cleanup();
            verify(s3, times(2)).deleteObject(any(DeleteObjectRequest.class));
            assertThat(
                jdbc.queryForObject(
                    "select count(*) from notice_image where image_id in (?,?)",
                    Long.class,
                    first,
                    second
                )
            ).isZero();
        } finally {
            jdbc.update("delete from notice_image where image_id in (?,?)", first, second);
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void cleanupKeepsOwnedAndUnexpiredImagesAndExpiredAttachmentRollsBackEdits() {
        var owned = images.upload(processed());
        var pending = images.upload(processed());
        var expired = images.upload(processed());
        var notice = notices.save(null, "원래 제목", "원래 본문", NoticeStatus.PRIVATE, false, null, List.of(owned));
        jdbc.update(
            "update notice_image set expires_at=(now() AT TIME ZONE 'Asia/Seoul')-interval '1 second' where image_id in (?,?)",
            owned,
            expired
        );
        try {
            assertThatThrownBy(
                () -> notices
                    .save(notice.id(), "변경 제목", "변경 본문", NoticeStatus.PUBLISHED, false, null, List.of(owned, expired))
            )
                .isInstanceOf(InvalidNoticeException.class);
            assertThat(notices.find(notice.id(), false).title()).isEqualTo("원래 제목");
            assertThat(notices.find(notice.id(), false).status()).isEqualTo(NoticeStatus.PRIVATE);
            assertThat(images.images(notice.id())).extracting(i -> i.id()).containsExactly(owned);
            images.cleanup();
            assertThat(
                jdbc.queryForObject(
                    "select count(*) from notice_image where image_id in (?,?)",
                    Long.class,
                    owned,
                    pending
                )
            ).isEqualTo(2);
            assertThat(jdbc.queryForObject("select count(*) from notice_image where image_id=?", Long.class, expired))
                .isZero();
            verify(s3, times(1)).deleteObject(any(DeleteObjectRequest.class));
        } finally {
            notices.delete(notice.id());
            jdbc.update("delete from notice_image where image_id in (?,?,?)", owned, pending, expired);
        }
    }

    @Test
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    void failedUploadWithSuccessfulCompensationLeavesNoPendingRow() {
        given(s3.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(S3Exception.builder().statusCode(503).build());
        assertThatThrownBy(() -> images.upload(processed())).isInstanceOf(InfrastructureException.class);
        var request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3).putObject(request.capture(), any(RequestBody.class));
        verify(s3).deleteObject(
            DeleteObjectRequest.builder().bucket("private-notice-test").key(request.getValue().key()).build()
        );
        assertThat(
            jdbc.queryForObject(
                "select count(*) from notice_image where object_key=?",
                Long.class,
                request.getValue().key()
            )
        ).isZero();
    }

    @Test
    void databaseFailureBeforeRegistrationDoesNotCreateAnUntrackedS3Object() {
        var database = mock(NamedParameterJdbcTemplate.class);
        given(database.update(anyString(), any(MapSqlParameterSource.class)))
            .willThrow(new DataAccessResourceFailureException("DB 연결 실패"));
        var repository = new NoticeImageRepository(database, s3, "private-notice-test", "poudy/test/notices/");
        assertThatThrownBy(() -> repository.upload(processed())).isInstanceOf(DataAccessResourceFailureException.class);
        verifyNoInteractions(s3);
    }

    private static ProcessedImage processed() {
        return new ProcessedImage(FeedbackImageFormat.PNG, new byte[] {1, 2, 3});
    }

    private static String body(UUID image, String status) {
        return "{\"title\":\"이미지 공지\",\"content\":\"첨부 이미지 본문\",\"status\":\"" + status
            + "\",\"bannerEnabled\":false,\"imageIds\":[\"" + image + "\"]}";
    }
}
