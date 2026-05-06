ALTER TABLE items
    ALTER COLUMN residual_value DROP NOT NULL,
    ALTER COLUMN residual_value DROP DEFAULT;

UPDATE items
SET residual_value = NULL
WHERE residual_value = 0;
