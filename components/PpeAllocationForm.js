// components/PpeAllocationForm.jsx
'use client';

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Calendar, AlertCircle, CheckCircle, Loader2, Search, X } from "@/components/shared/theme";

const PpeAllocationForm = ({ ppeItem, employees, onSubmit, onCancel }) => {
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showEmployeeSelection, setShowEmployeeSelection] = useState(false);
    const [issueReason, setIssueReason] = useState("new_employee");
    const [expectedReturnDate, setExpectedReturnDate] = useState("");
    const [issuedBy, setIssuedBy] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Set default expected return date (30 days from now)
    useEffect(() => {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        setExpectedReturnDate(thirtyDaysFromNow.toISOString().split('T')[0]);
    }, []);

    // Reset form when PPE item changes
    useEffect(() => {
        if (ppeItem) {
            setSelectedEmployee(null);
            setIssuedBy("");
            setNotes("");
            setIssueReason("new_employee");
            setErrors({});
        }
    }, [ppeItem]);

    const issueReasons = [
        { value: "new_employee", label: "New Employee" },
        { value: "regular_replacement", label: "Regular Replacement" },
        { value: "damaged", label: "Damaged" },
        { value: "lost", label: "Lost" },
        { value: "stolen", label: "Stolen" },
        { value: "size_change", label: "Size Change" },
        { value: "department_change", label: "Department Change" },
        { value: "site_requirement", label: "Site Requirement" }
    ];

    const filteredEmployees = employees.filter(employee =>
        employee.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        employee.department?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const validateForm = () => {
        const newErrors = {};
        
        if (!selectedEmployee) {
            newErrors.employee = "Please select an employee";
        }
        
        if (!issuedBy.trim()) {
            newErrors.issuedBy = "Issued by is required";
        }
        
        if (!ppeItem) {
            newErrors.ppeItem = "PPE item is required";
        }

        // Check if PPE item is available
        if (ppeItem && ppeItem.status !== 'available') {
            newErrors.ppeItem = `This PPE item is not available (Current status: ${ppeItem.status})`;
        }

        // Check stock
        if (ppeItem && ppeItem.current_stock !== undefined && ppeItem.current_stock <= 0) {
            newErrors.ppeItem = "This PPE item is out of stock";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const allocationData = {
                ppe_item_id: ppeItem.id,
                employee_id: selectedEmployee.id,
                issue_date: new Date().toISOString().split('T')[0],
                issue_reason: issueReason,
                expected_return_date: expectedReturnDate || null,
                issued_by: issuedBy.trim(),
                allocation_status: "active",
                condition_at_issue: "new",
                notes: notes.trim() || null
            };

            console.log('Submitting allocation data:', allocationData);
            await onSubmit(allocationData);
            
            // Reset form on success
            setSelectedEmployee(null);
            setIssuedBy("");
            setNotes("");
            setIssueReason("new_employee");
            
        } catch (error) {
            console.error("Allocation error:", error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    const formatCategory = (category) => {
        return category.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            available: { color: "bg-green-100 text-green-800", label: "Available" },
            issued: { color: "bg-blue-100 text-blue-800", label: "Issued" },
            damaged: { color: "bg-red-100 text-red-800", label: "Damaged" },
            under_maintenance: { color: "bg-yellow-100 text-yellow-800", label: "Maintenance" },
            expired: { color: "bg-gray-100 text-gray-800", label: "Expired" }
        };
        
        const config = statusConfig[status] || { color: "bg-gray-100 text-gray-800", label: status };
        return <Badge className={config.color}>{config.label}</Badge>;
    };

    if (!ppeItem) {
        return (
            <Card>
                <CardContent className="p-8 text-center">
                    <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No PPE Item Selected</h3>
                    <p className="text-gray-500">
                        Please select a PPE item from the inventory to issue.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* PPE Item Summary */}
            <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <Shield className="h-8 w-8 text-blue-600" />
                            <div>
                                <div className="font-semibold text-blue-900">{ppeItem.name}</div>
                                <div className="text-sm text-blue-700">
                                    ID: {ppeItem.ppe_id} • {formatCategory(ppeItem.category)}
                                </div>
                                {ppeItem.size && (
                                    <div className="text-sm text-blue-700">Size: {ppeItem.size}</div>
                                )}
                                {ppeItem.manufacturer && (
                                    <div className="text-sm text-blue-700">Manufacturer: {ppeItem.manufacturer}</div>
                                )}
                            </div>
                        </div>
                        <div className="text-right">
                            {getStatusBadge(ppeItem.status)}
                            {ppeItem.current_stock !== undefined && (
                                <div className={`text-sm mt-1 ${
                                    ppeItem.current_stock > 0 ? 'text-blue-700' : 'text-red-700'
                                }`}>
                                    Stock: {ppeItem.current_stock} available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PPE Item Errors */}
                    {errors.ppeItem && (
                        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-800">
                                <AlertCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">{errors.ppeItem}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Employee Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Assign to Employee</CardTitle>
                        <CardDescription>
                            Select the employee who will receive this PPE item
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {errors.employee && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-red-800">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">{errors.employee}</span>
                                </div>
                            </div>
                        )}

                        {selectedEmployee ? (
                            <Card className="bg-green-50 border-green-200">
                                <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                <User className="h-5 w-5 text-green-600" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-medium text-green-900">
                                                    {selectedEmployee.full_name}
                                                </div>
                                                <div className="text-sm text-green-700">
                                                    {selectedEmployee.id} • {selectedEmployee.department}
                                                </div>
                                                {selectedEmployee.job_title && (
                                                    <div className="text-xs text-green-600">
                                                        {selectedEmployee.job_title}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex space-x-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setShowEmployeeSelection(true)}
                                            >
                                                Change
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedEmployee(null)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start h-12 border-2 border-dashed border-gray-300 hover:border-gray-400"
                                onClick={() => setShowEmployeeSelection(true)}
                                disabled={ppeItem.status !== 'available' || (ppeItem.current_stock !== undefined && ppeItem.current_stock <= 0)}
                            >
                                <User className="h-4 w-4 mr-2" />
                                {ppeItem.status !== 'available' ? 'PPE Not Available' : 
                                 ppeItem.current_stock <= 0 ? 'Out of Stock' : 
                                 'Select an employee'}
                            </Button>
                        )}

                        {employees.length === 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-yellow-800">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm">No employees available. Please add employees first.</span>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Allocation Details */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Allocation Details</CardTitle>
                        <CardDescription>
                            Specify the allocation terms and conditions
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="issueReason">Issue Reason *</Label>
                                <Select value={issueReason} onValueChange={setIssueReason}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {issueReasons.map(reason => (
                                            <SelectItem key={reason.value} value={reason.value}>
                                                {reason.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="expectedReturnDate">Expected Return Date</Label>
                                <div className="flex items-center space-x-2">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <Input
                                        id="expectedReturnDate"
                                        type="date"
                                        value={expectedReturnDate}
                                        onChange={(e) => setExpectedReturnDate(e.target.value)}
                                        className="flex-1"
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                                <p className="text-xs text-gray-500">
                                    Optional - set when this PPE should be returned
                                </p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="issuedBy">
                                Issued By *
                                {errors.issuedBy && (
                                    <span className="text-red-500 text-sm ml-2">
                                        <AlertCircle className="h-3 w-3 inline mr-1" />
                                        {errors.issuedBy}
                                    </span>
                                )}
                            </Label>
                            <Input
                                id="issuedBy"
                                placeholder="Enter your full name"
                                value={issuedBy}
                                onChange={(e) => {
                                    setIssuedBy(e.target.value);
                                    if (errors.issuedBy) {
                                        setErrors(prev => ({ ...prev, issuedBy: '' }));
                                    }
                                }}
                                className={errors.issuedBy ? "border-red-500" : ""}
                                required
                            />
                            <p className="text-xs text-gray-500">
                                Name of the person issuing this PPE
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes (Optional)</Label>
                            <Textarea
                                id="notes"
                                placeholder="Additional notes about this allocation, special instructions, or comments..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                            />
                            <p className="text-xs text-gray-500">
                                Any additional information about this allocation
                            </p>
                        </div>

                        {/* Condition Info */}
                        <div className="bg-gray-50 rounded-lg p-3 border">
                            <div className="flex items-center space-x-2 text-gray-700 mb-1">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium">Condition at Issue: New</span>
                            </div>
                            <p className="text-xs text-gray-600">
                                All newly issued PPE items are marked as "New" condition. Condition will be tracked during returns.
                            </p>
                        </div>
                    </CardContent>
                </Card>

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
                            size="lg"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={!selectedEmployee || !issuedBy.trim() || loading || ppeItem.status !== 'available'}
                            className="bg-blue-600 hover:bg-blue-700"
                            size="lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Issuing PPE...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Issue PPE to {selectedEmployee?.full_name?.split(' ')[0] || 'Employee'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>

            {/* Employee Selection Dialog */}
            {showEmployeeSelection && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md max-h-[80vh] overflow-hidden">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between">
                                <span>Select Employee</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowEmployeeSelection(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardTitle>
                            <CardDescription>
                                Choose an employee to issue {ppeItem.name} to
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    placeholder="Search employees by name, ID, or department..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                    autoFocus
                                />
                            </div>

                            {/* Employee List */}
                            <div className="border rounded-lg max-h-60 overflow-y-auto">
                                {filteredEmployees.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <User className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                        <p>No employees found</p>
                                        {searchTerm && (
                                            <p className="text-sm mt-1">Try adjusting your search terms</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="divide-y">
                                        {filteredEmployees.map((employee) => (
                                            <div
                                                key={employee.id}
                                                className="p-3 cursor-pointer hover:bg-blue-50 transition-colors group"
                                                onClick={() => {
                                                    setSelectedEmployee(employee);
                                                    setShowEmployeeSelection(false);
                                                    setSearchTerm("");
                                                }}
                                            >
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                                        <User className="h-5 w-5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium text-gray-900 truncate">
                                                            {employee.full_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500 truncate">
                                                            {employee.id} • {employee.department}
                                                        </div>
                                                        {employee.job_title && (
                                                            <div className="text-xs text-gray-400 truncate">
                                                                {employee.job_title}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                        Select
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex space-x-2">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowEmployeeSelection(false);
                                        setSearchTerm("");
                                    }}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                {filteredEmployees.length > 0 && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedEmployee(filteredEmployees[0]);
                                            setShowEmployeeSelection(false);
                                            setSearchTerm("");
                                        }}
                                        className="flex-1"
                                    >
                                        Select First
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default PpeAllocationForm;