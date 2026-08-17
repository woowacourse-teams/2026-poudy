package com.poudy.offline.source;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;

public record InputManifest(List<InputManifestEntry> entries) {

    private static final byte[] HASH_DOMAIN = "poudy-normalized-sensory-input-manifest-v1"
            .getBytes(StandardCharsets.UTF_8);

    private static final Comparator<InputManifestEntry> CANONICAL_ORDER = Comparator
            .comparing(InputManifest::referenceKind)
            .thenComparing(InputManifest::referenceValue);

    public InputManifest {
        if (entries == null || entries.isEmpty()) {
            throw new IllegalArgumentException("입력 manifest에는 한 개 이상의 byte 입력이 필요합니다.");
        }
        if (entries.stream().anyMatch(entry -> entry == null)) {
            throw new IllegalArgumentException("입력 manifest 항목은 null일 수 없습니다.");
        }

        List<InputManifestEntry> canonicalEntries = new ArrayList<>(entries);
        canonicalEntries.sort(CANONICAL_ORDER);
        rejectDuplicateReferences(canonicalEntries);
        entries = List.copyOf(canonicalEntries);
    }

    public InputManifestSha256 manifestSha256() {
        MessageDigest digest = sha256Digest();
        digest.update(HASH_DOMAIN);
        digest.update(intBytes(entries.size()));
        entries.forEach(entry -> updateDigest(digest, entry));
        return new InputManifestSha256(HexFormat.of().formatHex(digest.digest()));
    }

    private static void rejectDuplicateReferences(List<InputManifestEntry> entries) {
        Map<InputManifestEntry.InputReference, InputManifestEntry> entriesByReference = new HashMap<>();
        for (InputManifestEntry entry : entries) {
            InputManifestEntry existing = entriesByReference.putIfAbsent(
                    entry.inputReference(),
                    entry);
            if (existing == null) {
                continue;
            }
            if (existing.equals(entry)) {
                throw new IllegalArgumentException("입력 manifest에 중복 항목이 있습니다.");
            }
            throw new IllegalArgumentException("같은 manifest 입력 식별자에 서로 다른 내용이 있습니다.");
        }
    }

    private static void updateDigest(MessageDigest digest, InputManifestEntry entry) {
        digest.update(referenceKind(entry).getBytes(StandardCharsets.UTF_8));
        updateLengthPrefixed(digest, referenceValue(entry));
        digest.update(longBytes(entry.byteSize()));
        digest.update(HexFormat.of().parseHex(entry.contentSha256().value()));
    }

    private static void updateLengthPrefixed(MessageDigest digest, String value) {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        digest.update(intBytes(bytes.length));
        digest.update(bytes);
    }

    private static String referenceKind(InputManifestEntry entry) {
        if (entry.inputReference() instanceof InputManifestEntry.InputReference.StableIdentifier) {
            return "stable-id";
        }
        return "logical-file";
    }

    private static String referenceValue(InputManifestEntry entry) {
        return switch (entry.inputReference()) {
            case InputManifestEntry.InputReference.StableIdentifier identifier ->
                identifier.value().value();
            case InputManifestEntry.InputReference.LogicalFileName fileName -> fileName.value();
        };
    }

    private static MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("JVM에서 SHA-256을 사용할 수 없습니다.", exception);
        }
    }

    private static byte[] intBytes(int value) {
        return ByteBuffer.allocate(Integer.BYTES).putInt(value).array();
    }

    private static byte[] longBytes(long value) {
        return ByteBuffer.allocate(Long.BYTES).putLong(value).array();
    }
}
