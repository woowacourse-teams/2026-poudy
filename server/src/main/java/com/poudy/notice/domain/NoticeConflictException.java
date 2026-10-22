package com.poudy.notice.domain;

public class NoticeConflictException extends com.poudy.exception.ConflictException {
    public NoticeConflictException() {
        super(com.poudy.exception.ErrorCode.NOTICE_NOT_PRIVATE);
    }
}
