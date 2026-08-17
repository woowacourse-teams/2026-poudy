package com.poudy.offline.source;

import java.net.URI;
import java.util.Locale;

public sealed interface SourceLocator
        permits SourceLocator.PublicUrl, SourceLocator.InternalDocumentRef {

    record PublicUrl(URI url) implements SourceLocator {

        public PublicUrl {
            if (url == null || !url.isAbsolute() || url.getHost() == null) {
                throw new IllegalArgumentException("공개 원천에는 절대 HTTP(S) URL이 필요합니다.");
            }

            String scheme = url.getScheme().toLowerCase(Locale.ROOT);
            if (!scheme.equals("http") && !scheme.equals("https")) {
                throw new IllegalArgumentException("공개 원천에는 절대 HTTP(S) URL이 필요합니다.");
            }
        }
    }

    record InternalDocumentRef(String reference) implements SourceLocator {

        public InternalDocumentRef {
            if (reference == null || reference.isBlank()) {
                throw new IllegalArgumentException("내부 문서 참조는 비어 있을 수 없습니다.");
            }
            if (!reference.equals(reference.strip())) {
                throw new IllegalArgumentException("내부 문서 참조의 앞뒤에 공백을 둘 수 없습니다.");
            }
        }
    }
}
