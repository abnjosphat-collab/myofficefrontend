// frontend/app/quotations/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableCell, TableRow, WidthType, BorderStyle } from 'docx';
import { AppShell } from '@/components/app-shell';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { formatDate } from '@/lib/format';
import { lineTotal } from '@/components/shared/utils';
import {
  useTheme, PageHero, StatTile, StatusBadge, FormField, PrimaryButton, useCollapseSection, GlowCard, ACCENT_HEX, SelectField,
} from '@/components/shared/theme';
import {
  Download, FileText, FileDown, Plus, Trash2, Calculator,
  Building, User, Shield, Zap, Lightbulb, Copy, Printer,
  Edit3, Users, Sparkles, History, Send, FileUp,
  Palette, Eye, ChevronDown, ChevronUp, ChevronsUp, ChevronsDown,
} from '@/components/shared/theme';

import type { QuotationItem, ClientData, RecentQuotation, QuotationTemplate } from './types';
import { calculateTotals } from './calcQuotations';

const QUOTATION_TEMPLATES = [
  {
    id: 'premium-web', name: 'Premium Web Development', category: 'Technology', color: 'bg-gradient-to-r from-brand-600 to-purple-600', icon: '💻',
    items: [
      { description: 'Premium Website Design & UI/UX', quantity: 1, rate: 3500, amount: 3500 },
      { description: 'Advanced Frontend Development', quantity: 1, rate: 4500, amount: 4500 },
      { description: 'Enterprise Backend Development', quantity: 1, rate: 5500, amount: 5500 },
      { description: 'SEO & Performance Optimization', quantity: 1, rate: 1800, amount: 1800 },
      { description: 'Premium Maintenance (6 months)', quantity: 6, rate: 500, amount: 3000 },
    ],
    notes: 'Includes premium responsive design, advanced SEO optimization, and 6 months of priority technical support. Project completion within 8 weeks with weekly progress updates.',
    terms: '50% advance payment required. Balance due upon project completion. 30-day premium support included. Rush delivery available at 25% premium.',
  },
  {
    id: 'executive-consulting', name: 'Executive Consulting', category: 'Professional Services', color: 'bg-gradient-to-r from-emerald-600 to-teal-600', icon: '📊',
    items: [
      { description: 'Executive Strategic Analysis', quantity: 1, rate: 7500, amount: 7500 },
      { description: 'Market Research & Competitive Analysis', quantity: 1, rate: 4500, amount: 4500 },
      { description: 'Implementation Roadmap', quantity: 1, rate: 5500, amount: 5500 },
      { description: 'Performance Dashboard Setup', quantity: 1, rate: 2500, amount: 2500 },
    ],
    notes: 'Comprehensive executive business analysis with actionable insights and detailed implementation roadmap. Includes quarterly review sessions.',
    terms: 'Payment in three installments. Executive weekly progress reports. 30-day revision period. Confidentiality guaranteed.',
  },
  {
    id: 'platinum-maintenance', name: 'Platinum Maintenance', category: 'Support', color: 'bg-gradient-to-r from-amber-600 to-orange-600', icon: '🛡️',
    items: [
      { description: 'Platinum Routine Maintenance', quantity: 12, rate: 600, amount: 7200 },
      { description: '24/7 Priority Support', quantity: 1, rate: 2000, amount: 2000 },
      { description: 'Advanced Software Updates', quantity: 4, rate: 500, amount: 2000 },
      { description: 'Enterprise Security Monitoring', quantity: 12, rate: 400, amount: 4800 },
    ],
    notes: '24/7 priority emergency support with 1-hour response time. Regular maintenance visits and advanced security monitoring with threat detection.',
    terms: 'Annual platinum contract. 1-hour response time for emergencies. Monthly executive performance reports. Service level agreement included.',
  },
];

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' }, { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }, { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
];

const PREMIUM_THEMES = [
  { id: 'executive', name: 'Executive', dotClass: 'bg-brand-700' },
  { id: 'modern', name: 'Modern', dotClass: 'bg-violet-600' },
  { id: 'corporate', name: 'Corporate', dotClass: 'bg-emerald-600' },
  { id: 'luxury', name: 'Luxury', dotClass: 'bg-red-600' },
];

