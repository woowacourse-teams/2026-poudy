package com.poudy.image.processing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

import com.poudy.feedback.domain.Feedback;
import com.poudy.image.domain.ImageFormat;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.InvalidImageException;
import com.poudy.image.domain.ProcessedImage;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.CRC32;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.web.multipart.MultipartFile;

@DisplayName("이미지 처리")
class ImageProcessorTest {

    private final HeicImageDecoder heicImageDecoder = mock(HeicImageDecoder.class);
    private final ImageProcessor processor = new ImageProcessor(heicImageDecoder);

    @ParameterizedTest
    @CsvSource({"900, 300", "300, 900", "128, 128"})
    @DisplayName("프로필 사진은 중앙을 정사각형으로 잘라 작은 사진도 512px WebP로 맞춘다")
    void cropsProfileAtCenter(int width, int height) throws Exception {
        BufferedImage source = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = source.createGraphics();
        int side = Math.min(width, height);
        try {
            graphics.setColor(Color.RED);
            graphics.fillRect(0, 0, width, height);
            graphics.setColor(Color.GREEN);
            graphics.fillRect((width - side) / 2, (height - side) / 2, side, side);
        } finally {
            graphics.dispose();
        }
        ByteArrayOutputStream original = new ByteArrayOutputStream();
        ImageIO.write(source, "png", original);
        source.flush();

        ProcessedImage processed = processor.process(
            new MockMultipartFile("image", "photo.png", "image/png", original.toByteArray()),
            ImagePurpose.PROFILE
        );

        assertThat(processed.format()).isEqualTo(ImageFormat.WEBP);
        assertThat(processed.format().contentType()).isEqualTo("image/webp");
        assertThat(new String(processed.bytes(), 8, 4, StandardCharsets.US_ASCII)).isEqualTo("WEBP");
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(processed.bytes()));
        assertThat(decoded.getWidth()).isEqualTo(512);
        assertThat(decoded.getHeight()).isEqualTo(512);
        for (int coordinate : List.of(10, 256, 501)) {
            Color color = new Color(decoded.getRGB(coordinate, coordinate));
            assertThat(color.getGreen()).isGreaterThan(200);
            assertThat(color.getRed()).isLessThan(30);
        }
        decoded.flush();
    }

    @Test
    @DisplayName("투명 PNG 프로필은 WebP로 바꿔도 투명 영역을 유지한다")
    void preservesProfileTransparency() throws Exception {
        BufferedImage source = new BufferedImage(64, 64, BufferedImage.TYPE_INT_ARGB);
        source.setRGB(32, 32, Color.GREEN.getRGB());
        ByteArrayOutputStream original = new ByteArrayOutputStream();
        ImageIO.write(source, "png", original);
        source.flush();

        ProcessedImage processed = processor.process(
            new MockMultipartFile("image", "photo.png", "image/png", original.toByteArray()),
            ImagePurpose.PROFILE
        );

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(processed.bytes()));
        assertThat(new Color(decoded.getRGB(0, 0), true).getAlpha()).isZero();
        assertThat(new Color(decoded.getRGB(260, 260), true).getAlpha()).isGreaterThan(200);
        decoded.flush();
    }

    @ParameterizedTest
    @ValueSource(strings = {"jpeg", "heic"})
    @DisplayName("JPEG와 HEIC 프로필도 디코딩과 검증을 거쳐 WebP로 저장한다")
    void convertsOtherProfileFormats(String format) throws Exception {
        byte[] original = imageBytes("jpeg", 30, 20);
        if (format.equals("heic")) {
            byte[] heic = heicHeader();
            given(heicImageDecoder.decodeToJpeg(heic)).willReturn(original);
            original = heic;
        }
        ProcessedImage processed = processor.process(
            new MockMultipartFile("image", "photo." + format, "image/" + format, original),
            ImagePurpose.PROFILE
        );
        assertThat(processed.format()).isEqualTo(ImageFormat.WEBP);
        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(processed.bytes()));
        assertThat(decoded.getWidth()).isEqualTo(512);
        assertThat(decoded.getHeight()).isEqualTo(512);
        decoded.flush();
    }

    @Test
    @DisplayName("파일명과 선언 형식 대신 실제 PNG 바이트를 재인코딩한다")
    void processesPngByDecodedContent() throws Exception {
        byte[] original = imageBytes("png", 20, 10);
        byte[] withTrailingData = append(original, "private-metadata".getBytes(StandardCharsets.UTF_8));
        MockMultipartFile file = new MockMultipartFile(
            "images",
            "wrong.jpg",
            "text/plain",
            withTrailingData
        );

        ProcessedImage processed = processor.process(file);

        assertThat(processed.format()).isEqualTo(ImageFormat.PNG);
        assertThat(
            containsSequence(
                processed.bytes(),
                "private-metadata".getBytes(StandardCharsets.UTF_8)
            )
        )
            .isFalse();
        BufferedImage decoded = ImageIO.read(new java.io.ByteArrayInputStream(processed.bytes()));
        assertThat(decoded.getWidth()).isEqualTo(20);
        assertThat(decoded.getHeight()).isEqualTo(10);
    }

    @Test
    @DisplayName("실제 JPEG 바이트를 JPEG로 재인코딩한다")
    void processesJpeg() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "images",
            "image.png",
            "image/png",
            imageBytes("jpeg", 16, 8)
        );

        ProcessedImage processed = processor.process(file);

        assertThat(processed.format()).isEqualTo(ImageFormat.JPEG);
        assertThat(processed.bytes()[0] & 0xff).isEqualTo(0xff);
        assertThat(processed.bytes()[1] & 0xff).isEqualTo(0xd8);
    }

    @Test
    @DisplayName("HEIC의 기본 이미지를 JPEG로 재인코딩한다")
    void processesHeicAsJpeg() throws Exception {
        byte[] heic = heicHeader();
        given(heicImageDecoder.decodeToJpeg(heic)).willReturn(imageBytes("jpeg", 16, 8));
        MockMultipartFile file = new MockMultipartFile("images", "image.heic", "image/heic", heic);

        ProcessedImage processed = processor.process(file);

        assertThat(processed.format()).isEqualTo(ImageFormat.JPEG);
        BufferedImage decoded = ImageIO.read(new java.io.ByteArrayInputStream(processed.bytes()));
        assertThat(decoded.getWidth()).isEqualTo(16);
        assertThat(decoded.getHeight()).isEqualTo(8);
    }

    @Test
    @DisplayName("HEIX brand의 HEIC 이미지도 JPEG로 재인코딩한다")
    void processesHeixAsJpeg() throws Exception {
        byte[] heix = heicHeader("heix");
        given(heicImageDecoder.decodeToJpeg(heix)).willReturn(imageBytes("jpeg", 16, 8));
        MockMultipartFile file = new MockMultipartFile("images", "image.heic", "image/heic", heix);

        ProcessedImage processed = processor.process(file);

        assertThat(processed.format()).isEqualTo(ImageFormat.JPEG);
    }

    @Test
    @DisplayName("HEIC brand만 있고 디코딩할 수 없는 ISO BMFF 입력을 거절한다")
    void rejectsBrokenHeic() throws Exception {
        byte[] broken = heicHeader();
        given(heicImageDecoder.decodeToJpeg(broken)).willThrow(new IOException("broken"));
        MockMultipartFile file = new MockMultipartFile("images", "image.heic", "image/heic", broken);

        assertThatThrownBy(() -> processor.process(file)).isInstanceOf(InvalidImageException.class);
    }

    @Test
    @DisplayName("HEIC이 아닌 ISO BMFF 형식을 HEIC로 오인하지 않는다")
    void rejectsOtherIsoBaseMediaFile() {
        byte[] avifHeader = {
                0,
                0,
                0,
                16,
                'f',
                't',
                'y',
                'p',
                'a',
                'v',
                'i',
                'f',
                0,
                0,
                0,
                0
        };
        MockMultipartFile file = new MockMultipartFile("images", "image.avif", "image/avif", avifHeader);

        assertThatThrownBy(() -> processor.process(file)).isInstanceOf(InvalidImageException.class);
    }

    @Test
    @DisplayName("메타데이터 안에 JPEG 썸네일 표식이 있어도 한 장의 JPEG로 처리한다")
    void processesJpegWithEmbeddedThumbnailMarker() throws Exception {
        byte[] original = imageBytes("jpeg", 16, 8);
        byte[] thumbnail = imageBytes("jpeg", 2, 2);
        MockMultipartFile file = new MockMultipartFile(
            "images",
            "image.jpg",
            "image/jpeg",
            withExifThumbnail(original, thumbnail)
        );

        ProcessedImage processed = processor.process(file);

        assertThat(processed.format()).isEqualTo(ImageFormat.JPEG);
        assertThat(containsSequence(processed.bytes(), thumbnail)).isFalse();
    }

    @Test
    @DisplayName("시그니처만 PNG인 손상 파일을 거절한다")
    void rejectsBrokenPng() {
        byte[] broken = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        MockMultipartFile file = new MockMultipartFile("images", "image.png", "image/png", broken);

        assertThatThrownBy(() -> processor.process(file)).isInstanceOf(InvalidImageException.class);
    }

    @Test
    @DisplayName("4,096px를 넘는 축을 거절한다")
    void rejectsOversizedDimension() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
            "images",
            "image.png",
            "image/png",
            imageBytes("png", 4_097, 1)
        );

        assertThatThrownBy(() -> processor.process(file)).isInstanceOf(InvalidImageException.class);
    }

    @Test
    @DisplayName("각 축은 범위 안이어도 총 16MP를 넘으면 디코딩 전에 거절한다")
    void rejectsTooManyPixels() throws Exception {
        byte[] png = imageBytes("png", 2, 2);
        rewritePngDimensions(png, 4_001, 4_000);
        MockMultipartFile file = new MockMultipartFile("images", "image.png", "image/png", png);

        assertThatThrownBy(() -> processor.process(file)).isInstanceOf(InvalidImageException.class);
    }

    @Test
    @DisplayName("파일 수와 개별 파일 크기를 디코딩 전에 거절한다")
    void validatesBatchLimits() {
        List<MultipartFile> tooManyFiles = new ArrayList<>();
        for (int index = 0; index < Feedback.MAX_IMAGE_COUNT + 1; index++) {
            tooManyFiles.add(new MockMultipartFile("images", new byte[] {1}));
        }
        assertThatThrownBy(() -> processor.validateBatch(tooManyFiles, Feedback.MAX_IMAGE_COUNT))
            .isInstanceOf(InvalidImageException.class);

        MultipartFile largeA = sizedFile(ImageProcessor.MAX_FILE_BYTES);
        MultipartFile largeB = sizedFile(ImageProcessor.MAX_FILE_BYTES);
        MultipartFile largeC = sizedFile(ImageProcessor.MAX_FILE_BYTES);
        MultipartFile largeD = sizedFile(ImageProcessor.MAX_FILE_BYTES);
        MultipartFile largeE = sizedFile(ImageProcessor.MAX_FILE_BYTES + 1);
        assertThatThrownBy(
            () -> processor.validateBatch(List.of(largeA, largeB, largeC, largeD, largeE), Feedback.MAX_IMAGE_COUNT)
        )
            .isInstanceOf(InvalidImageException.class);
    }

    private static MultipartFile sizedFile(long size) {
        MultipartFile file = mock(MultipartFile.class);
        given(file.isEmpty()).willReturn(false);
        given(file.getSize()).willReturn(size);
        return file;
    }

    private static byte[] heicHeader() {
        return heicHeader("heic");
    }

    private static byte[] heicHeader(String brand) {
        byte[] brandBytes = brand.getBytes(StandardCharsets.US_ASCII);
        return new byte[] {
                0,
                0,
                0,
                24,
                'f',
                't',
                'y',
                'p',
                brandBytes[0],
                brandBytes[1],
                brandBytes[2],
                brandBytes[3],
                0,
                0,
                0,
                0,
                'm',
                'i',
                'f',
                '1',
                brandBytes[0],
                brandBytes[1],
                brandBytes[2],
                brandBytes[3]
        };
    }

    private static byte[] imageBytes(String format, int width, int height) throws Exception {
        int type = BufferedImage.TYPE_INT_ARGB;
        if ("jpeg".equals(format)) {
            type = BufferedImage.TYPE_INT_RGB;
        }
        BufferedImage image = new BufferedImage(width, height, type);
        Graphics2D graphics = image.createGraphics();
        try {
            graphics.setColor(Color.CYAN);
            graphics.fillRect(0, 0, width, height);
        } finally {
            graphics.dispose();
        }
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, format, output);
        return output.toByteArray();
    }

    private static byte[] append(byte[] first, byte[] second) {
        byte[] joined = new byte[first.length + second.length];
        System.arraycopy(first, 0, joined, 0, first.length);
        System.arraycopy(second, 0, joined, first.length, second.length);
        return joined;
    }

    private static byte[] withExifThumbnail(byte[] jpeg, byte[] thumbnail) {
        byte[] exifPrefix = {'E', 'x', 'i', 'f', 0, 0};
        return withJpegSegment(jpeg, 0xe1, append(exifPrefix, thumbnail));
    }

    private static byte[] withJpegSegment(byte[] jpeg, int marker, byte[] payload) {
        int payloadLength = payload.length;
        int segmentLength = payloadLength + 2;
        byte[] segment = new byte[payloadLength + 4];
        segment[0] = (byte) 0xff;
        segment[1] = (byte) marker;
        segment[2] = (byte) (segmentLength >>> 8);
        segment[3] = (byte) segmentLength;
        System.arraycopy(payload, 0, segment, 4, payload.length);

        byte[] joined = new byte[jpeg.length + segment.length];
        System.arraycopy(jpeg, 0, joined, 0, 2);
        System.arraycopy(segment, 0, joined, 2, segment.length);
        System.arraycopy(jpeg, 2, joined, 2 + segment.length, jpeg.length - 2);
        return joined;
    }

    private static boolean containsSequence(byte[] bytes, byte[] expected) {
        for (int offset = 0; offset <= bytes.length - expected.length; offset++) {
            boolean matches = true;
            for (int index = 0; index < expected.length; index++) {
                if (bytes[offset + index] != expected[index]) {
                    matches = false;
                    break;
                }
            }
            if (matches) {
                return true;
            }
        }
        return false;
    }

    private static void rewritePngDimensions(byte[] png, int width, int height) {
        writeInt(png, 16, width);
        writeInt(png, 20, height);
        CRC32 crc = new CRC32();
        crc.update(png, 12, 17);
        writeInt(png, 29, (int) crc.getValue());
    }

    private static void writeInt(byte[] bytes, int offset, int value) {
        bytes[offset] = (byte) (value >>> 24);
        bytes[offset + 1] = (byte) (value >>> 16);
        bytes[offset + 2] = (byte) (value >>> 8);
        bytes[offset + 3] = (byte) value;
    }
}
