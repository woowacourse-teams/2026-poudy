package com.poudy.feedback.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.springframework.stereotype.Component;

@Component
public class HeicImageDecoder {

    private static final Duration TIMEOUT = Duration.ofSeconds(15);
    private static final long MAX_INTERMEDIATE_BYTES = 32L * 1024 * 1024;
    private static final long MAX_ADDRESS_SPACE_BYTES = 384L * 1024 * 1024;

    private static final Path DEFAULT_RESOURCE_LIMITER = Path.of("/usr/bin/prlimit");
    private static final Path DEFAULT_DECODER = Path.of("/usr/bin/heif-convert");

    private final Path resourceLimiter;
    private final Path decoder;

    public HeicImageDecoder() {
        this(DEFAULT_RESOURCE_LIMITER, DEFAULT_DECODER);
    }

    HeicImageDecoder(Path resourceLimiter, Path decoder) {
        this.resourceLimiter = resourceLimiter;
        this.decoder = decoder;
    }

    public byte[] decodeToJpeg(byte[] source) throws IOException {
        validateRuntime();
        Path directory = Files.createTempDirectory("poudy-heic-");
        try {
            Path input = directory.resolve("input.heic");
            Path output = directory.resolve("output.jpg");
            Files.write(input, source);

            Process process = startDecoder(input, output);
            if (!waitFor(process) || process.exitValue() != 0) {
                throw new IOException("HEIC 디코딩에 실패했습니다.");
            }

            Path decoded = singleJpegIn(directory);
            long size = Files.size(decoded);
            if (size <= 0 || size > MAX_INTERMEDIATE_BYTES) {
                throw new IOException("HEIC 디코딩 결과 크기가 허용 범위를 벗어났습니다.");
            }
            return Files.readAllBytes(decoded);
        } finally {
            deleteRecursively(directory);
        }
    }

    private Process startDecoder(Path input, Path output) throws IOException {
        return decoderProcess(input, output).start();
    }

    ProcessBuilder decoderProcess(Path input, Path output) {
        ProcessBuilder builder = new ProcessBuilder(
            resourceLimiter.toString(),
            "--as=" + MAX_ADDRESS_SPACE_BYTES,
            "--fsize=" + MAX_INTERMEDIATE_BYTES,
            "--cpu=" + TIMEOUT.toSeconds(),
            "--",
            decoder.toString(),
            "--quiet",
            "-q",
            "95",
            input.toString(),
            output.toString()
        );
        builder.environment().clear();
        builder.redirectOutput(ProcessBuilder.Redirect.DISCARD);
        builder.redirectError(ProcessBuilder.Redirect.DISCARD);
        return builder;
    }

    void validateRuntime() throws IOException {
        if (!isExecutableFile(resourceLimiter) || !isExecutableFile(decoder)) {
            throw new IOException("HEIC 디코딩 실행 파일을 사용할 수 없습니다.");
        }
    }

    private static boolean isExecutableFile(Path path) {
        return Files.isRegularFile(path) && Files.isExecutable(path);
    }

    private static boolean waitFor(Process process) throws IOException {
        try {
            boolean completed = process.waitFor(TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
            if (!completed) {
                process.destroyForcibly();
                process.waitFor(1, TimeUnit.SECONDS);
            }
            return completed;
        } catch (InterruptedException exception) {
            process.destroyForcibly();
            Thread.currentThread().interrupt();
            throw new IOException("HEIC 디코딩 대기가 중단됐습니다.", exception);
        }
    }

    private static Path singleJpegIn(Path directory) throws IOException {
        try (Stream<Path> paths = Files.list(directory)) {
            List<Path> images = paths
                .filter(Files::isRegularFile)
                .filter(HeicImageDecoder::hasJpegExtension)
                .toList();
            if (images.size() != 1) {
                throw new IOException("HEIC 기본 이미지를 하나로 디코딩하지 못했습니다.");
            }
            return images.getFirst();
        }
    }

    private static boolean hasJpegExtension(Path path) {
        String name = path.getFileName().toString().toLowerCase(Locale.ROOT);
        return name.endsWith(".jpg") || name.endsWith(".jpeg");
    }

    private static void deleteRecursively(Path directory) throws IOException {
        if (!Files.exists(directory)) {
            return;
        }
        IOException failure = null;
        try (Stream<Path> paths = Files.walk(directory)) {
            for (Path path : paths.sorted(Comparator.reverseOrder()).toList()) {
                try {
                    Files.deleteIfExists(path);
                } catch (IOException exception) {
                    if (failure == null) {
                        failure = exception;
                    } else {
                        failure.addSuppressed(exception);
                    }
                }
            }
        }
        if (failure != null) {
            throw failure;
        }
    }
}
