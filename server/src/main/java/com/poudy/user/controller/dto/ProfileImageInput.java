package com.poudy.user.controller.dto;

import java.util.UUID;

public record ProfileImageInput(boolean sent, UUID imageId) {

    public static final ProfileImageInput NOT_SENT = new ProfileImageInput(false, null);
}
