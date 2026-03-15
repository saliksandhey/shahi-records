-- Supabase SQL Initialization Script for "Shahi Boutique – Date Sales Record"

-- Create table "sales"
CREATE TABLE public.sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    customer_name TEXT NOT NULL,
    phone TEXT,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL,
    discount NUMERIC DEFAULT 0,
    total NUMERIC NOT NULL,
    paid_amount NUMERIC NOT NULL,
    remaining_amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'UPI', 'Card')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create policy to allow ONLY authenticated users to do CRUD operations
CREATE POLICY "Allow authenticated full access to sales"
    ON public.sales
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