const TABS = [
  { id: 'editor', label: 'Editor', icon: Edit3 },
  { id: 'templates', label: 'Templates', icon: Sparkles },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'history', label: 'History', icon: History },
] as const;

// ─── Local themed collapsible panel — the "GlassPanel" replacement ────────────

function Panel({ id, title, icon: Icon, badge, actions, sections, children }: {
  id: string; title: string; icon: React.ElementType; badge?: string; actions?: React.ReactNode;
  sections: ReturnType<typeof useCollapseSection>; children: React.ReactNode;
}) {
  const t = useTheme();
  const open = sections.expanded[id];
  return (
    <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
      <div className={`flex items-center justify-between gap-2 px-4 py-3 border-b ${t.border} flex-wrap`}>
        <button type="button" onClick={() => sections.toggle(id)} className="flex items-center gap-2 min-w-0 flex-1 text-left">
          <Icon className="h-3.5 w-3.5 text-brand-400 shrink-0" />
          <span className={`text-sm font-semibold ${t.textPrimary}`}>{title}</span>
          {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${t.chipBg} ${t.textFaint}`}>{badge}</span>}
        </button>
        <div className="flex items-center gap-1.5">
          {actions}
          <button type="button" onClick={() => sections.toggle(id)} title={open ? 'Collapse' : 'Expand'}
            className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
            {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

const QuotationGeneratorContent = () => {
  const t = useTheme();
  const sections = useCollapseSection({ quickActions: true, designTheme: true, companyDetails: true, clientInfo: true, quotationDetails: true, items: true, notes: true, terms: true, templates: true, clients: true, history: true });
  const [isClient, setIsClient] = useState(false);
  const [quotation, setQuotation] = useState({
    quotationNumber: 'QT-000000', date: '', validUntil: '', status: 'draft', currency: 'USD', taxRate: 10, discount: 0,
    notes: 'Thank you for considering our premium services. We are committed to delivering exceptional quality and value for your investment.',
    terms: 'Payment terms: 50% advance required for project commencement, balance due upon completion. All payments are due within 30 days of invoice date. Rush delivery available at 25% premium.',
    title: 'Premium Services Quotation', theme: 'executive', paymentTerms: 'Net 30', deliveryTime: '4-6 weeks',
  });

  const [client, setClient] = useState({ name: '', company: '', email: '', phone: '', address: '', city: '', country: '', website: '' });
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [company, setCompany] = useState({
    name: 'Elite Solutions Inc.', email: 'contact@elitesolutions.com', phone: '+1 (555) 123-4567',
    address: '123 Business Avenue, Suite 1000', city: 'New York, NY 10001', country: 'United States',
    website: 'www.elitesolutions.com', taxId: 'TAX-123456789', logo: '', tagline: 'Premium Business Solutions', founded: '2015', accreditation: 'A+ BBB Rated',
  });

  const [activeTab, setActiveTab] = useState<typeof TABS[number]['id']>('editor');
  const [clientsList, setClientsList] = useState<ClientData[]>([]);
  const [recentQuotations, setRecentQuotations] = useState<RecentQuotation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const today = new Date().toISOString().split('T')[0];
    const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setQuotation(prev => ({ ...prev, quotationNumber: `QT-${Date.now().toString().slice(-6)}`, date: today, validUntil }));
    setItems([
      { id: 1, description: 'Executive Consultation & Strategy Session', quantity: 2, rate: 250, amount: 500, category: 'service' },
      { id: 2, description: 'Premium Development Hours', quantity: 40, rate: 125, amount: 5000, category: 'development' },
      { id: 3, description: 'Advanced Project Management', quantity: 10, rate: 95, amount: 950, category: 'management' },
      { id: 4, description: 'Quality Assurance & Testing', quantity: 8, rate: 85, amount: 680, category: 'testing' },
    ]);
    setClientsList([
      { id: 1, name: 'John Smith', company: 'Tech Innovations LLC', email: 'john@techinnovations.com', phone: '+1 (555) 123-4567', address: '456 Tech Park Drive', city: 'San Francisco', country: 'United States' },
      { id: 2, name: 'Sarah Johnson', company: 'Global Enterprises Corp', email: 'sarah@globalenterprises.com', phone: '+1 (555) 987-6543', address: '789 Corporate Boulevard', city: 'Chicago', country: 'United States' },
    ]);
    setRecentQuotations([
      { id: 1, number: 'QT-001234', client: 'Tech Innovations LLC', amount: 4350, date: '2024-01-15', status: 'accepted' },
      { id: 2, number: 'QT-001235', client: 'Global Enterprises Corp', amount: 8900, date: '2024-01-18', status: 'pending' },
    ]);
  }, []);

  const addItem = () => { setItems([...items, { id: Date.now(), description: '', quantity: 1, rate: 0, amount: 0, category: 'service' }]); toast.success('New item added'); };
  const removeItem = (id: number) => { setItems(items.filter(item => item.id !== id)); toast.success('Item removed'); };
  const updateItem = (id: number, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value } as QuotationItem;
      if (field === 'quantity' || field === 'rate') updated.amount = lineTotal(updated.quantity, updated.rate);
      return updated;
    }));
  };

  const totals = calculateTotals(items, quotation.taxRate, quotation.discount);

  const applyTemplate = (template: QuotationTemplate) => {
    setItems(template.items.map((item, index) => ({ id: Date.now() + index, category: 'service', ...item })));
    setQuotation(prev => ({ ...prev, notes: template.notes, terms: template.terms }));
    toast.success(`"${template.name}" template applied!`);
  };

  const loadClient = (clientData: ClientData) => { setClient({ ...clientData, website: clientData.website ?? '' }); toast.success('Client loaded successfully!'); };

  const generatePDF = async () => {
    setIsGenerating(true);
    try {
      const doc = new jsPDF();
      const currencySymbol = CURRENCIES.find(c => c.code === quotation.currency)?.symbol || '$';
      doc.setProperties({ title: `Quotation ${quotation.quotationNumber}`, author: company.name });
      doc.setFillColor(30, 64, 175); doc.rect(0, 0, 210, 50, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text(company.name, 20, 20);
      doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.text(company.tagline || 'Premium Business Solutions', 20, 28);
      doc.text(company.email, 20, 35); doc.text(company.phone, 20, 42);
      doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text('QUOTATION', 180, 20, { align: 'right' });
      doc.setFontSize(12); doc.setFont('helvetica', 'normal');
      doc.text(`Number: ${quotation.quotationNumber}`, 180, 28, { align: 'right' });
      doc.text(`Date: ${quotation.date}`, 180, 35, { align: 'right' });
      doc.text(`Valid Until: ${quotation.validUntil}`, 180, 42, { align: 'right' });
      doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('BILL TO:', 20, 70);
      doc.setFont('helvetica', 'normal');
      const clientY = 78;
      if (client.name) doc.text(client.name, 20, clientY);
      if (client.company) doc.text(client.company, 20, clientY + 7);
      if (client.email) doc.text(client.email, 20, clientY + 14);
      if (client.phone) doc.text(client.phone, 20, clientY + 21);
      if (client.address) doc.text(client.address, 20, clientY + 28);
      doc.setFillColor(30, 64, 175); doc.rect(20, 110, 170, 10, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('Description', 22, 117); doc.text('Qty', 140, 117); doc.text('Rate', 155, 117); doc.text('Amount', 180, 117, { align: 'right' });
      let yPosition = 125;
      doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'normal');
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
      doc.setFillColor(249, 250, 251); doc.rect(120, finalY, 80, 60, 'F');
      doc.setDrawColor(209, 213, 219); doc.rect(120, finalY, 80, 60);
      doc.setFontSize(10); doc.setTextColor(75, 85, 99);
      const summaryY = finalY + 10;
      doc.text('Subtotal:', 130, summaryY); doc.text(`${currencySymbol}${totals.subtotal}`, 180, summaryY, { align: 'right' });
      doc.text(`Tax (${quotation.taxRate}%):`, 130, summaryY + 8); doc.text(`${currencySymbol}${totals.taxAmount}`, 180, summaryY + 8, { align: 'right' });
      doc.text(`Discount (${quotation.discount}%):`, 130, summaryY + 16); doc.text(`-${currencySymbol}${totals.discountAmount}`, 180, summaryY + 16, { align: 'right' });
      doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
      doc.text('TOTAL:', 130, summaryY + 28); doc.text(`${currencySymbol}${totals.total}`, 180, summaryY + 28, { align: 'right' });
      const notesStartY = finalY + 70;
      if (quotation.notes) {
        doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.text('Notes:', 20, notesStartY);
        doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(quotation.notes, 170), 20, notesStartY + 7);
      }
      if (quotation.terms) {
        const termsY = notesStartY + (quotation.notes ? 30 : 0);
        doc.setFont('helvetica', 'bold'); doc.text('Terms & Conditions:', 20, termsY);
        doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(quotation.terms, 170), 20, termsY + 7);
      }
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(`Generated by ${company.name} - ${company.website}`, 105, pageHeight - 10, { align: 'center' });
      doc.save(`quotation-${quotation.quotationNumber}.pdf`);
      toast.success('PDF generated successfully!');
    } catch (error) { console.error('PDF generation error:', error); toast.error('Failed to generate PDF'); }
    finally { setIsGenerating(false); }
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
                ...items.map(item => new TableRow({ children: [new TableCell({ children: [new Paragraph({ text: item.description })] }), new TableCell({ children: [new Paragraph({ text: item.quantity.toString() })] }), new TableCell({ children: [new Paragraph({ text: `${currencySymbol}${item.rate.toFixed(2)}` })] }), new TableCell({ children: [new Paragraph({ text: `${currencySymbol}${item.amount.toFixed(2)}` })] })] })),
              ],
            }),
            new Paragraph({ children: [new TextRun({ text: 'SUMMARY', bold: true, size: 20 })], spacing: { before: 400, after: 200 } }),
            new Paragraph({ children: [new TextRun({ text: `Subtotal: ${currencySymbol}${totals.subtotal}` }), new TextRun({ text: `\nTax (${quotation.taxRate}%): ${currencySymbol}${totals.taxAmount}`, break: 1 }), new TextRun({ text: `\nDiscount (${quotation.discount}%): -${currencySymbol}${totals.discountAmount}`, break: 1 }), new TextRun({ text: `\nTOTAL: ${currencySymbol}${totals.total}`, break: 1, bold: true, size: 24 })], spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun({ text: 'Notes:', bold: true, size: 16 })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun(quotation.notes)], spacing: { after: 400 } }),
            new Paragraph({ children: [new TextRun({ text: 'Terms & Conditions:', bold: true, size: 16 })], spacing: { after: 200 } }),
            new Paragraph({ children: [new TextRun(quotation.terms)] }),
            new Paragraph({ children: [new TextRun({ text: `Generated by ${company.name}`, size: 12, color: '6b7280' })], alignment: AlignmentType.CENTER, spacing: { before: 800 } }),
          ],
        }],
      });
      const buffer = await Packer.toBlob(doc);
      saveAs(buffer, `quotation-${quotation.quotationNumber}.docx`);
      toast.success('Word document generated!');
    } catch (error) { console.error('Word generation error:', error); toast.error('Failed to generate Word document'); }
    finally { setIsGenerating(false); }
  };

  const sendQuotation = () => { if (!client.email) { toast.error('Please enter client email first'); return; } toast.success(`Quotation sent to ${client.email}!`); };
  const copyToClipboard = async () => { await navigator.clipboard.writeText(`Quotation ${quotation.quotationNumber}\nTotal: ${quotation.currency} ${totals.total}`); toast.success('Copied to clipboard!'); };
  const printQuotation = () => { toast.success('Opening print dialog...'); setTimeout(() => window.print(), 500); };
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => { setCompany({ ...company, logo: (e.target?.result as string) ?? '' }); toast.success('Logo uploaded!'); };
      reader.readAsDataURL(file);
    }
  };

  const currencySymbol = CURRENCIES.find(c => c.code === quotation.currency)?.symbol || '$';
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  if (!isClient) {
    return (
      <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
        <div className={`flex items-center justify-center h-96 ${t.textFaint}`}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#86BBD8] mx-auto mb-4" />
            <p>Loading Quotation Generator...</p>
          </div>
        </div>
      </main>
    );
  }

  const editorContent = (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {!previewMode && (
        <div className="xl:col-span-1 space-y-4">
          <Panel id="quickActions" title="Quick Actions" icon={Zap} sections={sections}>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: FileUp, label: 'Save Template', action: () => toast.success('Saved!') },
                { icon: Send, label: 'Send to Client', action: sendQuotation },
                { icon: Download, label: 'Export PDF', action: generatePDF },
                { icon: Copy, label: 'Copy Link', action: copyToClipboard },
              ].map((action, index) => (
                <button key={index} type="button" onClick={action.action}
                  className={`h-14 flex flex-col items-center justify-center gap-1 rounded-xl ${t.chipBg} ${t.hoverBg} transition-colors`}>
                  <action.icon className="w-4 h-4 text-[#86BBD8]" />
                  <span className={`text-xs ${t.textMuted}`}>{action.label}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel id="designTheme" title="Design Theme" icon={Palette} sections={sections}>
            <div className="grid grid-cols-2 gap-2">
              {PREMIUM_THEMES.map(theme => (
                <button key={theme.id} type="button" onClick={() => setQuotation({ ...quotation, theme: theme.id })}
                  className={`p-2.5 rounded-xl border-2 transition-all text-left ${quotation.theme === theme.id ? 'border-brand-500/60 bg-brand-500/10' : `${t.border} hover:border-brand-400/40`}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full shrink-0 ${theme.dotClass}`} />
                    <span className={`text-xs font-medium ${t.textMuted}`}>{theme.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel id="companyDetails" title="Company Details" icon={Building} sections={sections}>
            <div className="space-y-3">
              <FormField label="Company Name"><input value={company.name} onChange={(e) => setCompany({ ...company, name: e.target.value })} className={inputCls} /></FormField>
              <FormField label="Company Logo">
                {company.logo && <img src={company.logo} alt="Logo" className="w-12 h-12 object-contain rounded mb-2" />}
                <input type="file" accept="image/*" onChange={handleLogoUpload} title="Upload company logo"
                  className={`w-full text-xs ${t.textMuted} file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 ${t.chipBg} file:text-inherit`} />
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Email"><input value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} className={inputCls} /></FormField>
                <FormField label="Phone"><input value={company.phone} onChange={(e) => setCompany({ ...company, phone: e.target.value })} className={inputCls} /></FormField>
              </div>
              <FormField label="Tagline"><input value={company.tagline} onChange={(e) => setCompany({ ...company, tagline: e.target.value })} className={inputCls} /></FormField>
            </div>
          </Panel>

          <Panel id="clientInfo" title="Client Information" icon={User} sections={sections}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Client Name" required><input value={client.name} onChange={(e) => setClient({ ...client, name: e.target.value })} className={inputCls} /></FormField>
                <FormField label="Company"><input value={client.company} onChange={(e) => setClient({ ...client, company: e.target.value })} className={inputCls} /></FormField>
              </div>
              <FormField label="Email"><input type="email" value={client.email} onChange={(e) => setClient({ ...client, email: e.target.value })} className={inputCls} /></FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Phone"><input value={client.phone} onChange={(e) => setClient({ ...client, phone: e.target.value })} className={inputCls} /></FormField>
                <FormField label="Country"><input value={client.country} onChange={(e) => setClient({ ...client, country: e.target.value })} className={inputCls} /></FormField>
              </div>
            </div>
          </Panel>

          <Panel id="quotationDetails" title="Quotation Details" icon={FileText} sections={sections}>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Quotation #"><input value={quotation.quotationNumber} onChange={(e) => setQuotation({ ...quotation, quotationNumber: e.target.value })} className={inputCls} /></FormField>
                <FormField label="Currency">
                  <SelectField size="form" title="Currency" value={quotation.currency} onChange={v => setQuotation({ ...quotation, currency: v })}
                    options={CURRENCIES.map(c => ({ value: c.code, label: `${c.code} (${c.symbol})` }))} />
                </FormField>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Tax Rate (%)"><input type="number" value={quotation.taxRate} onChange={(e) => setQuotation({ ...quotation, taxRate: parseFloat(e.target.value) || 0 })} className={inputCls} /></FormField>
                <FormField label="Discount (%)"><input type="number" value={quotation.discount} onChange={(e) => setQuotation({ ...quotation, discount: parseFloat(e.target.value) || 0 })} className={inputCls} /></FormField>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Payment Terms">
                  <SelectField size="form" title="Payment terms" value={quotation.paymentTerms} onChange={v => setQuotation({ ...quotation, paymentTerms: v })}
                    options={['Net 15', 'Net 30', 'Net 60', 'Due on receipt']} />
                </FormField>
                <FormField label="Delivery Time">
                  <SelectField size="form" title="Delivery time" value={quotation.deliveryTime} onChange={v => setQuotation({ ...quotation, deliveryTime: v })}
                    options={['1-2 weeks', '2-4 weeks', '4-6 weeks', '8+ weeks']} />
                </FormField>
              </div>
            </div>
          </Panel>
        </div>
      )}

      <div className={`${previewMode ? 'xl:col-span-3' : 'xl:col-span-2'} space-y-4`}>
        <div className="flex justify-end">
          <button type="button" onClick={() => setPreviewMode(!previewMode)}
            className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all ${previewMode ? 'bg-brand-500/15 text-brand-500' : `${t.chipBg} ${t.hoverBg} ${t.textMuted}`}`}>
            <Eye className="h-3.5 w-3.5" /> {previewMode ? 'Edit Mode' : 'Preview Mode'}
          </button>
        </div>

        <Panel id="items" title={previewMode ? 'Quotation Preview' : 'Quotation Items'} icon={Calculator} badge={`${items.length} items`} sections={sections}
          actions={!previewMode ? <PrimaryButton icon={Plus} accent="violet" onClick={addItem}>Add Item</PrimaryButton> : undefined}>
          {previewMode ? (
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
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">QUOTATION</h2>
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
                <div className="bg-gradient-to-r from-slate-900 to-brand-900 text-white px-4 py-3 rounded-t-lg">
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
                  <div className="flex justify-between text-slate-300 text-sm"><span>Subtotal:</span><span>{currencySymbol} {totals.subtotal}</span></div>
                  <div className="flex justify-between text-slate-300 text-sm"><span>Tax ({quotation.taxRate}%):</span><span>{currencySymbol} {totals.taxAmount}</span></div>
                  <div className="flex justify-between text-slate-300 text-sm"><span>Discount ({quotation.discount}%):</span><span className="text-red-300">-{currencySymbol} {totals.discountAmount}</span></div>
                  <div className="border-t border-slate-700 pt-3 flex justify-between text-lg font-bold"><span>Total:</span><span className="text-green-400">{currencySymbol} {totals.total}</span></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8 text-sm">
                <div><h4 className="font-semibold text-slate-900 mb-3">Notes</h4><div className="bg-brand-50 p-4 rounded-lg"><p className="text-slate-700 whitespace-pre-line">{quotation.notes}</p></div></div>
                <div><h4 className="font-semibold text-slate-900 mb-3">Terms & Conditions</h4><div className="bg-slate-50 p-4 rounded-lg"><p className="text-slate-700 whitespace-pre-line">{quotation.terms}</p></div></div>
              </div>
              <div className="mt-8 pt-6 border-t border-slate-200 text-center text-slate-500 text-sm">
                <p>Generated by {company.name} • {company.website} • {company.email}</p>
                <p className="mt-1">This quotation is valid until {quotation.validUntil}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className={`grid grid-cols-12 gap-2 items-end p-3 ${t.chipBg} rounded-xl border ${t.border}`}>
                  <div className="col-span-1 flex items-end justify-center pb-1">
                    <div className="w-7 h-7 bg-brand-500/20 rounded-lg flex items-center justify-center text-brand-500 font-semibold text-xs">{index + 1}</div>
                  </div>
                  <div className="col-span-5"><FormField label="Description"><input value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="Item description" className={inputCls} /></FormField></div>
                  <div className="col-span-2"><FormField label="Quantity"><input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)} className={inputCls} /></FormField></div>
                  <div className="col-span-2"><FormField label="Rate"><input type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)} className={inputCls} /></FormField></div>
                  <div className="col-span-1">
                    <label className={`block text-xs font-medium ${t.textFaint} mb-1`}>Amount</label>
                    <div className={`h-9 flex items-center px-3 text-sm font-semibold text-[#86BBD8] ${t.inputBg} rounded-lg`}>{currencySymbol}{item.amount.toFixed(2)}</div>
                  </div>
                  <div className="col-span-1 flex items-end pb-0.5 justify-center">
                    <button type="button" onClick={() => removeItem(item.id)} title="Remove item"
                      className="h-9 w-9 flex items-center justify-center rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              <div className={`mt-4 p-5 ${t.chipBg} rounded-xl border ${t.border}`}>
                <div className="grid grid-cols-2 gap-6">
                  <div className={`space-y-2 text-sm ${t.textFaint}`}>
                    <div className="flex justify-between"><span>Subtotal:</span><span>{currencySymbol} {totals.subtotal}</span></div>
                    <div className="flex justify-between"><span>Tax ({quotation.taxRate}%):</span><span>{currencySymbol} {totals.taxAmount}</span></div>
                    <div className="flex justify-between"><span>Discount ({quotation.discount}%):</span><span className="text-rose-500">-{currencySymbol} {totals.discountAmount}</span></div>
                  </div>
                  <div className={`flex flex-col justify-center border-l ${t.border} pl-6`}>
                    <div className={`text-xs uppercase tracking-wider mb-1 ${t.textFaint}`}>Total Amount</div>
                    <div className="text-2xl font-bold text-[#86BBD8]">{currencySymbol} {totals.total}</div>
                    <div className={`text-xs mt-1 ${t.textFaint}`}>Valid until: {quotation.validUntil ? formatDate(quotation.validUntil) : 'Not set'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Panel>

        {!previewMode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Panel id="notes" title="Notes" icon={Lightbulb} sections={sections}>
              <PredictiveInput historyKey="quotation_notes" multiline rows={4}
                value={quotation.notes} onChange={v => setQuotation({ ...quotation, notes: v })} placeholder="Additional notes for the client..."
                inputClassName={t.inputBg} />
            </Panel>
            <Panel id="terms" title="Terms & Conditions" icon={Shield} sections={sections}>
              <PredictiveInput historyKey="quotation_terms" multiline rows={4}
                value={quotation.terms} onChange={v => setQuotation({ ...quotation, terms: v })} placeholder="Payment terms and conditions..."
                inputClassName={t.inputBg} />
            </Panel>
          </div>
        )}
      </div>
    </div>
  );

  const templatesContent = (
    <Panel id="templates" title="Professional Templates" icon={Sparkles} sections={sections}>
      <p className={`text-xs mb-4 ${t.textFaint}`}>Choose from premium quotation templates designed for maximum impact</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUOTATION_TEMPLATES.map((template) => (
          <GlowCard key={template.id} color={ACCENT_HEX.violet} surface={`${t.glass} rounded-2xl`} className="overflow-hidden group">
            <div className={`h-1.5 ${template.color}`} />
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge color="#94a3b8" label={template.category} />
                <span className="text-2xl">{template.icon}</span>
              </div>
              <h3 className={`font-semibold mt-2 mb-3 ${t.textPrimary}`}>{template.name}</h3>
              <div className="space-y-1.5 mb-4">
                <div className={`text-xs ${t.textFaint}`}>{template.items.length} pre-configured items</div>
                {template.items.slice(0, 2).map((item, index) => (
                  <div key={index} className={`flex justify-between text-xs ${t.textFaint}`}>
                    <span className="truncate">{item.description}</span><span className="ml-2 shrink-0">${item.amount}</span>
                  </div>
                ))}
                {template.items.length > 2 && <div className={`text-xs ${t.textFaint}`}>+{template.items.length - 2} more items</div>}
              </div>
              <PrimaryButton icon={Sparkles} accent="violet" size="md" fullWidth onClick={() => applyTemplate(template)}>Use Template</PrimaryButton>
            </div>
          </GlowCard>
        ))}
      </div>
    </Panel>
  );

  const clientsContent = (
    <Panel id="clients" title="Client Management" icon={Users} sections={sections}>
      <p className={`text-xs mb-4 ${t.textFaint}`}>Manage your client database and quickly load client information</p>
      <div className="space-y-3">
        {clientsList.map((c) => (
          <div key={c.id} className={`flex items-center justify-between p-3 ${t.chipBg} rounded-xl border ${t.border} transition-colors group`}>
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-emerald-500 shrink-0" />
              <div>
                <div className={`font-semibold text-sm ${t.textPrimary}`}>{c.name}</div>
                <div className={`text-xs ${t.textFaint}`}>{c.company}</div>
                <div className={`text-xs ${t.textFaint}`}>{c.email}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => loadClient(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${t.hoverBg} ${t.textFaint} opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1.5`}>
                <User className="h-3.5 w-3.5" /> Load
              </button>
              <StatusBadge color="#34d399" label="Active" />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );

  const historyContent = (
    <Panel id="history" title="Quotation History" icon={History} sections={sections}>
      <p className={`text-xs mb-4 ${t.textFaint}`}>Track your previous quotations and their status</p>
      <div className="space-y-3">
        {recentQuotations.map((quote) => (
          <div key={quote.id} className={`flex items-center justify-between p-3 ${t.chipBg} rounded-xl border ${t.border} transition-colors`}>
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${quote.status === 'accepted' ? 'bg-emerald-400' : quote.status === 'pending' ? 'bg-amber-400' : 'bg-slate-400'}`} />
              <div>
                <div className={`font-semibold text-sm ${t.textPrimary}`}>{quote.number}</div>
                <div className={`text-xs ${t.textFaint}`}>{quote.client}</div>
                <div className={`text-xs ${t.textFaint}`}>{quote.date}</div>
              </div>
            </div>
            <div className="text-right">
              <div className={`font-semibold text-sm ${t.textPrimary}`}>${quote.amount}</div>
              <div className="mt-1"><StatusBadge color={quote.status === 'accepted' ? '#34d399' : quote.status === 'pending' ? '#f59e0b' : '#94a3b8'} label={quote.status} /></div>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={FileText}
        accent="violet"
        crumbs={['Core Management', 'Quotations']}
        title="Quotation Generator"
        description="Create professional quotations and manage client proposals."
        statsOpen
        actions={
          <>
            <button type="button" onClick={sections.toggleAll} title={sections.allOpen ? 'Collapse all sections' : 'Expand all sections'}
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
              {sections.allOpen ? <ChevronsUp className="h-3.5 w-3.5" /> : <ChevronsDown className="h-3.5 w-3.5" />}
            </button>
            <PrimaryButton icon={Download} accent="violet" submitting={isGenerating} onClick={generatePDF}>{isGenerating ? 'Generating...' : 'PDF'}</PrimaryButton>
            <button type="button" onClick={generateWord} className={`h-8 px-3 rounded-lg text-xs font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1.5`}><FileDown className="h-3.5 w-3.5" /> Word</button>
            <button type="button" onClick={printQuotation} className={`h-8 px-3 rounded-lg text-xs font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1.5`}><Printer className="h-3.5 w-3.5" /> Print</button>
            <button type="button" onClick={sendQuotation} className={`h-8 px-3 rounded-lg text-xs font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1.5`}><Send className="h-3.5 w-3.5" /> Send</button>
          </>
        }
      >
        <div className="grid grid-cols-4 gap-3">
          <StatTile icon={Calculator} color="#86BBD8" label="Line Items" value={items.length} />
          <StatTile icon={FileText} color="#34d399" label="Total Value" value={`${quotation.currency} ${totals.total}`} />
          <StatTile icon={Calculator} color="#f59e0b" label="Tax Rate" value={`${quotation.taxRate}%`} />
          <StatTile icon={Calculator} color="#a78bfa" label="Discount" value={`${quotation.discount}%`} />
        </div>
      </PageHero>

      <div className={`${t.glassSoft} rounded-xl p-1 flex gap-1 flex-wrap`}>
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? 'bg-brand-500/15 text-brand-500' : `${t.textFaint} ${t.hoverBg} ${t.hoverText}`}`}>
            <tab.icon className="h-3.5 w-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'editor' && editorContent}
      {activeTab === 'templates' && templatesContent}
      {activeTab === 'clients' && clientsContent}
      {activeTab === 'history' && historyContent}
    </main>
  );
};

export default function QuotationGenerator() {
  return <AppShell><QuotationGeneratorContent /></AppShell>;
}
