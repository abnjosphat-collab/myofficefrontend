// frontend/app/quotations/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableCell, TableRow, WidthType, BorderStyle } from 'docx';
import { PageShell } from '@/components/PageShell';
import { HeroPanel } from '@/components/shared/HeroPanel';
import { GlassPanel } from '@/components/shared/GlassPanel';
import { usePageCollapse, MasterCollapseButton } from '@/components/shared';
import { GlassTabs, type GlassTab } from '@/components/shared/GlassTabs';
import { GlassButton } from '@/components/shared/GlassButton';
import { GlassInput, GlassSelect, GlassTextarea } from '@/components/shared/GlassInput';
import { GlassBadge } from '@/components/shared/GlassBadge';
import {
  Download, FileText, FileDown, Plus, Trash2, Calculator,
  Building, User, Shield, Zap, Lightbulb, Copy, Printer,
  Edit3, Users, Sparkles, History, Send, FileUp,
  Palette, Eye, CreditCard, FileCheck, ChevronRight
} from 'lucide-react';

interface QuotationItem {
  id: number;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  category: string;
}

interface ClientData {
  id?: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  website?: string | undefined;
}

interface RecentQuotation {
  id: number;
  number: string;
  client: string;
  amount: number;
  date: string;
  status: string;
}

interface QuotationTemplate {
  id: string;
  name: string;
  category: string;
  color: string;
  icon: string;
  items: { description: string; quantity: number; rate: number; amount: number }[];
  notes: string;
  terms: string;
}

const QUOTATION_TEMPLATES = [
  {
    id: 'premium-web',
    name: 'Premium Web Development',
    category: 'Technology',
    color: 'bg-gradient-to-r from-blue-600 to-purple-600',
    icon: '💻',
    items: [
      { description: 'Premium Website Design & UI/UX', quantity: 1, rate: 3500, amount: 3500 },
      { description: 'Advanced Frontend Development', quantity: 1, rate: 4500, amount: 4500 },
      { description: 'Enterprise Backend Development', quantity: 1, rate: 5500, amount: 5500 },
      { description: 'SEO & Performance Optimization', quantity: 1, rate: 1800, amount: 1800 },
      { description: 'Premium Maintenance (6 months)', quantity: 6, rate: 500, amount: 3000 }
    ],
    notes: 'Includes premium responsive design, advanced SEO optimization, and 6 months of priority technical support. Project completion within 8 weeks with weekly progress updates.',
    terms: '50% advance payment required. Balance due upon project completion. 30-day premium support included. Rush delivery available at 25% premium.'
  },
  {
    id: 'executive-consulting',
    name: 'Executive Consulting',
    category: 'Professional Services',
    color: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    icon: '📊',
    items: [
      { description: 'Executive Strategic Analysis', quantity: 1, rate: 7500, amount: 7500 },
      { description: 'Market Research & Competitive Analysis', quantity: 1, rate: 4500, amount: 4500 },
      { description: 'Implementation Roadmap', quantity: 1, rate: 5500, amount: 5500 },
      { description: 'Performance Dashboard Setup', quantity: 1, rate: 2500, amount: 2500 }
    ],
    notes: 'Comprehensive executive business analysis with actionable insights and detailed implementation roadmap. Includes quarterly review sessions.',
    terms: 'Payment in three installments. Executive weekly progress reports. 30-day revision period. Confidentiality guaranteed.'
  },
  {
    id: 'platinum-maintenance',
    name: 'Platinum Maintenance',
    category: 'Support',
    color: 'bg-gradient-to-r from-amber-600 to-orange-600',
    icon: '🛡️',
    items: [
      { description: 'Platinum Routine Maintenance', quantity: 12, rate: 600, amount: 7200 },
      { description: '24/7 Priority Support', quantity: 1, rate: 2000, amount: 2000 },
      { description: 'Advanced Software Updates', quantity: 4, rate: 500, amount: 2000 },
      { description: 'Enterprise Security Monitoring', quantity: 12, rate: 400, amount: 4800 }
    ],
    notes: '24/7 priority emergency support with 1-hour response time. Regular maintenance visits and advanced security monitoring with threat detection.',
    terms: 'Annual platinum contract. 1-hour response time for emergencies. Monthly executive performance reports. Service level agreement included.'
  }
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
];

