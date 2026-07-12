'use client';

import { useState, useEffect, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, Info, User, Briefcase, Shield, ListTodo, Trophy, History } from "@/components/shared/theme";

// --- Tab Components ---
const Tabs = ({ children, activeTab, setActiveTab }) => (
  <div className="space-y-4">{children}</div>
);

const TabsList = ({ children }) => (
  <div className="flex space-x-1 border-b pb-1 overflow-x-auto">{children}</div>
);

const TabsTrigger = ({ value, children, activeTab, setActiveTab }) => (
  <button 
    type="button" 
    onClick={() => setActiveTab(value)} 
    className={`px-3 py-2 text-sm font-medium transition-all duration-150 rounded-t-lg ${activeTab === value ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700'}`}
  >
    {children}
  </button>
);

const TabsContent = ({ value, children, activeTab }) => (
  <div className={`pt-4 ${activeTab === value ? 'block' : 'hidden'}`}>{children}</div>
);

// --- Custom Components for Reusability ---
const FormSection = ({ title, icon: Icon, children }) => (
  <>
    <div className="flex items-center space-x-2 pt-4 pb-2">
      <Icon className="h-5 w-5 text-indigo-600" />
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    </div>
    <Separator className="mb-4" />
    {children}
  </>
);

export default function EmployeeForm({ onSubmit, initialData = {}, onCancel }) {
  const employee = initialData ?? {};
  const isEditing = useMemo(() => !!employee.id, [employee.id]);

  const [activeTab, setActiveTab] = useState('personal');

  const initialFormState = useMemo(
    () => ({
      id: employee.id ?? "",
      first_name: employee.first_name ?? "",
      last_name: employee.last_name ?? "",
      id_number: employee.id_number ?? "",
      email: employee.email ?? "",
      phone: employee.phone ?? "",
      address: employee.address ?? "",
      
      date_of_engagement: employee.date_of_engagement ?? "",
      designation: employee.designation ?? "",
      employee_class: employee.employee_class ?? "",
      supervisor: employee.supervisor ?? "",
      section: employee.section ?? "",
      department: employee.department ?? "",
      grade: employee.grade ?? "",
      qualifications: employee.qualifications?.join(", ") ?? "",
      
      drivers_license_class: employee.drivers_license_class ?? "",
      ppe_issue_date: employee.ppe_issue_date ?? "",

      offences: employee.offences?.join(" | ") ?? "",
      awards_recognition: employee.awards_recognition?.join(" | ") ?? "",
      
      other_positions: employee.other_positions?.join(", ") ?? "",
      previous_employer: employee.previous_employer ?? "",
    }),
    [employee.id, employee.first_name, employee.last_name, employee.id_number, employee.email, employee.phone, employee.address, employee.date_of_engagement, employee.designation, employee.employee_class, employee.supervisor, employee.section, employee.department, employee.grade, employee.qualifications, employee.drivers_license_class, employee.ppe_issue_date, employee.offences, employee.awards_recognition, employee.other_positions, employee.previous_employer]
  );

  const [formData, setFormData] = useState(initialFormState);
  const [submissionStatus, setSubmissionStatus] = useState(null);

  useEffect(() => {
    const isNewForm = !formData.id && initialFormState.id;
    const isDifferentEmployee = formData.id !== initialFormState.id;
    
    if (isNewForm || isDifferentEmployee) {
      setFormData(initialFormState);
      setSubmissionStatus(null);
    }
  }, [initialFormState]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSubmissionStatus(null);
  };

  const processSeparatedField = useCallback((fieldValue, separator = ",") => 
    fieldValue.split(separator)
      .map((q) => q.trim())
      .filter((q) => q.length > 0), []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const processedQualifications = processSeparatedField(formData.qualifications, ",");
    const processedOtherPositions = processSeparatedField(formData.other_positions, ",");
    const processedOffences = processSeparatedField(formData.offences, "|");
    const processedAwards = processSeparatedField(formData.awards_recognition, "|");

    const employeeIdForApi = parseInt(formData.id, 10);

    if (!isEditing && (isNaN(employeeIdForApi) || formData.id === "")) {
      setSubmissionStatus("error");
      console.error("Employee ID is required and must be a number for new enrollment.");
      setActiveTab('personal');
      return;
    }

    const payload = {
      id: isEditing ? employee.id : employeeIdForApi,
      first_name: formData.first_name,
      last_name: formData.last_name,
      id_number: formData.id_number,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      
      date_of_engagement: formData.date_of_engagement,
      designation: formData.designation,
      employee_class: formData.employee_class,
      supervisor: formData.supervisor,
      section: formData.section,
      department: formData.department,
      grade: formData.grade,
      qualifications: processedQualifications,

      drivers_license_class: formData.drivers_license_class,
      ppe_issue_date: formData.ppe_issue_date,
      
      offences: processedOffences,
      awards_recognition: processedAwards,
      other_positions: processedOtherPositions,
      
      previous_employer: formData.previous_employer,
    };

    try {
      const success = await onSubmit(payload);
      if (success) {
        setSubmissionStatus("success");
        if (!isEditing) {
          setFormData(
            Object.fromEntries(
              Object.keys(initialFormState).map(key => [key, ''])
            )
          );
        }
      } else {
        setSubmissionStatus("error");
      }
    } catch (err) {
      console.error(err);
      setSubmissionStatus("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {isEditing && (
        <Alert className="bg-blue-50 border-blue-200 text-blue-700 p-3 flex items-center gap-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            Employee ID **{employee.id}** is locked for editing.
          </AlertDescription>
        </Alert>
      )}

      <Tabs activeTab={activeTab} setActiveTab={setActiveTab}>
        <TabsList>
          <TabsTrigger value="personal" activeTab={activeTab} setActiveTab={setActiveTab}>
            <User className="h-4 w-4 mr-1" /> General Info
          </TabsTrigger>
          <TabsTrigger value="org" activeTab={activeTab} setActiveTab={setActiveTab}>
            <Briefcase className="h-4 w-4 mr-1" /> Organizational
          </TabsTrigger>
          <TabsTrigger value="safety" activeTab={activeTab} setActiveTab={setActiveTab}>
            <Shield className="h-4 w-4 mr-1" /> Compliance & Safety
          </TabsTrigger>
          <TabsTrigger value="history" activeTab={activeTab} setActiveTab={setActiveTab}>
            <History className="h-4 w-4 mr-1" /> History & Ancillary
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="personal" activeTab={activeTab}>
          <FormSection title="Personal & Contact Details" icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label htmlFor="id">Employee ID</Label>
                <Input
                  id="id"
                  type="number"
                  name="id"
                  value={formData.id}
                  onChange={handleChange}
                  required
                  disabled={isEditing}
                  className={isEditing ? "bg-gray-100" : ""}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="id_number">National ID Number</Label>
                <Input
                  id="id_number"
                  type="text"
                  name="id_number"
                  value={formData.id_number}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g., john.doe@company.com"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g., +263771234567"
                />
              </div>
              
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="address">Residential Address</Label>
                <Input
                  id="address"
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Street Address, City, Country"
                />
              </div>
            </div>
          </FormSection>
        </TabsContent>

        {/* Rest of the tabs remain the same */}
        <TabsContent value="org" activeTab={activeTab}>
          <FormSection title="Organizational Details" icon={Briefcase}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label htmlFor="date_of_engagement">Date of Engagement</Label>
                <Input
                  id="date_of_engagement"
                  type="date"
                  name="date_of_engagement"
                  value={formData.date_of_engagement}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="employee_class">Employment Class</Label>
                <Input
                  id="employee_class"
                  type="text"
                  name="employee_class"
                  value={formData.employee_class}
                  onChange={handleChange}
                  placeholder="e.g., Permanent, Contract"
                  required
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  placeholder="e.g., Operations, Finance"
                  required
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  type="text"
                  name="section"
                  value={formData.section}
                  onChange={handleChange}
                  placeholder="e.g., Mining, Processing"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="designation">Designation / Role Title</Label>
                <Input
                  id="designation"
                  type="text"
                  name="designation"
                  value={formData.designation}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  type="text"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  placeholder="e.g., G5, Senior Analyst"
                />
              </div>
              
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="supervisor">Direct Supervisor's Name</Label>
                <Input
                  id="supervisor"
                  type="text"
                  name="supervisor"
                  value={formData.supervisor}
                  onChange={handleChange}
                  placeholder="e.g., Jane Smith"
                />
              </div>
              
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="qualifications">
                  Qualifications (Comma-separated: e.g., Degree, Diploma)
                </Label>
                <Input
                  id="qualifications"
                  type="text"
                  name="qualifications"
                  value={formData.qualifications}
                  onChange={handleChange}
                  placeholder="e.g., B.Sc. Computer Science, Project Management"
                />
              </div>
            </div>
          </FormSection>
        </TabsContent>

        <TabsContent value="safety" activeTab={activeTab}>
          <FormSection title="Compliance & Safety" icon={Shield}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="space-y-1">
                <Label htmlFor="drivers_license_class">Driver's License Class</Label>
                <Input
                  id="drivers_license_class"
                  type="text"
                  name="drivers_license_class"
                  value={formData.drivers_license_class}
                  onChange={handleChange}
                  placeholder="e.g., Class 4, Code 14"
                />
              </div>
              
              <div className="space-y-1">
                <Label htmlFor="ppe_issue_date">Last PPE Issue Date</Label>
                <Input
                  id="ppe_issue_date"
                  type="date"
                  name="ppe_issue_date"
                  value={formData.ppe_issue_date}
                  onChange={handleChange}
                />
              </div>
            </div>
          </FormSection>
          
          <FormSection title="Discipline & Recognition" icon={ListTodo}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="offences">
                  Offences / Disciplinary Actions (Pipe-separated: |)
                </Label>
                <Input 
                  id="offences"
                  type="text"
                  name="offences"
                  value={formData.offences}
                  onChange={handleChange}
                  placeholder="e.g., Verbal Warning for Tardiness (2023-10-01) | Written Warning (2024-01-15)"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="awards_recognition">
                  Accolades / Awards / Recognition (Pipe-separated: |)
                </Label>
                <Input 
                  id="awards_recognition"
                  type="text"
                  name="awards_recognition"
                  value={formData.awards_recognition}
                  onChange={handleChange}
                  placeholder="e.g., Employee of the Month (Jan 2024) | Safety Champion Award (Q3 2023)"
                />
              </div>
            </div>
          </FormSection>
        </TabsContent>

        <TabsContent value="history" activeTab={activeTab}>
          <FormSection title="Ancillary Roles" icon={Trophy}>
            <div className="space-y-1">
              <Label htmlFor="other_positions">
                Worker Positions (Comma-separated: e.g., SHEQ Rep, Bus Marshal)
              </Label>
              <Input
                id="other_positions"
                type="text"
                name="other_positions"
                value={formData.other_positions}
                onChange={handleChange}
                placeholder="e.g., SHEQ Rep, Workers' Rep, Bus Marshal"
              />
            </div>
          </FormSection>
          
          <FormSection title="Employment History" icon={History}>
            <div className="space-y-1">
              <Label htmlFor="previous_employer">Previous Employer Details</Label>
              <Input 
                id="previous_employer"
                type="text"
                name="previous_employer"
                value={formData.previous_employer}
                onChange={handleChange}
                placeholder="Company Name, Role, Tenure, Reason for Leaving"
              />
            </div>
          </FormSection>
        </TabsContent>
      </Tabs>

      {submissionStatus === "success" && (
        <Alert className="border-green-500 bg-green-50 text-green-700 flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          <AlertDescription>
            {isEditing
              ? "Employee details successfully updated."
              : "New employee successfully enrolled. The form has been reset."}
          </AlertDescription>
        </Alert>
      )}

      {submissionStatus === "error" && (
        <Alert variant="destructive">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Submission Failed</AlertTitle>
          <AlertDescription>
            Operation failed. Please check the data and ensure the API server is
            running. (Check the **General Info** tab for required fields like Employee ID).
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel / Dismiss
          </Button>
        )}
        <Button type="submit">
          {isEditing ? "Save Amendments" : "Enroll Personnel"}
        </Button>
      </div>
    </form>
  );
}