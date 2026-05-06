ALTER TABLE items
    ADD COLUMN IF NOT EXISTS salvage_profile VARCHAR(20),
    ADD COLUMN IF NOT EXISTS annual_depreciation_rate NUMERIC(5,4);

ALTER TABLE items
    DROP CONSTRAINT IF EXISTS items_salvage_profile_check,
    ADD CONSTRAINT items_salvage_profile_check CHECK (
        salvage_profile IS NULL OR salvage_profile IN ('valueKeeper', 'steady', 'fastDrop')
    );

ALTER TABLE items
    DROP CONSTRAINT IF EXISTS items_annual_depreciation_rate_check,
    ADD CONSTRAINT items_annual_depreciation_rate_check CHECK (
        annual_depreciation_rate IS NULL
        OR (annual_depreciation_rate >= 0 AND annual_depreciation_rate < 1)
    );
