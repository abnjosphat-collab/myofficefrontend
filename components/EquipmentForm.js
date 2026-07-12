// components/EquipmentForm.js
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, X, AlertTriangle } from "@/components/shared/theme";

const EquipmentForm = ({ equipment, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        equipment_id: "",
        name: "",
        model: "",
        serial_number: "",
        category: "",
        description: "",
        status: "operational",
        location: "",
        department: "",
        commission_date: "",
        purchase_cost: "",
        current_value: "",
        depreciation_rate: "",
        supplier: "",
        supplier_contact: "",
        supplier_phone: "",
        warranty_info: "",
        specifications: "",
        maintenance_interval: "",
        last_maintenance: "",
        next_maintenance: "",
        maintenance_notes: ""
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (equipment) {
            // Convert all data to proper format for form inputs
            const processedData = {
                equipment_id: equipment.equipment_id || "",
                name: equipment.name || "",
                model: equipment.model || "",
                serial_number: equipment.serial_number || "",
                category: equipment.category || "",
                description: equipment.description || "",
                status: equipment.status || "operational",
                location: equipment.location || "",
                department: equipment.department || "",
                commission_date: equipment.commission_date ? formatDateForInput(equipment.commission_date) : "",
                purchase_cost: equipment.purchase_cost?.toString() || "",
                current_value: equipment.current_value?.toString() || "",
                depreciation_rate: equipment.depreciation_rate?.toString() || "",
                supplier: equipment.supplier || "",
                supplier_contact: equipment.supplier_contact || "",
                supplier_phone: equipment.supplier_phone || "",
                warranty_info: equipment.warranty_info || "",
                specifications: equipment.specifications || "",
                maintenance_interval: equipment.maintenance_interval?.toString() || "",
                last_maintenance: equipment.last_maintenance ? formatDateForInput(equipment.last_maintenance) : "",
                next_maintenance: equipment.next_maintenance ? formatDateForInput(equipment.next_maintenance) : "",
                maintenance_notes: equipment.maintenance_notes || ""
            };
            setFormData(processedData);
        } else {
            // Reset form for new equipment
            setFormData({
                equipment_id: "",
                name: "",
                model: "",
                serial_number: "",
                category: "",
                description: "",
                status: "operational",
                location: "",
                department: "",
                commission_date: "",
                purchase_cost: "",
                current_value: "",
                depreciation_rate: "",
                supplier: "",
                supplier_contact: "",
                supplier_phone: "",
                warranty_info: "",
                specifications: "",
                maintenance_interval: "",
                last_maintenance: "",
                next_maintenance: "",
                maintenance_notes: ""
            });
        }
    }, [equipment]);

    // Helper function to format date for input[type="date"]
    const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Process form data before submission
    const processFormData = (data) => {
        const processed = { ...data };
        
        // Remove ID for new equipment (let backend generate it)
        if (!equipment) {
            delete processed.id;
        }

        // Convert empty strings to null for optional fields
        const optionalFields = [
            'model', 'serial_number', 'category', 'description', 'location', 
            'department', 'supplier', 'supplier_contact', 'supplier_phone',
            'warranty_info', 'specifications', 'maintenance_notes'
        ];
        
        optionalFields.forEach(field => {
            if (processed[field] === '') {
                processed[field] = null;
            }
        });

        // Convert number fields - handle empty strings and convert to numbers
        const numberFields = ['purchase_cost', 'current_value', 'depreciation_rate', 'maintenance_interval'];
        numberFields.forEach(field => {
            if (processed[field] === '') {
                processed[field] = null;
            } else if (processed[field] !== null && processed[field] !== '') {
                // Convert to number, handling decimal places
                const numValue = parseFloat(processed[field]);
                processed[field] = isNaN(numValue) ? null : numValue;
            }
        });

        // Convert date fields - handle empty strings
        const dateFields = ['commission_date', 'last_maintenance', 'next_maintenance'];
        dateFields.forEach(field => {
            if (processed[field] === '') {
                processed[field] = null;
            }
        });

        return processed;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            // Basic validation
            if (!formData.equipment_id.trim()) {
                throw new Error("Equipment ID is required");
            }
            if (!formData.name.trim()) {
                throw new Error("Equipment name is required");
            }

            // Process the form data
            const submissionData = processFormData(formData);
            
            console.log("Submitting equipment data:", submissionData);
            await onSubmit(submissionData);
            
        } catch (err) {
            console.error("Form submission error:", err);
            setError(err.message || "Failed to save equipment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
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

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="equipment_id" className="flex items-center">
                                Equipment ID <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Input
                                id="equipment_id"
                                name="equipment_id"
                                value={formData.equipment_id}
                                onChange={handleChange}
                                required
                                placeholder="EQP-001"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center">
                                Equipment Name <span className="text-red-500 ml-1">*</span>
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                placeholder="Industrial Drill Press"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="model">Model</Label>
                            <Input
                                id="model"
                                name="model"
                                value={formData.model}
                                onChange={handleChange}
                                placeholder="DP-5000"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="serial_number">Serial Number</Label>
                            <Input
                                id="serial_number"
                                name="serial_number"
                                value={formData.serial_number}
                                onChange={handleChange}
                                placeholder="SN-DP5000-001"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="category">Category</Label>
                            <Input
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                placeholder="Machinery"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="status">Status</Label>
                            <Select 
                                value={formData.status} 
                                onValueChange={(value) => handleSelectChange('status', value)}
                                disabled={loading}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="operational">Operational</SelectItem>
                                    <SelectItem value="maintenance">Maintenance</SelectItem>
                                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                                    <SelectItem value="reserved">Reserved</SelectItem>
                                    <SelectItem value="retired">Retired</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location">Location</Label>
                            <Input
                                id="location"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="Workshop A"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department">Department</Label>
                            <Input
                                id="department"
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                placeholder="Manufacturing"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="commission_date">Commission Date</Label>
                            <Input
                                id="commission_date"
                                name="commission_date"
                                type="date"
                                value={formData.commission_date}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Describe the equipment, its purpose, and key features..."
                            disabled={loading}
                        />
                    </div>
                </TabsContent>

                {/* Technical Specifications Tab */}
                <TabsContent value="technical" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="purchase_cost">Purchase Cost ($)</Label>
                            <Input
                                id="purchase_cost"
                                name="purchase_cost"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.purchase_cost}
                                onChange={handleChange}
                                placeholder="12500.00"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="current_value">Current Value ($)</Label>
                            <Input
                                id="current_value"
                                name="current_value"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.current_value}
                                onChange={handleChange}
                                placeholder="9800.00"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="depreciation_rate">Depreciation Rate (%)</Label>
                            <Input
                                id="depreciation_rate"
                                name="depreciation_rate"
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                value={formData.depreciation_rate}
                                onChange={handleChange}
                                placeholder="15.5"
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="specifications">Technical Specifications</Label>
                        <Textarea
                            id="specifications"
                            name="specifications"
                            value={formData.specifications}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Enter technical specifications, features, and capabilities..."
                            disabled={loading}
                        />
                    </div>
                </TabsContent>

                {/* Maintenance Tab */}
                <TabsContent value="maintenance" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="maintenance_interval">Maintenance Interval (months)</Label>
                            <Input
                                id="maintenance_interval"
                                name="maintenance_interval"
                                type="number"
                                min="0"
                                value={formData.maintenance_interval}
                                onChange={handleChange}
                                placeholder="6"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="last_maintenance">Last Maintenance Date</Label>
                            <Input
                                id="last_maintenance"
                                name="last_maintenance"
                                type="date"
                                value={formData.last_maintenance}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="next_maintenance">Next Maintenance Date</Label>
                            <Input
                                id="next_maintenance"
                                name="next_maintenance"
                                type="date"
                                value={formData.next_maintenance}
                                onChange={handleChange}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="maintenance_notes">Maintenance Notes</Label>
                        <Textarea
                            id="maintenance_notes"
                            name="maintenance_notes"
                            value={formData.maintenance_notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Enter maintenance history, issues, or special instructions..."
                            disabled={loading}
                        />
                    </div>
                </TabsContent>

                {/* Supplier Tab */}
                <TabsContent value="supplier" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier">Supplier Name</Label>
                            <Input
                                id="supplier"
                                name="supplier"
                                value={formData.supplier}
                                onChange={handleChange}
                                placeholder="Industrial Tools Inc."
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier_contact">Contact Person</Label>
                            <Input
                                id="supplier_contact"
                                name="supplier_contact"
                                value={formData.supplier_contact}
                                onChange={handleChange}
                                placeholder="John Smith"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier_phone">Phone Number</Label>
                            <Input
                                id="supplier_phone"
                                name="supplier_phone"
                                value={formData.supplier_phone}
                                onChange={handleChange}
                                placeholder="+1-555-0101"
                                disabled={loading}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="warranty_info">Warranty Information</Label>
                            <Input
                                id="warranty_info"
                                name="warranty_info"
                                value={formData.warranty_info}
                                onChange={handleChange}
                                placeholder="2 years parts and labor"
                                disabled={loading}
                            />
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onCancel} 
                    disabled={loading}
                    className="min-w-[100px]"
                >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                </Button>
                <Button 
                    type="submit" 
                    disabled={loading}
                    className="min-w-[140px]"
                >
                    {loading ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save className="h-4 w-4 mr-2" />
                            {equipment ? "Update Equipment" : "Add Equipment"}
                        </>
                    )}
                </Button>
            </div>
        </form>
    );
};

export default EquipmentForm;