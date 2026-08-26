-- Migration: add_missing_columns.sql
-- Adiciona colunas que o painel usa mas que faltam no schema

-- Tasks: adicionar coluna owner
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS owner text;

-- Suppliers: adicionar colunas contact e map_link
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS contact text;
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS map_link text;
