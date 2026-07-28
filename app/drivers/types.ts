// app/drivers/types.ts — the authorised drivers registry's data model: the driver
// record shape and its form-payload mirror. Split out of page.tsx as part of the
// standing "decompose on touch" convention. Component *prop* interfaces stay in
// page.tsx — they're coupled to one component, not the page's data contract.
// DEPARTMENTS/LICENSE_CLASSES/STATUS_COLORS also stay in page.tsx (business
// vocabulary, same as every other page's config constants).

export interface Driver {
  id: number;
  full_name: string;
  phone_numbers: string[];
  department?: string;
  license_class?: string;
  license_expiry?: string;
  status: 'active' | 'inactive' | 'suspended';
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DriverForm {
  full_name: string; phones: string[]; department: string; license_class: string;
  license_expiry: string; status: 'active' | 'inactive' | 'suspended'; notes: string;
}
