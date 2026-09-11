package com.poudy.config;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.DigestInputStream;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import org.springframework.core.io.ResourceLoader;

public final class ResourceFingerprint {

    private ResourceFingerprint() {
    }

    public static String of(ResourceLoader resources, String directory, List<String> names) throws IOException {
        MessageDigest digest = sha256();
        for (String name : names) {
            digest.update(name.getBytes(StandardCharsets.UTF_8));
            digestContent(digest, open(resources, directory, name));
        }
        return HexFormat.of().formatHex(digest.digest());
    }

    private static void digestContent(MessageDigest digest, InputStream source) throws IOException {
        try (InputStream input = new DigestInputStream(source, digest)) {
            input.transferTo(OutputStream.nullOutputStream());
        }
    }

    private static InputStream open(ResourceLoader resources, String directory, String name) throws IOException {
        if (directory.isBlank()) {
            return resources.getResource("classpath:" + name).getInputStream();
        }
        return Files.newInputStream(Path.of(directory).resolve(name));
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
