'use client';

import { useState, useEffect, type FormEvent } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, useTheme, FormField, FormActions, SelectField } from "@/components/shared/theme";
import { ListAutocomplete } from "@/components/shared/ListAutocomplete";
import type { EquipmentItem } from "@/app/equipment/types";

const STATUS_OPTIONS = [
  { value: "operational", label: "Operational" },
  { value: "maintenance", label: "Maintenance" },
  { value: "out_of_service", label: "Out of Service" },
  { value: "reserved", label: "Reserved" },
  { value: "retired", label: "Retired" },
];

const CRITICALITY_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "High", label: "High" },
  { value: "Medium", label: "Medium" },
  { value: "Low", label: "Low" },
];

interface FormState {
  equipment_id: string;
  name: string;
  model: string;
  manufacturer: string;
  serial_number: string;
  category: string;
  criticality: string;
  description: string;
  status: string;
  location: string;
  department: string;
  commission_date: string;
  purchase_cost: string;
  power_rating: string;
  supplier: string;
  supplier_contact: string;
  supplier_phone: string;
  warranty_info: string;
  specifications: string;
  maintenance_interval: string;
  maintenance_notes: string;
}

const BLANK_FORM: FormState = {
  equipment_id: "",
  name: "",
  model: "",
  manufacturer: "",
  serial_number: "",
  category: "",
  criticality: "",
  description: "",
  status: "operational",
  location: "",
  department: "",
  commission_date: "",
  purchase_cost: "",
  power_rating: "",
  supplier: "",
  supplier_contact: "",
  supplier_phone: "",
  warranty_info: "",
  specifications: "",
  maintenance_interval: "",
  maintenance_notes: "",
};

// Equipment dates are Postgres `date` columns (no time component) feeding an
// <input type="date">, which needs a bare YYYY-MM-DD. Slicing the string directly
// avoids routing through `new Date(...)`, which parses a date-only string as UTC
// midnight and can roll the displayed day back by one in any UTC+ timezone.
const formatDateForInput = (dateString?: string | null): string => {
  if (!dateString) return "";
  return dateString.slice(0, 10);
};

type SubmissionData = Omit<FormState, "purchase_cost" | "maintenance_interval"> & {
  purchase_cost: number | null;
  maintenance_interval: number | null;
};

const processFormData = (data: FormState): SubmissionData => {
  const optionalFields = [
    "model", "manufacturer", "serial_number", "category", "criticality", "description", "location",
    "department", "power_rating", "supplier", "supplier_contact", "supplier_phone",
    "warranty_info", "specifications", "maintenance_notes",
  ] as const;
  const dateFields = ["commission_date"] as const;

  const cleaned: Record<string, string | null> = { ...data };
  optionalFields.forEach((field) => {
    if (cleaned[field] === "") cleaned[field] = null;
  });
  dateFields.forEach((field) => {
    if (cleaned[field] === "") cleaned[field] = null;
  });

  const toNumberOrNull = (value: string): number | null => {
    if (value === "") return null;
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  };

  return {
    ...(cleaned as unknown as SubmissionData),
    purchase_cost: toNumberOrNull(data.purchase_cost),
    maintenance_interval: toNumberOrNull(data.maintenance_interval),
  };
};

interface EquipmentFormProps {
  equipment: EquipmentItem | null;
  onSubmit: (data: SubmissionData) => Promise<void>;
  onCancel: () => void;
}

