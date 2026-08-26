package com.poudy.feedback.service;

import com.poudy.feedback.domain.Feedback;
import com.poudy.feedback.domain.FeedbackImageFormat;
import com.poudy.feedback.domain.InvalidFeedbackImageException;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.atomic.AtomicBoolean;
import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

@Component
public class FeedbackImageProcessor {

    public static final long MAX_FILE_BYTES = 5L * 1024 * 1024;
    public static final long MAX_TOTAL_BYTES = MAX_FILE_BYTES * Feedback.MAX_IMAGE_COUNT;
    public static final int MAX_DIMENSION = 4_096;
    public static final long MAX_PIXELS = 16_000_000L;

    private static final byte[] PNG_SIGNATURE = {
            (byte) 0x89,
            0x50,
            0x4e,
            0x47,
            0x0d,
            0x0a,
            0x1a,
            0x0a
    };
    private static final byte[] APNG_CHUNK = "acTL".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] PNG_END_CHUNK = "IEND".getBytes(StandardCharsets.US_ASCII);
    private static final byte[] MPO_SIGNATURE = {'M', 'P', 'F', 0};

    public ProcessedImage process(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_FILE_BYTES) {
            throw invalidImage();
        }

        try {
            byte[] original = file.getBytes();
            if (original.length == 0 || original.length > MAX_FILE_BYTES) {
                throw invalidImage();
            }

            FeedbackImageFormat format = signatureOf(original);
            rejectMultipleFrames(original, format);
            byte[] encoded = reencode(original, format);
            if (encoded.length > MAX_FILE_BYTES) {
                throw invalidImage();
            }
            verifyEncoded(encoded, format);

            return new ProcessedImage(format, encoded);
        } catch (InvalidFeedbackImageException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw new InvalidFeedbackImageException("처리할 수 없는 의견 이미지입니다.", exception);
        }
    }

    public void validateBatch(java.util.List<MultipartFile> files) {
        if (files == null || files.isEmpty() || files.size() > Feedback.MAX_IMAGE_COUNT) {
            throw invalidImage();
        }

        long total = 0;
        for (MultipartFile file : files) {
            if (file == null || file.isEmpty() || file.getSize() > MAX_FILE_BYTES) {
                throw invalidImage();
            }
            total = Math.addExact(total, file.getSize());
            if (total > MAX_TOTAL_BYTES) {
                throw invalidImage();
            }
        }
    }

    private static FeedbackImageFormat signatureOf(byte[] bytes) {
        if (startsWith(bytes, PNG_SIGNATURE)) {
            return FeedbackImageFormat.PNG;
        }
        if (bytes.length >= 3
                && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) {
            return FeedbackImageFormat.JPEG;
        }
        throw invalidImage();
    }

    private static void rejectMultipleFrames(byte[] bytes, FeedbackImageFormat format) {
        if (format == FeedbackImageFormat.PNG && hasPngChunk(bytes, APNG_CHUNK)) {
            throw invalidImage();
        }
        if (format == FeedbackImageFormat.JPEG) {
            JpegInspection inspection = inspectJpeg(bytes, 0);
            if (inspection.hasMpoApp2Segment()
                    || hasFollowingJpeg(bytes, inspection.endOffset())) {
                throw invalidImage();
            }
        }
    }

    private static byte[] reencode(byte[] original, FeedbackImageFormat format) throws IOException {
        BufferedImage decoded = decode(original, format, true);
        try {
            return encode(decoded, format);
        } finally {
            decoded.flush();
        }
    }

    private static BufferedImage decode(
            byte[] bytes,
            FeedbackImageFormat expectedFormat,
            boolean normalize)
            throws IOException {
        try (MemoryCacheImageInputStream input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw invalidImage();
            }

            ImageReader reader = readers.next();
            AtomicBoolean warned = new AtomicBoolean();
            try {
                reader.addIIOReadWarningListener((ignored, warning) -> warned.set(true));
                reader.setInput(input, false, false);
                if (formatOf(reader) != expectedFormat || reader.getNumImages(true) != 1) {
                    throw invalidImage();
                }

                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                validateDimensions(width, height);
                ImageReadParam readParam = reader.getDefaultReadParam();
                BufferedImage image = reader.read(0, readParam);
                if (image == null || warned.get()) {
                    throw invalidImage();
                }
                if (!normalize) {
                    return image;
                }
                BufferedImage normalized = normalized(image, expectedFormat);
                image.flush();
                return normalized;
            } finally {
                reader.dispose();
            }
        }
    }

    private static FeedbackImageFormat formatOf(ImageReader reader) throws IOException {
        String name = reader.getFormatName();
        if ("JPEG".equalsIgnoreCase(name) || "JPG".equalsIgnoreCase(name)) {
            return FeedbackImageFormat.JPEG;
        }
        if ("PNG".equalsIgnoreCase(name)) {
            return FeedbackImageFormat.PNG;
        }
        throw invalidImage();
    }

    private static void validateDimensions(int width, int height) {
        if (width <= 0
                || height <= 0
                || width > MAX_DIMENSION
                || height > MAX_DIMENSION
                || (long) width * height > MAX_PIXELS) {
            throw invalidImage();
        }
    }

    private static BufferedImage normalized(BufferedImage image, FeedbackImageFormat format) {
        int imageType = format == FeedbackImageFormat.JPEG
                ? BufferedImage.TYPE_INT_RGB
                : BufferedImage.TYPE_INT_ARGB;
        BufferedImage normalized = new BufferedImage(image.getWidth(), image.getHeight(), imageType);
        Graphics2D graphics = normalized.createGraphics();
        try {
            if (format == FeedbackImageFormat.JPEG) {
                graphics.setColor(Color.WHITE);
                graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
            }
            graphics.drawImage(image, 0, 0, null);
        } finally {
            graphics.dispose();
        }
        return normalized;
    }

    private static byte[] encode(BufferedImage image, FeedbackImageFormat format) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName(
                format == FeedbackImageFormat.JPEG
                        ? "jpeg"
                        : "png");
        if (!writers.hasNext()) {
            throw invalidImage();
        }

        ImageWriter writer = writers.next();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream output = new MemoryCacheImageOutputStream(bytes)) {
            writer.setOutput(output);
            ImageWriteParam params = writer.getDefaultWriteParam();
            if (format == FeedbackImageFormat.JPEG && params.canWriteCompressed()) {
                params.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                params.setCompressionQuality(0.9f);
            }
            writer.write(null, new IIOImage(image, null, null), params);
            output.flush();
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }

    private static void verifyEncoded(byte[] bytes, FeedbackImageFormat format) throws IOException {
        BufferedImage verified = decode(bytes, format, false);
        try {
            if (verified.getWidth() <= 0 || verified.getHeight() <= 0) {
                throw invalidImage();
            }
        } finally {
            verified.flush();
        }
    }

    private static boolean hasPngChunk(byte[] bytes, byte[] expectedType) {
        int offset = PNG_SIGNATURE.length;
        while (offset + 12 <= bytes.length) {
            long length = Integer.toUnsignedLong(readInt(bytes, offset));
            if (length > Integer.MAX_VALUE || offset + 12L + length > bytes.length) {
                throw invalidImage();
            }
            if (matchesAt(bytes, expectedType, offset + 4)) {
                return true;
            }
            if (matchesAt(bytes, PNG_END_CHUNK, offset + 4)) {
                return false;
            }
            offset = Math.toIntExact(offset + 12L + length);
        }
        return false;
    }

    private static int readInt(byte[] bytes, int offset) {
        return (bytes[offset] & 0xff) << 24
                | (bytes[offset + 1] & 0xff) << 16
                | (bytes[offset + 2] & 0xff) << 8
                | bytes[offset + 3] & 0xff;
    }

    private static boolean hasFollowingJpeg(byte[] bytes, int firstImageEndOffset) {
        if (firstImageEndOffset < 0) {
            return false;
        }
        for (int offset = firstImageEndOffset; offset + 2 < bytes.length; offset++) {
            if (isJpegSignatureAt(bytes, offset)
                    && inspectJpeg(bytes, offset).endOffset() > offset) {
                return true;
            }
        }
        return false;
    }

    private static JpegInspection inspectJpeg(byte[] bytes, int startOffset) {
        int offset = startOffset + 2;
        boolean inScan = false;
        boolean hasMpoApp2Segment = false;
        while (offset < bytes.length) {
            int marker;
            if (inScan) {
                marker = -1;
                while (offset < bytes.length) {
                    if ((bytes[offset] & 0xff) != 0xff) {
                        offset++;
                        continue;
                    }
                    offset++;
                    while (offset < bytes.length && (bytes[offset] & 0xff) == 0xff) {
                        offset++;
                    }
                    if (offset >= bytes.length) {
                        return new JpegInspection(hasMpoApp2Segment, -1);
                    }
                    marker = bytes[offset++] & 0xff;
                    if (marker == 0x00 || marker >= 0xd0 && marker <= 0xd7) {
                        marker = -1;
                        continue;
                    }
                    inScan = false;
                    break;
                }
                if (marker < 0) {
                    return new JpegInspection(hasMpoApp2Segment, -1);
                }
            } else {
                if ((bytes[offset] & 0xff) != 0xff) {
                    return new JpegInspection(hasMpoApp2Segment, -1);
                }
                while (offset < bytes.length && (bytes[offset] & 0xff) == 0xff) {
                    offset++;
                }
                if (offset >= bytes.length) {
                    return new JpegInspection(hasMpoApp2Segment, -1);
                }
                marker = bytes[offset++] & 0xff;
            }

            if (marker == 0xd9) {
                return new JpegInspection(hasMpoApp2Segment, offset);
            }
            if (marker == 0x01 || marker == 0xd8 || marker >= 0xd0 && marker <= 0xd7) {
                continue;
            }
            if (marker == 0x00 || offset + 2 > bytes.length) {
                return new JpegInspection(hasMpoApp2Segment, -1);
            }

            int segmentLength = (bytes[offset] & 0xff) << 8 | bytes[offset + 1] & 0xff;
            if (segmentLength < 2 || offset + segmentLength > bytes.length) {
                return new JpegInspection(hasMpoApp2Segment, -1);
            }
            if (marker == 0xe2 && matchesAt(bytes, MPO_SIGNATURE, offset + 2)) {
                hasMpoApp2Segment = true;
            }
            offset += segmentLength;
            if (marker == 0xda) {
                inScan = true;
            }
        }
        return new JpegInspection(hasMpoApp2Segment, -1);
    }

    private static boolean isJpegSignatureAt(byte[] bytes, int offset) {
        return offset + 2 < bytes.length
                && (bytes[offset] & 0xff) == 0xff
                && (bytes[offset + 1] & 0xff) == 0xd8
                && (bytes[offset + 2] & 0xff) == 0xff;
    }

    private static boolean startsWith(byte[] bytes, byte[] expected) {
        return bytes.length >= expected.length && matchesAt(bytes, expected, 0);
    }

    private static boolean matchesAt(byte[] bytes, byte[] expected, int offset) {
        if (offset < 0 || offset + expected.length > bytes.length) {
            return false;
        }
        for (int index = 0; index < expected.length; index++) {
            if (bytes[offset + index] != expected[index]) {
                return false;
            }
        }
        return true;
    }

    private static InvalidFeedbackImageException invalidImage() {
        return new InvalidFeedbackImageException("처리할 수 없는 의견 이미지입니다.");
    }

    private record JpegInspection(boolean hasMpoApp2Segment, int endOffset) {
    }

    public record ProcessedImage(FeedbackImageFormat format, byte[] bytes) {

        public ProcessedImage {
            bytes = bytes.clone();
        }

        @Override
        public byte[] bytes() {
            return bytes.clone();
        }
    }
}
