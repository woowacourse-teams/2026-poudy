package com.poudy.offline.source;

public sealed interface ValueOrMissing<T>
        permits ValueOrMissing.Present, ValueOrMissing.Missing {

    static <T> ValueOrMissing<T> present(T value) {
        return new Present<>(value);
    }

    static <T> ValueOrMissing<T> missing(MissingReason reason) {
        return new Missing<>(reason, null);
    }

    static <T> ValueOrMissing<T> other(String note) {
        return new Missing<>(MissingReason.OTHER_WITH_NOTE, note);
    }

    record Present<T>(T value) implements ValueOrMissing<T> {

        public Present {
            if (value == null) {
                throw new IllegalArgumentException("관측값은 null일 수 없습니다.");
            }
            if (value instanceof CharSequence text && text.toString().isBlank()) {
                throw new IllegalArgumentException("문자열 관측값은 비어 있을 수 없습니다.");
            }
        }
    }

    record Missing<T>(MissingReason reason, String note) implements ValueOrMissing<T> {

        public Missing {
            if (reason == null) {
                throw new IllegalArgumentException("결측 이유가 필요합니다.");
            }
            if (reason == MissingReason.OTHER_WITH_NOTE) {
                if (note == null || note.isBlank()) {
                    throw new IllegalArgumentException("기타 결측 이유에는 설명이 필요합니다.");
                }
            } else if (note != null) {
                throw new IllegalArgumentException("기타 결측 이유가 아니면 설명을 함께 저장할 수 없습니다.");
            }
        }
    }
}
