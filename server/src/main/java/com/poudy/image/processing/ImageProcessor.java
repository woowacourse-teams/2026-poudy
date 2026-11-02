package com.poudy.image.processing;

import com.poudy.image.domain.ImageFormat;
import com.poudy.image.domain.ImagePurpose;
import com.poudy.image.domain.InvalidImageException;
import com.poudy.image.domain.ProcessedImage;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.List;
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
public class ImageProcessor {

    public static final long MAX_FILE_BYTES = 5L * 1024 * 1024;
    public static final int MAX_DIMENSION = 4_096;
    public static final long MAX_PIXELS = 16_000_000L;

    private static final int PROFILE_SIZE = 512;

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
    private static final byte[] FILE_TYPE_BOX = "ftyp".getBytes(StandardCharsets.US_ASCII);
    private static final byte[][] HEIC_BRANDS = {
            "heic".getBytes(StandardCharsets.US_ASCII),
            "heix".getBytes(StandardCharsets.US_ASCII)
    };

    private final HeicImageDecoder heicImageDecoder;

    public ImageProcessor(HeicImageDecoder heicImageDecoder) {
        this.heicImageDecoder = heicImageDecoder;
    }

    public ProcessedImage process(MultipartFile file) {
        return process(file, ImagePurpose.FEEDBACK);
    }

