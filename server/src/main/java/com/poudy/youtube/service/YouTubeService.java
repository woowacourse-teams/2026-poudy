package com.poudy.youtube.service;

import com.poudy.exception.ErrorCode;
import com.poudy.exception.ResourceNotFoundException;
import com.poudy.product.repository.ProductRepository;
import com.poudy.youtube.domain.YouTubeChannel;
import com.poudy.youtube.domain.YouTubeChannelOrder;
import com.poudy.youtube.domain.YouTubeProduct;
import com.poudy.youtube.domain.YouTubeVideo;
import com.poudy.youtube.repository.YouTubeRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
public class YouTubeService {
    private final YouTubeRepository youtube;
    private final ProductRepository products;

    public YouTubeService(YouTubeRepository youtube, ProductRepository products) {
        this.youtube = youtube;
        this.products = products;
    }

    public List<YouTubeChannel> channels(int limit, int offset) {
        return youtube.channels(limit, offset);
    }

    public List<YouTubeVideo> videos(String channelId, int limit, int offset) {
        return youtube.videos(channelId, null, limit, offset);
    }

    public List<YouTubeVideo> productMentions(long productId, int limit, int offset) {
        if (!products.existsById(productId)) {
            throw new ResourceNotFoundException(ErrorCode.PRODUCT_NOT_FOUND);
        }
        return youtube.videos(null, productId, limit, offset);
    }

    public YouTubeChannel channel(String id) {
        return youtube.channels(id, 1, 0).stream().findFirst()
            .orElseThrow(() -> new ResourceNotFoundException(ErrorCode.ENDPOINT_NOT_FOUND));
    }

    public List<YouTubeProduct> products(String channelId) {
        return youtube.products(channelId);
    }

    public List<YouTubeChannelOrder> channelOrder() {
        return youtube.channelOrder();
    }

    @Transactional
    public void updateOrder(String id, int position) {
        if (!youtube.updateOrder(id, position)) {
            throw new ResourceNotFoundException(ErrorCode.ENDPOINT_NOT_FOUND);
        }
    }

}
