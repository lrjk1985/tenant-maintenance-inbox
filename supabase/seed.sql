insert into public.units (property_name, unit_label, address, notes)
values
  ('North Bridge Shophouse', '#02-04', '12 North Bridge Road', 'Retail tenancy with shared riser access'),
  ('River Valley Offices', '08-12', '240 River Valley Road', 'Office suite with pantry plumbing'),
  ('Joo Chiat Walkups', '3A', '18 Joo Chiat Place', 'Residential lease')
on conflict (property_name, unit_label) do nothing;

insert into public.tenants (tenant_name, company_name, phone_number, normalized_phone, unit_id, lease_status, notes)
select 'Alicia Tan', 'Pine & Paper Studio', '+65 9123 4567', '6591234567', units.id, 'active', 'Prefers WhatsApp for maintenance updates'
from public.units
where property_name = 'North Bridge Shophouse' and unit_label = '#02-04'
on conflict (normalized_phone) do nothing;

insert into public.tenants (tenant_name, company_name, phone_number, normalized_phone, unit_id, lease_status, notes)
select 'Marcus Lim', 'Lattice Works Pte Ltd', '+65 9788 2100', '6597882100', units.id, 'active', 'Office manager is usually on-site after 10am'
from public.units
where property_name = 'River Valley Offices' and unit_label = '08-12'
on conflict (normalized_phone) do nothing;
