// app/cv-builder/page.jsx
'use client';

import { useState, useRef } from 'react';
import { RequireAuth } from '@/components/shared/RequireAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { 
  Upload, 
  Download, 
  Eye, 
  Edit3,
  User,
  Briefcase,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Award,
  Linkedin,
  FileText,
  Sparkles,
  Zap,
  Star,
  Globe,
  Settings,
  Wand2,
  Brain,
  Cpu,
  Palette,
  Type,
  Columns,
  Image as ImageIcon,
  Plus,
  Trash2,
  Copy,
  Scissors,
  Filter,
  FileUp,
  RefreshCw,
  CheckCircle2,
  ChevronRight,
  LayoutGrid,
  PaintBucket,
  TextCursor,
  AlignLeft,
  Bold,
  Italic,
  List,
  Hash,
  Calendar,
  Clock,
  Building,
  BookOpen,
  Target,
  TrendingUp,
  Users,
  Mail as MailIcon,
  Phone as PhoneIcon,
  MapPin as MapPinIcon,
  ExternalLink,
  Printer,
  FilePlus,
  Save,
  UploadCloud,
  EyeOff,
  Eye as EyeIcon,
  Maximize2,
  Minimize2,
  RotateCcw,
  Settings2,
  HelpCircle,
  Info,
  AlertCircle,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  MoveVertical,
  GripVertical,
  MoreVertical,
  Edit,
  Trash,
  Copy as CopyIcon,
  Share2,
  Lock,
  Unlock,
  ZoomIn,
  ZoomOut,
  Grid,
  List as ListIcon,
  Layout,
  Moon,
  Sun,
  Monitor
} from '@/components/shared/theme';

// ========== TYPES ==========
interface PersonalInfo { firstName: string; lastName: string; title: string; summary: string; photo: string | null; }
interface ContactInfo  { email: string; phone: string; location: string; linkedin: string; portfolio: string; }
interface Experience   { id: string; company: string; position: string; startDate: string; endDate: string; current: boolean; description: string; }
interface Education    { id: string; institution: string; degree: string; field: string; startDate: string; endDate: string; current: boolean; gpa: string; }
interface Skill        { id: string; name: string; level: number; }
interface Project      { id: string; name: string; description: string; }
interface CvData {
  personalInfo: PersonalInfo;
  contact: ContactInfo;
  experience: Experience[];
  education: Education[];
  skills: Skill[];
  projects: Project[];
  certifications: string[];
  languages: string[];
}
interface ExtractedSection { type: string; content: string; }

// ========== UTILITY FUNCTIONS ==========
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const useToast = () => {
  const showToast = (title: string, description: string, variant: string = 'default') => {
    const toast = document.createElement('div');
    toast.className = `fixed top-4 right-4 p-4 rounded-lg shadow-xl z-50 backdrop-blur-sm animate-in slide-in-from-right-4 duration-300 ${
      variant === 'destructive' 
        ? 'bg-red-500/90 text-white border border-red-600' 
        : 'bg-green-500/90 text-white border border-green-600'
    }`;
    toast.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="flex-shrink-0">
          ${variant === 'destructive' ? '❌' : '✅'}
        </div>
        <div>
          <div class="font-semibold">${title}</div>
          <div class="text-sm opacity-90">${description}</div>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  };

  return { toast: showToast };
};

// ========== BEAUTIFUL TEMPLATE SYSTEM ==========
const TEMPLATES = {
  EXECUTIVE_VELVET: {
    id: 'executive_velvet',
    name: 'Executive Velvet',
    description: 'Luxurious dark theme with gold accents',
    category: 'Premium',
    icon: '👑',
    colors: {
      primary: '#0F172A',
      secondary: '#F59E0B',
      accent: '#1E293B',
      text: '#FFFFFF',
      background: '#0F172A'
    }
  },
  MODERN_SILK: {
    id: 'modern_silk',
    name: 'Modern Silk',
    description: 'Clean, elegant with silk-like texture',
    category: 'Modern',
    icon: '✨',
    colors: {
      primary: '#3B82F6',
      secondary: '#10B981',
      accent: '#F3F4F6',
      text: '#1F2937',
      background: '#FFFFFF'
    }
  },
  MINIMAL_MARBLE: {
    id: 'minimal_marble',
    name: 'Minimal Marble',
    description: 'Ultra-clean with marble-inspired design',
    category: 'Minimal',
    icon: '🏛️',
    colors: {
      primary: '#6B7280',
      secondary: '#9CA3AF',
      accent: '#F9FAFB',
      text: '#111827',
      background: '#FFFFFF'
    }
  },
  CREATIVE_AMETHYST: {
    id: 'creative_amethyst',
    name: 'Creative Amethyst',
    description: 'Bold and creative with purple accents',
    category: 'Creative',
    icon: '💎',
    colors: {
      primary: '#7C3AED',
      secondary: '#A78BFA',
      accent: '#F5F3FF',
      text: '#1F2937',
      background: '#FFFFFF'
    }
  },
  PROFESSIONAL_OAK: {
    id: 'professional_oak',
    name: 'Professional Oak',
    description: 'Traditional professional with wood-like tones',
    category: 'Professional',
    icon: '📜',
    colors: {
      primary: '#78350F',
      secondary: '#D97706',
      accent: '#FEF3C7',
      text: '#1F2937',
      background: '#FFFBEB'
    }
  }
};

