// components/PpeForm.jsx
'use client';

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Wrench, DollarSign, AlertCircle, CheckCircle, Loader2 } from "@/components/shared/theme";

const PpeForm = ({ ppe, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        ppe_id: '',
        name: '',
        category: 'eye_protection',
        description: '',
        manufacturer: '',
        model: '',
        size: '',
        status: 'available',
        storage_location: '',
        department: '',
        current_stock: 0,
        min_stock_level: 0
    });
    
    const [activeTab, setActiveTab] = useState("basic");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // PPE categories matching your backend enum
    const ppeCategories = [
        { value: "hearing_protection", label: "Hearing Protection" },
        { value: "eye_protection", label: "Eye Protection" },
        { value: "respiratory", label: "Respiratory" },
        { value: "head_protection", label: "Head Protection" },
        { value: "foot_protection", label: "Foot Protection" },
        { value: "hand_protection", label: "Hand Protection" },
        { value: "body_protection", label: "Body Protection" },
        { value: "fall_protection", label: "Fall Protection" },
        { value: "high_visibility", label: "High Visibility" }
    ];

    const statusOptions = [
        { value: "available", label: "Available", color: "bg-green-100 text-green-800" },
        { value: "issued", label: "Issued", color: "bg-blue-100 text-blue-800" },
        { value: "damaged", label: "Damaged", color: "bg-red-100 text-red-800" },
        { value: "under_maintenance", label: "Under Maintenance", color: "bg-yellow-100 text-yellow-800" },
        { value: "expired", label: "Expired", color: "bg-gray-100 text-gray-800" }
    ];

    const departments = [
        "Mining", "Processing", "Maintenance", "Safety", "Laboratory", 
        "Administration", "Security", "Transport", "Contractor"
    ];

    useEffect(() => {
        if (ppe) {
            setFormData({
                ppe_id: ppe.ppe_id || '',
                name: ppe.name || '',
                category: ppe.category || 'eye_protection',
                description: ppe.description || '',
                manufacturer: ppe.manufacturer || '',
                model: ppe.model || '',
                size: ppe.size || '',
                status: ppe.status || 'available',
                storage_location: ppe.storage_location || '',
                department: ppe.department || '',
                current_stock: ppe.current_stock || 0,
                min_stock_level: ppe.min_stock_level || 0
            });
        }
    }, [ppe]);

    const validateForm = () => {
        const newErrors = {};
        
        if (!formData.ppe_id.trim()) {
            newErrors.ppe_id = "PPE ID is required";
        }
        
        if (!formData.name.trim()) {
            newErrors.name = "Name is required";
        }
        
        if (!formData.category) {
            newErrors.category = "Category is required";
        }
        
        if (formData.current_stock < 0) {
            newErrors.current_stock = "Stock cannot be negative";
        }
        
        if (formData.min_stock_level < 0) {
            newErrors.min_stock_level = "Minimum stock cannot be negative";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        const processedValue = type === 'number' ? (value === '' ? 0 : parseInt(value)) : value;
        
        setFormData(prev => ({
            ...prev,
            [name]: processedValue
        }));

        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user selects something
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            // Clean data for submission
            const submitData = {
                ...formData,
                current_stock: parseInt(formData.current_stock) || 0,
                min_stock_level: parseInt(formData.min_stock_level) || 0
            };

            await onSubmit(submitData);
        } catch (error) {
            console.error("Form submission error:", error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const statusOption = statusOptions.find(opt => opt.value === status);
        return (
            <Badge className={statusOption?.color || "bg-gray-100 text-gray-800"}>
                {statusOption?.label || status}
            </Badge>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Quick Summary */}
            {ppe && (
                <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-blue-900">{ppe.name}</h3>
                                <p className="text-sm text-blue-700">ID: {ppe.ppe_id}</p>
                            </div>
                            <div className="text-right">
                                {getStatusBadge(ppe.status)}
                                {ppe.current_stock !== undefined && (
                                    <p className="text-sm text-blue-700 mt-1">
                                        Stock: {ppe.current_stock}
                                    </p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic" className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Basic Information
                    </TabsTrigger>
                    <TabsTrigger value="details" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Additional Details
                    </TabsTrigger>
                </TabsList>

                {/* Basic Information Tab */}
                <TabsContent value="basic" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Basic Information</CardTitle>
                            <CardDescription>
                                Essential details about the PPE item
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="ppe_id">
                                        PPE ID *
                                        {errors.ppe_id && (
                                            <span className="text-red-500 text-sm ml-2">
                                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                                {errors.ppe_id}
                                            </span>
                                        )}
                                    </Label>
                                    <Input
                                        id="ppe_id"
                                        name="ppe_id"
                                        value={formData.ppe_id}
                                        onChange={handleChange}
                                        placeholder="SAFE-HELM-001"
                                        className={errors.ppe_id ? "border-red-500" : ""}
                                        disabled={!!ppe} // Can't change ID when editing
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="name">
                                        Name *
                                        {errors.name && (
                                            <span className="text-red-500 text-sm ml-2">
                                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                                {errors.name}
                                            </span>
                                        )}
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Safety Helmet"
                                        className={errors.name ? "border-red-500" : ""}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="category">
                                        Category *
                                        {errors.category && (
                                            <span className="text-red-500 text-sm ml-2">
                                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                                {errors.category}
                                            </span>
                                        )}
                                    </Label>
                                    <Select 
                                        value={formData.category} 
                                        onValueChange={(value) => handleSelectChange('category', value)}
                                    >
                                        <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                                            <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ppeCategories.map(category => (
                                                <SelectItem key={category.value} value={category.value}>
                                                    {category.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="status">Status *</Label>
                                    <Select 
                                        value={formData.status} 
                                        onValueChange={(value) => handleSelectChange('status', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map(status => (
                                                <SelectItem key={status.value} value={status.value}>
                                                    <div className="flex items-center gap-2">
                                                        <div className={`w-2 h-2 rounded-full ${status.color.split(' ')[0]}`} />
                                                        {status.label}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="Describe the PPE item, its features, and intended use..."
                                    rows={3}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="storage_location">Storage Location</Label>
                                    <Input
                                        id="storage_location"
                                        name="storage_location"
                                        value={formData.storage_location}
                                        onChange={handleChange}
                                        placeholder="Main Store, Workshop A, etc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="department">Department</Label>
                                    <Select 
                                        value={formData.department} 
                                        onValueChange={(value) => handleSelectChange('department', value)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map(dept => (
                                                <SelectItem key={dept} value={dept}>
                                                    {dept}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Additional Details Tab */}
                <TabsContent value="details" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Additional Details</CardTitle>
                            <CardDescription>
                                Manufacturer information and stock management
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="manufacturer">Manufacturer</Label>
                                    <Input
                                        id="manufacturer"
                                        name="manufacturer"
                                        value={formData.manufacturer}
                                        onChange={handleChange}
                                        placeholder="3M, Honeywell, etc."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model">Model</Label>
                                    <Input
                                        id="model"
                                        name="model"
                                        value={formData.model}
                                        onChange={handleChange}
                                        placeholder="Model number or name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="size">Size / Specifications</Label>
                                <Input
                                    id="size"
                                    name="size"
                                    value={formData.size}
                                    onChange={handleChange}
                                    placeholder="Medium, Large, Universal, etc."
                                />
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current_stock">
                                        Current Stock
                                        {errors.current_stock && (
                                            <span className="text-red-500 text-sm ml-2">
                                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                                {errors.current_stock}
                                            </span>
                                        )}
                                    </Label>
                                    <Input
                                        id="current_stock"
                                        name="current_stock"
                                        type="number"
                                        value={formData.current_stock}
                                        onChange={handleChange}
                                        min="0"
                                        className={errors.current_stock ? "border-red-500" : ""}
                                    />
                                    <p className="text-xs text-gray-500">
                                        Number of items currently available
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="min_stock_level">
                                        Minimum Stock Level
                                        {errors.min_stock_level && (
                                            <span className="text-red-500 text-sm ml-2">
                                                <AlertCircle className="h-3 w-3 inline mr-1" />
                                                {errors.min_stock_level}
                                            </span>
                                        )}
                                    </Label>
                                    <Input
                                        id="min_stock_level"
                                        name="min_stock_level"
                                        type="number"
                                        value={formData.min_stock_level}
                                        onChange={handleChange}
                                        min="0"
                                        className={errors.min_stock_level ? "border-red-500" : ""}
                                    />
                                    <p className="text-xs text-gray-500">
                                        Alert when stock falls below this level
                                    </p>
                                </div>
                            </div>

                            {/* Stock Alert */}
                            {formData.current_stock <= formData.min_stock_level && formData.min_stock_level > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-yellow-800">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="font-medium">Low Stock Alert</span>
                                    </div>
                                    <p className="text-sm text-yellow-700 mt-1">
                                        Current stock ({formData.current_stock}) is at or below minimum level ({formData.min_stock_level})
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Separator />

            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                    Fields marked with * are required
                </div>
                <div className="flex justify-end space-x-4">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                {ppe ? "Updating..." : "Creating..."}
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                {ppe ? "Update PPE Item" : "Add PPE Item"}
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
};

export default PpeForm;