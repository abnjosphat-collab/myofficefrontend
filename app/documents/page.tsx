// app/documents/page.tsx
'use client';

import { PageShell } from '@/components/PageShell';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Folder, FileText, Upload, Search, Trash2, Edit, X, HardDrive, Archive,
  Download, Eye, File, Filter, FolderPlus, Grid2X2, ListTree, MoreVertical,
  Share2, Star, ChevronRight, Loader2, RefreshCw, FileSpreadsheet, Menu,
  Image as ImageIcon, Video, Music, Archive as ArchiveIcon, Building, Users,
  Target, HelpCircle, Settings, Zap, AlertTriangle, TrendingUp, FolderOpen,
  Calendar, Briefcase, BarChart3, SortAsc, SortDesc, Tag, FilterX, Layers,
  Plus, Check, Maximize2, History, Edit3, Trash as TrashIcon, FolderTree,
  MessageSquare,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  GlassPanel, GlassButton, GlassBadge, GlassInput, GlassSelect, GlassModal, GlassProgress,
  usePageCollapse, MasterCollapseButton,
} from '@/components/shared';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
}

interface PathItem {
  name: string;
  id: string;
  type: 'category' | 'subfolder';
}

interface DocumentFile {
  id: string;
  name: string;            // display name (user-editable)
  original_name: string;
  type: string;
  categoryId: string;
  categoryName: string;
  folderId: string | null;
  folderPath: string;
  file_size: number;
  starred: boolean;
  description: string;    // comments
  created_at: string;
  updated_at: string;
  file_url: string;
  storage_path: string;
  mime_type: string;
}

