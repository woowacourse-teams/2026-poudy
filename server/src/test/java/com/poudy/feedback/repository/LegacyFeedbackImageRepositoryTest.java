package com.poudy.feedback.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.poudy.feedback.domain.LegacyFeedbackImage;
import com.poudy.feedback.domain.LegacyFeedbackImages;
import com.poudy.image.domain.ImageContent;
import java.util.Arrays;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CommonPrefix;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Request;
import software.amazon.awssdk.services.s3.model.ListObjectsV2Response;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Object;

@DisplayName("이전 경로 의견 이미지 저장소")
class LegacyFeedbackImageRepositoryTest {

    private static final String BUCKET = "poudy-bucket";
    private static final String PENDING_PREFIX = "poudy/feedback/pending/";

    private final S3Client s3Client = mock(S3Client.class);
    private final LegacyFeedbackImageRepository repository = new LegacyFeedbackImageRepository(
        s3Client,
        BUCKET,
        PENDING_PREFIX
    );

    @Test
    @DisplayName("의견 폴더의 이미지와 이전 임시 이미지를 찾고 UUID가 아닌 폴더와 파일은 건너뛴다")
    void findsLegacyImages() {
        UUID feedbackId = UUID.randomUUID();
        UUID storedId = UUID.randomUUID();
        UUID pendingId = UUID.randomUUID();
        String folder = "poudy/feedback/" + feedbackId + "/images/";
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willAnswer(invocation -> {
            ListObjectsV2Request request = invocation.getArgument(0);
            if ("/".equals(request.delimiter())) {
                return prefixes("poudy/feedback/" + feedbackId + "/", "poudy/feedback/images/", PENDING_PREFIX);
            }
            if (request.prefix().equals(folder)) {
                return objects(folder + storedId + ".jpg", folder + "readme.txt");
            }
            if (request.prefix().equals(PENDING_PREFIX)) {
                return objects(PENDING_PREFIX + pendingId + ".png");
            }
            return objects();
        });

        LegacyFeedbackImages images = repository.findAll();

        assertThat(images.imageIds()).containsExactlyInAnyOrder(storedId, pendingId);
        assertThat(images.classify(Map.of(storedId, feedbackId, pendingId, feedbackId)).toMove())
            .extracting(LegacyFeedbackImage::key)
            .containsExactlyInAnyOrder(folder + storedId + ".jpg", PENDING_PREFIX + pendingId + ".png");
    }

    @Test
    @DisplayName("이전 정식 경로와 이전 임시 경로에서 저장된 Content-Type과 함께 이미지를 읽는다")
    void readsLegacyImage() {
        UUID feedbackId = UUID.randomUUID();
        UUID imageId = UUID.randomUUID();
        String pendingKey = PENDING_PREFIX + imageId + ".png";
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).willAnswer(invocation -> {
            GetObjectRequest request = invocation.getArgument(0);
            if (request.key().equals(pendingKey)) {
                return ResponseBytes
                    .fromByteArray(GetObjectResponse.builder().contentType("image/png").build(), new byte[] {9});
            }
            throw NoSuchKeyException.builder().message("missing").build();
        });

        Optional<ImageContent> content = repository.read(feedbackId, imageId);

        assertThat(content).hasValueSatisfying(image -> assertThat(image.contentType()).isEqualTo("image/png"));
        assertThat(repository.read(feedbackId, UUID.randomUUID())).isEmpty();
    }

    @Test
    @DisplayName("보존 기간이 지난 의견의 이전 폴더 파일을 모두 지운다")
    void deletesLegacyFolder() {
        UUID feedbackId = UUID.randomUUID();
        String key = "poudy/feedback/" + feedbackId + "/images/" + UUID.randomUUID() + ".png";
        given(s3Client.listObjectsV2(any(ListObjectsV2Request.class))).willReturn(objects(key));

        repository.deleteFolder(feedbackId);

        verify(s3Client).deleteObject(argThat((DeleteObjectRequest request) -> request.key().equals(key)));
    }

    private static ListObjectsV2Response prefixes(String... prefixes) {
        return ListObjectsV2Response.builder()
            .commonPrefixes(
                Arrays.stream(prefixes).map(prefix -> CommonPrefix.builder().prefix(prefix).build()).toList()
            )
            .build();
    }

    private static ListObjectsV2Response objects(String... keys) {
        return ListObjectsV2Response.builder()
            .contents(Arrays.stream(keys).map(key -> S3Object.builder().key(key).build()).toList())
            .build();
    }
}
