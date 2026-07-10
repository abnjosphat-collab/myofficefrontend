// app/documents/page.tsx
'use client';

import { AppShell } from '@/components/app-shell';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Folder, FileText, Upload, Search, Trash2, X, HardDrive, Archive,
  Download, Eye, File, Filter, FolderPlus, Grid2X2, ListTree, MoreVertical,
  Star, ChevronRight, Loader2, FileSpreadsheet, Menu,
  Image as ImageIcon, Video, Music, Archive as ArchiveIcon, Building, Users,
  Target, HelpCircle, Settings, Zap, AlertTriangle, TrendingUp, FolderOpen,
  SortAsc, SortDesc, FilterX,
  Check, Edit3, Trash as TrashIcon,
  MessageSquare,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ViewToggle,
  FormField, FormActions, useCollapseSection, CenterModal, ProgressBar, ACCENT_HEX, GlowCard, SelectField,
} from '@/components/shared/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  description: string;
}

interface PathItem {
  name: string;
  id: string;
  type: 'category' | 'subfolder';
}

interface DocumentFile {
  id: string;
  name: string;
  original_name: string;
  type: string;
  categoryId: string;
  categoryName: string;
  folderId: string | null;
  folderPath: string;
  file_size: number;
  starred: boolean;
  description: string;
  created_at: string;
  updated_at: string;
  file_url: string;
  storage_path: string;
  mime_type: string;
}

interface PendingFile {
  file: File;
  name: string;
  description: string;
}

interface DeleteItem {
  name: string;
  id?: string;
  type?: string;
  categoryId?: string;
  folderId?: string | null;
  storage_path?: string;
}

interface RenameItem {
  name: string;
  id?: string;
  type?: string;
}