interface PendingFile {
  file: File;
  name: string;           // editable display name
  description: string;    // comment
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
  { id: '1', name: 'Organizational Context', icon: Building, color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', description: 'Internal/external issues, stakeholder requirements, AMS scope' },
  { id: '2', name: 'Leadership',             icon: Users,    color: 'from-blue-500 to-blue-600',   bgColor: 'bg-blue-50',   textColor: 'text-blue-700',   description: 'Organizational structure, asset policy, RACI matrix' },
  { id: '3', name: 'Planning',               icon: Target,   color: 'from-green-500 to-green-600', bgColor: 'bg-green-50',  textColor: 'text-green-700',  description: 'Risk management, objectives, AMPs, budgeting' },
  { id: '4', name: 'Support',                icon: HelpCircle, color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-50',   textColor: 'text-cyan-700',   description: 'Resources, training, communication, documentation' },
  { id: '5', name: 'Operation',              icon: Settings, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-700', description: 'Operational planning, change management, procurement' },
  { id: '6', name: 'Performance Evaluation', icon: TrendingUp, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-700', description: 'Monitoring, audits, management review' },
  { id: '7', name: 'Improvement',            icon: Zap,      color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', description: 'Corrective actions, continual improvement' },
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

function getFileIcon(type: string | undefined): React.ReactElement {
  switch (type) {
    case 'pdf':         return <FileText     className="h-5 w-5 text-red-400" />;
    case 'document':    return <FileText     className="h-5 w-5 text-blue-400" />;
    case 'spreadsheet': return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    case 'image':       return <ImageIcon    className="h-5 w-5 text-purple-400" />;
    case 'video':       return <Video        className="h-5 w-5 text-orange-400" />;
    case 'audio':       return <Music        className="h-5 w-5 text-pink-400" />;
    case 'archive':     return <ArchiveIcon  className="h-5 w-5 text-white/50" />;
    default:            return <File         className="h-5 w-5 text-white/40" />;
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
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
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
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
        title="More actions">
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 oz-glass-dark rounded-xl shadow-xl z-20 w-44 py-1 border border-white/10">
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onPreview(doc); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"><Eye className="h-3.5 w-3.5" />Preview</button>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onDownload(doc); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"><Download className="h-3.5 w-3.5" />Download</button>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onToggleStar(doc); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <Star className={`h-3.5 w-3.5 ${doc.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />{doc.starred ? 'Unstar' : 'Star'}</button>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onRename(doc); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"><Edit3 className="h-3.5 w-3.5" />Rename</button>
            <div className="border-t border-white/10 my-1" />
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onDelete(doc); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors"><TrashIcon className="h-3.5 w-3.5" />Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const sections = usePageCollapse({ searchFilters: false });

  const [viewMode,         setViewMode]         = useState('grid');
  const [currentCategory,  setCurrentCategory]  = useState<Category | null>(null);
  const [currentFolder,    setCurrentFolder]    = useState<string | null>(null);
  const [customSubfolders, setCustomSubfolders] = useState<CustomSubfolders>({});
  const [documents,        setDocuments]        = useState<DocumentFile[]>([]);
  const [searchQuery,      setSearchQuery]      = useState('');
  const [isLoading,        setIsLoading]        = useState(false);
  const [path,             setPath]             = useState<PathItem[]>([]);
  const [activeTab,        setActiveTab]        = useState('all');
  const [mobileMenuOpen,   setMobileMenuOpen]   = useState(false);
  const [selectedItems,    setSelectedItems]    = useState<Set<string>>(new Set());

  const [fileTypeFilter, setFileTypeFilter] = useState('all');
  const [dateFilter,     setDateFilter]     = useState('all');
  const [sizeFilter,     setSizeFilter]     = useState('all');
  const [sortBy,         setSortBy]         = useState('date');
  const [sortOrder,      setSortOrder]      = useState('desc');
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

  // Per-file pending state for upload modal
  const [pendingFiles,  setPendingFiles]  = useState<PendingFile[]>([]);
  const [isUploading,   setIsUploading]   = useState(false);
  const [uploadProgress,setUploadProgress]= useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem('ams_custom_subfolders');
    setCustomSubfolders(saved ? JSON.parse(saved) as CustomSubfolders : {});
    const first = BASE_CATEGORIES[0];
    setCurrentCategory(first);
    setPath([{ name: first.name, id: first.id, type: 'category' }]);
  }, []);

  useEffect(() => {
    if (currentCategory) loadFiles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory, currentFolder]);

  // ── API calls (all go through FastAPI backend) ────────────────────────────

  async function loadFiles() {
    if (!currentCategory) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ category_id: currentCategory.id });
      if (currentFolder) params.set('folder_id', currentFolder);
      const r = await fetch(`${API}/api/documents?${params}`);
      if (!r.ok) throw new Error(await r.text());
      const data: Record<string, unknown>[] = await r.json();
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDocuments(data.map(fromDb));
    } catch (e) {
      toast.error(`Failed to load files: ${e}`);
    } finally {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!r.ok) throw new Error(await r.text());
      setDocuments(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    } catch (e) { toast.error(`Update failed: ${e}`); }
  }

  // ── Subfolder management (localStorage — just names, no file data) ─────────

  function saveSubfolders(val: CustomSubfolders) {
    localStorage.setItem('ams_custom_subfolders', JSON.stringify(val));
    setCustomSubfolders(val);
  }

  function getAllSubfolders(): string[] {
    const def = DEFAULT_SUBFOLDERS[currentCategory?.name ?? ''] ?? [];
    const cus = customSubfolders[currentCategory?.name ?? ''] ?? [];
    return Array.from(new Set([...def, ...cus]));
  }

  // ── Navigation ────────────────────────────────────────────────────────────

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
    if (index === 0) {
      setCurrentFolder(null);
      setPath(p => p.slice(0, 1));
    } else {
      const item = path[index];
      setCurrentFolder(item.id === 'root' ? null : item.id);
      setPath(p => p.slice(0, index + 1));
    }
  }

  // ── Folder CRUD ───────────────────────────────────────────────────────────

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

  // ── File actions ──────────────────────────────────────────────────────────

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
    for (const t of targets) await deleteDoc(t);
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

  // ── Derived data ──────────────────────────────────────────────────────────

  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(d => d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q));
    }
    if (fileTypeFilter !== 'all') filtered = filtered.filter(d => d.type === fileTypeFilter);
    const now = new Date();
    if (dateFilter === 'today')  filtered = filtered.filter(d => new Date(d.created_at).toDateString() === now.toDateString());
    else if (dateFilter === 'week')  { const w = new Date(now); w.setDate(w.getDate() - 7);   filtered = filtered.filter(d => new Date(d.created_at) > w); }
    else if (dateFilter === 'month') { const m = new Date(now); m.setMonth(m.getMonth() - 1); filtered = filtered.filter(d => new Date(d.created_at) > m); }
    if (sizeFilter === 'small')  filtered = filtered.filter(d => d.file_size < 1024 * 1024);
    else if (sizeFilter === 'medium') filtered = filtered.filter(d => d.file_size >= 1024 * 1024 && d.file_size < 10 * 1024 * 1024);
    else if (sizeFilter === 'large')  filtered = filtered.filter(d => d.file_size >= 10 * 1024 * 1024);
    if (activeTab === 'starred') filtered = filtered.filter(d => d.starred);
    else if (activeTab === 'recent') { const s = new Date(); s.setDate(s.getDate() - 7); filtered = filtered.filter(d => new Date(d.updated_at) > s); }
    filtered.sort((a, b) => {
      let av: string | number | Date, bv: string | number | Date;
      switch (sortBy) {
        case 'name': av = a.name.toLowerCase(); bv = b.name.toLowerCase(); break;
        case 'size': av = a.file_size; bv = b.file_size; break;
        case 'type': av = a.type; bv = b.type; break;
        default:     av = new Date(a.created_at); bv = new Date(b.created_at);
      }
      return sortOrder === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return filtered;
  }, [documents, searchQuery, fileTypeFilter, dateFilter, sizeFilter, activeTab, sortBy, sortOrder]);

  const stats = {
    totalFiles: documents.length,
    totalSize:  documents.reduce((s, d) => s + d.file_size, 0),
    starred:    documents.filter(d => d.starred).length,
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const renderHomeView = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Asset Management System</h2>
        <p className="text-white/50 text-sm">ISO 55001 Compliant Document Management</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {BASE_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <button key={cat.id} type="button" onClick={() => handleCategoryClick(cat)}
              className="oz-glass-panel rounded-2xl p-5 text-left hover:bg-white/[0.12] transition-all group">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${cat.color} shadow-lg mb-3 w-fit`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-[#86BBD8] transition-colors">{cat.name}</h3>
              <p className="text-xs text-white/50 line-clamp-2">{cat.description}</p>
            </button>
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
            <h2 className="text-xl font-bold text-white">{currentCategory?.name}</h2>
            <p className="text-xs text-white/50">{currentCategory?.description}</p>
          </div>
          <div className="flex gap-2">
            <GlassButton icon={FolderPlus} onClick={() => setIsCreateFolderOpen(true)}>New Folder</GlassButton>
            <GlassButton icon={Upload} variant="primary" onClick={() => setIsUploadOpen(true)}>Upload</GlassButton>
          </div>
        </div>
        {all.length === 0 ? (
          <div className="oz-glass-panel rounded-2xl p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-white/20 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No folders yet</h3>
            <p className="text-white/50 text-sm mb-4">Create your first folder to start organising documents</p>
            <GlassButton icon={FolderPlus} onClick={() => setIsCreateFolderOpen(true)}>Create Folder</GlassButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {all.map(name => {
              const isDefault = defaults.includes(name);
              return (
                <div key={name} className="oz-glass-panel rounded-2xl p-4 group flex items-center justify-between gap-2 hover:bg-white/[0.12] transition-all">
                  <button type="button" onClick={() => handleSubfolderClick(name)} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/30 to-indigo-500/30 shrink-0">
                      <Folder className="h-4 w-4 text-[#86BBD8]" />
                    </div>
                    <span className="font-medium text-white text-sm truncate">{name}</span>
                  </button>
                  {!isDefault && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button type="button" title="Rename" className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        onClick={() => { setItemToRename({ name, type: 'folder' }); setNewName(name); setIsRenameDialogOpen(true); }}>
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button type="button" title="Delete" className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
                        onClick={() => { setItemToDelete({ name, type: 'folder' }); setIsDeleteDialogOpen(true); }}>
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <ChevronRight className="h-3.5 w-3.5 text-white/30 shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredDocuments.map(doc => (
        <div key={doc.id} onClick={() => handlePreview(doc)}
          className={`oz-glass-panel rounded-2xl p-4 cursor-pointer hover:bg-white/[0.12] transition-all group ${selectedItems.has(doc.id) ? 'ring-2 ring-[#86BBD8]/50' : ''}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              <input type="checkbox" checked={selectedItems.has(doc.id)} onChange={() => toggleSelectItem(doc.id)}
                onClick={e => e.stopPropagation()} className="mt-0.5 accent-[#86BBD8] h-3.5 w-3.5" />
              {getFileIcon(doc.type)}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{doc.name}</p>
                <p className="text-xs text-white/40">{formatFileSize(doc.file_size)}</p>
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => handleToggleStar(doc)} title={doc.starred ? 'Unstar' : 'Star'}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors">
                <Star className={`h-3.5 w-3.5 ${doc.starred ? 'fill-yellow-400 text-yellow-400' : 'text-white/40'}`} />
              </button>
              <FileActionsMenu doc={doc} onPreview={handlePreview} onDownload={handleDownload} onRename={handleRenameClick} onDelete={handleDeleteClick} onToggleStar={handleToggleStar} />
            </div>
          </div>
          {doc.description && (
            <p className="text-[11px] text-white/40 mb-2 line-clamp-2 flex items-start gap-1">
              <MessageSquare className="h-2.5 w-2.5 shrink-0 mt-0.5" />{doc.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/35">{formatDateTime(doc.created_at)}</span>
            <GlassBadge variant="neutral" size="sm">{doc.type.toUpperCase()}</GlassBadge>
          </div>
        </div>
      ))}
    </div>
  );

  const renderTableView = () => (
    <div className="oz-glass-panel rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="w-10 p-3"><input type="checkbox" checked={selectedItems.size === filteredDocuments.length && filteredDocuments.length > 0} onChange={handleSelectAll} className="accent-[#86BBD8]" /></th>
            <th className="w-10 p-3"></th>
            <th className="text-left p-3 text-white/60 font-medium cursor-pointer hover:text-white" onClick={() => { setSortBy('name'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>
              Name {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc className="inline h-3 w-3 ml-1" /> : <SortDesc className="inline h-3 w-3 ml-1" />)}
            </th>
            <th className="text-left p-3 text-white/60 font-medium">Comments</th>
            <th className="text-left p-3 text-white/60 font-medium cursor-pointer hover:text-white" onClick={() => { setSortBy('type'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>Type</th>
            <th className="text-left p-3 text-white/60 font-medium cursor-pointer hover:text-white" onClick={() => { setSortBy('size'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>Size</th>
            <th className="text-left p-3 text-white/60 font-medium cursor-pointer hover:text-white" onClick={() => { setSortBy('date'); setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); }}>Uploaded</th>
            <th className="w-20 p-3"></th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map(doc => (
            <tr key={doc.id} className="border-b border-white/[0.05] hover:bg-white/[0.05] cursor-pointer group" onClick={() => handlePreview(doc)}>
              <td className="p-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedItems.has(doc.id)} onChange={() => toggleSelectItem(doc.id)} className="accent-[#86BBD8]" /></td>
              <td className="p-3">{getFileIcon(doc.type)}</td>
              <td className="p-3 font-medium text-white">
                <div className="flex items-center gap-2">{doc.name}{doc.starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}</div>
                {doc.original_name && doc.original_name !== doc.name && <p className="text-[11px] text-white/30">{doc.original_name}</p>}
              </td>
              <td className="p-3 text-white/45 text-xs max-w-[160px]">
                <p className="truncate">{doc.description || '—'}</p>
              </td>
              <td className="p-3"><GlassBadge variant="neutral" size="sm">{doc.type.toUpperCase()}</GlassBadge></td>
              <td className="p-3 text-white/50">{formatFileSize(doc.file_size)}</td>
              <td className="p-3 text-white/50 text-xs whitespace-nowrap">{formatDateTime(doc.created_at)}</td>
              <td className="p-3" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => handleToggleStar(doc)} title={doc.starred ? 'Unstar' : 'Star'} className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors">
                    <Star className={`h-3 w-3 ${doc.starred ? 'fill-yellow-400 text-yellow-400' : 'text-white/40'}`} />
                  </button>
                  <FileActionsMenu doc={doc} onPreview={handlePreview} onDownload={handleDownload} onRename={handleRenameClick} onDelete={handleDeleteClick} onToggleStar={handleToggleStar} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSubfolderView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">{path[path.length - 1]?.name}</h2>
          <p className="text-xs text-white/50">in {currentCategory?.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedItems.size > 0 && (
            <GlassButton variant="danger" icon={TrashIcon} size="sm" onClick={handleBulkDelete}>Delete ({selectedItems.size})</GlassButton>
          )}
          <div className="flex rounded-xl overflow-hidden border border-white/10">
            <button type="button" onClick={() => setViewMode('grid')} title="Grid view"
              className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[#2A4D69]/60 text-[#86BBD8]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}><Grid2X2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setViewMode('table')} title="Table view"
              className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-[#2A4D69]/60 text-[#86BBD8]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}><ListTree className="h-4 w-4" /></button>
          </div>
          <GlassButton icon={Upload} variant="primary" onClick={() => setIsUploadOpen(true)}>Upload</GlassButton>
        </div>
      </div>

      <GlassPanel title="Search & Filters" defaultOpen {...sections.panel('searchFilters')}>
        <div className="flex flex-col gap-4 p-1">
          <div className="flex items-center gap-3 flex-wrap">
            <GlassInput placeholder="Search name or comments…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} icon={Search} wrapperClassName="flex-1 min-w-[200px]" />
            <div className="flex gap-1">
              {(['all', 'starred', 'recent'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`h-7 px-3 text-xs rounded-lg transition-colors capitalize font-medium ${activeTab === tab ? 'bg-[#2A4D69]/60 text-[#86BBD8] border border-[#86BBD8]/25' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
                  {tab}
                </button>
              ))}
            </div>
            <GlassButton size="sm" icon={Filter} onClick={() => setShowFilters(v => !v)} variant={showFilters ? 'primary' : 'secondary'}>
              Filters {hasActiveFilters && <span className="ml-1 px-1.5 py-0.5 bg-[#86BBD8]/30 rounded text-[10px]">!</span>}
            </GlassButton>
            {hasActiveFilters && <GlassButton size="sm" icon={FilterX} onClick={clearAllFilters} variant="ghost">Clear</GlassButton>}
          </div>
          {showFilters && (
            <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-4 gap-3">
              <GlassSelect label="File Type" value={fileTypeFilter} onChange={e => setFileTypeFilter(e.target.value)}
                options={Object.entries(FILE_TYPE_CATEGORIES).map(([k, { label }]) => ({ value: k, label }))} />
              <GlassSelect label="Date Range" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                options={[{value:'all',label:'All time'},{value:'today',label:'Today'},{value:'week',label:'Last 7 days'},{value:'month',label:'Last 30 days'}]} />
              <GlassSelect label="File Size" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}
                options={[{value:'all',label:'Any size'},{value:'small',label:'Small (<1MB)'},{value:'medium',label:'Medium (1–10MB)'},{value:'large',label:'Large (>10MB)'}]} />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">Sort By</label>
                <div className="flex gap-2">
                  <GlassSelect value={sortBy} onChange={e => setSortBy(e.target.value)} wrapperClassName="flex-1"
                    options={[{value:'name',label:'Name'},{value:'date',label:'Date'},{value:'size',label:'Size'},{value:'type',label:'Type'}]} />
                  <GlassButton size="sm" onClick={() => setSortOrder(v => v === 'asc' ? 'desc' : 'asc')} title={sortOrder}>
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </GlassButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassPanel>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Files',   value: stats.totalFiles,                  icon: FileText  },
          { label: 'Storage Used',  value: formatFileSize(stats.totalSize),   icon: HardDrive },
          { label: 'Starred',       value: stats.starred,                     icon: Star      },
        ].map(s => (
          <div key={s.label} className="oz-glass-panel rounded-2xl p-3 flex items-center justify-between">
            <div><p className="text-xs text-white/50">{s.label}</p><p className="text-xl font-bold text-white">{s.value}</p></div>
            <s.icon className="h-7 w-7 text-white/20" />
          </div>
        ))}
      </div>

      <p className="text-sm text-white/50">Found <span className="font-semibold text-white">{filteredDocuments.length}</span> files</p>

      {isLoading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="oz-glass-panel rounded-2xl h-24 animate-pulse" />)}</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="oz-glass-panel rounded-2xl p-12 text-center">
          <Archive className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No files found</h3>
          <p className="text-white/50 text-sm mb-4">{hasActiveFilters ? 'Try adjusting your search or filters' : 'Upload your first document'}</p>
          {!hasActiveFilters && <GlassButton icon={Upload} variant="primary" onClick={() => setIsUploadOpen(true)}>Upload Files</GlassButton>}
          {hasActiveFilters  && <GlassButton icon={FilterX} onClick={clearAllFilters}>Clear Filters</GlassButton>}
        </div>
      ) : viewMode === 'grid' ? renderGridView() : renderTableView()}
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <GlassButton size="sm" icon={Menu} className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} title="Menu" />
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Folder className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">AMS Document Hub</h1>
                <p className="text-xs text-white/50">ISO 55001 Compliant</p>
              </div>
            </div>
          </div>
          <MasterCollapseButton collapse={sections} />
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed left-0 top-0 h-full w-64 oz-glass-dark z-50 shadow-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-white">Categories</h2>
                <GlassButton size="xs" icon={X} onClick={() => setMobileMenuOpen(false)} title="Close" />
              </div>
              <div className="space-y-1">
                {BASE_CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.id} type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => { handleCategoryClick(cat); setMobileMenuOpen(false); }}>
                      <Icon className="h-4 w-4" /> {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Breadcrumb */}
        {path.length > 0 && currentCategory && (
          <nav className="flex items-center gap-1.5 text-sm mb-6 flex-wrap">
            <button type="button" onClick={() => { setCurrentCategory(null as unknown as Category); setCurrentFolder(null); setPath([]); }}
              className="text-white/50 hover:text-white transition-colors">Home</button>
            <ChevronRight className="h-3.5 w-3.5 text-white/30" />
            <button type="button" onClick={() => { setCurrentFolder(null); setPath(p => p.slice(0,1)); }}
              className={`transition-colors ${path.length === 1 ? 'text-white font-medium' : 'text-white/50 hover:text-white'}`}>
              {currentCategory.name}
            </button>
            {path.slice(1).map((item, i) => (
              <React.Fragment key={item.id}>
                <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                {i === path.slice(1).length - 1
                  ? <span className="text-white font-medium">{item.name}</span>
                  : <button type="button" onClick={() => handleBreadcrumbClick(i + 1)} className="text-white/50 hover:text-white transition-colors">{item.name}</button>}
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Main content */}
        {!currentCategory ? renderHomeView() : !currentFolder ? renderCategoryView() : renderSubfolderView()}
      </div>

      {/* Create Folder Modal */}
      <GlassModal isOpen={isCreateFolderOpen} onClose={() => setIsCreateFolderOpen(false)} title="Create New Folder" size="sm"
        footer={<div className="flex justify-end gap-2"><GlassButton onClick={() => setIsCreateFolderOpen(false)}>Cancel</GlassButton><GlassButton variant="primary" onClick={handleCreateSubfolder}>Create</GlassButton></div>}>
        <GlassInput label="Folder Name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Enter folder name" autoFocus />
      </GlassModal>

      {/* Upload Modal */}
      <GlassModal isOpen={isUploadOpen} onClose={() => { setIsUploadOpen(false); setPendingFiles([]); }} title="Upload Files" size="lg"
        footer={<div className="flex justify-end gap-2">
          <GlassButton onClick={() => { setIsUploadOpen(false); setPendingFiles([]); }}>Cancel</GlassButton>
          <GlassButton variant="primary" icon={Upload} onClick={uploadFilesToApi} disabled={pendingFiles.length === 0 || isUploading} loading={isUploading}>
            Upload {pendingFiles.length > 0 ? `${pendingFiles.length} file(s)` : ''}
          </GlassButton>
        </div>}>
        <div className="space-y-4">
          {/* Drop zone */}
          <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center cursor-pointer hover:border-white/40 hover:bg-white/[0.03] transition-all"
            onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-8 w-8 mx-auto text-white/30 mb-2" />
            <p className="text-sm text-white/50 mb-2">Click to browse or drag and drop files</p>
            <GlassButton size="sm">Browse Files</GlassButton>
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={e => {
                const added: PendingFile[] = Array.from(e.target.files ?? []).map(f => ({
                  file: f, name: f.name, description: '',
                }));
                setPendingFiles(prev => [...prev, ...added]);
                e.target.value = '';
              }} />
          </div>

          {/* Per-file rename + comment */}
          {pendingFiles.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-white/50 font-medium">{pendingFiles.length} file(s) selected — set a display name and optional comment for each</p>
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {pendingFiles.map((pf, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.08] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {getFileIcon(getFileExtension(pf.file.name))}
                        <span className="text-[11px] text-white/35 truncate">{pf.file.name}</span>
                        <span className="text-[11px] text-white/25 shrink-0">{formatFileSize(pf.file.size)}</span>
                      </div>
                      <button type="button" onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))}
                        className="h-5 w-5 flex items-center justify-center rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={pf.name}
                      onChange={e => setPendingFiles(prev => prev.map((p, j) => j === i ? { ...p, name: e.target.value } : p))}
                      placeholder="Display name (leave blank to use filename)"
                      className="w-full bg-white/[0.07] border border-white/[0.12] rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/25 focus:outline-none focus:border-[#86BBD8]/40"
                    />
                    <textarea
                      value={pf.description}
                      onChange={e => setPendingFiles(prev => prev.map((p, j) => j === i ? { ...p, description: e.target.value } : p))}
                      placeholder="Comment or notes about this document (optional)"
                      rows={2}
                      className="w-full bg-white/[0.07] border border-white/[0.12] rounded-lg px-3 py-1.5 text-xs text-white/80 placeholder-white/25 focus:outline-none focus:border-[#86BBD8]/40 resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {isUploading && <GlassProgress value={uploadProgress} showLabel size="md" />}
        </div>
      </GlassModal>

      {/* Rename Modal */}
      <GlassModal isOpen={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)}
        title={`Rename ${itemToRename?.type === 'folder' ? 'Folder' : 'File'}`} size="sm"
        footer={<div className="flex justify-end gap-2"><GlassButton onClick={() => setIsRenameDialogOpen(false)}>Cancel</GlassButton><GlassButton variant="primary" onClick={handleRenameConfirm}>Rename</GlassButton></div>}>
        <GlassInput value={newName} onChange={e => setNewName(e.target.value)} placeholder="Enter new name" autoFocus />
      </GlassModal>

      {/* File Preview Modal */}
      <GlassModal isOpen={isFilePreviewOpen} onClose={() => setIsFilePreviewOpen(false)} title={selectedFile?.name ?? ''} size="xl"
        footer={<div className="flex justify-end gap-2">
          <GlassButton icon={Download} onClick={() => handleDownload(selectedFile)}>Download</GlassButton>
          <GlassButton variant="danger" icon={TrashIcon} onClick={() => { handleDeleteClick(selectedFile ? { ...selectedFile, storage_path: selectedFile.storage_path } : null); setIsFilePreviewOpen(false); }}>Delete</GlassButton>
        </div>}>
        <div className="space-y-4">
          <div className="min-h-[200px] flex items-center justify-center bg-white/[0.03] rounded-xl p-4">
            {selectedFile?.type === 'image' && selectedFile.file_url
              ? <img src={selectedFile.file_url} alt={selectedFile.name} className="max-w-full max-h-[400px] object-contain rounded" />
              : selectedFile?.type === 'pdf' && selectedFile.file_url
              ? <iframe src={selectedFile.file_url} className="w-full h-[400px] rounded" title={selectedFile.name} />
              : <div className="text-center">{getFileIcon(selectedFile?.type)}<p className="mt-2 text-white/40 text-sm">Preview not available — click Download to open</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Display name',   value: selectedFile?.name },
              { label: 'Original file',  value: selectedFile?.original_name },
              { label: 'Size',           value: formatFileSize(selectedFile?.file_size) },
              { label: 'Type',           value: selectedFile?.type?.toUpperCase() },
              { label: 'Uploaded',       value: formatDateTime(selectedFile?.created_at) },
              { label: 'Location',       value: selectedFile?.folderPath || currentCategory?.name },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/[0.05] rounded-lg p-2">
                <p className="text-white/40 mb-0.5">{label}</p>
                <p className="text-white font-medium truncate">{value}</p>
              </div>
            ))}
          </div>
          {selectedFile?.description && (
            <div className="bg-white/[0.05] rounded-lg p-3">
              <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Comments</p>
              <p className="text-white/80 text-sm">{selectedFile.description}</p>
            </div>
          )}
        </div>
      </GlassModal>

      {/* Delete Modal */}
      <GlassModal isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)}
        title={`Delete ${itemToDelete?.type === 'folder' ? 'Folder' : 'File'}?`} size="sm"
        footer={<div className="flex justify-end gap-2">
          <GlassButton onClick={() => setIsDeleteDialogOpen(false)}>Cancel</GlassButton>
          <GlassButton variant="danger" icon={TrashIcon} onClick={handleDeleteConfirm}>Delete</GlassButton>
        </div>}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-white/70 text-sm">
            {itemToDelete?.type === 'folder'
              ? `Permanently delete folder "${itemToDelete?.name}" and all files inside it?`
              : `Permanently delete "${itemToDelete?.name}"? The file will be removed from storage.`}
          </p>
        </div>
      </GlassModal>

      <Toaster richColors />
    </PageShell>
  );
}
