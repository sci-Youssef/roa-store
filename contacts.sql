-- Migration: Drop and recreate contacts table
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DROP TABLE IF EXISTS contacts;

CREATE TABLE contacts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
); 