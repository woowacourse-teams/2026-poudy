UPDATE product p
SET is_sensitive_skin = true
WHERE EXISTS (
    SELECT 1 FROM product_skin_type s WHERE s.product_id = p.id AND s.skin_type_code = 'SENSITIVE'
);

DELETE FROM product_skin_type WHERE skin_type_code = 'SENSITIVE';

UPDATE "user"
SET is_sensitive_skin = true, skin_type = NULL
WHERE skin_type = 'SENSITIVE';

DELETE FROM skin_type WHERE code = 'SENSITIVE';
