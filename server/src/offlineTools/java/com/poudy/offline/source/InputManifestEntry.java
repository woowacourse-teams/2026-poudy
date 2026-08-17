package com.poudy.offline.source;

public record InputManifestEntry(
        InputReference inputReference,
        long byteSize,
        ContentSha256 contentSha256) {

    public InputManifestEntry {
        if (inputReference == null) {
            throw new IllegalArgumentException("입력 파일명 또는 안정 식별자가 필요합니다.");
        }
        if (byteSize < 0) {
            throw new IllegalArgumentException("입력 byte 크기는 음수일 수 없습니다.");
        }
        if (contentSha256 == null) {
            throw new IllegalArgumentException("입력 내용의 SHA-256이 필요합니다.");
        }
    }

    public sealed interface InputReference
            permits InputReference.StableIdentifier, InputReference.LogicalFileName {

        record StableIdentifier(StableId value) implements InputReference {

            public StableIdentifier {
                if (value == null) {
                    throw new IllegalArgumentException("입력 안정 식별자가 필요합니다.");
                }
            }
        }

        record LogicalFileName(String value) implements InputReference {

            public LogicalFileName {
                if (value == null || value.isBlank()) {
                    throw new IllegalArgumentException("논리 파일명은 비어 있을 수 없습니다.");
                }
                if (!value.equals(value.strip())) {
                    throw new IllegalArgumentException("논리 파일명 앞뒤에는 공백을 둘 수 없습니다.");
                }
                if (!hasWellFormedUtf16(value)) {
                    throw new IllegalArgumentException("논리 파일명은 올바른 Unicode 문자열이어야 합니다.");
                }
                if (looksLikePath(value)) {
                    throw new IllegalArgumentException("논리 파일명에는 경로나 절대 위치를 넣을 수 없습니다.");
                }
                if (value.chars().anyMatch(Character::isISOControl)) {
                    throw new IllegalArgumentException("논리 파일명에는 제어 문자를 넣을 수 없습니다.");
                }
            }

            private static boolean looksLikePath(String value) {
                return value.equals(".")
                        || value.equals("..")
                        || value.indexOf('/') >= 0
                        || value.indexOf('\\') >= 0
                        || value.indexOf(':') >= 0;
            }

            private static boolean hasWellFormedUtf16(String value) {
                for (int index = 0; index < value.length(); index++) {
                    char character = value.charAt(index);
                    if (Character.isHighSurrogate(character)) {
                        if (index + 1 >= value.length()
                                || !Character.isLowSurrogate(value.charAt(index + 1))) {
                            return false;
                        }
                        index++;
                    } else if (Character.isLowSurrogate(character)) {
                        return false;
                    }
                }
                return true;
            }
        }
    }
}