interface CustomSubfolders {
  [categoryName: string]: string[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

const BASE_CATEGORIES: Category[] = [
  { id: '1', name: 'Organizational Context', icon: Building, color: ACCENT_HEX.indigo, description: 'Internal/external issues, stakeholder requirements, AMS scope' },
  { id: '2', name: 'Leadership',             icon: Users,    color: ACCENT_HEX.blue,   description: 'Organizational structure, asset policy, RACI matrix' },
  { id: '3', name: 'Planning',               icon: Target,   color: '#34d399',         description: 'Risk management, objectives, AMPs, budgeting' },
  { id: '4', name: 'Support',                icon: HelpCircle, color: ACCENT_HEX.cyan, description: 'Resources, training, communication, documentation' },
  { id: '5', name: 'Operation',              icon: Settings, color: '#f59e0b',         description: 'Operational planning, change management, procurement' },
  { id: '6', name: 'Performance Evaluation', icon: TrendingUp, color: ACCENT_HEX.violet, description: 'Monitoring, audits, management review' },
  { id: '7', name: 'Improvement',            icon: Zap,      color: '#eab308',         description: 'Corrective actions, continual improvement' },
];

const DEFAULT_SUBFOLDERS: Record<string, string[]> = {
  'Organizational Context': ['Internal & External Issues', 'Stakeholder Requirements', 'AMS Scope & Boundaries', 'Asset Hierarchy & Data Governance'],
  'Leadership': ['Organizational Structure & Roles', 'Asset Management Policy', 'Responsibilities & Authorities (RACI)'],
  'Planning': ['Risk Management', 'AM Objectives & KPIs', 'Asset Management Plans (AMP)', 'Budget, Forecast & Demand Planning', 'Change Management'],
  'Support': ['Resource Management', 'Competence & Training', 'Awareness & Communication', 'Documented Information'],
  'Operation': ['Operational Planning & Control', 'Management of Change', 'Outsourcing & Procurement'],
  'Performance Evaluation': ['Monitoring & Measurement', 'Internal Audit', 'Management Review'],
  'Improvement': ['Nonconformity & Corrective Action', 'Continual Improvement'],
};

const FILE_TYPE_CATEGORIES = {
  all:         { label: 'All Files',    icon: FileText },
  document:    { label: 'Documents',   icon: FileText },
  spreadsheet: { label: 'Spreadsheets',icon: FileSpreadsheet },
  pdf:         { label: 'PDFs',        icon: FileText },
  image:       { label: 'Images',      icon: ImageIcon },
  video:       { label: 'Videos',      icon: Video },
  audio:       { label: 'Audio',       icon: Music },
  archive:     { label: 'Archives',    icon: ArchiveIcon },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFileExtension(filename: string): string {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  if (['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext)) return 'image';
  if (['mp4','avi','mov','wmv','mkv','webm'].includes(ext)) return 'video';
  if (['mp3','wav','ogg','m4a','flac'].includes(ext)) return 'audio';
  if (['doc','docx','txt','md','rtf'].includes(ext)) return 'document';
  if (['xls','xlsx','csv'].includes(ext)) return 'spreadsheet';
  if (ext === 'pdf') return 'pdf';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return 'archive';
  return 'file';
}

function fileIconFor(type: string | undefined): { icon: React.ElementType; color: string } {
  switch (type) {
    case 'pdf':         return { icon: FileText, color: '#f43f5e' };
    case 'document':    return { icon: FileText, color: ACCENT_HEX.blue };
    case 'spreadsheet': return { icon: FileSpreadsheet, color: '#34d399' };
    case 'image':       return { icon: ImageIcon, color: ACCENT_HEX.violet };
    case 'video':       return { icon: Video, color: '#f97316' };
    case 'audio':       return { icon: Music, color: '#ec4899' };
    case 'archive':     return { icon: ArchiveIcon, color: '#94a3b8' };
    default:            return { icon: File, color: '#94a3b8' };
  }
}

function formatFileSize(bytes: number | undefined): string {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fromDb(row: Record<string, unknown>): DocumentFile {
  return {
    id:            String(row.id),
    name:          String(row.name),
    original_name: String(row.original_name ?? row.name),
    type:          String(row.file_type  ?? 'file'),
    categoryId:    String(row.category_id ?? ''),
    categoryName:  String(row.category_name ?? ''),
    folderId:      row.folder_id ? String(row.folder_id) : null,
    folderPath:    String(row.folder_path ?? ''),
    file_size:     Number(row.file_size  ?? 0),
    starred:       Boolean(row.starred),
    description:   String(row.description ?? ''),
    created_at:    String(row.created_at),
    updated_at:    String(row.updated_at ?? row.created_at),
    file_url:      String(row.file_url   ?? ''),
    storage_path:  String(row.storage_path ?? ''),
    mime_type:     String(row.mime_type  ?? ''),
  };
}

// ─── FileActionsMenu ──────────────────────────────────────────────────────────

function FileActionsMenu({ doc, onPreview, onDownload, onRename, onDelete, onToggleStar }: {
  doc: DocumentFile;
  onPreview: (d: DocumentFile) => void;
  onDownload: (d: DocumentFile) => void;
  onRename: (d: RenameItem) => void;
  onDelete: (d: DeleteItem) => void;
  onToggleStar: (d: DocumentFile) => void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
        title="More actions">
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 top-8 ${t.glass} rounded-xl ${t.shadow} z-20 w-44 py-1 overflow-hidden`}>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onPreview(doc); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-colors`}><Eye className="h-3.5 w-3.5" />Preview</button>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onDownload(doc); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-colors`}><Download className="h-3.5 w-3.5" />Download</button>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onToggleStar(doc); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-colors`}>
              <Star className={`h-3.5 w-3.5 ${doc.starred ? 'fill-amber-400 text-amber-400' : ''}`} />{doc.starred ? 'Unstar' : 'Star'}</button>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onRename(doc); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-colors`}><Edit3 className="h-3.5 w-3.5" />Rename</button>
            <div className={`border-t ${t.border} my-1`} />
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onDelete(doc); }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 ${t.hoverBgSoft} transition-colors`}><TrashIcon className="h-3.5 w-3.5" />Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function DocumentsPageContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, searchFilters: true });

  const [viewMode,         setViewMode]         = useState<'grid' | 'table'>('grid');
  const [currentCategory,  setCurrentCategory]  = useState<Category | null>(null);
  const [currentFolder,    setCurrentFolder]    = useState<string | null>(null);
  const [customSubfolders, setCustomSubfolders] = useState<CustomSubfolders>({});
  const [documents,        setDocuments]        = useState<DocumentFile[]>([]);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [isLoading,        setIsLoading]        = useState(false);
  const [path,             setPath]             = useState<PathItem[]>([]);
  const [activeTab,        setActiveTab]        = useState<'all' | 'starred' | 'recent'>('all');
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false);
  const [selectedItems,    setSelectedItems]    = useState<Set<string>>(new Set());

  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [dateFilter,     setDateFilter]     = useState('all');
  const [sizeFilter,     setSizeFilter]     = useState('all');
  const [sortBy,         setSortBy]         = useState('date');
  const [sortOrder,      setSortOrder]      = useState<'asc' | 'desc'>('desc');
  const [showFilters,    setShowFilters]    = useState(false);

  const [isCreateFolderOpen,  setIsCreateFolderOpen]  = useState(false);
  const [isUploadOpen,        setIsUploadOpen]        = useState(false);
  const [isDeleteDialogOpen,  setIsDeleteDialogOpen]  = useState(false);
  const [isRenameDialogOpen,  setIsRenameDialogOpen]  = useState(false);
  const [itemToDelete,        setItemToDelete]        = useState<DeleteItem | null>(null);
  const [itemToRename,        setItemToRename]        = useState<RenameItem | null>(null);
  const [newName,             setNewName]             = useState('');
  const [newFolderName,       setNewFolderName]       = useState('');
  const [selectedFile,        setSelectedFile]        = useState<DocumentFile | null>(null);
  const [isFilePreviewOpen,   setIsFilePreviewOpen]   = useState(false);

  const [pendingFiles,  setPendingFiles]  = useState<PendingFile[]>([]);
  const [isUploading,   setIsUploading]   = useState(false);
  const [uploadProgress,setUploadProgress]= useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('ams_custom_subfolders');
    setCustomSubfolders(saved ? JSON.parse(saved) as CustomSubfolders : {});
  }, []);

  useEffect(() => {
    if (currentCategory) loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory, currentFolder]);

  async function loadFiles() {
    if (!currentCategory) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ category_id: currentCategory.id });
      if (currentFolder) params.set('folder_id', currentFolder);
      const r = await fetch(`${API}/api/documents?${params}`);
      if (!r.ok) throw new Error(await r.text());
      const data: Record<string, unknown>[] = await r.json();
      setDocuments(data.map(fromDb));
    } catch (e) {
      toast.error(`Failed to load files: ${e}`);
    } finally {
      setIsLoading(false);
    }
  }

  async function uploadFilesToApi() {
    if (!pendingFiles.length) { toast.error('No files selected'); return; }
    if (!currentCategory)     { toast.error('No category selected'); return; }
    setIsUploading(true);
    setUploadProgress(0);
    const folderPath = path.slice(1).map(p => p.name).join('/');
    let done = 0;
    const newDocs: DocumentFile[] = [];

    for (const pf of pendingFiles) {
      try {
        const fd = new FormData();
        fd.append('file',          pf.file);
        fd.append('name',          pf.name.trim() || pf.file.name);
        fd.append('description',   pf.description.trim());
        fd.append('category_id',   currentCategory.id);
        fd.append('category_name', currentCategory.name);
        fd.append('folder_id',     currentFolder ?? '');
        fd.append('folder_path',   folderPath);
        const r = await fetch(`${API}/api/documents/upload`, { method: 'POST', body: fd });
        if (!r.ok) throw new Error(await r.text());
        newDocs.push(fromDb(await r.json()));
      } catch (e) {
        toast.error(`Failed to upload "${pf.file.name}": ${e}`);
      }
      done++;
      setUploadProgress((done / pendingFiles.length) * 100);
    }

    if (newDocs.length) {
      setDocuments(prev => [...newDocs, ...prev]);
      toast.success(`Uploaded ${newDocs.length} of ${pendingFiles.length} file(s)`);
    }
    setPendingFiles([]);
    setIsUploadOpen(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsUploading(false);
  }

  async function deleteDoc(item: DeleteItem) {
    if (!item.id) return;
    try {
      const r = await fetch(`${API}/api/documents/${item.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error(await r.text());
      setDocuments(prev => prev.filter(d => d.id !== item.id));
      toast.success(`"${item.name}" deleted`);
    } catch (e) { toast.error(`Delete failed: ${e}`); }
  }

  async function updateDoc(id: string, updates: Partial<DocumentFile>) {
    try {
      const r = await fetch(`${API}/api/documents/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
      });
      if (!r.ok) throw new Error(await r.text());
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    } catch (e) { toast.error(`Update failed: ${e}`); }
  }

  function saveSubfolders(val: CustomSubfolders) {
    localStorage.setItem('ams_custom_subfolders', JSON.stringify(val));
    setCustomSubfolders(val);
  }

  function getAllSubfolders(): string[] {
    const def = DEFAULT_SUBFOLDERS[currentCategory?.name ?? ''] ?? [];
    const cus = customSubfolders[currentCategory?.name ?? ''] ?? [];
    return Array.from(new Set([...def, ...cus]));
  }

  function handleCategoryClick(cat: Category) {
    setCurrentCategory(cat);
    setCurrentFolder(null);
    setPath([{ name: cat.name, id: cat.id, type: 'category' }]);
    setFileTypeFilter('all'); setDateFilter('all'); setSizeFilter('all');
    setSearchQuery(''); setActiveTab('all');
  }

  function handleSubfolderClick(name: string) {
    setCurrentFolder(name);
    setPath(prev => [...prev, { name, id: name, type: 'subfolder' }]);
  }

  function handleBreadcrumbClick(index: number) {
    if (index === 0) { setCurrentFolder(null); setPath(p => p.slice(0, 1)); }
    else {
      const item = path[index];
      setCurrentFolder(item.id === 'root' ? null : item.id);
      setPath(p => p.slice(0, index + 1));
    }
  }

  function handleCreateSubfolder() {
    if (!newFolderName.trim() || !currentCategory) return;
    if (getAllSubfolders().includes(newFolderName)) { toast.error('Folder already exists'); return; }
    const existing = customSubfolders[currentCategory.name] ?? [];
    saveSubfolders({ ...customSubfolders, [currentCategory.name]: [...existing, newFolderName] });
    toast.success(`Folder "${newFolderName}" created`);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
  }

  function handleDeleteSubfolder() {
    if (!itemToDelete || !currentCategory) return;
    if (DEFAULT_SUBFOLDERS[currentCategory.name]?.includes(itemToDelete.name)) {
      toast.error('Cannot delete a default folder'); setItemToDelete(null); setIsDeleteDialogOpen(false); return;
    }
    const existing = customSubfolders[currentCategory.name] ?? [];
    saveSubfolders({ ...customSubfolders, [currentCategory.name]: existing.filter(s => s !== itemToDelete.name) });
    if (currentFolder === itemToDelete.name) { setCurrentFolder(null); setPath(p => p.slice(0, 1)); }
    toast.success(`Folder "${itemToDelete.name}" deleted`);
    setItemToDelete(null); setIsDeleteDialogOpen(false);
  }

  function handleRenameSubfolder() {
    if (!itemToRename || !newName.trim() || !currentCategory) return;
    if (DEFAULT_SUBFOLDERS[currentCategory.name]?.includes(itemToRename.name)) {
      toast.error('Cannot rename a default folder'); setIsRenameDialogOpen(false); setItemToRename(null); setNewName(''); return;
    }
    const existing = customSubfolders[currentCategory.name] ?? [];
    saveSubfolders({ ...customSubfolders, [currentCategory.name]: existing.map(s => s === itemToRename.name ? newName : s) });
    if (currentFolder === itemToRename.name) {
      setCurrentFolder(newName);
      setPath(p => p.map(x => x.id === itemToRename.name ? { ...x, name: newName, id: newName } : x));
    }
    toast.success(`Renamed to "${newName}"`);
    setIsRenameDialogOpen(false); setItemToRename(null); setNewName('');
  }

  function handleDownload(doc: DocumentFile | null) {
    if (!doc?.file_url) { toast.error('No download URL'); return; }
    const a = document.createElement('a');
    a.href = doc.file_url;
    a.download = doc.name;
    a.target = '_blank';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success(`Downloading ${doc.name}`);
  }

  function handlePreview(doc: DocumentFile) { setSelectedFile(doc); setIsFilePreviewOpen(true); }
  function handleDeleteClick(item: DeleteItem | null) { setItemToDelete(item); setIsDeleteDialogOpen(true); }

  async function handleDeleteConfirm() {
    if (!itemToDelete) return;
    if (itemToDelete.type === 'folder') { handleDeleteSubfolder(); return; }
    await deleteDoc(itemToDelete);
    setItemToDelete(null); setIsDeleteDialogOpen(false);
  }

  function handleRenameClick(item: RenameItem) { setItemToRename(item); setNewName(item.name); setIsRenameDialogOpen(true); }

  async function handleRenameConfirm() {
    if (!itemToRename || !newName.trim()) return;
    if (itemToRename.type === 'folder') { handleRenameSubfolder(); return; }
    await updateDoc(itemToRename.id ?? '', { name: newName });
    toast.success(`Renamed to "${newName}"`);
    setIsRenameDialogOpen(false); setItemToRename(null); setNewName('');
  }

  async function handleToggleStar(doc: DocumentFile) {
    await updateDoc(doc.id, { starred: !doc.starred });
    toast.success(!doc.starred ? 'Added to starred' : 'Removed from starred');
  }

  async function handleBulkDelete() {
    const targets = documents.filter(d => selectedItems.has(d.id));
    for (const tgt of targets) await deleteDoc(tgt);
    setSelectedItems(new Set());
  }

  function handleSelectAll() {
    if (selectedItems.size === filteredDocuments.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(filteredDocuments.map(d => d.id)));
  }

  function toggleSelectItem(id: string) {
    setSelectedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function clearAllFilters() { setSearchQuery(''); setFileTypeFilter('all'); setDateFilter('all'); setSizeFilter('all'); setActiveTab('all'); }
  const hasActiveFilters = searchQuery !== '' || fileTypeFilter !== 'all' || dateFilter !== 'all' || sizeFilter !== 'all' || activeTab !== 'all';

  const filteredDocuments = useMemo(() => {
    let result = [...documents];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
    }
    if (fileTypeFilter !== 'all') result = result.filter(d => d.type === fileTypeFilter);
    const now = new Date();
    if (dateFilter === 'today')  result = result.filter(d => new Date(d.created_at).toDateString() === now.toDateString());
    else if (dateFilter === 'week')  { const w = new Date(now); w.setDate(w.getDate() - 7);   result = result.filter(d => new Date(d.created_at) > w); }
    else if (dateFilter === 'month') { const m = new Date(now); m.setMonth(m.getMonth() - 1); result = result.filter(d => new Date(d.created_at) > m); }
    if (sizeFilter === 'small')  result = result.filter(d => d.file_size < 1024 * 1024);
    else if (sizeFilter === 'medium') result = result.filter(d => d.file_size >= 1024 * 1024 && d.file_size < 10 * 1024 * 1024);
    else if (sizeFilter === 'large')  result = result.filter(d => d.file_size >= 10 * 1024 * 1024);
    if (activeTab === 'starred') result = result.filter(d => d.starred);
    else if (activeTab === 'recent') { const s = new Date(); s.setDate(s.getDate() - 7); result = result.filter(d => new Date(d.updated_at) > s); }
    result.sort((a, b) => {
      let av: string | number | Date, bv: string | number | Date;
      switch (sortBy) {
        case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case 'size': av = a.file_size; bv = b.file_size; break;
        case 'type': av = a.type; bv = b.type; break;
        default:     av = new Date(a.created_at); bv = new Date(b.created_at);
      }
      return sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return result;
  }, [documents, searchQuery, fileTypeFilter, dateFilter, sizeFilter, activeTab, sortBy, sortOrder]);

  const stats = {
    totalFiles: documents.length,
    totalSize:  documents.reduce((s, d) => s + d.file_size, 0),
    starred:    documents.filter(d => d.starred).length,
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderHomeView = () => (
    <div className="space-y-6">
      <div className="text-center mb-2">
        <h2 className={`text-2xl font-bold ${t.textPrimary} mb-1`}>Asset Management System</h2>
        <p className={`text-sm ${t.textFaint}`}>ISO 55001 Compliant Document Management</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {BASE_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <GlowCard key={cat.id} onClick={() => handleCategoryClick(cat)} color={cat.color}
              surface={`${t.glass} rounded-2xl`} className="p-5 text-left group">
              <div className="p-2.5 rounded-xl mb-3 w-fit" style={{ background: `${cat.color}22` }}>
                <Icon className="h-5 w-5" style={{ color: cat.color }} />
              </div>
              <h3 className={`font-semibold mb-1 ${t.textPrimary} group-hover:text-blue-400 transition-colors`}>{cat.name}</h3>
              <p className={`text-xs line-clamp-2 ${t.textFaint}`}>{cat.description}</p>
            </GlowCard>
          );
        })}
      </div>
    </div>
  );

  const renderCategoryView = () => {
    const all = getAllSubfolders();
    const defaults = DEFAULT_SUBFOLDERS[currentCategory?.name ?? ''] ?? [];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className={`text-xl font-bold ${t.textPrimary}`}>{currentCategory?.name}</h2>
            <p className={`text-xs ${t.textFaint}`}>{currentCategory?.description}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsCreateFolderOpen(true)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.textMuted} ${t.glassSoft} ${t.hoverText} transition-colors`}>
              <FolderPlus className="h-3.5 w-3.5" /> New Folder
            </button>
            <button type="button" onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all">
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
          </div>
        </div>
        {all.length === 0 ? (
          <div className={`${t.glass} rounded-2xl p-12 text-center`}>
            <FolderOpen className={`h-12 w-12 mx-auto ${t.textFaint} mb-4`} />
            <h3 className={`text-lg font-semibold ${t.textPrimary} mb-2`}>No folders yet</h3>
            <p className={`text-sm mb-4 ${t.textFaint}`}>Create your first folder to start organising documents</p>
            <button type="button" onClick={() => setIsCreateFolderOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all">
              <FolderPlus className="h-3.5 w-3.5" /> Create Folder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {all.map(name => {
              const isDefault = defaults.includes(name);
              return (
                <GlowCard key={name} onClick={() => handleSubfolderClick(name)} color={ACCENT_HEX.blue}
                  surface={`${t.glass} rounded-2xl`} className="p-4 group flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-blue-500/15 shrink-0">
                      <Folder className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className={`font-medium text-sm truncate ${t.textPrimary}`}>{name}</span>
                  </div>
                  {!isDefault && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
                      <button type="button" title="Rename" className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}
                        onClick={() => { setItemToRename({ name, type: 'folder' }); setNewName(name); setIsRenameDialogOpen(true); }}>
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button type="button" title="Delete" className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} text-rose-500 hover:text-rose-400 transition-colors`}
                        onClick={() => { setItemToDelete({ name, type: 'folder' }); setIsDeleteDialogOpen(true); }}>
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${t.textFaint}`} />
                </GlowCard>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredDocuments.map(doc => {
        const fi = fileIconFor(doc.type);
        return (
          <GlowCard key={doc.id} onClick={() => handlePreview(doc)} color={fi.color}
            surface={`${t.glass} rounded-2xl`}
            className="p-4 group">
            <div className="flex items-start justify-between mb-3 gap-2 min-w-0">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <input type="checkbox" checked={selectedItems.has(doc.id)} onChange={() => toggleSelectItem(doc.id)}
                  onClick={e => e.stopPropagation()} title={`Select ${doc.name}`} className="mt-0.5 accent-blue-500 h-3.5 w-3.5 shrink-0" />
                <fi.icon className="h-5 w-5 shrink-0" style={{ color: fi.color }} />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold truncate ${t.textPrimary}`}>{doc.name}</p>
                  <p className={`text-xs ${t.textFaint}`}>{formatFileSize(doc.file_size)}</p>
                </div>
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button type="button" onClick={() => handleToggleStar(doc)} title={doc.starred ? 'Unstar' : 'Star'}
                  className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} transition-colors`}>
                  <Star className={`h-3.5 w-3.5 ${doc.starred ? 'fill-amber-400 text-amber-400' : t.textFaint}`} />
                </button>
                <FileActionsMenu doc={doc} onPreview={handlePreview} onDownload={handleDownload} onRename={handleRenameClick} onDelete={handleDeleteClick} onToggleStar={handleToggleStar} />
              </div>
            </div>
            {doc.description && (
              <p className={`text-[11px] mb-2 line-clamp-2 flex items-start gap-1 ${t.textFaint}`}>
                <MessageSquare className="h-2.5 w-2.5 shrink-0 mt-0.5" />{doc.description}
              </p>
            )}
            <div className="flex items-center justify-between">
              <span className={`text-xs ${t.textFaint}`}>{formatDateTime(doc.created_at)}</span>
              <StatusBadge color={fi.color} label={doc.type.toUpperCase()} />
            </div>
          </GlowCard>
        );
      })}
    </div>
  );

  const renderTableView = () => (
    <div className={`${t.glass} rounded-2xl overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b ${t.border}`}>
            <th className="w-10 p-3"><input type="checkbox" title="Select all" checked={selectedItems.size === filteredDocuments.length && filteredDocuments.length > 0} onChange={handleSelectAll} className="accent-blue-500" /></th>
            <th className="w-10 p-3"><span className="sr-only">File type icon</span></th>
            <th className={`text-left p-3 font-medium cursor-pointer ${t.textSecondary} ${t.hoverText}`} onClick={() => { setSortBy('name'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
              Name {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc className="inline h-3 w-3 ml-1" /> : <SortDesc className="inline h-3 w-3 ml-1" />)}
            </th>
            <th className={`text-left p-3 font-medium ${t.textSecondary}`}>Comments</th>
            <th className={`text-left p-3 font-medium cursor-pointer ${t.textSecondary} ${t.hoverText}`} onClick={() => { setSortBy('type'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>Type</th>
            <th className={`text-left p-3 font-medium cursor-pointer ${t.textSecondary} ${t.hoverText}`} onClick={() => { setSortBy('size'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>Size</th>
            <th className={`text-left p-3 font-medium cursor-pointer ${t.textSecondary} ${t.hoverText}`} onClick={() => { setSortBy('date'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>Uploaded</th>
            <th className="w-20 p-3"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map(doc => {
            const fi = fileIconFor(doc.type);
            return (
              <tr key={doc.id} className={`border-b ${t.border} ${t.hoverBgSoft} cursor-pointer group`} onClick={() => handlePreview(doc)}>
                <td className="p-3" onClick={e => e.stopPropagation()}><input type="checkbox" title={`Select ${doc.name}`} checked={selectedItems.has(doc.id)} onChange={() => toggleSelectItem(doc.id)} className="accent-blue-500" /></td>
                <td className="p-3"><fi.icon className="h-4 w-4" style={{ color: fi.color }} /></td>
                <td className={`p-3 font-medium ${t.textPrimary}`}>
                  <div className="flex items-center gap-2">{doc.name}{doc.starred && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}</div>
                  {doc.original_name && doc.original_name !== doc.name && <p className={`text-[11px] ${t.textFaint}`}>{doc.original_name}</p>}
                </td>
                <td className={`p-3 text-xs max-w-[160px] ${t.textFaint}`}><p className="truncate">{doc.description || '—'}</p></td>
                <td className="p-3"><StatusBadge color={fi.color} label={doc.type.toUpperCase()} /></td>
                <td className={`p-3 ${t.textMuted}`}>{formatFileSize(doc.file_size)}</td>
                <td className={`p-3 text-xs whitespace-nowrap ${t.textMuted}`}>{formatDateTime(doc.created_at)}</td>
                <td className="p-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => handleToggleStar(doc)} title={doc.starred ? 'Unstar' : 'Star'} className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} transition-colors`}>
                      <Star className={`h-3 w-3 ${doc.starred ? 'fill-amber-400 text-amber-400' : t.textFaint}`} />
                    </button>
                    <FileActionsMenu doc={doc} onPreview={handlePreview} onDownload={handleDownload} onRename={handleRenameClick} onDelete={handleDeleteClick} onToggleStar={handleToggleStar} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderSubfolderView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className={`text-xl font-bold ${t.textPrimary}`}>{path[path.length - 1]?.name}</h2>
          <p className={`text-xs ${t.textFaint}`}>in {currentCategory?.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedItems.size > 0 && (
            <button type="button" onClick={handleBulkDelete}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all">
              <TrashIcon className="h-3.5 w-3.5" /> Delete ({selectedItems.size})
            </button>
          )}
          <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: Grid2X2, label: 'Grid view' }, { value: 'table', icon: ListTree, label: 'Table view' }]} />
          <button type="button" onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all">
            <Upload className="h-3.5 w-3.5" /> Upload
          </button>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-4`}>
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Search name or comments…" className="flex-1 min-w-[200px]" />
          <div className={`flex ${t.glassSoft} rounded-lg p-0.5`}>
            {(['all', 'starred', 'recent'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                className={`h-7 px-3 text-xs rounded-md transition-colors capitalize font-medium ${activeTab === tab ? 'bg-blue-500/20 text-blue-400' : `${t.textFaint} ${t.hoverText}`}`}>
                {tab}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors ${showFilters ? 'bg-blue-500/15 text-blue-400' : `${t.textMuted} ${t.glassSoft} ${t.hoverText}`}`}>
            <Filter className="h-3.5 w-3.5" /> Filters {hasActiveFilters && <span className={`ml-1 px-1.5 py-0.5 ${t.chipBg} rounded text-[10px]`}>!</span>}
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={clearAllFilters} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors`}>
              <FilterX className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
        {showFilters && (
          <div className={`pt-3 border-t ${t.border} grid grid-cols-1 md:grid-cols-4 gap-3`}>
            <FormField label="File Type">
              <SelectField size="filter" title="File type" value={fileTypeFilter} onChange={setFileTypeFilter}
                options={Object.entries(FILE_TYPE_CATEGORIES).map(([k, { label }]) => ({ value: k, label }))} />
            </FormField>
            <FormField label="Date Range">
              <SelectField size="filter" title="Date range" value={dateFilter} onChange={setDateFilter}
                options={[{ value: 'all', label: 'All time' }, { value: 'today', label: 'Today' }, { value: 'week', label: 'Last 7 days' }, { value: 'month', label: 'Last 30 days' }]} />
            </FormField>
            <FormField label="File Size">
              <SelectField size="filter" title="File size" value={sizeFilter} onChange={setSizeFilter}
                options={[{ value: 'all', label: 'Any size' }, { value: 'small', label: 'Small (<1MB)' }, { value: 'medium', label: 'Medium (1–10MB)' }, { value: 'large', label: 'Large (>10MB)' }]} />
            </FormField>
            <FormField label="Sort By">
              <div className="flex gap-2">
                <SelectField size="filter" title="Sort by" value={sortBy} onChange={setSortBy} className="flex-1"
                  options={[{ value: 'name', label: 'Name' }, { value: 'date', label: 'Date' }, { value: 'size', label: 'Size' }, { value: 'type', label: 'Type' }]} />
                <button type="button" onClick={() => setSortOrder(v => v === 'asc' ? 'desc' : 'asc')} title={sortOrder}
                  className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
                  {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        <StatTile icon={FileText} color={ACCENT_HEX.violet} value={stats.totalFiles} label="Total Files" />
        <StatTile icon={HardDrive} color={ACCENT_HEX.blue} value={formatFileSize(stats.totalSize)} label="Storage Used" />
        <StatTile icon={Star} color={ACCENT_HEX.amber} value={stats.starred} label="Starred" onClick={() => setActiveTab('starred')} />
      </div>

      <p className={`text-sm ${t.textFaint}`}>Found <span className={`font-semibold ${t.textPrimary}`}>{filteredDocuments.length}</span> files</p>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className={`${t.glass} rounded-2xl h-24 animate-pulse`} />)}</div>
      ) : filteredDocuments.length === 0 ? (
        <div className={`${t.glass} rounded-2xl p-12 text-center`}>
          <Archive className={`h-12 w-12 mx-auto ${t.textFaint} mb-4`} />
          <h3 className={`text-lg font-semibold ${t.textPrimary} mb-2`}>No files found</h3>
          <p className={`text-sm mb-4 ${t.textFaint}`}>{hasActiveFilters ? 'Try adjusting your search or filters' : 'Upload your first document'}</p>
          {!hasActiveFilters && (
            <button type="button" onClick={() => setIsUploadOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all">
              <Upload className="h-3.5 w-3.5" /> Upload Files
            </button>
          )}
          {hasActiveFilters && (
            <button type="button" onClick={clearAllFilters} className={`inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-medium ${t.textMuted} ${t.glassSoft} ${t.hoverText} transition-all`}>
              <FilterX className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? renderGridView() : renderTableView()}
    </div>
  );

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Folder}
        accent="violet"
        crumbs={['Core Management', 'Documents']}
        title="AMS Document Hub"
        description="ISO 55001 compliant document management"
        statsOpen={sections.expanded.hero}
        actions={
          <button type="button" className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white/10" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} title="Menu">
            <Menu className="h-4 w-4" />
          </button>
        }
      >
        <div className="flex flex-wrap gap-1">
          <StatTile icon={FileText} color={ACCENT_HEX.violet} value={stats.totalFiles} label="Total Files" />
          <StatTile icon={HardDrive} color={ACCENT_HEX.blue} value={formatFileSize(stats.totalSize)} label="Storage Used" />
          <StatTile icon={Star} color={ACCENT_HEX.amber} value={stats.starred} label="Starred" />
        </div>
      </PageHero>

      {mobileMenuOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
          <div className={`fixed left-0 top-0 h-full w-64 ${t.glass} z-50 ${t.shadow} p-4`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`font-semibold ${t.textPrimary}`}>Categories</h2>
              <button type="button" onClick={() => setMobileMenuOpen(false)} title="Close" className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint}`}><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-1">
              {BASE_CATEGORIES.map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.id} type="button"
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${t.textMuted} ${t.hoverBg} ${t.hoverText}`}
                    onClick={() => { handleCategoryClick(cat); setMobileMenuOpen(false); }}>
                    <Icon className="h-4 w-4" /> {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {path.length > 0 && currentCategory && (
        <nav className="flex items-center gap-1.5 text-sm flex-wrap">
          <button type="button" onClick={() => { setCurrentCategory(null); setCurrentFolder(null); setPath([]); }}
            className={`${t.textFaint} ${t.hoverText} transition-colors`}>Home</button>
          <ChevronRight className={`h-3.5 w-3.5 ${t.textFaint}`} />
          <button type="button" onClick={() => { setCurrentFolder(null); setPath(p => p.slice(0, 1)); }}
            className={`transition-colors ${path.length === 1 ? `font-medium ${t.textPrimary}` : `${t.textFaint} ${t.hoverText}`}`}>
            {currentCategory.name}
          </button>
          {path.slice(1).map((item, i) => (
            <React.Fragment key={item.id}>
              <ChevronRight className={`h-3.5 w-3.5 ${t.textFaint}`} />
              {i === path.slice(1).length - 1
                ? <span className={`font-medium ${t.textPrimary}`}>{item.name}</span>
                : <button type="button" onClick={() => handleBreadcrumbClick(i + 1)} className={`${t.textFaint} ${t.hoverText} transition-colors`}>{item.name}</button>}
            </React.Fragment>
          ))}
        </nav>
      )}

      {!currentCategory ? renderHomeView() : !currentFolder ? renderCategoryView() : renderSubfolderView()}

      {/* Create Folder Modal */}
      <CenterModal open={isCreateFolderOpen} onClose={() => setIsCreateFolderOpen(false)} title="Create New Folder" accent="violet" width="max-w-sm">
        <form className="p-5 space-y-4" onSubmit={e => { e.preventDefault(); handleCreateSubfolder(); }}>
          <FormField label="Folder Name">
            <input autoFocus value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter folder name" className={`w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`} />
          </FormField>
          <FormActions onCancel={() => setIsCreateFolderOpen(false)} submitLabel="Create" accent="violet" />
        </form>
      </CenterModal>

      {/* Upload Modal */}
      <CenterModal open={isUploadOpen} onClose={() => { setIsUploadOpen(false); setPendingFiles([]); }} title="Upload Files" accent="violet" width="max-w-2xl">
        <form className="p-5 space-y-4" onSubmit={e => { e.preventDefault(); uploadFilesToApi(); }}>
          <div className={`border-2 border-dashed ${t.border} rounded-xl p-6 text-center cursor-pointer hover:border-blue-400/40 transition-all`}
            onClick={() => fileInputRef.current?.click()}>
            <Upload className={`h-8 w-8 mx-auto ${t.textFaint} mb-2`} />
            <p className={`text-sm mb-2 ${t.textFaint}`}>Click to browse or drag and drop files</p>
            <span className={`inline-flex h-8 px-3 items-center rounded-lg text-[13px] font-medium ${t.textMuted} ${t.glassSoft}`}>Browse Files</span>
            <input ref={fileInputRef} type="file" multiple className="hidden" title="Choose files"
              onChange={e => {
                const added: PendingFile[] = Array.from(e.target.files ?? []).map(f => ({ file: f, name: f.name, description: '' }));
                setPendingFiles(prev => [...prev, ...added]);
                e.target.value = '';
              }} />
          </div>

          {pendingFiles.length > 0 && (
            <div className="space-y-3">
              <p className={`text-xs font-medium ${t.textFaint}`}>{pendingFiles.length} file(s) selected — set a display name and optional comment for each</p>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {pendingFiles.map((pf, i) => {
                  const fi = fileIconFor(getFileExtension(pf.file.name));
                  return (
                    <div key={i} className={`p-3 rounded-xl ${t.chipBg} space-y-2`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <fi.icon className="h-4 w-4 shrink-0" style={{ color: fi.color }} />
                          <span className={`text-[11px] truncate ${t.textFaint}`}>{pf.file.name}</span>
                          <span className={`text-[11px] shrink-0 ${t.textFaint}`}>{formatFileSize(pf.file.size)}</span>
                        </div>
                        <button type="button" title="Remove file" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                          className={`h-5 w-5 flex items-center justify-center rounded ${t.textFaint} hover:text-rose-500 transition-all shrink-0`}>
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <input
                        type="text" value={pf.name}
                        aria-label={`Display name for ${pf.file.name}`}
                        onChange={e => setPendingFiles(prev => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))}
                        placeholder="Display name (leave blank to use filename)"
                        className={`w-full h-8 px-3 rounded-lg text-xs ${t.inputBg} focus:outline-none`}
                      />
                      <textarea
                        value={pf.description}
                        aria-label={`Comment for ${pf.file.name}`}
                        onChange={e => setPendingFiles(prev => prev.map((p, j) => j === i ? { ...p, description: e.target.value } : p))}
                        placeholder="Comment or notes about this document (optional)"
                        rows={2}
                        className={`w-full px-3 py-1.5 rounded-lg text-xs ${t.inputBg} focus:outline-none resize-none`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isUploading && <ProgressBar value={uploadProgress} color={ACCENT_HEX.blue} label="Uploading" />}

          <FormActions
            onCancel={() => { setIsUploadOpen(false); setPendingFiles([]); }}
            submitting={isUploading}
            submitLabel={`Upload ${pendingFiles.length > 0 ? `${pendingFiles.length} file(s)` : ''}`}
            accent="violet"
          />
        </form>
      </CenterModal>

      {/* Rename Modal */}
      <CenterModal open={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)} title={`Rename ${itemToRename?.type === 'folder' ? 'Folder' : 'File'}`} accent="violet" width="max-w-sm">
        <form className="p-5 space-y-4" onSubmit={e => { e.preventDefault(); handleRenameConfirm(); }}>
          <FormField label="New name">
            <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} placeholder="Enter new name" className={`w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`} />
          </FormField>
          <FormActions onCancel={() => setIsRenameDialogOpen(false)} submitLabel="Rename" accent="violet" />
        </form>
      </CenterModal>

      {/* File Preview Modal */}
      <CenterModal open={isFilePreviewOpen} onClose={() => setIsFilePreviewOpen(false)} title={selectedFile?.name ?? ''} subtitle="File preview" accent="violet" width="max-w-2xl">
        <div className="p-5 space-y-4">
          <div className={`min-h-[200px] flex items-center justify-center ${t.chipBg} rounded-xl p-4`}>
            {selectedFile?.type === 'image' && selectedFile.file_url
              ? <img src={selectedFile.file_url} alt={selectedFile.name} className="max-w-full max-h-[400px] object-contain rounded" />
              : selectedFile?.type === 'pdf' && selectedFile.file_url
              ? <iframe src={selectedFile.file_url} className="w-full h-[400px] rounded" title={selectedFile.name} />
              : (() => { const fi = fileIconFor(selectedFile?.type); return (
                  <div className="text-center">
                    <fi.icon className="h-10 w-10 mx-auto" style={{ color: fi.color }} />
                    <p className={`mt-2 text-sm ${t.textFaint}`}>Preview not available — click Download to open</p>
                  </div>
                ); })()}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Display name', value: selectedFile?.name },
              { label: 'Original file', value: selectedFile?.original_name },
              { label: 'Size', value: formatFileSize(selectedFile?.file_size) },
              { label: 'Type', value: selectedFile?.type?.toUpperCase() },
              { label: 'Uploaded', value: formatDateTime(selectedFile?.created_at) },
              { label: 'Location', value: selectedFile?.folderPath || currentCategory?.name },
            ].map(({ label, value }) => (
              <div key={label} className={`${t.chipBg} rounded-lg p-2`}>
                <p className={`mb-0.5 ${t.textFaint}`}>{label}</p>
                <p className={`font-medium truncate ${t.textPrimary}`}>{value}</p>
              </div>
            ))}
          </div>
          {selectedFile?.description && (
            <div className={`${t.chipBg} rounded-lg p-3`}>
              <p className={`text-xs mb-1 flex items-center gap-1 ${t.textFaint}`}><MessageSquare className="h-3 w-3" /> Comments</p>
              <p className={`text-sm ${t.textMuted}`}>{selectedFile.description}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => handleDownload(selectedFile)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium ${t.textMuted} ${t.glassSoft} ${t.hoverText} transition-all inline-flex items-center justify-center gap-2`}>
              <Download className="h-4 w-4" /> Download
            </button>
            <button type="button" onClick={() => { handleDeleteClick(selectedFile ? { ...selectedFile } : null); setIsFilePreviewOpen(false); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all inline-flex items-center justify-center gap-2">
              <TrashIcon className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </CenterModal>

      {/* Delete Modal */}
      <CenterModal open={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} title={`Delete ${itemToDelete?.type === 'folder' ? 'Folder' : 'File'}?`} accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
            <p className={`text-sm ${t.textMuted}`}>
              {itemToDelete?.type === 'folder'
                ? `Permanently delete folder "${itemToDelete?.name}" and all files inside it?`
                : `Permanently delete "${itemToDelete?.name}"? The file will be removed from storage.`}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setIsDeleteDialogOpen(false)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Cancel</button>
            <button type="button" onClick={handleDeleteConfirm}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all inline-flex items-center justify-center gap-2">
              <TrashIcon className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </CenterModal>

      <Toaster richColors />
    </main>
  );
}

export default function DocumentsPage() {
  return (
    <AppShell>
      <DocumentsPageContent />
    </AppShell>
  );
}
