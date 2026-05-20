// Training.jsx - API Integrated Component for Training & Certification (Aligned with React Naming Convention)


'use client';
import React, { useState, useMemo, useEffect } from 'react';
import { 
    Users, Shield, Calendar, AlertTriangle, FileText, CheckCircle, Clock,
    Search, X, Plus, Trash2, BookOpen, Download, UploadCloud, Loader2, ChevronRight
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { fmtDate as formatDate } from '@/components/shared';

interface Certification {
  id: number | string;
  employee_name: string;
  employee_id: string;
  department: string;
  certification_name: string;
  expiry_date: string;
  required_refresher: string;
  status: string;
  certificate_url?: string;
}

interface RefresherItem {
  refresher: string;
  employees_due: number;
}

// --- Configuration ---
const API_BASE_URL = 'http://localhost:8000/api/training'; 

// --- Utility Components (ShadCN/UI Style) ---
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (<div className={`bg-white rounded-xl shadow-lg border border-slate-100/70 transition-all ${className}`}>{children}</div>);
const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (<div className={`p-4 border-b border-slate-100 ${className}`}>{children}</div>);
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (<div className={`p-4 ${className}`}>{children}</div>);
const Button = ({ children, variant = 'primary', className = '', onClick, disabled = false, type = 'button', title }: {
    children: React.ReactNode; variant?: string; className?: string;
    onClick?: () => void; disabled?: boolean; type?: 'button' | 'submit' | 'reset'; title?: string;
}) => {
    let baseStyle = 'px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2';
    switch (variant) {
        case 'primary': baseStyle += ' bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/30'; break;
        case 'secondary': baseStyle += ' bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'; break;
        case 'outline': baseStyle += ' bg-white text-indigo-600 border border-indigo-300 hover:bg-indigo-50'; break;
        case 'destructive': baseStyle += ' bg-red-600 text-white hover:bg-red-700'; break;
        default: baseStyle += ' bg-slate-200 text-slate-800 hover:bg-slate-300';
    }
    return <button type={type} title={title} className={`${baseStyle} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={onClick} disabled={disabled}>{children}</button>;
};

const Input = ({ placeholder, value, onChange, type = 'text', className = '', required = false, name = '' }: {
    placeholder?: string; value: string; onChange: React.ChangeEventHandler<HTMLInputElement>;
    type?: string; className?: string; required?: boolean; name?: string;
}) =>
    <input 
        className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors ${className}`} 
        placeholder={placeholder} 
        value={value} 
        onChange={onChange} 
        type={type} 
        required={required}
        name={name}
    />;

const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (<span className={`px-3 py-1 text-xs rounded-full font-medium ${className}`}>{children}</span>);

const AlertStatCard = ({ icon: Icon, title, value, colorClass, gradient }: {
    icon: React.ElementType; title: string; value: string | number; colorClass: string; gradient: string;
}) => (
    <Card className={`p-6 overflow-hidden relative ring-1 ring-slate-100 transition-shadow duration-300 hover:shadow-xl`}>
        <div className={`absolute inset-y-0 left-0 w-1 ${gradient}`}></div>
        <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium uppercase text-slate-500">{title}</h3>
            <Icon className={`h-6 w-6 ${colorClass} opacity-80`} />
        </div>
        <p className={`text-4xl font-extrabold ${colorClass}`}>{value}</p>
    </Card>
);


const getStatusStyle = (status: string) => {
    switch (status) {
        case 'Expired': return 'bg-red-500/10 text-red-600 border border-red-300';
        case 'Due Soon': return 'bg-yellow-500/10 text-yellow-600 border border-yellow-300';
        case 'Valid': return 'bg-green-500/10 text-green-600 border border-green-300';
        default: return 'bg-slate-100 text-slate-600';
    }
};

// --- Add/Edit Modal Component ---
const AddCertModal = ({ isOpen, onClose, onSave, departments, isSaving }: {
    isOpen: boolean; onClose: () => void; onSave: (data: globalThis.FormData) => void;
    departments: string[]; isSaving: boolean;
}) => {
    const [formData, setFormData] = useState({
        employee_id: '', employee_name: '', department: departments[0] || '',
        certification_name: '', expiry_date: '', required_refresher: '', certificate_file: null as File | null
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, certificate_file: e.target.files?.[0] ?? null }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = new FormData();
        // Append all form fields
        Object.keys(formData).forEach(key => {
            const val = (formData as Record<string, unknown>)[key];
            if (key !== 'certificate_file' && val) {
                data.append(key, val as string);
            }
        });
        // Append the file separately
        if (formData.certificate_file) {
            data.append('certificate_file', formData.certificate_file);
        }
        onSave(data);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4 backdrop-blur-sm">
            <Card className="shadow-2xl w-full max-w-2xl">
                <CardHeader>
                    <h3 className="text-xl font-bold text-slate-800">Add New Certification Record</h3>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <Input name="employee_name" placeholder="Employee Name" onChange={handleChange} required value={formData.employee_name} />
                        <Input name="employee_id" placeholder="Employee ID (e.g., E001)" onChange={handleChange} required value={formData.employee_id} />

                        <select name="department" value={formData.department} onChange={handleChange} required className="p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500">
                            {departments.map(dept => (<option key={dept} value={dept}>{dept}</option>))}
                        </select>
                        <Input name="certification_name" placeholder="Certification Name" onChange={handleChange} required value={formData.certification_name} />
                        
                        <div className='flex flex-col'>
                            <label className='text-xs font-medium text-slate-500 mb-1'>Expiry Date</label>
                            <Input name="expiry_date" type="date" onChange={handleChange} required value={formData.expiry_date} />
                        </div>
                        <Input name="required_refresher" placeholder="Required Refresher Course" onChange={handleChange} required value={formData.required_refresher} />

                        <div className='col-span-2 flex flex-col pt-2 border-t border-slate-100'>
                            <label className='text-sm font-medium text-slate-700 mb-2 flex items-center gap-2'>
                                <UploadCloud className='h-4 w-4 text-indigo-500'/> Certificate Document (PDF/JPG)
                            </label>
                            <input 
                                type="file" 
                                name="certificate_file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={handleFileChange} 
                                className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                            />
                            {formData.certificate_file && <p className='text-xs text-green-600 mt-2'>File attached: {formData.certificate_file.name}</p>}
                        </div>

                    </CardContent>
                    <div className='p-4 border-t border-slate-100 flex justify-end gap-3'>
                        <Button variant="secondary" onClick={onClose} disabled={isSaving}><X className='h-4 w-4'/> Cancel</Button>
                        <Button type="submit" variant="primary" disabled={isSaving}>
                            {isSaving ? <Loader2 className='h-4 w-4 animate-spin'/> : <Plus className='h-4 w-4'/>} 
                            {isSaving ? 'Saving...' : 'Save Record'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};


// --- Main Component ---
export default function Training() { // Renamed to Training
    const [certifications, setCertifications] = useState<Certification[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);
    const [complianceData, setComplianceData] = useState<{ rate: number; expired: number; dueSoon: number; refreshers: RefresherItem[] }>({ rate: 0, expired: 0, dueSoon: 0, refreshers: [] });
    
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterDept, setFilterDept] = useState('All');
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- API Fetching ---
    const fetchData = async () => {
        setLoading(true);
        setApiError(null);
        try {
            const certsResponse = await fetch(API_BASE_URL);
            const rateResponse = await fetch(`${API_BASE_URL}/reports/compliance_rate`);
            const refreshersResponse = await fetch(`${API_BASE_URL}/reports/due_refreshers`);

            if (!certsResponse.ok || !rateResponse.ok || !refreshersResponse.ok) {
                 throw new Error("Failed to fetch all data from API.");
            }

            const certsData: Certification[] = await certsResponse.json();
            const rateData = await rateResponse.json();
            const refreshersData = await refreshersResponse.json();
            
            // Calculate Due Soon count from the main certs list client-side
            const dueSoonCount = certsData.filter(c => c.status === 'Due Soon').length;

            setCertifications(certsData);
            setComplianceData({
                rate: rateData.compliance_rate,
                expired: rateData.non_compliant,
                dueSoon: dueSoonCount,
                refreshers: refreshersData
            });

        } catch (e) {
            console.error("API Error:", e);
            setApiError("Could not load data. Is the FastAPI server running?");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    }, []);

    // --- Handlers ---
    const handleSaveCertificate = async (formData: globalThis.FormData) => {
        setIsSaving(true);
        setApiError(null);
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                // When using FormData for file uploads, don't set Content-Type header
                body: formData, 
            });

            if (!response.ok) {
                // Attempt to read error message from server
                const errorBody = await response.json();
                throw new Error(errorBody.detail || "Failed to create record due to server error.");
            }

            // Refetch all data to update tables and stats
            await fetchData(); 
            setIsModalOpen(false);
        } catch (e) {
            console.error("Save Error:", e);
            setApiError(`Failed to save record: ${(e as Error).message}.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteCertificate = async (id: number | string) => {
        if (!window.confirm("Are you sure you want to delete this record? This cannot be undone.")) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/${id}`, {
                method: 'DELETE',
            });

            if (response.status !== 204) {
                throw new Error("Failed to delete record.");
            }

            // Refetch data to update the UI
            await fetchData();

        } catch (e) {
            console.error("Delete Error:", e);
            setApiError(`Failed to delete record: ${(e as Error).message}.`);
        }
    };

    // --- Data Processing ---
    const DepartmentOptions = useMemo(() => {
        const depts = new Set(['All']);
        certifications.forEach(c => depts.add(c.department));
        return Array.from(depts);
    }, [certifications]);
    
    const filteredCerts = useMemo(() => {
        return certifications
            .filter(cert => filterStatus === 'All' || cert.status === filterStatus)
            .filter(cert => filterDept === 'All' || cert.department === filterDept)
            .filter(cert => 
                cert.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                cert.certification_name.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => {
                const order: Record<string, number> = { 'Expired': 3, 'Due Soon': 2, 'Valid': 1 };
                return (order[b.status] ?? 0) - (order[a.status] ?? 0);
            });
    }, [certifications, filterStatus, filterDept, searchTerm]);
    
    const totalCerts = certifications.length;

    // --- Render Component ---
    if (loading && totalCerts === 0) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                <p className="ml-3 text-lg text-indigo-600 font-medium">Loading compliance records...</p>
            </div>
        );
    }
    
    if (apiError) {
        return (
             <div className="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg m-10 max-w-7xl mx-auto">
                <h2 className="text-xl font-bold mb-2">API Connection Error</h2>
                <p>{apiError}</p>
                <p className='mt-2 text-sm'>Check your terminal to ensure the FastAPI server is running and accessible on port 8000.</p>
            </div>
        );
    }

    return (
        <PageShell>
        <main className="container mx-auto px-4 py-6 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <nav className="flex items-center gap-1.5 text-xs text-[#6B7B8E] mb-2">
                  <span>Home</span>
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-[#2A4D69] font-medium">Training</span>
                </nav>
                <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">Training & Certification</h1>
                <p className="text-[#6B7B8E] mt-1">Manage mandatory employee qualifications, track expiry dates, and maintain audit readiness.</p>
              </div>
            </div>
            
            {/* --- 1. Expiry Alerts (Polished Stat Cards) --- */}
            <div className="max-w-7xl mx-auto mb-12">
                <h2 className="text-xl font-bold text-slate-700 mb-5 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-500" /> Compliance Overview
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <AlertStatCard 
                        icon={Shield} 
                        title="Total Certifications Tracked" 
                        value={totalCerts} 
                        colorClass="text-indigo-600"
                        gradient="bg-indigo-600"
                    />
                    <AlertStatCard 
                        icon={CheckCircle} 
                        title="Overall Compliance Rate" 
                        value={`${complianceData.rate}%`} 
                        colorClass="text-green-600"
                        gradient="bg-green-600"
                    />
                    <AlertStatCard 
                        icon={X} 
                        title="Expired Certifications" 
                        value={complianceData.expired} 
                        colorClass="text-red-600"
                        gradient="bg-red-600"
                    />
                    <AlertStatCard 
                        icon={Clock} 
                        title="Due Soon (90 Days)" 
                        value={complianceData.dueSoon} 
                        colorClass="text-yellow-600"
                        gradient="bg-yellow-600"
                    />
                </div>
            </div>

            {/* --- 2. Certification Tracking Table --- */}
            <div className="max-w-7xl mx-auto">
                <Card className='shadow-2xl shadow-slate-200/50'>
                    <CardHeader className='flex justify-between items-center flex-row'>
                        <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-indigo-500" /> Certification Register ({totalCerts} Total)
                        </h2>
                        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                            <Plus className="h-4 w-4" /> Add New Certification
                        </Button>
                    </CardHeader>
                    
                    <CardContent>
                        {/* Search and Filters */}
                        <div className="flex flex-wrap gap-4 mb-6">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Search employee or certification..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                            
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 w-40"
                            >
                                <option value="All">All Statuses</option>
                                <option value="Valid">Valid</option>
                                <option value="Due Soon">Due Soon</option>
                                <option value="Expired">Expired</option>
                            </select>

                            <select
                                value={filterDept}
                                onChange={(e) => setFilterDept(e.target.value)}
                                className="p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-indigo-500 focus:border-indigo-500 w-40"
                            >
                                {DepartmentOptions.map(dept => (
                                    <option key={dept} value={dept}>{dept === 'All' ? 'All Departments' : dept}</option>
                                ))}
                            </select>
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-11 gap-4 py-3 px-4 text-xs font-bold uppercase text-slate-600 border-y border-slate-200 bg-slate-50/50">
                            <div className="col-span-3">Employee (ID)</div>
                            <div className="col-span-3">Certification / Refresher</div>
                            <div className="col-span-2">Expiry Date</div>
                            <div className="text-center">Status</div>
                            <div className="text-center">Certificate</div>
                            <div className="text-right">Actions</div>
                        </div>

                        {/* Table Rows */}
                        <div className="divide-y divide-slate-100">
                            {filteredCerts.length > 0 ? (
                                filteredCerts.map(cert => (
                                    <div key={cert.id} className="grid grid-cols-11 gap-4 py-4 px-4 hover:bg-indigo-50/20 transition-colors duration-150">
                                        <div className="col-span-3 text-sm font-semibold text-slate-800 flex flex-col">
                                            {cert.employee_name}
                                            <span className='text-xs font-normal text-slate-500 italic'>{cert.department} ({cert.employee_id})</span>
                                        </div>
                                        <div className="col-span-3 text-sm text-slate-700 flex flex-col">
                                            <span className='font-medium'>{cert.certification_name}</span>
                                            <span className='text-xs text-slate-500 italic'>Refresher: {cert.required_refresher}</span>
                                        </div>
                                        <div className="col-span-2 text-sm text-slate-700 font-medium flex items-center gap-1">
                                            <Calendar className='h-4 w-4 text-slate-400'/> {formatDate(cert.expiry_date)}
                                        </div>
                                        <div className="text-center flex items-center justify-center">
                                            <Badge className={getStatusStyle(cert.status)}>{cert.status}</Badge>
                                        </div>
                                        <div className="text-center flex items-center justify-center">
                                            {cert.certificate_url ? (
                                                <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                                                     <Button variant='outline' className='h-8 w-8 p-1' title="Download Certificate">
                                                        <Download className='h-4 w-4'/>
                                                     </Button>
                                                </a>
                                            ) : (
                                                <span className='text-xs text-slate-400 italic'>N/A</span>
                                            )}
                                        </div>
                                        <div className="text-right flex items-center justify-end gap-2">
                                            <Button variant='destructive' className='h-8 w-8 p-1' title="Delete Record" onClick={() => handleDeleteCertificate(cert.id)}>
                                                <Trash2 className='h-4 w-4'/>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-slate-500">
                                    <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                                    No certifications found matching your filters.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- 3. Compliance Reports --- */}
            <div className="max-w-7xl mx-auto mt-12">
                <h2 className="text-xl font-bold text-slate-700 mb-5 flex items-center gap-2 border-b pb-2 border-slate-200">
                    <CheckCircle className="h-5 w-5 text-green-600" /> Detailed Compliance Reports
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className='p-6'>
                        <h3 className="font-semibold text-slate-800">Overall Compliance Rate</h3>
                        <p className="text-5xl font-extrabold text-green-600 mt-2">{complianceData.rate}<span className='text-3xl font-medium'>%</span></p>
                        <p className="text-sm text-slate-500 mt-1">Based on non-expired certifications.</p>
                    </Card>
                    <Card className='p-6'>
                        <h3 className="font-semibold text-slate-800 mb-3">Top Refresher Courses Needed</h3>
                        <ul className="text-sm text-slate-600 list-disc list-inside space-y-2">
                            {complianceData.refreshers.length > 0 ? complianceData.refreshers.map(item => (
                                <li key={item.refresher}>
                                    **{item.refresher}** ({item.employees_due} employees)
                                </li>
                            )) : <li>No major refreshers due at this time.</li>}
                        </ul>
                    </Card>
                    <Card className='p-6 flex flex-col justify-center'>
                        <h3 className="font-semibold text-slate-800 mb-3">Generate Custom Report</h3>
                        <Button variant="outline" className='w-full text-indigo-600 border-indigo-300 hover:bg-indigo-50'>
                            <FileText className='h-4 w-4' /> Download Full Compliance Audit (PDF)
                        </Button>
                    </Card>
                </div>
            </div>
            
            {/* Add Certification Modal */}
            <AddCertModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCertificate}
                // Pass all departments except 'All' to the modal
                departments={DepartmentOptions.filter(d => d !== 'All')}
                isSaving={isSaving}
            />

        </main>
        </PageShell>
    );
}
