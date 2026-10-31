package com.poudy.image.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.poudy.exception.InfrastructureException;
import com.poudy.image.domain.ImageContent;
import com.poudy.image.domain.ImageFormat;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.ProcessedImage;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.exception.SdkClientException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.CopyObjectRequest;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.ServerSideEncryption;

@DisplayName("S3 이미지 저장소")
class S3ImageRepositoryTest {

    private static final String BUCKET = "poudy-bucket";
    private static final String FEEDBACK_PREFIX = "poudy/feedback/images/";

    private final S3Client s3Client = mock(S3Client.class);
    private final S3ImageRepository repository = new S3ImageRepository(s3Client, BUCKET, FEEDBACK_PREFIX);

    @Test
    @DisplayName("재인코딩 바이트를 용도별 최종 경로에 확장자 없이 비공개 암호화해 저장한다")
    void storesImageAtPurposePath() {
        UUID id = UUID.randomUUID();

        repository.save(id, ImagePurpose.FEEDBACK, new ProcessedImage(ImageFormat.PNG, new byte[] {1, 2, 3}));

        ArgumentCaptor<PutObjectRequest> requestCaptor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(requestCaptor.capture(), any(RequestBody.class));
        PutObjectRequest request = requestCaptor.getValue();
        assertThat(request.bucket()).isEqualTo(BUCKET);
        assertThat(request.key()).isEqualTo(FEEDBACK_PREFIX + id);
        assertThat(request.contentType()).isEqualTo("image/png");
        assertThat(request.ifNoneMatch()).isEqualTo("*");
        assertThat(request.serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
    }

    @Test
    @DisplayName("저장 실패를 재시도하지 않고 인프라 예외로 변환한다")
    void doesNotRetryFailedWrite() {
        given(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
            .willThrow(SdkClientException.create("timeout"));

        assertThatThrownBy(
            () -> repository.save(
                UUID.randomUUID(),
                ImagePurpose.FEEDBACK,
                new ProcessedImage(ImageFormat.PNG, new byte[] {1})
            )
        ).isInstanceOf(InfrastructureException.class);

        verify(s3Client, times(1)).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    @DisplayName("저장된 Content-Type과 함께 이미지를 읽는다")
    void readsImageWithStoredContentType() {
        UUID id = UUID.randomUUID();
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class))).willReturn(
            ResponseBytes.fromByteArray(GetObjectResponse.builder().contentType("image/jpeg").build(), new byte[] {7})
        );

        ImageContent content = repository.read(id, ImagePurpose.FEEDBACK).orElseThrow();

        assertThat(content.bytes()).containsExactly(7);
        assertThat(content.contentType()).isEqualTo("image/jpeg");
        ArgumentCaptor<GetObjectRequest> requestCaptor = ArgumentCaptor.forClass(GetObjectRequest.class);
        verify(s3Client).getObjectAsBytes(requestCaptor.capture());
        assertThat(requestCaptor.getValue().key()).isEqualTo(FEEDBACK_PREFIX + id);
    }

    @Test
    @DisplayName("파일이 없으면 빈 결과를 돌려준다")
    void returnsEmptyForMissingImage() {
        given(s3Client.getObjectAsBytes(any(GetObjectRequest.class)))
            .willThrow(NoSuchKeyException.builder().message("missing").build());

        assertThat(repository.read(UUID.randomUUID(), ImagePurpose.FEEDBACK)).isEmpty();
    }

    @Test
    @DisplayName("이전 경로의 객체를 용도별 최종 경로로 암호화해 복사한다")
    void copiesLegacyObject() {
        UUID id = UUID.randomUUID();

        repository
            .copyFrom("poudy/feedback/" + UUID.randomUUID() + "/images/" + id + ".jpg", id, ImagePurpose.FEEDBACK);

        ArgumentCaptor<CopyObjectRequest> requestCaptor = ArgumentCaptor.forClass(CopyObjectRequest.class);
        verify(s3Client).copyObject(requestCaptor.capture());
        CopyObjectRequest request = requestCaptor.getValue();
        assertThat(request.destinationKey()).isEqualTo(FEEDBACK_PREFIX + id);
        assertThat(request.copySource()).startsWith(BUCKET + "/poudy/feedback/");
        assertThat(request.serverSideEncryption()).isEqualTo(ServerSideEncryption.AES256);
    }

    @Test
    @DisplayName("삭제 실패를 인프라 예외로 알린다")
    void reportsDeleteFailure() {
        given(s3Client.deleteObject(any(DeleteObjectRequest.class))).willThrow(SdkClientException.create("down"));

        assertThatThrownBy(() -> repository.delete(UUID.randomUUID(), ImagePurpose.FEEDBACK))
            .isInstanceOf(InfrastructureException.class);
    }

    @Test
    @DisplayName("경로가 /로 끝나지 않으면 만들 수 없다")
    void rejectsPrefixWithoutSlash() {
        assertThatThrownBy(() -> new S3ImageRepository(s3Client, BUCKET, "poudy/feedback/images"))
            .isInstanceOf(IllegalArgumentException.class);
    }
}