const EquipmentForm = ({ equipment, onSubmit, onCancel }: EquipmentFormProps) => {
  const t = useTheme();
  const [formData, setFormData] = useState<FormState>(BLANK_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (equipment) {
      setFormData({
        equipment_id: equipment.equipment_id || "",
        name: equipment.name || "",
        model: equipment.model || "",
        manufacturer: equipment.manufacturer || "",
        serial_number: equipment.serial_number || "",
        category: equipment.category || "",
        criticality: equipment.criticality || "",
        description: equipment.description || "",
        status: equipment.status || "operational",
        location: equipment.location || "",
        department: equipment.department || "",
        commission_date: formatDateForInput(equipment.commission_date),
        purchase_cost: equipment.purchase_cost?.toString() || "",
        power_rating: equipment.power_rating || "",
        supplier: equipment.supplier || "",
        supplier_contact: equipment.supplier_contact || "",
        supplier_phone: equipment.supplier_phone || "",
        warranty_info: equipment.warranty_info || "",
        specifications: equipment.specifications || "",
        maintenance_interval: equipment.maintenance_interval?.toString() || "",
        maintenance_notes: equipment.maintenance_notes || "",
      });
    } else {
      setFormData(BLANK_FORM);
    }
  }, [equipment]);

  const set = (name: keyof FormState, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.equipment_id.trim()) throw new Error("Equipment ID is required");
      if (!formData.name.trim()) throw new Error("Equipment name is required");

      await onSubmit(processFormData(formData));
    } catch (err) {
      setError((err as Error).message || "Failed to save equipment");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = `${t.inputBg} rounded-lg text-sm px-3 py-2 w-full transition-all focus:outline-none`;

  return (
    <form onSubmit={handleSubmit}>
      <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="technical">Technical</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            <TabsTrigger value="supplier">Supplier</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Equipment ID" required>
                <input name="equipment_id" value={formData.equipment_id}
                  onChange={(e) => set("equipment_id", e.target.value)}
                  required disabled={loading} placeholder="EQP-001" className={inputCls} />
              </FormField>
              <FormField label="Equipment Name" required>
                <input name="name" value={formData.name}
                  onChange={(e) => set("name", e.target.value)}
                  required disabled={loading} placeholder="Industrial Drill Press" className={inputCls} />
              </FormField>
              <FormField label="Model">
                <input name="model" value={formData.model}
                  onChange={(e) => set("model", e.target.value)}
                  disabled={loading} placeholder="DP-5000" className={inputCls} />
              </FormField>
              <FormField label="Manufacturer">
                <input name="manufacturer" value={formData.manufacturer}
                  onChange={(e) => set("manufacturer", e.target.value)}
                  disabled={loading} placeholder="Atlas Copco" className={inputCls} />
              </FormField>
              <FormField label="Serial Number">
                <input name="serial_number" value={formData.serial_number}
                  onChange={(e) => set("serial_number", e.target.value)}
                  disabled={loading} placeholder="SN-DP5000-001" className={inputCls} />
              </FormField>
              <FormField label="Category">
                <input name="category" value={formData.category}
                  onChange={(e) => set("category", e.target.value)}
                  disabled={loading} placeholder="Machinery" className={inputCls} />
              </FormField>
              <FormField label="Status">
                <SelectField title="Status" value={formData.status}
                  onChange={(v) => set("status", v)} options={STATUS_OPTIONS} disabled={loading} />
              </FormField>
              <FormField label="Criticality">
                <SelectField title="Criticality" value={formData.criticality}
                  onChange={(v) => set("criticality", v)} options={CRITICALITY_OPTIONS} disabled={loading} />
              </FormField>
              <FormField label="Location">
                <ListAutocomplete listName="location" value={formData.location} onChange={(v) => set("location", v)} disabled={loading} placeholder="Workshop A" />
              </FormField>
              <FormField label="Department">
                <input name="department" value={formData.department}
                  onChange={(e) => set("department", e.target.value)}
                  disabled={loading} placeholder="Manufacturing" className={inputCls} />
              </FormField>
              <FormField label="Commission Date">
                <input type="date" name="commission_date" value={formData.commission_date}
                  onChange={(e) => set("commission_date", e.target.value)}
                  disabled={loading} className={inputCls} style={{ colorScheme: t.light ? "light" : "dark" }} />
              </FormField>
            </div>
            <FormField label="Description">
              <Textarea name="description" value={formData.description}
                onChange={(e) => set("description", e.target.value)}
                rows={3} placeholder="Describe the equipment, its purpose, and key features..." disabled={loading} />
            </FormField>
          </TabsContent>

          <TabsContent value="technical" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Purchase Cost ($)">
                <input type="number" step="0.01" min="0" name="purchase_cost" value={formData.purchase_cost}
                  onChange={(e) => set("purchase_cost", e.target.value)}
                  disabled={loading} placeholder="12500.00" className={inputCls} />
              </FormField>
              <FormField label="Power Rating">
                <input name="power_rating" value={formData.power_rating}
                  onChange={(e) => set("power_rating", e.target.value)}
                  disabled={loading} placeholder="45kW" className={inputCls} />
              </FormField>
            </div>
            <FormField label="Technical Specifications">
              <Textarea name="specifications" value={formData.specifications}
                onChange={(e) => set("specifications", e.target.value)}
                rows={4} placeholder="Enter technical specifications, features, and capabilities..." disabled={loading} />
            </FormField>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <FormField label="Maintenance Interval (months)">
              <input type="number" min="0" name="maintenance_interval" value={formData.maintenance_interval}
                onChange={(e) => set("maintenance_interval", e.target.value)}
                disabled={loading} placeholder="6" className={`${inputCls} max-w-xs`} />
            </FormField>
            <FormField label="Maintenance Notes">
              <Textarea name="maintenance_notes" value={formData.maintenance_notes}
                onChange={(e) => set("maintenance_notes", e.target.value)}
                rows={3} placeholder="Enter maintenance history, issues, or special instructions..." disabled={loading} />
            </FormField>
          </TabsContent>

          <TabsContent value="supplier" className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Supplier Name">
                <input name="supplier" value={formData.supplier}
                  onChange={(e) => set("supplier", e.target.value)}
                  disabled={loading} placeholder="Industrial Tools Inc." className={inputCls} />
              </FormField>
              <FormField label="Contact Person">
                <input name="supplier_contact" value={formData.supplier_contact}
                  onChange={(e) => set("supplier_contact", e.target.value)}
                  disabled={loading} placeholder="John Smith" className={inputCls} />
              </FormField>
              <FormField label="Phone Number">
                <input name="supplier_phone" value={formData.supplier_phone}
                  onChange={(e) => set("supplier_phone", e.target.value)}
                  disabled={loading} placeholder="+1-555-0101" className={inputCls} />
              </FormField>
              <FormField label="Warranty Information">
                <input name="warranty_info" value={formData.warranty_info}
                  onChange={(e) => set("warranty_info", e.target.value)}
                  disabled={loading} placeholder="2 years parts and labor" className={inputCls} />
              </FormField>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <FormActions onCancel={onCancel} submitting={loading}
        submitLabel={equipment ? "Update Equipment" : "Add Equipment"} />
    </form>
  );
};

export default EquipmentForm;
