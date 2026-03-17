-- Supabase SQL Initialization Script for Invoices and Items

-- Create table "invoices"
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    phone TEXT,
    rec_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    total_amount NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Create policy to allow ONLY authenticated users to do CRUD operations
CREATE POLICY "Allow authenticated full access to invoices"
    ON public.invoices
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Create table "invoice_items"
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL,
    amount NUMERIC NOT NULL
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policy to allow ONLY authenticated users to do CRUD operations
CREATE POLICY "Allow authenticated full access to invoice_items"
    ON public.invoice_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