// ========== STUNNING TEMPLATE COMPONENTS ==========
const TemplateExecutiveVelvet = ({ cvData }: { cvData: CvData }) => {
  const { personalInfo, experience, education, skills, projects, certifications, contact } = cvData;
  
  return (
    <div className="bg-[#0F172A] text-white min-h-[842px] max-w-[1100px] mx-auto shadow-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="relative p-12 bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A]">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#F59E0B] to-transparent"></div>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="mb-6">
              <h1 className="text-5xl font-light mb-2 tracking-tight">
                <span className="font-bold">{personalInfo.firstName}</span> {personalInfo.lastName}
              </h1>
              <div className="w-24 h-1 bg-[#F59E0B] mb-4"></div>
              <p className="text-xl text-gray-300 tracking-wide">{personalInfo.title}</p>
            </div>
            
            <div className="flex flex-wrap gap-6 mt-8">
              {contact?.email && (
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="p-2 bg-[#1E293B] rounded-lg">
                    <MailIcon className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                  <span>{contact.email}</span>
                </div>
              )}
              {contact?.phone && (
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="p-2 bg-[#1E293B] rounded-lg">
                    <PhoneIcon className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact?.location && (
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="p-2 bg-[#1E293B] rounded-lg">
                    <MapPinIcon className="h-4 w-4 text-[#F59E0B]" />
                  </div>
                  <span>{contact.location}</span>
                </div>
              )}
            </div>
          </div>
          
          {personalInfo.photo && (
            <div className="ml-8">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-[#F59E0B]/20 shadow-2xl">
                <img src={personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-[700px]">
        {/* Sidebar */}
        <div className="w-[35%] bg-[#1E293B] p-10 border-r border-gray-800">
          {/* Summary */}
          {personalInfo.summary && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-[#F59E0B] uppercase tracking-widest mb-4">Professional Profile</h3>
              <p className="text-gray-300 text-sm leading-relaxed">{personalInfo.summary}</p>
            </div>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-[#F59E0B] uppercase tracking-widest mb-6">Core Competencies</h3>
              <div className="space-y-4">
                {skills.map((skill: Skill, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">{skill.name}</span>
                      <span className="text-[#F59E0B] font-medium">{skill.level}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#F59E0B] to-[#FBBF24] rounded-full"
                        style={{ width: `${skill.level}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Education */}
          {education.length > 0 && (
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-[#F59E0B] uppercase tracking-widest mb-6">Education</h3>
              <div className="space-y-6">
                {education.map((edu: Education, index: number) => (
                  <div key={index} className="space-y-1">
                    <h4 className="font-semibold text-white">{edu.degree}</h4>
                    <p className="text-sm text-[#F59E0B]">{edu.institution}</p>
                    <p className="text-xs text-gray-400">{edu.startDate} - {edu.endDate}</p>
                    {edu.gpa && (
                      <p className="text-xs text-gray-300 mt-1">GPA: {edu.gpa}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#F59E0B] uppercase tracking-widest mb-6">Certifications</h3>
              <div className="space-y-3">
                {certifications.map((cert: string, index: number) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-gray-300">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></div>
                    <span>{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="w-[65%] p-10">
          {/* Experience */}
          {experience.length > 0 && (
            <div className="mb-12">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-1 bg-[#F59E0B]"></div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wide">Professional Experience</h2>
              </div>
              
              <div className="space-y-10">
                {experience.map((exp: Experience, index: number) => (
                  <div key={index} className="relative pl-12">
                    <div className="absolute left-0 top-2 w-8 h-8 rounded-full border-4 border-[#0F172A] bg-[#F59E0B] shadow-lg"></div>
                    <div className="pb-8 border-l-2 border-gray-800 pl-8">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-bold text-white mb-1">{exp.position}</h3>
                          <p className="text-[#F59E0B] font-semibold">{exp.company}</p>
                        </div>
                        <span className="text-sm text-gray-400 bg-gray-800 px-4 py-1.5 rounded-full">
                          {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-gray-300 leading-relaxed">{exp.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          {projects.length > 0 && (
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-1 bg-[#F59E0B]"></div>
                <h2 className="text-xl font-bold text-white uppercase tracking-wide">Key Projects</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                {projects.map((project: Project, index: number) => (
                  <div key={index} className="bg-[#1E293B] border border-gray-800 rounded-xl p-6">
                    <h3 className="font-bold text-white mb-3">{project.name}</h3>
                    <p className="text-sm text-gray-300">{project.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TemplateModernSilk = ({ cvData }: { cvData: CvData }) => {
  const { personalInfo, experience, education, skills, projects, contact } = cvData;
  
  return (
    <div className="bg-white min-h-[842px] max-w-[1100px] mx-auto shadow-2xl border border-gray-200 overflow-hidden rounded-3xl">
      {/* Header with Gradient */}
      <div className="bg-gradient-to-r from-brand-600 via-brand-500 to-cyan-500 text-white p-12">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-6xl font-bold mb-4 tracking-tight">
              {personalInfo.firstName} <span className="text-cyan-200">{personalInfo.lastName}</span>
            </h1>
            <p className="text-2xl font-light tracking-wide text-brand-100 mb-8">{personalInfo.title}</p>
            
            <div className="flex flex-wrap gap-8">
              {contact?.email && (
                <div className="flex items-center gap-3">
                  <MailIcon className="h-5 w-5" />
                  <span>{contact.email}</span>
                </div>
              )}
              {contact?.phone && (
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {contact?.location && (
                <div className="flex items-center gap-3">
                  <MapPinIcon className="h-5 w-5" />
                  <span>{contact.location}</span>
                </div>
              )}
            </div>
          </div>
          
          {personalInfo.photo && (
            <div className="ml-8">
              <div className="w-40 h-40 rounded-full overflow-hidden border-8 border-white/30 shadow-2xl">
                <img src={personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-12">
        <div className="grid grid-cols-3 gap-12">
          {/* Left Column */}
          <div className="col-span-2 space-y-12">
            {/* Summary */}
            {personalInfo.summary && (
              <div className="bg-gradient-to-r from-brand-50 to-cyan-50 p-8 rounded-2xl border border-brand-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Professional Summary</h2>
                <p className="text-gray-700 leading-relaxed text-lg">{personalInfo.summary}</p>
              </div>
            )}

            {/* Experience */}
            {experience.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-8 pb-4 border-b border-brand-200">Work Experience</h2>
                <div className="space-y-10">
                  {experience.map((exp: Experience, index: number) => (
                    <div key={index} className="group">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 group-hover:text-brand-600 transition-colors">{exp.position}</h3>
                          <p className="text-lg text-brand-600 font-semibold">{exp.company}</p>
                        </div>
                        <div className="text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">
                          {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
                        </div>
                      </div>
                      {exp.description && (
                        <p className="text-gray-600 leading-relaxed pl-6 border-l-4 border-brand-200">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-12">
            {/* Skills */}
            {skills.length > 0 && (
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b border-brand-200">Expertise</h3>
                <div className="space-y-5">
                  {skills.map((skill: Skill, index: number) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{skill.name}</span>
                        <span className="text-xs text-brand-600 font-bold">{skill.level}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-brand-600 to-cyan-500 h-2 rounded-full"
                          style={{ width: `${skill.level}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education */}
            {education.length > 0 && (
              <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl border border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 mb-6 pb-3 border-b border-brand-200">Education</h3>
                <div className="space-y-6">
                  {education.map((edu: Education, index: number) => (
                    <div key={index} className="space-y-2">
                      <h4 className="font-bold text-gray-900">{edu.degree}</h4>
                      <p className="text-brand-600 font-semibold">{edu.institution}</p>
                      <p className="text-sm text-gray-500">{edu.startDate} - {edu.current ? 'Present' : edu.endDate}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Projects */}
            {projects.length > 0 && (
              <div className="bg-gradient-to-r from-cyan-50 to-brand-50 p-8 rounded-2xl border border-cyan-100">
                <h3 className="text-xl font-bold text-gray-900 mb-6">Notable Projects</h3>
                <div className="space-y-4">
                  {projects.map((project: Project, index: number) => (
                    <div key={index} className="space-y-2">
                      <h4 className="font-semibold text-gray-900">{project.name}</h4>
                      <p className="text-sm text-gray-600">{project.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ========== IMPROVED TEXT EXTRACTOR ==========
class TextExtractor {
  static extractSections(text: string): ExtractedSection[] {
    const sections: ExtractedSection[] = [];
    const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);
    
    const sectionPatterns = {
      contact: /^(contact information|contact details|email|phone|address|location|linkedin|github|portfolio):?$/i,
      summary: /^(summary|professional summary|profile|about me|about|objective|career objective|professional profile):?$/i,
      experience: /^(work experience|professional experience|employment|career history|experience|work history|employment history):?$/i,
      education: /^(education|academic background|qualifications|academic qualifications|education & training):?$/i,
      skills: /^(skills|technical skills|core competencies|expertise|competencies|key skills|professional skills):?$/i,
      projects: /^(projects|project experience|key projects|portfolio|notable projects|project work):?$/i,
      certifications: /^(certifications|certificates|licenses|awards|honors|certifications & awards):?$/i,
      languages: /^(languages|language proficiency|language skills):?$/i
    };
    
    let currentSection = null;
    let currentContent = [];
    
    for (const line of lines) {
      let isSectionHeader = false;
      
      const normalizedLine = line.replace(/:$/, '').toLowerCase();
      
      for (const [section, pattern] of Object.entries(sectionPatterns)) {
        if (pattern.test(normalizedLine)) {
          if (currentSection) {
            sections.push({
              type: currentSection,
              content: currentContent.join('\n').trim()
            });
          }
          currentSection = section;
          currentContent = [];
          isSectionHeader = true;
          break;
        }
      }
      
      if (!isSectionHeader && line === line.toUpperCase() && line.length > 3 && line.length < 50) {
        for (const [section, pattern] of Object.entries(sectionPatterns)) {
          if (pattern.test(line.toLowerCase())) {
            if (currentSection) {
              sections.push({
                type: currentSection,
                content: currentContent.join('\n').trim()
              });
            }
            currentSection = section;
            currentContent = [];
            isSectionHeader = true;
            break;
          }
        }
      }
      
      if (!isSectionHeader && currentSection) {
        if (line.length > 0 && !line.match(/^[-=*_]{3,}$/)) {
          currentContent.push(line);
        }
      } else if (!currentSection && line.length > 0 && !isSectionHeader) {
        if (!currentSection) currentSection = 'summary';
        currentContent.push(line);
      }
    }
    
    if (currentSection && currentContent.length > 0) {
      sections.push({
        type: currentSection,
        content: currentContent.join('\n').trim()
      });
    }
    
    if (sections.length === 0 && lines.length > 0) {
      const personalLines = [];
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        if (!sectionPatterns.summary.test(lines[i].toLowerCase())) {
          personalLines.push(lines[i]);
        } else {
          break;
        }
      }
      if (personalLines.length > 0) {
        sections.push({
          type: 'summary',
          content: personalLines.join('\n')
        });
      }
    }
    
    return sections;
  }
  
  static extractContactInfo(text: string): ContactInfo {
    const contact = {
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      portfolio: ''
    };
    
    const emailRegex = /[\w.%+-]+@[\w.-]+\.[a-zA-Z]{2,}/g;
    const emailMatches = text.match(emailRegex);
    if (emailMatches) {
      const personalEmail = emailMatches.find((email: string) =>
        !email.includes('example.com') && 
        !email.includes('test.com') &&
        email.split('@')[0].length > 1
      );
      if (personalEmail) contact.email = personalEmail;
    }
    
    const phonePatterns = [
      /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      /(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})/g,
      /(\+\d{1,3}\s?)?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g
    ];
    
    for (const pattern of phonePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const phone = matches[0].replace(/\D/g, '');
        if (phone.length >= 10) {
          const formatted = `(${phone.substring(0,3)}) ${phone.substring(3,6)}-${phone.substring(6,10)}`;
          contact.phone = formatted;
          break;
        }
      }
    }
    
    const locationPatterns = [
      /Location:\s*([^\n]+)/i,
      /Address:\s*([^\n]+)/i,
      /Based in\s*([^\n.,]+)/i,
      /Lives in\s*([^\n.,]+)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:,\s*[A-Z]{2})?(?:\s+\d{5})?/,
      /(?:from\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
      /,\s*([A-Z][a-z]+\s*(?:[A-Z][a-z]+)?)(?:\s*[A-Z]{2})?\s*\d{5}/
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const location = match[1].trim();
        if (location.length > 3 && location.length < 50 && !location.includes('@')) {
          contact.location = location;
          break;
        }
      }
    }
    
    const linkedinPatterns = [
      /linkedin\.com\/in\/[\w-]+/g,
      /linkedin\.com\/company\/[\w-]+/g,
      /https?:\/\/(?:www\.)?linkedin\.com\/[^\s]+/g,
      /LinkedIn:\s*([^\s]+)/i
    ];
    
    for (const pattern of linkedinPatterns) {
      const match = text.match(pattern);
      if (match) {
        let linkedinUrl = match[0];
        if (!linkedinUrl.startsWith('http')) {
          linkedinUrl = 'https://' + linkedinUrl;
        }
        contact.linkedin = linkedinUrl;
        break;
      }
    }
    
    return contact;
  }
}

// ========== PARSING FUNCTIONS ==========
const parseExperience = (content: string): Experience[] => {
  const experiences = [];
  const lines = content.split('\n');
  
  let currentExp = null;
  let bulletPoints = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    const jobPatterns = [
      /^(.+?)\s+(?:at|@)\s+(.+?)\s+\(?(.+?)\)?$/i,
      /^(.+?),\s+(.+?)\s+-\s+(.+)$/i,
      /^(.+?)\s+-\s+(.+?)\s+\((.+?)\)$/i,
      /^(.+?)\s+-\s+(.+?)\s+(.+)$/i,
    ];
    
    let matched = false;
    for (const pattern of jobPatterns) {
      const match = trimmedLine.match(pattern);
      if (match && match[1] && match[2]) {
        if (currentExp) {
          currentExp.description = bulletPoints.join('\n');
          experiences.push(currentExp);
          bulletPoints = [];
        }
        
        const position = match[1].trim();
        const company = match[2].trim();
        let dates = match[3] ? match[3].trim() : '';
        
        if (!dates) {
          const dateMatch = trimmedLine.match(/(\d{4})\s*[-–]\s*(\d{4}|Present|Current|Now)/i);
          if (dateMatch) {
            dates = `${dateMatch[1]} - ${dateMatch[2]}`;
          }
        }
        
        currentExp = {
          id: generateUniqueId(),
          company: company,
          position: position,
          startDate: dates.split(' - ')[0] || '',
          endDate: dates.includes(' - ') ? dates.split(' - ')[1] : '',
          current: dates.includes('Present') || dates.includes('Current') || dates.includes('Now'),
          description: ''
        };
        matched = true;
        break;
      }
    }
    
    if (!matched && trimmedLine.length > 0) {
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./)) {
        bulletPoints.push(trimmedLine.replace(/^[•\-]\s*|\d+\.\s*/, ''));
      } else if (currentExp && trimmedLine.length > 10) {
        bulletPoints.push(trimmedLine);
      }
    }
  }
  
  if (currentExp) {
    currentExp.description = bulletPoints.join('\n');
    experiences.push(currentExp);
  }
  
  if (experiences.length === 0 && lines.length > 0) {
    experiences.push({
      id: generateUniqueId(),
      company: 'Various Companies',
      position: 'Professional Experience',
      startDate: '',
      endDate: '',
      current: false,
      description: content
    });
  }
  
  return experiences;
};

const parseEducation = (content: string): Education[] => {
  const educations = [];
  const lines = content.split('\n');
  
  let currentEdu = null;
  let collectingInfo = false;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    const educationPatterns = [
      /^(.+?),\s+(.+?)\s+-\s+(.+)$/i,
      /^(.+?)\s+at\s+(.+?)\s+\(?(.+?)\)?$/i,
      /^(.+?)\s+(?:from|at)\s+(.+)$/i,
    ];
    
    let matched = false;
    for (const pattern of educationPatterns) {
      const match = trimmedLine.match(pattern);
      if (match) {
        if (currentEdu) {
          educations.push(currentEdu);
        }
        
        const degree = match[1].trim();
        const institution = match[2].trim();
        let dates = match[3] ? match[3].trim() : '';
        
        if (!dates) {
          const dateMatch = trimmedLine.match(/(\d{4})\s*[-–]\s*(\d{4}|Present|Current)/i);
          if (dateMatch) {
            dates = `${dateMatch[1]} - ${dateMatch[2]}`;
          }
        }
        
        let gpa = '';
        const gpaMatch = trimmedLine.match(/GPA[:]?\s*(\d\.\d\d?)/i);
        if (gpaMatch) {
          gpa = gpaMatch[1];
        }
        
        currentEdu = {
          id: generateUniqueId(),
          institution: institution,
          degree: degree,
          field: '',
          startDate: dates.split(' - ')[0] || '',
          endDate: dates.includes(' - ') ? dates.split(' - ')[1] : '',
          current: dates.includes('Present') || dates.includes('Current'),
          gpa: gpa
        };
        collectingInfo = true;
        matched = true;
        break;
      }
    }
    
    if (!matched && collectingInfo && trimmedLine.length > 0 && currentEdu) {
      const gpaMatch = trimmedLine.match(/GPA[:]?\s*(\d\.\d\d?)/i);
      if (gpaMatch && !currentEdu.gpa) {
        currentEdu.gpa = gpaMatch[1];
      } else if (trimmedLine.match(/^[A-Z][a-z]+/)) {
        if (!currentEdu.field && trimmedLine.length < 50) {
          currentEdu.field = trimmedLine;
        }
      }
    } else if (!matched && !collectingInfo && trimmedLine.length > 5) {
      educations.push({
        id: generateUniqueId(),
        institution: trimmedLine,
        degree: '',
        field: '',
        startDate: '',
        endDate: '',
        current: false,
        gpa: ''
      });
    }
  }
  
  if (currentEdu) {
    educations.push(currentEdu);
  }
  
  return educations;
};

const parseSkills = (content: string): Skill[] => {
  const skills = [];
  
  const skillLines = content.split(/[,;|•\n\t]+/);
  
  for (const line of skillLines) {
    const skill = line.trim();
    if (skill.length > 2 && skill.length < 50) {
      const cleanSkill = skill
        .replace(/^\d+\.\s*/, '')
        .replace(/^[•\-]\s*/, '')
        .replace(/\(.*?\)/g, '')
        .trim();
      
      if (cleanSkill.length > 2 && !cleanSkill.match(/^[0-9]+$/)) {
        let level = 75;
        const lowerSkill = cleanSkill.toLowerCase();
        
        if (lowerSkill.includes('expert') || lowerSkill.includes('advanced') || lowerSkill.includes('master')) {
          level = 90;
        } else if (lowerSkill.includes('intermediate') || lowerSkill.includes('proficient')) {
          level = 70;
        } else if (lowerSkill.includes('beginner') || lowerSkill.includes('basic') || lowerSkill.includes('novice')) {
          level = 50;
        } else if (lowerSkill.includes('familiar')) {
          level = 40;
        }
        
        const skillName = cleanSkill
          .replace(/\s*(expert|advanced|intermediate|proficient|beginner|basic|novice|familiar)\s*/gi, '')
          .trim();
        
        if (skillName.length > 0) {
          skills.push({
            id: generateUniqueId(),
            name: skillName,
            level: level
          });
        }
      }
    }
  }
  
  const uniqueSkills = [];
  const seen = new Set();
  for (const skill of skills) {
    if (!seen.has(skill.name.toLowerCase())) {
      seen.add(skill.name.toLowerCase());
      uniqueSkills.push(skill);
    }
  }
  
  return uniqueSkills.slice(0, 20);
};

const parseProjects = (content: string): Project[] => {
  const projects = [];
  const lines = content.split('\n');
  
  let currentProject = null;
  let descriptionLines = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    if (trimmedLine.length > 5 && trimmedLine.length < 100 && 
        !trimmedLine.startsWith('•') && !trimmedLine.startsWith('-') &&
        !trimmedLine.match(/^\d+\./) && !trimmedLine.match(/^[a-z]/)) {
      
      if (currentProject) {
        currentProject.description = descriptionLines.join(' ').trim();
        projects.push(currentProject);
        descriptionLines = [];
      }
      
      currentProject = {
        id: generateUniqueId(),
        name: trimmedLine.replace(/[:.]$/, ''),
        description: ''
      };
    } else if (currentProject && trimmedLine.length > 0) {
      descriptionLines.push(trimmedLine);
    }
  }
  
  if (currentProject) {
    currentProject.description = descriptionLines.join(' ').trim();
    projects.push(currentProject);
  }
  
  return projects.slice(0, 10);
};

// ========== MAIN COMPONENT ==========
function CVFactoryContent() {
  const [activeTab, setActiveTab] = useState('upload');
  const [activeTemplate, setActiveTemplate] = useState('executive_velvet');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isGeneratingWord, setIsGeneratingWord] = useState(false);
  const [uploadedText, setUploadedText] = useState('');
  const [extractedSections, setExtractedSections] = useState<ExtractedSection[]>([]);
  
  const [cvData, setCvData] = useState<CvData>({
    personalInfo: {
      firstName: '',
      lastName: '',
      title: '',
      summary: '',
      photo: null
    },
    contact: {
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      portfolio: ''
    },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: []
  });

  const [editorMode, setEditorMode] = useState('visual');
  const [textEditorContent, setTextEditorContent] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    
    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        toast('PDF Detected', 'For PDF files, please copy and paste the text manually', 'destructive');
        setIsProcessing(false);
        return;
      } else if (file.type.includes('text') || file.name.endsWith('.txt')) {
        text = await readFileAsText(file);
      } else if (file.type.includes('msword') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
        try {
          text = await readFileAsText(file);
        } catch (error) {
          toast('File Format', 'For Word documents, please copy and paste the text manually', 'destructive');
          setIsProcessing(false);
          return;
        }
      } else {
        toast('Unsupported Format', 'Please upload TXT or copy/paste your CV text', 'destructive');
        setIsProcessing(false);
        return;
      }
      
      setUploadedText(text);
      setTextEditorContent(text);
      
      const contactInfo = TextExtractor.extractContactInfo(text);
      setCvData(prev => ({
        ...prev,
        contact: { ...prev.contact, ...contactInfo }
      }));
      
      const sections = TextExtractor.extractSections(text);
      setExtractedSections(sections);
      
      const summarySection = sections.find(s => s.type === 'summary');
      if (summarySection) {
        setCvData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, summary: summarySection.content }
        }));
      }
      
      toast('File Uploaded', `${sections.length} sections detected. Use extraction tools to parse.`);
      
      setActiveTab('editor');
      setEditorMode('text');
      
    } catch (error) {
      console.error('Error reading file:', error);
      toast('Upload Failed', 'Could not read the file. Try copying and pasting the text.', 'destructive');
    } finally {
      setIsProcessing(false);
    }
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) ?? '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const extractSection = (sectionType: string) => {
    if (!textEditorContent.trim()) {
      toast('No Content', 'Please paste or upload your CV text first', 'destructive');
      return;
    }
    
    const sections = TextExtractor.extractSections(textEditorContent);
    
    let targetContent = '';
    for (const section of sections) {
      if (section.type === sectionType) {
        targetContent = section.content;
        break;
      }
    }
    
    if (!targetContent && sectionType === 'summary') {
      const lines = textEditorContent.split('\n').slice(0, 10).join('\n');
      targetContent = lines;
    }
    
    if (!targetContent.trim()) {
      toast('No Content Found', `Could not find ${sectionType} section`, 'destructive');
      return;
    }
    
    switch (sectionType) {
      case 'summary':
        setCvData(prev => ({
          ...prev,
          personalInfo: { ...prev.personalInfo, summary: targetContent }
        }));
        break;
        
      case 'contact':
        const contactInfo = TextExtractor.extractContactInfo(targetContent);
        setCvData(prev => ({
          ...prev,
          contact: { ...prev.contact, ...contactInfo }
        }));
        break;
        
      case 'experience':
        const experiences = parseExperience(targetContent);
        if (experiences.length > 0) {
          setCvData(prev => ({
            ...prev,
            experience: experiences
          }));
        }
        break;
        
      case 'education':
        const educations = parseEducation(targetContent);
        if (educations.length > 0) {
          setCvData(prev => ({
            ...prev,
            education: educations
          }));
        }
        break;
        
      case 'skills':
        const skills = parseSkills(targetContent);
        if (skills.length > 0) {
          setCvData(prev => ({
            ...prev,
            skills: skills
          }));
        }
        break;
        
      case 'projects':
        const projects = parseProjects(targetContent);
        if (projects.length > 0) {
          setCvData(prev => ({
            ...prev,
            projects: projects
          }));
        }
        break;
        
      case 'certifications':
        const certLines = targetContent.split('\n')
          .filter(line => line.trim().length > 5)
          .map(line => line.replace(/^[•\-]\s*|\d+\.\s*/, '').trim());
        if (certLines.length > 0) {
          setCvData(prev => ({
            ...prev,
            certifications: certLines
          }));
        }
        break;
        
      case 'languages':
        const languageLines = targetContent.split('\n')
          .filter(line => line.trim().length > 2)
          .map(line => line.replace(/^[•\-]\s*/, '').trim());
        if (languageLines.length > 0) {
          setCvData(prev => ({
            ...prev,
            languages: languageLines
          }));
        }
        break;
    }
    
    const itemCount = targetContent.split('\n').filter(line => line.trim().length > 0).length;
    toast('Section Extracted', `${sectionType} section added with ${itemCount} items`);
  };

  const updatePersonalInfo = (field: keyof PersonalInfo, value: string) => {
    setCvData(prev => ({
      ...prev,
      personalInfo: { ...prev.personalInfo, [field]: value }
    }));
  };

  const updateContact = (field: keyof ContactInfo, value: string) => {
    setCvData(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value }
    }));
  };

  const updateExperience = (id: string, field: keyof Experience, value: string | boolean) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => 
        exp.id === id ? { ...exp, [field]: value } : exp
      )
    }));
  };

  const updateEducation = (id: string, field: keyof Education, value: string | boolean) => {
    setCvData(prev => ({
      ...prev,
      education: prev.education.map(edu => 
        edu.id === id ? { ...edu, [field]: value } : edu
      )
    }));
  };

  const updateSkill = (id: string, field: keyof Skill, value: string | number) => {
    setCvData(prev => ({
      ...prev,
      skills: prev.skills.map(skill => 
        skill.id === id ? { ...skill, [field]: value } : skill
      )
    }));
  };

  const updateProject = (id: string, field: keyof Project, value: string) => {
    setCvData(prev => ({
      ...prev,
      projects: prev.projects.map(project => 
        project.id === id ? { ...project, [field]: value } : project
      )
    }));
  };

  const addExperience = () => {
    setCvData(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: generateUniqueId(),
          company: '',
          position: '',
          startDate: '',
          endDate: '',
          current: false,
          description: ''
        }
      ]
    }));
  };

  const addEducation = () => {
    setCvData(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: generateUniqueId(),
          institution: '',
          degree: '',
          field: '',
          startDate: '',
          endDate: '',
          current: false,
          gpa: ''
        }
      ]
    }));
  };

  const addSkill = () => {
    setCvData(prev => ({
      ...prev,
      skills: [
        ...prev.skills,
        {
          id: generateUniqueId(),
          name: '',
          level: 75
        }
      ]
    }));
  };

  const addProject = () => {
    setCvData(prev => ({
      ...prev,
      projects: [
        ...prev.projects,
        {
          id: generateUniqueId(),
          name: '',
          description: ''
        }
      ]
    }));
  };

  const removeExperience = (id: string) => {
    setCvData(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  };

  const removeEducation = (id: string) => {
    setCvData(prev => ({
      ...prev,
      education: prev.education.filter(edu => edu.id !== id)
    }));
  };

  const removeSkill = (id: string) => {
    setCvData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill.id !== id)
    }));
  };

  const removeProject = (id: string) => {
    setCvData(prev => ({
      ...prev,
      projects: prev.projects.filter(project => project.id !== id)
    }));
  };

  const downloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;
      
      const element = printRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      let heightLeft = imgHeight;
      let position = 0;
      
      while (heightLeft > pageHeight) {
        position = heightLeft - pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `${cvData.personalInfo.firstName || 'CV'}_${cvData.personalInfo.lastName || 'Document'}.pdf`;
      pdf.save(fileName);
      
      toast('PDF Downloaded', 'Your elegant CV has been saved as high-quality PDF');
      
    } catch (error) {
      console.error('PDF generation error:', error);
      toast('PDF Generation Failed', 'Please try again', 'destructive');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const downloadWord = async () => {
    setIsGeneratingWord(true);
    try {
      const template = TEMPLATES[activeTemplate as keyof typeof TEMPLATES];
      
      const wordHTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${cvData.personalInfo.firstName} ${cvData.personalInfo.lastName} - CV</title>
<style>
  body {
    font-family: 'Calibri', Arial, sans-serif;
    margin: 40px;
    line-height: 1.6;
    color: #333;
  }
  h1 {
    color: ${template?.colors.primary || '#2C3E50'};
    font-size: 28px;
    margin-bottom: 5px;
    border-bottom: 3px solid ${template?.colors.secondary || '#00A79D'};
    padding-bottom: 10px;
  }
  h2 {
    color: ${template?.colors.secondary || '#00A79D'};
    font-size: 20px;
    margin-top: 25px;
    margin-bottom: 15px;
    border-bottom: 2px solid ${template?.colors.accent || '#F8F8F8'};
    padding-bottom: 5px;
  }
  .contact-info {
    margin-bottom: 25px;
    padding: 15px;
    background-color: #f8f9fa;
    border-radius: 5px;
  }
  .experience-item, .education-item {
    margin-bottom: 20px;
  }
  .company, .institution {
    font-weight: bold;
    color: ${template?.colors.secondary || '#00A79D'};
  }
  .date {
    color: #666;
    font-style: italic;
    font-size: 14px;
  }
  .summary {
    font-style: italic;
    color: #555;
    margin: 15px 0;
  }
</style>
</head>
<body>
  <div class="cv-container">
    <h1>${cvData.personalInfo.firstName || 'Your'} ${cvData.personalInfo.lastName || 'Name'}</h1>
    <h2>${cvData.personalInfo.title || 'Professional Title'}</h2>
    
    <div class="contact-info">
      ${cvData.contact.email ? `<div><strong>Email:</strong> ${cvData.contact.email}</div>` : ''}
      ${cvData.contact.phone ? `<div><strong>Phone:</strong> ${cvData.contact.phone}</div>` : ''}
      ${cvData.contact.location ? `<div><strong>Location:</strong> ${cvData.contact.location}</div>` : ''}
      ${cvData.contact.linkedin ? `<div><strong>LinkedIn:</strong> ${cvData.contact.linkedin}</div>` : ''}
    </div>
    
    ${cvData.personalInfo.summary ? `
      <div>
        <h2>Professional Summary</h2>
        <p class="summary">${cvData.personalInfo.summary}</p>
      </div>
    ` : ''}
    
    ${cvData.experience.length > 0 ? `
      <div>
        <h2>Professional Experience</h2>
        ${cvData.experience.map(exp => `
          <div class="experience-item">
            <h3>${exp.position}</h3>
            <p><span class="company">${exp.company}</span> | <span class="date">${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}</span></p>
            ${exp.description ? `<p>${exp.description}</p>` : ''}
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    ${cvData.education.length > 0 ? `
      <div>
        <h2>Education</h2>
        ${cvData.education.map(edu => `
          <div class="education-item">
            <h3>${edu.degree}</h3>
            <p><span class="institution">${edu.institution}</span> | <span class="date">${edu.startDate} - ${edu.current ? 'Present' : edu.endDate}</span></p>
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    ${cvData.skills.length > 0 ? `
      <div>
        <h2>Skills</h2>
        <p>${cvData.skills.map(skill => skill.name).join(', ')}</p>
      </div>
    ` : ''}
    
    <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; text-align: center;">
      <p>Generated with CV Factory • ${new Date().toLocaleDateString('en-GB')}</p>
    </div>
  </div>
</body>
</html>`;

      const blob = new Blob([wordHTML], { 
        type: 'application/msword'
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${cvData.personalInfo.firstName || 'CV'}_${cvData.personalInfo.lastName || 'Document'}.doc`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast('Word Document Downloaded', 'Your CV has been saved in Word format');
      
    } catch (error) {
      console.error('Word generation error:', error);
      toast('Word Generation Failed', 'Please try again', 'destructive');
    } finally {
      setIsGeneratingWord(false);
    }
  };

  const renderTemplate = () => {
    const templates = {
      executive_velvet: TemplateExecutiveVelvet,
      modern_silk: TemplateModernSilk,
      minimal_marble: TemplateExecutiveVelvet,
      creative_amethyst: TemplateModernSilk,
      professional_oak: TemplateExecutiveVelvet
    };
    
    const TemplateComponent = templates[activeTemplate as keyof typeof templates] || TemplateExecutiveVelvet;
    return <TemplateComponent cvData={cvData} />;
  };

  const renderTemplateCard = (template: typeof TEMPLATES[keyof typeof TEMPLATES]) => (
    <div
      key={template.id}
      className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 cursor-pointer group ${
        activeTemplate === template.id 
          ? 'border-brand-500 ring-2 ring-brand-500/20 scale-[1.02]' 
          : 'border-gray-200 hover:border-brand-300 hover:scale-[1.02]'
      }`}
      onClick={() => setActiveTemplate(template.id)}
    >
      <div className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl">{template.icon}</div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-500">{template.category}</p>
          </div>
          {activeTemplate === template.id && (
            <Badge className="bg-brand-500">Selected</Badge>
          )}
        </div>
        
        <div className="flex gap-2 mb-4">
          {Object.values(template.colors).map((color, i) => (
            <div
              key={i}
              className="w-8 h-8 rounded-lg border"
              style={{ backgroundColor: color as string }}
              title={color as string}
            />
          ))}
        </div>
        
        <p className="text-sm text-gray-600">{template.description}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50/30">
      {/* Navigation */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600">
                <Wand2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-brand-600 to-purple-600 bg-clip-text text-transparent">
                  CV Factory
                </h1>
                <p className="text-xs text-gray-600">Transform any CV into elegance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant={activeTab === 'upload' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('upload')}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload
              </Button>
              <Button
                variant={activeTab === 'editor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('editor')}
                className="gap-2"
              >
                <Edit3 className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant={activeTab === 'preview' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('preview')}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={downloadPDF}
                disabled={isGeneratingPDF}
                className="gap-2 bg-green-500 hover:bg-green-600"
              >
                {isGeneratingPDF ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    PDF
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadWord}
                disabled={isGeneratingWord}
                className="gap-2"
              >
                {isGeneratingWord ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    Word
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-2xl">
              <CardHeader className="bg-gradient-to-r from-brand-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Upload className="h-8 w-8" />
                  Upload Your CV
                </CardTitle>
                <CardDescription className="text-brand-100">
                  Upload any CV format and we&apos;ll help you transform it into an elegant masterpiece
                </CardDescription>
              </CardHeader>
              <CardContent className="p-12">
                <div className="text-center mb-8">
                  <div className="inline-flex flex-col items-center gap-4">
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-100 to-purple-100">
                      <FileUp className="h-16 w-16 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-900">Drop your CV here</h3>
                      <p className="text-gray-600">Supported formats: TXT, PDF, DOC, DOCX, RTF</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:border-brand-500 transition-colors">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept=".txt,.pdf,.doc,.docx,.rtf"
                      className="hidden"
                    />
                    
                    <div 
                      className="cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="flex flex-col items-center gap-4">
                        <UploadCloud className="h-12 w-12 text-gray-400" />
                        <div>
                          <p className="text-lg font-semibold text-gray-700">Click to browse files</p>
                          <p className="text-sm text-gray-500">or drag and drop</p>
                        </div>
                      </div>
                    </div>
                    
                    {isProcessing && (
                      <div className="mt-6">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-brand-500" />
                        <p className="mt-2 text-gray-600">Processing your file...</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl text-center">
                      <div className="text-2xl font-bold text-brand-600">1</div>
                      <div className="text-sm font-semibold text-gray-700">Upload</div>
                      <p className="text-xs text-gray-600 mt-1">Upload any CV file</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl text-center">
                      <div className="text-2xl font-bold text-purple-600">2</div>
                      <div className="text-sm font-semibold text-gray-700">Extract</div>
                      <p className="text-xs text-gray-600 mt-1">Manually extract sections</p>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl text-center">
                      <div className="text-2xl font-bold text-green-600">3</div>
                      <div className="text-sm font-semibold text-gray-700">Transform</div>
                      <p className="text-xs text-gray-600 mt-1">Apply elegant template</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Editor Tab */}
        {activeTab === 'editor' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Left Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-brand-500 to-brand-600 text-white">
                  <CardTitle className="text-lg">Extraction Tools</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Text Editor Mode</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={editorMode === 'text' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditorMode('text')}
                      >
                        <AlignLeft className="h-4 w-4 mr-2" />
                        Text
                      </Button>
                      <Button
                        variant={editorMode === 'visual' ? 'default' : 'outline'}
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditorMode('visual')}
                      >
                        <Layout className="h-4 w-4 mr-2" />
                        Visual
                      </Button>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Extract Sections</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {['summary', 'contact', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages'].map((section) => (
                        <Button
                          key={section}
                          variant="outline"
                          size="sm"
                          onClick={() => extractSection(section)}
                          className="capitalize"
                        >
                          {section}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Quick Actions</Label>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setActiveTab('preview')}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        setUploadedText('');
                        setTextEditorContent('');
                        setExtractedSections([]);
                        toast('Editor Cleared', 'Ready for new content');
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {extractedSections.length > 0 && (
                <Card className="border-0 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <CardTitle className="text-lg">Detected Sections</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {extractedSections.map((section, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => extractSection(section.type)}
                        >
                          <div className="flex items-center gap-3">
                            <Badge variant="outline" className="capitalize">
                              {section.type}
                            </Badge>
                            <span className="text-sm text-gray-600">
                              {Math.min(section.content.split('\n').length, 10)} items
                            </span>
                          </div>
                          <Button size="sm" variant="ghost">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-lg">Template Selection</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {Object.values(TEMPLATES).slice(0, 3).map(renderTemplateCard)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Editor */}
            <div className="lg:col-span-3 space-y-8">
              {editorMode === 'text' ? (
                <Card className="border-0 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-brand-50 to-cyan-50">
                    <CardTitle className="flex items-center gap-2">
                      <AlignLeft className="h-5 w-5" />
                      Text Editor
                    </CardTitle>
                    <CardDescription>
                      Paste your CV text here and use extraction tools to the left
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <Textarea
                      ref={textAreaRef}
                      value={textEditorContent}
                      onChange={(e) => setTextEditorContent(e.target.value)}
                      placeholder={`Example CV format:

JOHN DOE
Senior Software Engineer
john.doe@email.com | (123) 456-7890 | San Francisco, CA

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years in full-stack development...

WORK EXPERIENCE
Senior Software Engineer at Tech Corp (Jan 2020 - Present)
• Led team of 5 developers on major project
• Implemented microservices architecture improving performance by 40%
• Developed REST APIs used by 10,000+ users

EDUCATION
Bachelor of Science in Computer Science
Stanford University (2014 - 2018)
GPA: 3.8

SKILLS
JavaScript, React, Node.js, Python, AWS, Docker, PostgreSQL`}
                      className="min-h-[600px] font-mono text-sm"
                    />
                    
                    <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        <span>Use extraction tools to the left to parse sections</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card className="border-0 shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-brand-50 to-cyan-50">
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input
                            value={cvData.personalInfo.firstName}
                            onChange={(e) => updatePersonalInfo('firstName', e.target.value)}
                            placeholder="John"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input
                            value={cvData.personalInfo.lastName}
                            onChange={(e) => updatePersonalInfo('lastName', e.target.value)}
                            placeholder="Doe"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Professional Title</Label>
                        <Input
                          value={cvData.personalInfo.title}
                          onChange={(e) => updatePersonalInfo('title', e.target.value)}
                          placeholder="Senior Software Engineer"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Professional Summary</Label>
                        <Textarea
                          value={cvData.personalInfo.summary}
                          onChange={(e) => updatePersonalInfo('summary', e.target.value)}
                          placeholder="Describe your professional background..."
                          rows={4}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Contact Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={cvData.contact.email}
                            onChange={(e) => updateContact('email', e.target.value)}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone</Label>
                          <Input
                            value={cvData.contact.phone}
                            onChange={(e) => updateContact('phone', e.target.value)}
                            placeholder="+1 (555) 123-4567"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input
                            value={cvData.contact.location}
                            onChange={(e) => updateContact('location', e.target.value)}
                            placeholder="New York, NY"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>LinkedIn</Label>
                          <Input
                            value={cvData.contact.linkedin}
                            onChange={(e) => updateContact('linkedin', e.target.value)}
                            placeholder="linkedin.com/in/username"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl">
                    <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Briefcase className="h-5 w-5" />
                          Work Experience
                        </CardTitle>
                        <Button onClick={addExperience} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Experience
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                      {cvData.experience.map((exp, index) => (
                        <div key={exp.id} className="p-6 border border-gray-200 rounded-xl bg-white space-y-4">
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-gray-900">Experience #{index + 1}</h4>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExperience(exp.id)}
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Company</Label>
                              <Input
                                value={exp.company}
                                onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                placeholder="Company Name"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Position</Label>
                              <Input
                                value={exp.position}
                                onChange={(e) => updateExperience(exp.id, 'position', e.target.value)}
                                placeholder="Your Position"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Start Date</Label>
                              <Input
                                value={exp.startDate}
                                onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                placeholder="Jan 2020"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>End Date</Label>
                              <Input
                                value={exp.endDate}
                                onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                disabled={exp.current}
                                placeholder="Present"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Switch
                              checked={exp.current}
                              onCheckedChange={(checked) => updateExperience(exp.id, 'current', checked)}
                            />
                            <Label>Currently working here</Label>
                          </div>

                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                              value={exp.description}
                              onChange={(e) => updateExperience(exp.id, 'description', e.target.value)}
                              placeholder="Describe your responsibilities and achievements..."
                              rows={3}
                            />
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <GraduationCap className="h-5 w-5" />
                            Education
                          </CardTitle>
                          <Button onClick={addEducation} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        {cvData.education.map((edu, index) => (
                          <div key={edu.id} className="p-4 border border-gray-200 rounded-lg bg-white space-y-3">
                            <div className="flex justify-between items-start">
                              <h4 className="font-semibold text-gray-900">Education #{index + 1}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEducation(edu.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-3">
                              <Input
                                value={edu.institution}
                                onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                placeholder="University Name"
                              />
                              <Input
                                value={edu.degree}
                                onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                placeholder="Bachelor of Science"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                <Input
                                  value={edu.startDate}
                                  onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)}
                                  placeholder="2016"
                                />
                                <Input
                                  value={edu.endDate}
                                  onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)}
                                  placeholder="2020"
                                />
                              </div>
                              <Input
                                value={edu.gpa}
                                onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)}
                                placeholder="GPA: 3.8"
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl">
                      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="flex items-center gap-2">
                            <Award className="h-5 w-5" />
                            Skills
                          </CardTitle>
                          <Button onClick={addSkill} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Add
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 space-y-4">
                        {cvData.skills.map((skill, index) => (
                          <div key={skill.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-white">
                            <Input
                              value={skill.name}
                              onChange={(e) => updateSkill(skill.id, 'name', e.target.value)}
                              placeholder="Skill name"
                              className="flex-1"
                            />
                            <div className="flex items-center gap-3">
                              <Slider
                                value={[skill.level]}
                                onValueChange={([value]) => updateSkill(skill.id, 'level', value)}
                                max={100}
                                step={5}
                                className="w-24"
                              />
                              <span className="text-sm font-medium w-12">{skill.level}%</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeSkill(skill.id)}
                                className="text-red-500 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === 'preview' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Preview</h2>
                <p className="text-gray-600">See your transformed CV in elegant templates</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4">
                <Select value={activeTemplate} onValueChange={setActiveTemplate}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select template" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(TEMPLATES).map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.icon}</span>
                          <span>{template.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={downloadPDF}
                    disabled={isGeneratingPDF}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  >
                    {isGeneratingPDF ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    onClick={downloadWord}
                    disabled={isGeneratingWord}
                    className="bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white"
                  >
                    {isGeneratingWord ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Download Word
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Template Selection */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Object.values(TEMPLATES).map(renderTemplateCard)}
            </div>

            {/* CV Preview */}
            <div className="relative">
              <div ref={printRef} className="scale-90 origin-top">
                {renderTemplate()}
              </div>
              
              <div className="absolute top-4 right-4">
                <div className="flex items-center gap-2 text-sm text-gray-500 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full border border-gray-200">
                  <Sparkles className="h-4 w-4" />
                  Premium Template Preview
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CVFactory() {
  return <RequireAuth><CVFactoryContent /></RequireAuth>;
}