const PREMIUM_THEMES = [
  { id: 'executive', name: 'Executive', primary: '#1e40af', secondary: '#1e3a8a', accent: '#f59e0b', dotClass: 'bg-blue-700' },
  { id: 'modern', name: 'Modern', primary: '#7c3aed', secondary: '#6d28d9', accent: '#06b6d4', dotClass: 'bg-violet-600' },
  { id: 'corporate', name: 'Corporate', primary: '#059669', secondary: '#047857', accent: '#dc2626', dotClass: 'bg-emerald-600' },
  { id: 'luxury', name: 'Luxury', primary: '#dc2626', secondary: '#b91c1c', accent: '#d97706', dotClass: 'bg-red-600' }
];

const QuotationGenerator = () => {
  const sections = usePageCollapse({ hero: false, quickActions: false, designTheme: false, companyDetails: false, clientInfo: false, quotationDetails: false, items: false, notes: false, terms: false, templates: false, clients: false, history: false });
  const [isClient, setIsClient] = useState(false);
  const [quotation, setQuotation] = useState({
    quotationNumber: 'QT-000000',
    date: '',
    validUntil: '',
    status: 'draft',
    currency: 'USD',
    taxRate: 10,
    discount: 0,
    notes: 'Thank you for considering our premium services. We are committed to delivering exceptional quality and value for your investment.',
    terms: 'Payment terms: 50% advance required for project commencement, balance due upon completion. All payments are due within 30 days of invoice date. Rush delivery available at 25% premium.',
    title: 'Premium Services Quotation',
    theme: 'executive',
    paymentTerms: 'Net 30',
    deliveryTime: '4-6 weeks'
  });

  const [client, setClient] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: '',
    website: ''
  });

  const [items, setItems] = useState<QuotationItem[]>([]);
  const [company, setCompany] = useState({
    name: 'Elite Solutions Inc.',
    email: 'contact@elitesolutions.com',
    phone: '+1 (555) 123-4567',
    address: '123 Business Avenue, Suite 1000',
    city: 'New York, NY 10001',
    country: 'United States',
    website: 'www.elitesolutions.com',
    taxId: 'TAX-123456789',
    logo: '',
    tagline: 'Premium Business Solutions',
    founded: '2015',
    accreditation: 'A+ BBB Rated'
  });

  const [activeTab, setActiveTab] = useState('editor');
  const [clientsList, setClientsList] = useState<ClientData[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const today = new Date().toISOString().split('T')[0];
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    setQuotation(prev => ({
      ...prev,
      quotationNumber: `QT-${Date.now().toString().slice(-6)}`,
      date: today,
      validUntil: validUntil
    }));

    setItems([
      { id: 1, description: 'Executive Consultation & Strategy Session', quantity: 2, rate: 250, amount: 500, category: 'service' },
      { id: 2, description: 'Premium Development Hours', quantity: 40, rate: 125, amount: 5000, category: 'development' },
      { id: 3, description: 'Advanced Project Management', quantity: 10, rate: 95, amount: 950, category: 'management' },
      { id: 4, description: 'Quality Assurance & Testing', quantity: 8, rate: 85, amount: 680, category: 'testing' }
    ]);

    setClientsList([
      { id: 1, name: 'John Smith', company: 'Tech Innovations LLC', email: 'john@techinnovations.com', phone: '+1 (555) 123-4567', address: '456 Tech Park Drive', city: 'San Francisco', country: 'United States' },
      { id: 2, name: 'Sarah Johnson', company: 'Global Enterprises Corp', email: 'sarah@globalenterprises.com', phone: '+1 (555) 987-6543', address: '789 Corporate Boulevard', city: 'Chicago', country: 'United States' }
    ]);

    setRecentQuotations([
      { id: 1, number: 'QT-001234', client: 'Tech Innovations LLC', amount: 4350, date: '2024-01-15', status: 'accepted' },
      { id: 2, number: 'QT-001235', client: 'Global Enterprises Corp', amount: 8900, date: '2024-01-18', status: 'pending' }
    ]);
  }, []);

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: '', quantity: 1, rate: 0, amount: 0, category: 'service' }]);
    toast.success('New item added');
  };

  const removeItem = (id: number) => {
    setItems(items.filter(item => item.id !== id));
    toast.success('Item removed');
  };

  const updateItem = (id: number, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value } as QuotationItem;
      if (field === 'quantity' || field === 'rate') {
        updated.amount = updated.quantity * updated.rate;
      }
      return updated;
    }));
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = (subtotal * quotation.taxRate) / 100;
    const discountAmount = (subtotal * quotation.discount) / 100;
    const total = subtotal + taxAmount - discountAmount;
    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const totals = calculateTotals();

  const applyTemplate = (template: QuotationTemplate) => {
    setItems(template.items.map((item, index) => ({ id: Date.now() + index, category: 'service', ...item })));
    setQuotation(prev => ({ ...prev, notes: template.notes, terms: template.terms }));
    toast.success(`"${template.name}" template applied!`);
  };

  const loadClient = (clientData: ClientData) => {
    setClient({ ...clientData, website: clientData.website ?? '' });
    toast.success('Client loaded successfully!');
  };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const currencySymbol = CURRENCIES.find(c => c.code === quotation.currency)?.symbol || '$';

      doc.setProperties({ title: `Quotation ${quotation.quotationNumber}`, author: company.name });
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 210, 50, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(company.name, 20, 20);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(company.tagline || 'Premium Business Solutions', 20, 28);
      doc.text(company.email, 20, 35);
      doc.text(company.phone, 20, 42);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('QUOTATION', 180, 20, { align: 'right' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Number: ${quotation.quotationNumber}`, 180, 28, { align: 'right' });
      doc.text(`Date: ${quotation.date}`, 180, 35, { align: 'right' });
      doc.text(`Valid Until: ${quotation.validUntil}`, 180, 42, { align: 'right' });
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', 20, 70);
      doc.setFont('helvetica', 'normal');
      let clientY = 78;
      if (client.name) doc.text(client.name, 20, clientY);
      if (client.company) doc.text(client.company, 20, clientY + 7);
      if (client.email) doc.text(client.email, 20, clientY + 14);
      if (client.phone) doc.text(client.phone, 20, clientY + 21);
      if (client.address) doc.text(client.address, 20, clientY + 28);
      doc.setFillColor(30, 64, 175);
      doc.rect(20, 110, 170, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', 22, 117);
      doc.text('Qty', 140, 117);
      doc.text('Rate', 155, 117);
      doc.text('Amount', 180, 117, { align: 'right' });
      let yPosition = 125;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      items.forEach((item, index) => {
        if (yPosition > 250) { doc.addPage(); yPosition = 20; }
        if (index % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(20, yPosition - 4, 170, 8, 'F'); }
        doc.text(item.description.substring(0, 40), 22, yPosition);
        doc.text(item.quantity.toString(), 140, yPosition);
        doc.text(`${currencySymbol}${item.rate.toFixed(2)}`, 155, yPosition);
        doc.text(`${currencySymbol}${item.amount.toFixed(2)}`, 180, yPosition, { align: 'right' });
        yPosition += 8;
      });
      const finalY = Math.max(yPosition + 10, 130);
      doc.setFillColor(249, 250, 251);
      doc.rect(120, finalY, 80, 60, 'F');
      doc.setDrawColor(209, 213, 219);
      doc.rect(120, finalY, 80, 60);
      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      let summaryY = finalY + 10;
      doc.text('Subtotal:', 130, summaryY);
      doc.text(`${currencySymbol}${totals.subtotal}`, 180, summaryY, { align: 'right' });
      doc.text(`Tax (${quotation.taxRate}%):`, 130, summaryY + 8);
      doc.text(`${currencySymbol}${totals.taxAmount}`, 180, summaryY + 8, { align: 'right' });
      doc.text(`Discount (${quotation.discount}%):`, 130, summaryY + 16);
      doc.text(`-${currencySymbol}${totals.discountAmount}`, 180, summaryY + 16, { align: 'right' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('TOTAL:', 130, summaryY + 28);
      doc.text(`${currencySymbol}${totals.total}`, 180, summaryY + 28, { align: 'right' });
      const notesStartY = finalY + 70;
      if (quotation.notes) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Notes:', 20, notesStartY);
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(quotation.notes, 170), 20, notesStartY + 7);
      }
      if (quotation.terms) {
        const termsY = notesStartY + (quotation.notes ? 30 : 0);
        doc.setFont('helvetica', 'bold');
        doc.text('Terms & Conditions:', 20, termsY);
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(quotation.terms, 170), 20, termsY + 7);
      }
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated by ${company.name} - ${company.website}`, 105, pageHeight - 10, { align: 'center' });
      doc.save(`quotation-${quotation.quotationNumber}.pdf`);
      toast.success('PDF generated successfully!');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateWord = async () => {
    setIsGenerating(true);
    try {
      const currencySymbol = CURRENCIES.find(c => c.code === quotation.currency)?.symbol || '$';
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: company.name, bold: true, size: 32, color: '1e40af' })], alignment: AlignmentType.LEFT, spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: company.tagline || 'Premium Business Solutions', italics: true, color: '6b7280' })], alignment: AlignmentType.LEFT, spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun({ text: 'QUOTATION', bold: true, size: 28, color: '1e40af' })], alignment: AlignmentType.CENTER, spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun({ text: `Quotation Number: ${quotation.quotationNumber}`, bold: true }), new TextRun({ text: `\tDate: ${quotation.date}`, bold: true }), new TextRun({ text: `\tValid Until: ${quotation.validUntil}`, bold: true })], spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun({ text: 'BILL TO:', bold: true, size: 20 })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: client.name || 'Client Name', bold: true }), new TextRun({ text: client.company ? `\n${client.company}` : '', break: 1 }), new TextRun({ text: client.email ? `\n${client.email}` : '', break: 1 }), new TextRun({ text: client.phone ? `\n${client.phone}` : '', break: 1 })], spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun({ text: 'QUOTATION ITEMS', bold: true, size: 20 })], spacing: { after: 200 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              borders: { top: { style: BorderStyle.SINGLE, size: 1, color: '1e40af' }, bottom: { style: BorderStyle.SINGLE, size: 1, color: '1e40af' }, left: { style: BorderStyle.SINGLE, size: 1, color: '1e40af' }, right: { style: BorderStyle.SINGLE, size: 1, color: '1e40af' }, insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' }, insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'd1d5db' } },
              rows: [
                new TableRow({ children: [new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Description', bold: true })] })], shading: { fill: '1e40af' } }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Qty', bold: true })] })], shading: { fill: '1e40af' } }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Unit Price', bold: true })] })], shading: { fill: '1e40af' } }), new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Amount', bold: true })] })], shading: { fill: '1e40af' } })] }),
                ...items.map(item => new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: item.description })] }), new TableCell({ children: [new Paragraph({ text: item.quantity.toString() })] }), new TableCell({ children: [new Paragraph({ text: `${currencySymbol}${item.rate.toFixed(2)}` })] }), new TableCell({ children: [new Paragraph({ text: `${currencySymbol}${item.amount.toFixed(2)}` })] })] }))
              ]
            }),
            new Paragraph({ children: [new TextRun({ text: 'SUMMARY', bold: true, size: 20 })], spacing: { before: 400, after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: `Subtotal: ${currencySymbol}${totals.subtotal}` }), new TextRun({ text: `\nTax (${quotation.taxRate}%): ${currencySymbol}${totals.taxAmount}`, break: 1 }), new TextRun({ text: `\nDiscount (${quotation.discount}%): -${currencySymbol}${totals.discountAmount}`, break: 1 }), new TextRun({ text: `\nTOTAL: ${currencySymbol}${totals.total}`, break: 1, bold: true, size: 24 })], spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun({ text: 'Notes:', bold: true, size: 16 })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun(quotation.notes)], spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun({ text: 'Terms & Conditions:', bold: true, size: 16 })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun(quotation.terms)] }),
            new Paragraph({ children: [new TextRun({ text: `Generated by ${company.name}`, size: 12, color: '6b7280' })], alignment: AlignmentType.CENTER, spacing: { before: 800 } })
          ]
        }]
      });
      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, `quotation-${quotation.quotationNumber}.docx`);
      toast.success('Word document generated!');
    } catch (error) {
      console.error('Word generation error:', error);
      toast.error('Failed to generate Word document');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendQuotation = () => {
    if (!client.email) { toast.error('Please enter client email first'); return; }
    toast.success(`Quotation sent to ${client.email}!`);
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(`Quotation ${quotation.quotationNumber}\nTotal: ${quotation.currency} ${totals.total}`);
    toast.success('Copied to clipboard!');
  };

  const printQuotation = () => {
    toast.success('Opening print dialog...');
    setTimeout(() => window.print(), 500);
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCompany({ ...company, logo: (e.target?.result as string) ?? '' });
        toast.success('Logo uploaded!');
      };
      reader.readAsDataURL(file);
    }
  };

  const currencySymbol = CURRENCIES.find(c => c.code === quotation.currency)?.symbol || '$';

  if (!isClient) {
    return (
      <PageShell>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#86BBD8] mx-auto mb-4" />
            <p className="text-white/50">Loading Quotation Generator...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  // --- Tab content ---

  const editorContent = (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Left sidebar — forms */}
      {!previewMode && (
        <div className="xl:col-span-1 space-y-4">
          {/* Quick Actions */}
          <GlassPanel title="Quick Actions" icon={Zap} defaultOpen {...sections.panel('quickActions')}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: FileUp, label: 'Save Template', action: () => toast.success('Saved!') },
                { icon: Send, label: 'Send to Client', action: sendQuotation },
                { icon: Download, label: 'Export PDF', action: generatePDF },
                { icon: Copy, label: 'Copy Link', action: copyToClipboard }
              ].map((action, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={action.action}
                  className="h-14 flex flex-col items-center justify-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/[0.15] transition-colors"
                >
                  <action.icon className="w-4 h-4 text-[#86BBD8]" />
                  <span className="text-xs text-white/60">{action.label}</span>
                </button>
              ))}
            </div>
          </GlassPanel>

          {/* Design Theme */}
          <GlassPanel title="Design Theme" icon={Palette} defaultOpen {...sections.panel('designTheme')}>
            <div className="grid grid-cols-2 gap-2">
              {PREMIUM_THEMES.map(theme => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setQuotation({ ...quotation, theme: theme.id })}
                  className={`p-2.5 rounded-xl border-2 transition-all text-left ${
                    quotation.theme === theme.id
                      ? 'border-[#86BBD8]/60 bg-[#2A4D69]/40'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${theme.dotClass}`} />
                    <span className="text-xs font-medium text-white/80">{theme.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </GlassPanel>

          {/* Company Details */}
          <GlassPanel title="Company Details" icon={Building} defaultOpen {...sections.panel('companyDetails')}>
            <div className="space-y-3">
              <GlassInput
                label="Company Name"
                value={company.name}
                onChange={(e) => setCompany({ ...company, name: e.target.value })}
              />
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                  Company Logo
                </label>
                {company.logo && (
                  <img src={company.logo} alt="Logo" className="w-12 h-12 object-contain rounded mb-2" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  title="Upload company logo"
                  className="w-full text-xs text-white/60 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-white/[0.08] file:text-white/60 hover:file:bg-white/[0.12]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <GlassInput label="Email" value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} />
                <GlassInput label="Phone" value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} />
              </div>
              <GlassInput label="Tagline" value={company.tagline} onChange={(e) => setCompany({ ...company, tagline: e.target.value })} />
            </div>
          </GlassPanel>

          {/* Client Information */}
          <GlassPanel title="Client Information" icon={User} defaultOpen {...sections.panel('clientInfo')}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <GlassInput label="Client Name *" value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} required />
                <GlassInput label="Company" value={client.company} onChange={(e) => setClient({ ...client, company: e.target.value })} />
              </div>
              <GlassInput label="Email" type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} />
              <div className="grid grid-cols-2 gap-2">
                <GlassInput label="Phone" value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} />
                <GlassInput label="Country" value={client.country} onChange={(e) => setClient({ ...client, country: e.target.value })} />
              </div>
            </div>
          </GlassPanel>

          {/* Quotation Details */}
          <GlassPanel title="Quotation Details" icon={FileText} defaultOpen {...sections.panel('quotationDetails')}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <GlassInput label="Quotation #" value={quotation.quotationNumber} onChange={(e) => setQuotation({ ...quotation, quotationNumber: e.target.value })} />
                <GlassSelect
                  label="Currency"
                  value={quotation.currency}
                  onChange={(e) => setQuotation({ ...quotation, currency: e.target.value })}
                  options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} (${c.symbol})` }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <GlassInput label="Tax Rate (%)" type="number" value={quotation.taxRate} onChange={(e) => setQuotation({ ...quotation, taxRate: parseFloat(e.target.value) || 0 })} />
                <GlassInput label="Discount (%)" type="number" value={quotation.discount} onChange={(e) => setQuotation({ ...quotation, discount: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <GlassSelect
                  label="Payment Terms"
                  value={quotation.paymentTerms}
                  onChange={(e) => setQuotation({ ...quotation, paymentTerms: e.target.value })}
                  options={[
                    { value: 'Net 15', label: 'Net 15' },
                    { value: 'Net 30', label: 'Net 30' },
                    { value: 'Net 60', label: 'Net 60' },
                    { value: 'Due on receipt', label: 'Due on receipt' }
                  ]}
                />
                <GlassSelect
                  label="Delivery Time"
                  value={quotation.deliveryTime}
                  onChange={(e) => setQuotation({ ...quotation, deliveryTime: e.target.value })}
                  options={[
                    { value: '1-2 weeks', label: '1-2 weeks' },
                    { value: '2-4 weeks', label: '2-4 weeks' },
                    { value: '4-6 weeks', label: '4-6 weeks' },
                    { value: '8+ weeks', label: '8+ weeks' }
                  ]}
                />
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {/* Main content area */}
      <div className={`${previewMode ? 'xl:col-span-3' : 'xl:col-span-2'} space-y-4`}>
        {/* Preview toggle */}
        <div className="flex justify-end">
          <GlassButton
            variant={previewMode ? 'primary' : 'ghost'}
            icon={Eye}
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </GlassButton>
        </div>

        {/* Items or preview */}
        <GlassPanel
          title={previewMode ? 'Quotation Preview' : 'Quotation Items'}
          icon={Calculator}
          badge={`${items.length} items`}
          defaultOpen
          {...sections.panel('items')}
          actions={
            !previewMode ? (
              <GlassButton size="sm" icon={Plus} onClick={addItem}>Add Item</GlassButton>
            ) : undefined
          }
        >
          {previewMode ? (
            // Print-ready preview — keep white bg
            <div className="bg-white p-8 rounded-lg border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-200">
                <div>
                  {company.logo && <img src={company.logo} alt="Logo" className="h-16 mb-4" />}
                  <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
                  <p className="text-slate-600">{company.tagline}</p>
                  <p className="text-slate-600 text-sm mt-2">{company.address}, {company.city}</p>
                  <p className="text-slate-600 text-sm">{company.phone} • {company.email}</p>
                </div>
                <div className="text-right">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">QUOTATION</h2>
                  <div className="mt-3 space-y-1 text-sm">
                    <p className="text-slate-600 font-semibold">#{quotation.quotationNumber}</p>
                    <p className="text-slate-600">Date: {quotation.date}</p>
                    <p className="text-slate-600">Valid Until: {quotation.validUntil}</p>
                    <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">Valid</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Bill To:</h3>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-slate-800 font-medium">{client.name}</p>
                    {client.company && <p className="text-slate-700">{client.company}</p>}
                    {client.email && <p className="text-slate-700">{client.email}</p>}
                    {client.phone && <p className="text-slate-700">{client.phone}</p>}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3">Payment Terms:</h3>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-slate-800">{quotation.paymentTerms}</p>
                    <p className="text-slate-700 text-sm mt-1">Delivery: {quotation.deliveryTime}</p>
                  </div>
                </div>
              </div>
              <div className="mb-8">
                <div className="bg-gradient-to-r from-slate-900 to-blue-900 text-white px-4 py-3 rounded-t-lg">
                  <h3 className="font-semibold">Quotation Items</h3>
                </div>
                <table className="w-full border border-slate-200 rounded-b-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left p-4 font-semibold text-slate-900">Description</th>
                      <th className="text-right p-4 font-semibold text-slate-900">Qty</th>
                      <th className="text-right p-4 font-semibold text-slate-900">Unit Price</th>
                      <th className="text-right p-4 font-semibold text-slate-900">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="p-4 text-slate-700">{item.description}</td>
                        <td className="p-4 text-right text-slate-700">{item.quantity}</td>
                        <td className="p-4 text-right text-slate-700">{currencySymbol}{item.rate.toFixed(2)}</td>
                        <td className="p-4 text-right font-medium text-slate-700">{currencySymbol}{item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mb-8">
                <div className="w-80 bg-slate-900 text-white rounded-lg p-6 space-y-3">
                  <div className="flex justify-between text-slate-300 text-sm">
                    <span>Subtotal:</span><span>{currencySymbol} {totals.subtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-sm">
                    <span>Tax ({quotation.taxRate}%):</span><span>{currencySymbol} {totals.taxAmount}</span>
                  </div>
                  <div className="flex justify-between text-slate-300 text-sm">
                    <span>Discount ({quotation.discount}%):</span><span className="text-red-300">-{currencySymbol} {totals.discountAmount}</span>
                  </div>
                  <div className="border-t border-slate-700 pt-3 flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-400">{currencySymbol} {totals.total}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Notes</h4>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-slate-700 whitespace-pre-line">{quotation.notes}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-3">Terms & Conditions</h4>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-slate-700 whitespace-pre-line">{quotation.terms}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-500 text-sm">
                <p>Generated by {company.name} • {company.website} • {company.email}</p>
                <p className="mt-1">This quotation is valid until {quotation.validUntil}</p>
              </div>
            </div>
          ) : (
            // Editor mode
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 bg-white/[0.04] rounded-xl border border-white/[0.08]">
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    <div className="w-7 h-7 bg-[#2A4D69]/60 rounded-lg flex items-center justify-center text-[#86BBD8] font-semibold text-xs">
                      {index + 1}
                    </div>
                  </div>
                  <div className="col-span-5">
                    <GlassInput
                      label="Description"
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Item description"
                    />
                  </div>
                  <div className="col-span-2">
                    <GlassInput
                      label="Quantity"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <GlassInput
                      label="Rate"
                      type="number"
                      value={item.rate}
                      onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Amount</label>
                    <div className="h-9 flex items-center px-3 text-sm font-semibold text-[#86BBD8] bg-white/[0.07] border border-white/[0.12] rounded-xl">
                      {currencySymbol}{item.amount.toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end pb-0.5 justify-center">
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label="Remove item"
                      className="h-9 w-9 flex items-center justify-center rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Totals */}
              <div className="mt-4 p-5 bg-[#0d1e2e]/80 rounded-xl border border-[#86BBD8]/10">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-white/50">
                      <span>Subtotal:</span><span>{currencySymbol} {totals.subtotal}</span>
                    </div>
                    <div className="flex justify-between text-white/50">
                      <span>Tax ({quotation.taxRate}%):</span><span>{currencySymbol} {totals.taxAmount}</span>
                    </div>
                    <div className="flex justify-between text-white/50">
                      <span>Discount ({quotation.discount}%):</span><span className="text-red-400">-{currencySymbol} {totals.discountAmount}</span>
                    </div>
                  </div>
                  <div className="flex flex-col justify-center border-l border-white/[0.08] pl-6">
                    <div className="text-xs text-white/40 uppercase tracking-wider mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-[#86BBD8]">{currencySymbol} {totals.total}</div>
                    <div className="text-xs text-white/30 mt-1">
                      Valid until: {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </GlassPanel>

        {/* Notes & Terms */}
        {!previewMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassPanel title="Notes" icon={Lightbulb} defaultOpen {...sections.panel('notes')}>
              <GlassTextarea
                value={quotation.notes}
                onChange={(e) => setQuotation({ ...quotation, notes: e.target.value })}
                placeholder="Additional notes for the client..."
                rows={4}
              />
            </GlassPanel>
            <GlassPanel title="Terms & Conditions" icon={Shield} defaultOpen {...sections.panel('terms')}>
              <GlassTextarea
                value={quotation.terms}
                onChange={(e) => setQuotation({ ...quotation, terms: e.target.value })}
                placeholder="Payment terms and conditions..."
                rows={4}
              />
            </GlassPanel>
          </div>
        )}
      </div>
    </div>
  );

  const templatesContent = (
    <GlassPanel title="Professional Templates" icon={Sparkles} defaultOpen {...sections.panel('templates')}>
      <p className="text-xs text-white/40 mb-4">Choose from premium quotation templates designed for maximum impact</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUOTATION_TEMPLATES.map((template) => (
          <div key={template.id} className="oz-glass-panel rounded-2xl overflow-hidden group hover:border-[#86BBD8]/30 transition-all">
            <div className={`h-1.5 ${template.color}`} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <GlassBadge variant="neutral">{template.category}</GlassBadge>
                <span className="text-2xl">{template.icon}</span>
              </div>
              <h3 className="font-semibold text-white group-hover:text-[#86BBD8] transition-colors mt-2 mb-3">
                {template.name}
              </h3>
              <div className="space-y-1.5 mb-4">
                <div className="text-xs text-white/40">{template.items.length} pre-configured items</div>
                {template.items.slice(0, 2).map((item, index) => (
                  <div key={index} className="flex justify-between text-xs text-white/30">
                    <span className="truncate">{item.description}</span>
                    <span className="ml-2 shrink-0">${item.amount}</span>
                  </div>
                ))}
                {template.items.length > 2 && (
                  <div className="text-xs text-white/20">+{template.items.length - 2} more items</div>
                )}
              </div>
              <GlassButton variant="primary" icon={Sparkles} className="w-full" onClick={() => applyTemplate(template)}>
                Use Template
              </GlassButton>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );

  const clientsContent = (
    <GlassPanel title="Client Management" icon={Users} defaultOpen {...sections.panel('clients')}>
      <p className="text-xs text-white/40 mb-4">Manage your client database and quickly load client information</p>
      <div className="space-y-3">
        {clientsList.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between p-3 bg-white/[0.04] rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-300 font-semibold text-sm">
                {c.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <div className="font-semibold text-sm text-white">{c.name}</div>
                <div className="text-xs text-white/50">{c.company}</div>
                <div className="text-xs text-white/30">{c.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton
                size="sm"
                variant="ghost"
                icon={User}
                onClick={() => loadClient(c)}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                Load
              </GlassButton>
              <GlassBadge variant="success">Active</GlassBadge>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );

  const historyContent = (
    <GlassPanel title="Quotation History" icon={History} defaultOpen {...sections.panel('history')}>
      <p className="text-xs text-white/40 mb-4">Track your previous quotations and their status</p>
      <div className="space-y-3">
        {recentQuotations.map((quote) => (
          <div
            key={quote.id}
            className="flex items-center justify-between p-3 bg-white/[0.04] rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                quote.status === 'accepted' ? 'bg-emerald-400' :
                quote.status === 'pending' ? 'bg-amber-400' : 'bg-white/30'
              }`} />
              <div>
                <div className="font-semibold text-sm text-white">{quote.number}</div>
                <div className="text-xs text-white/50">{quote.client}</div>
                <div className="text-xs text-white/30">{quote.date}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold text-sm text-white">${quote.amount}</div>
              <GlassBadge
                variant={quote.status === 'accepted' ? 'success' : quote.status === 'pending' ? 'warning' : 'neutral'}
                className="mt-1"
              >
                {quote.status}
              </GlassBadge>
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );

  const tabs: GlassTab[] = [
    { key: 'editor', label: 'Editor', icon: Edit3, content: editorContent },
    { key: 'templates', label: 'Templates', icon: Sparkles, content: templatesContent },
    { key: 'clients', label: 'Clients', icon: Users, content: clientsContent },
    { key: 'history', label: 'History', icon: History, content: historyContent }
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">
        <HeroPanel
          title="Quotation Generator"
          subtitle="Create professional quotations and manage client proposals."
          icon={FileText}
          stats={[
            { label: 'Line Items', value: items.length },
            { label: 'Total Value', value: `${quotation.currency} ${totals.total}` },
            { label: 'Tax Rate', value: `${quotation.taxRate}%` },
            { label: 'Discount', value: `${quotation.discount}%` }
          ]}
          {...sections.panel('hero')}
          actions={
            <div className="flex flex-wrap gap-2">
              <MasterCollapseButton collapse={sections} />
              <GlassButton variant="primary" icon={Download} loading={isGenerating} onClick={generatePDF}>
                {isGenerating ? 'Generating...' : 'PDF'}
              </GlassButton>
              <GlassButton variant="ghost" icon={FileDown} loading={isGenerating} onClick={generateWord}>
                Word
              </GlassButton>
              <GlassButton variant="ghost" icon={Printer} onClick={printQuotation}>
                Print
              </GlassButton>
              <GlassButton variant="ghost" icon={Send} onClick={sendQuotation}>
                Send
              </GlassButton>
            </div>
          }
        />

        <GlassTabs tabs={tabs} defaultTab={activeTab} onChange={setActiveTab} />
      </main>
    </PageShell>
  );
};

export default QuotationGenerator;
