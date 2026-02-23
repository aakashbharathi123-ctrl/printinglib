-- Add Printing and Packaging Technology department
INSERT INTO public.departments (id, name) VALUES
  ('PPT', 'Printing and Packaging Technology')
ON CONFLICT (id) DO NOTHING;
