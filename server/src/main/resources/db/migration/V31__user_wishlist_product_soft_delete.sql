-- 위시리스트에서 뺀 제품은 행을 지우지 않고 뺀 시각만 남긴다. 되돌리면 담은 시각 그대로 되살린다.
-- 다시 담으면 지금 담은 것으로 새로 쓴다. 회원·제품마다 행이 하나라 뺀 행이 쌓이지 않는다.
ALTER TABLE user_wishlist_product ADD COLUMN deleted_at TIMESTAMP NULL;
