package com.poudy.notice;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.anonymous;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;

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

    private static String body(UUID image, String status) {
        return "{\"title\":\"이미지 공지\",\"content\":\"첨부 이미지 본문\",\"status\":\"" + status
            + "\",\"bannerEnabled\":false,\"imageIds\":[\"" + image + "\"]}";
    }
}