    public ProcessedImage process(MultipartFile file, ImagePurpose purpose) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_FILE_BYTES) {
            throw invalidImage();
        }

        try {
            byte[] original = file.getBytes();
            if (original.length == 0 || original.length > MAX_FILE_BYTES) {
                throw invalidImage();
            }

            InputFormat inputFormat = signatureOf(original);
            ImageFormat storedFormat = inputFormat.storedFormat();
            if (purpose == ImagePurpose.PROFILE) {
                storedFormat = ImageFormat.WEBP;
            }
            byte[] encoded = reencode(original, inputFormat, storedFormat, purpose);
            if (encoded.length > MAX_FILE_BYTES) {
                throw invalidImage();
            }

            return new ProcessedImage(storedFormat, encoded);
        } catch (InvalidImageException exception) {
            throw exception;
        } catch (IOException | RuntimeException exception) {
            throw new InvalidImageException("처리할 수 없는 이미지입니다.", exception);
        }
    }

    public void validateBatch(List<MultipartFile> files, int maxCount) {
        if (files == null || files.isEmpty() || files.size() > maxCount) {
            throw invalidImage();
        }

        for (MultipartFile file : files) {
            if (file == null || file.isEmpty() || file.getSize() > MAX_FILE_BYTES) {
                throw invalidImage();
            }
        }
    }

    private static InputFormat signatureOf(byte[] bytes) {
        if (startsWith(bytes, PNG_SIGNATURE)) {
            return InputFormat.PNG;
        }
        if (bytes.length >= 3
            && (bytes[0] & 0xff) == 0xff
            && (bytes[1] & 0xff) == 0xd8
            && (bytes[2] & 0xff) == 0xff) {
            return InputFormat.JPEG;
        }
        if (isHeic(bytes)) {
            return InputFormat.HEIC;
        }
        throw invalidImage();
    }

    private static boolean isHeic(byte[] bytes) {
        if (bytes.length < 16 || !matchesAt(bytes, FILE_TYPE_BOX, 4)) {
            return false;
        }

        long boxSize = Integer.toUnsignedLong(readInt(bytes, 0));
        if (boxSize < 16 || boxSize > bytes.length) {
            return false;
        }

        int endOffset = Math.toIntExact(boxSize);
        for (int offset = 8; offset + 4 <= endOffset; offset += 4) {
            if (offset != 12 && isSupportedHeicBrand(bytes, offset)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isSupportedHeicBrand(byte[] bytes, int offset) {
        for (byte[] brand : HEIC_BRANDS) {
            if (matchesAt(bytes, brand, offset)) {
                return true;
            }
        }
        return false;
    }

    private byte[] reencode(
        byte[] original,
        InputFormat inputFormat,
        ImageFormat storedFormat,
        ImagePurpose purpose
    )
        throws IOException {
        BufferedImage decoded = decodeOriginal(original, inputFormat);
        try {
            if (purpose == ImagePurpose.PROFILE) {
                BufferedImage cropped = cropProfile(decoded);
                try {
                    return encode(cropped, storedFormat);
                } finally {
                    cropped.flush();
                }
            }
            return encode(decoded, storedFormat);
        } finally {
            decoded.flush();
        }
    }

    private static BufferedImage cropProfile(BufferedImage image) {
        int side = Math.min(image.getWidth(), image.getHeight());
        int left = (image.getWidth() - side) / 2;
        int top = (image.getHeight() - side) / 2;
        BufferedImage cropped = new BufferedImage(PROFILE_SIZE, PROFILE_SIZE, BufferedImage.TYPE_INT_ARGB);
        Graphics2D graphics = cropped.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            graphics.drawImage(image, 0, 0, PROFILE_SIZE, PROFILE_SIZE, left, top, left + side, top + side, null);
        } finally {
            graphics.dispose();
        }
        return cropped;
    }

    private BufferedImage decodeOriginal(byte[] original, InputFormat inputFormat) throws IOException {
        if (inputFormat == InputFormat.HEIC) {
            return decodeHeic(original);
        }
        return decode(original, inputFormat.storedFormat());
    }

    private BufferedImage decodeHeic(byte[] bytes) throws IOException {
        byte[] jpeg = heicImageDecoder.decodeToJpeg(bytes);
        return decode(jpeg, ImageFormat.JPEG);
    }

    private static BufferedImage decode(byte[] bytes, ImageFormat expectedFormat) throws IOException {
        try (MemoryCacheImageInputStream input = new MemoryCacheImageInputStream(new ByteArrayInputStream(bytes))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                throw invalidImage();
            }

            ImageReader reader = readers.next();
            try {
                reader.setInput(input, false, false);
                if (formatOf(reader) != expectedFormat) {
                    throw invalidImage();
                }

                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                validateDimensions(width, height);
                ImageReadParam readParam = reader.getDefaultReadParam();
                BufferedImage image = reader.read(0, readParam);
                if (image == null) {
                    throw invalidImage();
                }
                BufferedImage normalized = normalized(image, expectedFormat);
                image.flush();
                return normalized;
            } finally {
                reader.dispose();
            }
        }
    }

    private static ImageFormat formatOf(ImageReader reader) throws IOException {
        String name = reader.getFormatName();
        if ("JPEG".equalsIgnoreCase(name) || "JPG".equalsIgnoreCase(name)) {
            return ImageFormat.JPEG;
        }
        if ("PNG".equalsIgnoreCase(name)) {
            return ImageFormat.PNG;
        }
        throw invalidImage();
    }

    private static void validateDimensions(long width, long height) {
        if (width <= 0
            || height <= 0
            || width > MAX_DIMENSION
            || height > MAX_DIMENSION
            || width * height > MAX_PIXELS) {
            throw invalidImage();
        }
    }

    private static BufferedImage normalized(BufferedImage image, ImageFormat format) {
        int imageType = imageTypeOf(format);
        BufferedImage normalized = new BufferedImage(image.getWidth(), image.getHeight(), imageType);
        Graphics2D graphics = normalized.createGraphics();
        try {
            if (format == ImageFormat.JPEG) {
                graphics.setColor(Color.WHITE);
                graphics.fillRect(0, 0, image.getWidth(), image.getHeight());
            }
            graphics.drawImage(image, 0, 0, null);
        } finally {
            graphics.dispose();
        }
        return normalized;
    }

    private static int imageTypeOf(ImageFormat format) {
        if (format == ImageFormat.JPEG) {
            return BufferedImage.TYPE_INT_RGB;
        }

        return BufferedImage.TYPE_INT_ARGB;
    }

    private static byte[] encode(BufferedImage image, ImageFormat format) throws IOException {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByMIMEType(format.contentType());
        if (!writers.hasNext()) {
            throw invalidImage();
        }

        ImageWriter writer = writers.next();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream output = new MemoryCacheImageOutputStream(bytes)) {
            writer.setOutput(output);
            ImageWriteParam params = writer.getDefaultWriteParam();
            if (format == ImageFormat.JPEG && params.canWriteCompressed()) {
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

    private static int readInt(byte[] bytes, int offset) {
        return (bytes[offset] & 0xff) << 24
            | (bytes[offset + 1] & 0xff) << 16
            | (bytes[offset + 2] & 0xff) << 8
            | bytes[offset + 3] & 0xff;
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

    private static InvalidImageException invalidImage() {
        return new InvalidImageException("처리할 수 없는 이미지입니다.");
    }

    private enum InputFormat {

        JPEG(ImageFormat.JPEG),
        PNG(ImageFormat.PNG),
        HEIC(ImageFormat.JPEG);

        private final ImageFormat storedFormat;

        InputFormat(ImageFormat storedFormat) {
            this.storedFormat = storedFormat;
        }

        private ImageFormat storedFormat() {
            return storedFormat;
        }
    }

}
