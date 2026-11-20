package com.poudy.youtube.domain;

/**
 * 채널이 영상마다 제품에 낸 의견(youtube_video_product.recommendation)을 갈래별로 센 값이다.
 * other 는 neutral 과 uncertain 을 합친다.
 */
public record YouTubeOpinionCounts(long recommended, long mixed, long notRecommended, long other) {
}
