package com.poudy.user.controller.dto;

import java.util.UUID;
import tools.jackson.core.JsonParser;
import tools.jackson.databind.DeserializationContext;
import tools.jackson.databind.ValueDeserializer;

public class ProfileImageInputDeserializer extends ValueDeserializer<ProfileImageInput> {

    @Override
    public ProfileImageInput deserialize(JsonParser parser, DeserializationContext context) {
        return new ProfileImageInput(true, context.readValue(parser, UUID.class));
    }

    @Override
    public ProfileImageInput getNullValue(DeserializationContext context) {
        return new ProfileImageInput(true, null);
    }

    @Override
    public ProfileImageInput getAbsentValue(DeserializationContext context) {
        return ProfileImageInput.NOT_SENT;
    }
}
