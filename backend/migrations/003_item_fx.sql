ALTER TABLE items
    ADD COLUMN IF NOT EXISTS purchase_currency VARCHAR(3) NOT NULL DEFAULT 'CNY',
    ADD COLUMN IF NOT EXISTS purchase_original_amount NUMERIC(12,2),
    ADD COLUMN IF NOT EXISTS fx_rate NUMERIC(18,8),
    ADD COLUMN IF NOT EXISTS fx_rate_date DATE,
    ADD COLUMN IF NOT EXISTS fx_bank_fee NUMERIC(5,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS fx_source VARCHAR(50);

ALTER TABLE items
    DROP CONSTRAINT IF EXISTS items_purchase_currency_check,
    ADD CONSTRAINT items_purchase_currency_check CHECK (
        purchase_currency IN ('CNY', 'USD', 'HKD', 'JPY', 'EUR', 'GBP', 'TWD', 'MOP')
    );

ALTER TABLE items
    DROP CONSTRAINT IF EXISTS items_purchase_original_amount_check,
    ADD CONSTRAINT items_purchase_original_amount_check CHECK (
        purchase_original_amount IS NULL OR purchase_original_amount >= 0
    );

ALTER TABLE items
    DROP CONSTRAINT IF EXISTS items_fx_rate_check,
    ADD CONSTRAINT items_fx_rate_check CHECK (
        fx_rate IS NULL OR fx_rate > 0
    );

ALTER TABLE items
    DROP CONSTRAINT IF EXISTS items_fx_bank_fee_check,
    ADD CONSTRAINT items_fx_bank_fee_check CHECK (
        fx_bank_fee >= 0
    );
