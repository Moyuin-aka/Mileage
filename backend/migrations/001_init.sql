CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    purchase_price NUMERIC(12,2) NOT NULL,
    purchase_date DATE NOT NULL,

    expected_years NUMERIC(4,1),
    residual_value NUMERIC(12,2) NOT NULL DEFAULT 0,
    purchase_channel VARCHAR(255),

    status VARCHAR(20) NOT NULL DEFAULT 'active',
    retired_at DATE,
    sold_at DATE,
    sold_price NUMERIC(12,2),

    notes TEXT,
    image_url VARCHAR(500),

    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT items_category_check CHECK (
        category IN ('electronics', 'appliances', 'furniture', 'transportation', 'other')
    ),
    CONSTRAINT items_status_check CHECK (
        status IN ('active', 'retired', 'sold')
    ),
    CONSTRAINT items_purchase_price_check CHECK (purchase_price >= 0),
    CONSTRAINT items_residual_value_check CHECK (residual_value >= 0),
    CONSTRAINT items_expected_years_check CHECK (
        expected_years IS NULL OR expected_years > 0
    ),
    CONSTRAINT items_sold_price_check CHECK (
        sold_price IS NULL OR sold_price >= 0
    ),
    CONSTRAINT items_retired_date_check CHECK (
        retired_at IS NULL OR retired_at >= purchase_date
    ),
    CONSTRAINT items_sold_date_check CHECK (
        sold_at IS NULL OR sold_at >= purchase_date
    ),
    CONSTRAINT items_status_lifecycle_check CHECK (
        (
            status = 'active'
            AND retired_at IS NULL
            AND sold_at IS NULL
            AND sold_price IS NULL
        )
        OR
        (
            status = 'retired'
            AND retired_at IS NOT NULL
            AND sold_at IS NULL
            AND sold_price IS NULL
        )
        OR
        (
            status = 'sold'
            AND retired_at IS NULL
            AND sold_at IS NOT NULL
            AND sold_price IS NOT NULL
        )
    )
);

CREATE INDEX idx_items_status_active
    ON items(status)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_items_category_active
    ON items(category)
    WHERE deleted_at IS NULL;

CREATE INDEX idx_items_purchase_date_active
    ON items(purchase_date DESC)
    WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_items_updated_at
BEFORE UPDATE ON items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
