package com.poudy.offline.source;

import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;

public final class StableId {

    private static final Pattern NAMESPACE = Pattern.compile("[a-z][a-z0-9-]*[a-z0-9]");
    private static final Pattern LOCAL_VALUE = Pattern.compile("[A-Za-z0-9][A-Za-z0-9._@+:/=-]*");
    private static final Set<String> LOCATOR_NAMESPACES = Set.of(
            "http",
            "https",
            "ftp",
            "ftps",
            "file",
            "mailto",
            "data",
            "s3",
            "gs");

    private final String value;

    private StableId(String value) {
        this.value = value;
    }

    public static StableId namespaced(String namespace, String localValue) {
        if (namespace == null || !NAMESPACE.matcher(namespace).matches()) {
            throw new IllegalArgumentException("안정 식별자 namespace 형식이 올바르지 않습니다.");
        }
        if (LOCATOR_NAMESPACES.contains(namespace)) {
            throw new IllegalArgumentException("URL이나 저장소 locator namespace를 안정 식별자에 사용할 수 없습니다.");
        }
        if (localValue == null
                || !LOCAL_VALUE.matcher(localValue).matches()
                || looksLikeLocator(localValue)) {
            throw new IllegalArgumentException("안정 식별자 local value 형식이 올바르지 않습니다.");
        }

        return new StableId(namespace + ":" + localValue);
    }

    private static boolean looksLikeLocator(String value) {
        String lowercase = value.toLowerCase(java.util.Locale.ROOT);
        return value.indexOf('\\') >= 0
                || value.startsWith("/")
                || value.startsWith("./")
                || value.startsWith("../")
                || value.contains("://")
                || lowercase.startsWith("http:")
                || lowercase.startsWith("https:")
                || lowercase.startsWith("ftp:")
                || lowercase.startsWith("ftps:")
                || lowercase.startsWith("file:")
                || lowercase.startsWith("mailto:")
                || lowercase.startsWith("data:")
                || lowercase.startsWith("s3:")
                || lowercase.startsWith("gs:")
                || value.matches("^[A-Za-z]:.*");
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        return this == other
                || other instanceof StableId stableId && value.equals(stableId.value);
    }

    @Override
    public int hashCode() {
        return Objects.hash(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
