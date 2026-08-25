package com.poudy.infrastructure.discord;

public class DiscordWebhookException extends RuntimeException {

    public enum Failure {
        JSON_SERIALIZATION,
        INTERRUPTED,
        TRANSPORT
    }

    private final Failure failure;
    private final String causeType;

    DiscordWebhookException(Failure failure, String causeType) {
        super("Discord webhook 전송에 실패했습니다: " + failure);
        this.failure = failure;
        this.causeType = causeType;
    }

    public Failure failure() {
        return failure;
    }

    public String causeType() {
        return causeType;
    }

    public static DiscordWebhookException serializationFailure() {
        return new DiscordWebhookException(Failure.JSON_SERIALIZATION, null);
    }

    public static DiscordWebhookException interruptedFailure() {
        return new DiscordWebhookException(Failure.INTERRUPTED, null);
    }

    public static DiscordWebhookException transportFailure(String causeType) {
        return new DiscordWebhookException(Failure.TRANSPORT, causeType);
    }
}
