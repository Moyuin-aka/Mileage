CREATE TABLE IF NOT EXISTS item_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL DEFAULT 'repair',
    amount NUMERIC(12,2) NOT NULL,
    expense_date DATE NOT NULL,
    description TEXT,
    counts_in_cost BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT item_expenses_type_check CHECK (
        type IN ('repair', 'battery', 'maintenance', 'accessory', 'warranty', 'other')
    ),
    CONSTRAINT item_expenses_amount_check CHECK (amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_item_expenses_item_id
    ON item_expenses(item_id);

CREATE INDEX IF NOT EXISTS idx_item_expenses_date
    ON item_expenses(expense_date DESC);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'trg_item_expenses_updated_at'
    ) THEN
        CREATE TRIGGER trg_item_expenses_updated_at
        BEFORE UPDATE ON item_expenses
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END;
$$;
