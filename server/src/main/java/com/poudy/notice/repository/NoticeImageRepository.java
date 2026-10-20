package com.poudy.notice.repository;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.InfrastructureException;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.feedback.domain.image.ProcessedImage;
import com.poudy.notice.domain.InvalidNoticeException;
import com.poudy.notice.domain.NoticeImage;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

@Repository
public class NoticeImageRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final S3Client s3;
    private final String bucket;
    private final String prefix;
    public NoticeImageRepository(
        NamedParameterJdbcTemplate jdbc,
        S3Client s3,
        @Value("${poudy.notice.image-s3.bucket:}") String bucket,
        @Value("${poudy.notice.image-s3.prefix:poudy/notices/}") String prefix
    ) {
        this.jdbc = jdbc;
        this.s3 = s3;
        this.bucket = bucket;
        this.prefix = prefix;
        if (prefix.isBlank() || !prefix.endsWith("/")) {
            throw new IllegalArgumentException("공지 이미지 경로는 비어 있지 않고 /로 끝나야 합니다.");
        }
    }

    public UUID upload(ProcessedImage image) {
        if (bucket.isBlank()) {
            throw new InfrastructureException("공지 이미지 버킷이 설정되지 않았습니다.");
        }
        UUID id = UUID.randomUUID();
        String key = prefix + id + "." + image.format().extension();
        String type = image.format().extension().equals("png") ? "image/png" : "image/jpeg";
        try {
            s3.putObject(
                PutObjectRequest.builder().bucket(bucket).key(key).contentType(type).build(),
                RequestBody.fromBytes(image.bytes())
            );
            jdbc.update(
                "insert into notice_image(image_id,object_key,content_type,expires_at,created_at) values(:id,:key,:type,(now() AT TIME ZONE 'Asia/Seoul')+interval '24 hours',now() AT TIME ZONE 'Asia/Seoul')",
                new MapSqlParameterSource("id", id).addValue("key", key).addValue("type", type)
            );
            return id;
        } catch (RuntimeException ex) {
            try {
                s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
            } catch (RuntimeException cleanup) {
                ex.addSuppressed(cleanup);
            }
            throw new InfrastructureException("공지 이미지를 저장하지 못했습니다.", ex);
        }
    }

    public List<NoticeImage> images(UUID id) {
        return jdbc.query(
            "select * from notice_image where notice_id=:id order by display_order",
            new MapSqlParameterSource("id", id),
            (r, n) -> new NoticeImage(
                r.getObject("image_id", UUID.class),
                r.getString("object_key"),
                r.getString("content_type")
            )
        );
    }

    public void attach(UUID notice, List<UUID> ids) {
        if (ids.size() > 5 || new HashSet<>(ids).size() != ids.size()) {
            throw new InvalidNoticeException();
        }
        if (!ids.isEmpty()) {
            var valid = jdbc.query(
                "select image_id from notice_image where image_id in (:ids) and (notice_id=:notice or (notice_id is null and expires_at>(now() AT TIME ZONE 'Asia/Seoul'))) order by image_id for update",
                new MapSqlParameterSource("ids", ids).addValue("notice", notice),
                (r, n) -> r.getObject(1, UUID.class)
            );
            if (valid.size() != ids.size()) {
                throw new InvalidNoticeException();
            }
        }
        jdbc.update(
            "update notice_image set notice_id=null,display_order=null where notice_id=:notice",
            new MapSqlParameterSource("notice", notice)
        );
        for (int i = 0; i < ids.size(); i++) {
            jdbc.update(
                "update notice_image set notice_id=:notice,display_order=:position where image_id=:id",
                new MapSqlParameterSource("notice", notice).addValue("id", ids.get(i)).addValue("position", i)
            );
        }
    }

    public NoticeImage image(UUID id) {
        return jdbc.query(
            "select * from notice_image where image_id=:id and (notice_id is not null or expires_at>(now() AT TIME ZONE 'Asia/Seoul'))",
            new MapSqlParameterSource("id", id),
            (r, n) -> new NoticeImage(id, r.getString("object_key"), r.getString("content_type"))
        ).stream().findFirst().orElseThrow(() -> new ResourceNotFoundException(ErrorCode.NOTICE_NOT_FOUND));
    }

    public byte[] read(NoticeImage image) {
        try {
            return s3.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(image.objectKey()).build())
                .asByteArray();
        } catch (RuntimeException ex) {
            throw new InfrastructureException("공지 이미지를 읽지 못했습니다.", ex);
        }
    }

    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT1H")
    @Transactional
    public void cleanup() {
        if (bucket.isBlank()) {
            return;
        }
        var rows = jdbc.query(
            "select image_id,object_key from notice_image where notice_id is null and expires_at<=(now() AT TIME ZONE 'Asia/Seoul') order by image_id limit 100 for update skip locked",
            (r, n) -> Map.entry(r.getObject("image_id", UUID.class), r.getString("object_key"))
        );
        for (var row : rows) {
            s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(row.getValue()).build());
            jdbc.update("delete from notice_image where image_id=:id", new MapSqlParameterSource("id", row.getKey()));
        }
    }
}
