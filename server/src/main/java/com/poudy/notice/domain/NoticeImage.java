package com.poudy.notice.domain;

import java.util.UUID;

public record NoticeImage(UUID id, String objectKey, String contentType) {
}
