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
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import {
  GlassPanel, GlassButton, GlassBadge, GlassInput, GlassSelect, GlassModal, GlassProgress,
  usePageCollapse, MasterCollapseButton,
} from '@/components/shared';

// ============= TypeScript interfaces =============

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
  name: string;
  type: string;
  categoryId: string;
  categoryName: string;
  folderId: string | null;
  folderPath: string;
  file_size: number;
  starred: boolean;
  tags: string[];
  description: string;
  version: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  blobUrl?: string;
  file?: File;
}

interface DeleteItem {
  name: string;
  id?: string;
  type?: string;
  categoryId?: string;
  folderId?: string | null;
}

interface RenameItem {
  name: string;
  id?: string;
  type?: string;
}

interface CustomSubfolders {
  [categoryName: string]: string[];
}

interface FilesByLocation {
  [key: string]: DocumentFile[];
}

declare global {
  interface Window {
    filesByLocation: FilesByLocation;
  }
}

// Base category structure
const BASE_CATEGORIES: Category[] = [
  { id: '1', name: 'Organizational Context', icon: Building, color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50', textColor: 'text-indigo-700', description: 'Internal/external issues, stakeholder requirements, AMS scope' },
  { id: '2', name: 'Leadership', icon: Users, color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700', description: 'Organizational structure, asset policy, RACI matrix' },
  { id: '3', name: 'Planning', icon: Target, color: 'from-green-500 to-green-600', bgColor: 'bg-green-50', textColor: 'text-green-700', description: 'Risk management, objectives, AMPs, budgeting' },
  { id: '4', name: 'Support', icon: HelpCircle, color: 'from-cyan-500 to-cyan-600', bgColor: 'bg-cyan-50', textColor: 'text-cyan-700', description: 'Resources, training, communication, documentation' },
  { id: '5', name: 'Operation', icon: Settings, color: 'from-orange-500 to-orange-600', bgColor: 'bg-orange-50', textColor: 'text-orange-700', description: 'Operational planning, change management, procurement' },
  { id: '6', name: 'Performance Evaluation', icon: TrendingUp, color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50', textColor: 'text-purple-700', description: 'Monitoring, audits, management review' },
  { id: '7', name: 'Improvement', icon: Zap, color: 'from-yellow-500 to-yellow-600', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', description: 'Corrective actions, continual improvement' },
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
  all: { label: 'All Files', icon: FileText },
  document: { label: 'Documents', icon: FileText },
  spreadsheet: { label: 'Spreadsheets', icon: FileSpreadsheet },
  pdf: { label: 'PDFs', icon: FileText },
  image: { label: 'Images', icon: ImageIcon },
  video: { label: 'Videos', icon: Video },
  audio: { label: 'Audio', icon: Music },
  archive: { label: 'Archives', icon: ArchiveIcon },
};

// Helper functions
const getFileExtension = (filename: string): string => {
  const ext = (filename.split('.').pop() ?? '').toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'avi', 'mov', 'wmv', 'mkv', 'webm'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac'].includes(ext)) return 'audio';
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'document';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (ext === 'pdf') return 'pdf';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  return 'file';
};

const getFileIcon = (type: string | undefined): React.ReactElement => {
  switch (type) {
    case 'pdf': return <FileText className="h-5 w-5 text-red-400" />;
    case 'document': return <FileText className="h-5 w-5 text-blue-400" />;
    case 'spreadsheet': return <FileSpreadsheet className="h-5 w-5 text-emerald-400" />;
    case 'image': return <ImageIcon className="h-5 w-5 text-purple-400" />;
    case 'video': return <Video className="h-5 w-5 text-orange-400" />;
    case 'audio': return <Music className="h-5 w-5 text-pink-400" />;
    case 'archive': return <ArchiveIcon className="h-5 w-5 text-white/50" />;
    default: return <File className="h-5 w-5 text-white/40" />;
  }
};

const formatFileSize = (bytes: number | undefined): string => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// File action dropdown (inline)
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
        title="More actions" aria-label="More actions">
        <MoreVertical className="h-3.5 w-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-8 oz-glass-dark rounded-xl shadow-xl z-20 w-44 py-1 border border-white/10">
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onPreview(doc); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"><Eye className="h-3.5 w-3.5" />Preview</button>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onDownload(doc); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"><Download className="h-3.5 w-3.5" />Download</button>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onToggleStar(doc); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"><Star className={`h-3.5 w-3.5 ${doc.starred ? 'fill-yellow-400 text-yellow-400' : ''}`} />{doc.starred ? 'Unstar' : 'Star'}</button>
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onRename(doc); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:text-white hover:bg-white/10 transition-colors"><Edit3 className="h-3.5 w-3.5" />Rename</button>
            <div className="border-t border-white/10 my-1" />
            <button type="button" onClick={e => { e.stopPropagation(); setOpen(false); onDelete(doc); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-white/10 transition-colors"><TrashIcon className="h-3.5 w-3.5" />Delete</button>
          </div>
        </>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  const sections = usePageCollapse({ searchFilters: false });
  const user = null as { name?: string; email?: string } | null;

  const [viewMode, setViewMode] = useState<string>('grid');
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [customSubfolders, setCustomSubfolders] = useState<CustomSubfolders>({});
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [path, setPath] = useState<PathItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState<boolean>(false);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<DeleteItem | null>(null);
  const [itemToRename, setItemToRename] = useState<RenameItem | null>(null);
  const [newName, setNewName] = useState<string>('');
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<DocumentFile | null>(null);
  const [isFilePreviewOpen, setIsFilePreviewOpen] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSavedData();
    if (BASE_CATEGORIES.length > 0 && !currentCategory) {
      setCurrentCategory(BASE_CATEGORIES[0]);
      setPath([{ name: BASE_CATEGORIES[0].name, id: BASE_CATEGORIES[0].id, type: 'category' }]);
    }
  }, []);

  useEffect(() => {
    if (currentCategory) loadFolderContents();
  }, [currentCategory, currentFolder]);

  const loadSavedData = () => {
    const savedSubfolders = localStorage.getItem('ams_custom_subfolders');
    if (savedSubfolders) {
      setCustomSubfolders(JSON.parse(savedSubfolders) as CustomSubfolders);
    } else {
      setCustomSubfolders({});
      localStorage.setItem('ams_custom_subfolders', JSON.stringify({}));
    }
    const savedFiles = localStorage.getItem('ams_files_v2');
    if (savedFiles) {
      const files = JSON.parse(savedFiles) as DocumentFile[];
      const filesByLocation: FilesByLocation = {};
      files.forEach((file: DocumentFile) => {
        const key = `${file.categoryId}_${file.folderId || 'root'}`;
        if (!filesByLocation[key]) filesByLocation[key] = [];
        filesByLocation[key].push(file);
      });
      window.filesByLocation = filesByLocation;
    } else {
      window.filesByLocation = {};
    }
  };

  const saveCustomSubfoldersToStorage = (newSubfolders: CustomSubfolders) => {
    localStorage.setItem('ams_custom_subfolders', JSON.stringify(newSubfolders));
    setCustomSubfolders(newSubfolders);
  };

  const saveFileToLocalStorage = (file: DocumentFile) => {
    const savedFiles = localStorage.getItem('ams_files_v2');
    const files: DocumentFile[] = savedFiles ? JSON.parse(savedFiles) : [];
    files.push(file);
    localStorage.setItem('ams_files_v2', JSON.stringify(files));
    const key = `${file.categoryId}_${file.folderId || 'root'}`;
    if (!window.filesByLocation[key]) window.filesByLocation[key] = [];
    window.filesByLocation[key].push(file);
  };

  const deleteFileFromLocalStorage = (fileId: string, categoryId: string, folderId: string | null | undefined) => {
    const savedFiles = localStorage.getItem('ams_files_v2');
    if (savedFiles) {
      let files: DocumentFile[] = JSON.parse(savedFiles);
      files = files.filter((f: DocumentFile) => f.id !== fileId);
      localStorage.setItem('ams_files_v2', JSON.stringify(files));
      const key = `${categoryId}_${folderId || 'root'}`;
      if (window.filesByLocation[key]) {
        window.filesByLocation[key] = window.filesByLocation[key].filter((f: DocumentFile) => f.id !== fileId);
      }
    }
  };

  const updateFileInLocalStorage = (fileId: string, updates: Partial<DocumentFile>) => {
    const savedFiles = localStorage.getItem('ams_files_v2');
    if (savedFiles) {
      let files: DocumentFile[] = JSON.parse(savedFiles);
      const fileIndex = files.findIndex((f: DocumentFile) => f.id === fileId);
      if (fileIndex !== -1) {
        files[fileIndex] = { ...files[fileIndex], ...updates, updated_at: new Date().toISOString() };
        localStorage.setItem('ams_files_v2', JSON.stringify(files));
        const file = files[fileIndex];
        const key = `${file.categoryId}_${file.folderId || 'root'}`;
        if (window.filesByLocation[key]) {
          window.filesByLocation[key] = window.filesByLocation[key].map((f: DocumentFile) =>
            f.id === fileId ? { ...f, ...updates, updated_at: new Date().toISOString() } : f
          );
        }
        setDocuments(prev => prev.map(f => f.id === fileId ? { ...f, ...updates, updated_at: new Date().toISOString() } : f));
      }
    }
  };

  const loadFolderContents = () => {
    if (!currentCategory) return;
    setIsLoading(true);
    const folderId = currentFolder || 'root';
    const key = `${currentCategory.id}_${folderId}`;
    const files = window.filesByLocation?.[key] || [];
    setDocuments(files);
    setIsLoading(false);
  };

  const getAllSubfoldersForCategory = (): string[] => {
    const defaultSubs: string[] = DEFAULT_SUBFOLDERS[currentCategory?.name ?? ''] || [];
    const customSubs: string[] = customSubfolders[currentCategory?.name ?? ''] || [];
    return Array.from(new Set([...defaultSubs, ...customSubs]));
  };

  const handleCategoryClick = (category: Category) => {
    setCurrentCategory(category);
    setCurrentFolder(null);
    setPath([{ name: category.name, id: category.id, type: 'category' }]);
    loadFolderContents();
    setFileTypeFilter('all');
    setDateFilter('all');
    setSizeFilter('all');
    setSearchQuery('');
    setActiveTab('all');
  };

  const handleSubfolderClick = (subfolderName: string) => {
    setCurrentFolder(subfolderName);
    setPath(prev => [...prev, { name: subfolderName, id: subfolderName, type: 'subfolder' }]);
    loadFolderContents();
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      setCurrentFolder(null);
      setPath(path.slice(0, 1));
      loadFolderContents();
    } else {
      const clickedPath = path[index];
      setCurrentFolder(clickedPath.id === 'root' ? null : clickedPath.id);
      setPath(path.slice(0, index + 1));
      loadFolderContents();
    }
  };

  const handleCreateSubfolder = () => {
    if (!newFolderName.trim()) { toast.error('Please enter a folder name'); return; }
    const existingSubfolders = getAllSubfoldersForCategory();
    if (existingSubfolders.includes(newFolderName)) { toast.error('A folder with this name already exists'); return; }
    if (!currentCategory) return;
    const currentCustom = customSubfolders[currentCategory.name] || [];
    const updatedCustom: CustomSubfolders = { ...customSubfolders, [currentCategory.name]: [...currentCustom, newFolderName] };
    saveCustomSubfoldersToStorage(updatedCustom);
    const key = `${currentCategory.id}_${newFolderName}`;
    if (!window.filesByLocation[key]) window.filesByLocation[key] = [];
    toast.success(`Folder "${newFolderName}" created`);
    setNewFolderName('');
    setIsCreateFolderOpen(false);
  };

  const handleDeleteSubfolder = () => {
    if (!itemToDelete) return;
    const isDefault = DEFAULT_SUBFOLDERS[currentCategory?.name ?? '']?.includes(itemToDelete.name);
    if (isDefault) { toast.error(`"${itemToDelete.name}" is a default folder`); setItemToDelete(null); setIsDeleteDialogOpen(false); return; }
    if (!currentCategory) return;
    const currentCustom = customSubfolders[currentCategory.name] || [];
    const updatedCustom: CustomSubfolders = { ...customSubfolders, [currentCategory.name]: currentCustom.filter((s: string) => s !== itemToDelete.name) };
    saveCustomSubfoldersToStorage(updatedCustom);
    const key = `${currentCategory.id}_${itemToDelete.name}`;
    if (window.filesByLocation[key]) {
      window.filesByLocation[key].forEach((file: DocumentFile) => deleteFileFromLocalStorage(file.id, file.categoryId, file.folderId));
      delete window.filesByLocation[key];
    }
    if (currentFolder === itemToDelete.name) {
      setCurrentFolder(null);
      setPath(path.slice(0, 1));
      loadFolderContents();
    }
    toast.success(`Folder "${itemToDelete.name}" deleted`);
    setItemToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const handleRenameSubfolder = () => {
    if (!itemToRename || !newName.trim()) return;
    const isDefault = DEFAULT_SUBFOLDERS[currentCategory?.name ?? '']?.includes(itemToRename.name);
    if (isDefault) { toast.error(`"${itemToRename.name}" is a default folder`); setIsRenameDialogOpen(false); setItemToRename(null); setNewName(''); return; }
    if (!currentCategory) return;
    const currentCustom = customSubfolders[currentCategory.name] || [];
    const updatedCustom: CustomSubfolders = { ...customSubfolders, [currentCategory.name]: currentCustom.map((s: string) => s === itemToRename.name ? newName : s) };
    saveCustomSubfoldersToStorage(updatedCustom);
    const oldKey = `${currentCategory.id}_${itemToRename.name}`;
    const newKey = `${currentCategory.id}_${newName}`;
    if (window.filesByLocation[oldKey]) {
      window.filesByLocation[newKey] = window.filesByLocation[oldKey];
      delete window.filesByLocation[oldKey];
      window.filesByLocation[newKey].forEach((file: DocumentFile) => { file.folderId = newName; file.folderPath = file.folderPath?.replace(itemToRename.name, newName); });
    }
    if (currentFolder === itemToRename.name) {
      setCurrentFolder(newName);
      setPath(prev => prev.map(p => p.id === itemToRename.name ? { ...p, name: newName, id: newName } : p));
    }
    toast.success(`Renamed to "${newName}"`);
    setIsRenameDialogOpen(false);
    setItemToRename(null);
    setNewName('');
  };

  const handleFileUpload = async () => {
    if (uploadedFiles.length === 0) { toast.error('Please select files to upload'); return; }
    if (!currentCategory) { toast.error('No category selected'); return; }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const totalFiles = uploadedFiles.length;
      let uploadedCount = 0;
      const newDocuments: DocumentFile[] = [];
      for (const file of uploadedFiles) {
        const fileType = getFileExtension(file.name);
        const fileUrl = URL.createObjectURL(file);
        const newFile: DocumentFile = {
          id: `file-${Date.now()}-${Math.random()}`, name: file.name, type: fileType,
          categoryId: currentCategory.id, categoryName: currentCategory.name,
          folderId: currentFolder || null, folderPath: path.slice(1).map(p => p.name).join('/'),
          file_size: file.size, starred: false, tags: [], description: '', version: '1.0',
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
          created_by: user?.name || 'Current User', blobUrl: fileUrl, file: file,
        };
        newDocuments.push(newFile);
        saveFileToLocalStorage(newFile);
        uploadedCount++;
        setUploadProgress((uploadedCount / totalFiles) * 100);
      }
      setDocuments(prev => [...newDocuments, ...prev]);
      toast.success(`Uploaded ${uploadedFiles.length} file(s)`);
      setUploadedFiles([]);
      setIsUploadOpen(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch { toast.error('Failed to upload files'); } finally { setIsUploading(false); }
  };

  const handleDownload = (doc: DocumentFile | null) => {
    if (!doc) return;
    if (doc.blobUrl && doc.file) {
      const link = document.createElement('a');
      link.href = doc.blobUrl; link.download = doc.name;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
    }
    toast.success(`Downloading ${doc.name}`);
  };

  const handlePreview = (doc: DocumentFile) => { setSelectedFile(doc); setPreviewUrl(doc.blobUrl ?? null); setIsFilePreviewOpen(true); };
  const handleDeleteClick = (item: DeleteItem | null) => { setItemToDelete(item); setIsDeleteDialogOpen(true); };
  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    deleteFileFromLocalStorage(itemToDelete.id ?? '', itemToDelete.categoryId ?? '', itemToDelete.folderId);
    setDocuments(prev => prev.filter(doc => doc.id !== itemToDelete.id));
    toast.success(`"${itemToDelete.name}" deleted`);
    setItemToDelete(null);
    setIsDeleteDialogOpen(false);
  };
  const handleRenameClick = (item: RenameItem) => { setItemToRename(item); setNewName(item.name); setIsRenameDialogOpen(true); };
  const handleRenameConfirm = () => {
    if (!itemToRename || !newName.trim()) return;
    updateFileInLocalStorage(itemToRename.id ?? '', { name: newName });
    toast.success(`Renamed to "${newName}"`);
    setIsRenameDialogOpen(false); setItemToRename(null); setNewName('');
  };
  const handleToggleStar = (item: DocumentFile) => {
    const newStarred = !item.starred;
    updateFileInLocalStorage(item.id, { starred: newStarred });
    toast.success(newStarred ? 'Added to starred' : 'Removed from starred');
  };
  const handleBulkDelete = () => {
    const itemsToDelete = documents.filter(doc => selectedItems.has(doc.id));
    itemsToDelete.forEach(item => deleteFileFromLocalStorage(item.id, item.categoryId, item.folderId));
    setDocuments(prev => prev.filter(doc => !selectedItems.has(doc.id)));
    toast.success(`Deleted ${selectedItems.size} item(s)`);
    setSelectedItems(new Set());
  };
  const handleSelectAll = () => {
    if (selectedItems.size === filteredDocuments.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(filteredDocuments.map(doc => doc.id)));
  };
  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const clearAllFilters = () => { setSearchQuery(''); setFileTypeFilter('all'); setDateFilter('all'); setSizeFilter('all'); setActiveTab('all'); };
  const hasActiveFilters = searchQuery !== '' || fileTypeFilter !== 'all' || dateFilter !== 'all' || sizeFilter !== 'all' || activeTab !== 'all';

  const filteredDocuments = useMemo(() => {
    let filtered = [...documents];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc => doc.name.toLowerCase().includes(query) || (doc.tags && doc.tags.some((tag: string) => tag.toLowerCase().includes(query))));
    }
    if (fileTypeFilter !== 'all') filtered = filtered.filter(doc => doc.type === fileTypeFilter);
    const now = new Date();
    if (dateFilter === 'today') filtered = filtered.filter(doc => new Date(doc.created_at).toDateString() === now.toDateString());
    else if (dateFilter === 'week') { const weekAgo = new Date(now.setDate(now.getDate() - 7)); filtered = filtered.filter(doc => new Date(doc.created_at) > weekAgo); }
    else if (dateFilter === 'month') { const monthAgo = new Date(now.setMonth(now.getMonth() - 1)); filtered = filtered.filter(doc => new Date(doc.created_at) > monthAgo); }
    if (sizeFilter === 'small') filtered = filtered.filter(doc => (doc.file_size || 0) < 1024 * 1024);
    else if (sizeFilter === 'medium') filtered = filtered.filter(doc => (doc.file_size || 0) >= 1024 * 1024 && (doc.file_size || 0) < 10 * 1024 * 1024);
    else if (sizeFilter === 'large') filtered = filtered.filter(doc => (doc.file_size || 0) >= 10 * 1024 * 1024);
    if (activeTab === 'starred') filtered = filtered.filter(doc => doc.starred);
    else if (activeTab === 'recent') { const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); filtered = filtered.filter(doc => new Date(doc.updated_at) > sevenDaysAgo); }
    filtered.sort((a: DocumentFile, b: DocumentFile) => {
      let aVal: string | number | Date, bVal: string | number | Date;
      switch (sortBy) {
        case 'name': aVal = a.name.toLowerCase(); bVal = b.name.toLowerCase(); break;
        case 'size': aVal = a.file_size || 0; bVal = b.file_size || 0; break;
        case 'type': aVal = a.type; bVal = b.type; break;
        default: aVal = new Date(a.updated_at); bVal = new Date(b.updated_at);
      }
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });
    return filtered;
  }, [documents, searchQuery, fileTypeFilter, dateFilter, sizeFilter, activeTab, sortBy, sortOrder]);

  const stats = {
    totalFiles: documents.length,
    totalSize: documents.reduce((sum, doc) => sum + (doc.file_size || 0), 0),
    starredItems: documents.filter(doc => doc.starred).length,
  };

  // ─── Render: Home (category grid) ───
  const renderHomeView = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-1">Asset Management System</h2>
        <p className="text-white/50 text-sm">ISO 55001 Compliant Document Management</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {BASE_CATEGORIES.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategoryClick(category)}
              className="oz-glass-panel rounded-2xl p-5 text-left hover:bg-white/[0.12] transition-all group"
            >
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${category.color} shadow-lg mb-3 w-fit`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-[#86BBD8] transition-colors">{category.name}</h3>
              <p className="text-xs text-white/50 line-clamp-2">{category.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ─── Render: Category (subfolder grid) ───
  const renderCategoryView = () => {
    const allSubfolders = getAllSubfoldersForCategory();
    const defaultSubfoldersList: string[] = DEFAULT_SUBFOLDERS[currentCategory?.name ?? ''] || [];
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
        {allSubfolders.length === 0 ? (
          <div className="oz-glass-panel rounded-2xl p-12 text-center">
            <FolderOpen className="h-12 w-12 mx-auto text-white/20 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No folders yet</h3>
            <p className="text-white/50 text-sm mb-4">Create your first folder to start organising documents</p>
            <GlassButton icon={FolderPlus} onClick={() => setIsCreateFolderOpen(true)}>Create Folder</GlassButton>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allSubfolders.map((folderName) => {
              const isDefault = defaultSubfoldersList.includes(folderName);
              return (
                <div key={folderName} className="oz-glass-panel rounded-2xl p-4 group flex items-center justify-between gap-2 hover:bg-white/[0.12] transition-all">
                  <button type="button" onClick={() => handleSubfolderClick(folderName)} className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/30 to-indigo-500/30 shrink-0">
                      <Folder className="h-4 w-4 text-[#86BBD8]" />
                    </div>
                    <span className="font-medium text-white text-sm truncate">{folderName}</span>
                  </button>
                  {!isDefault && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button type="button" title="Rename" aria-label="Rename folder" className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                        onClick={() => { setItemToRename({ name: folderName }); setNewName(folderName); setIsRenameDialogOpen(true); }}>
                        <Edit3 className="h-3 w-3" />
                      </button>
                      <button type="button" title="Delete" aria-label="Delete folder" className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 text-red-400 hover:text-red-300 transition-colors"
                        onClick={() => { setItemToDelete({ name: folderName }); setIsDeleteDialogOpen(true); }}>
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

  // ─── Render: File grid ───
  const renderGridView = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {filteredDocuments.map((doc) => (
        <div
          key={doc.id}
          onClick={() => handlePreview(doc)}
          className={`oz-glass-panel rounded-2xl p-4 cursor-pointer hover:bg-white/[0.12] transition-all group ${selectedItems.has(doc.id) ? 'ring-2 ring-[#86BBD8]/50' : ''}`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={selectedItems.has(doc.id)}
                onChange={() => toggleSelectItem(doc.id)}
                onClick={e => e.stopPropagation()}
                className="mt-0.5 accent-[#86BBD8] h-3.5 w-3.5"
              />
              {doc.type === 'image' && doc.blobUrl
                ? <div className="h-10 w-10 rounded-lg overflow-hidden bg-white/10 shrink-0"><img src={doc.blobUrl} alt={doc.name} className="h-full w-full object-cover" /></div>
                : getFileIcon(doc.type)}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{doc.name}</p>
                <p className="text-xs text-white/40">{formatFileSize(doc.file_size)}</p>
              </div>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button type="button" onClick={() => handleToggleStar(doc)} title={doc.starred ? 'Unstar' : 'Star'} aria-label={doc.starred ? 'Remove star' : 'Add star'}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors">
                <Star className={`h-3.5 w-3.5 ${doc.starred ? 'fill-yellow-400 text-yellow-400' : 'text-white/40'}`} />
              </button>
              <FileActionsMenu doc={doc} onPreview={handlePreview} onDownload={handleDownload} onRename={handleRenameClick} onDelete={handleDeleteClick} onToggleStar={handleToggleStar} />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/40">{formatDate(doc.created_at)}</span>
            <GlassBadge variant="neutral" size="sm">{doc.type.toUpperCase()}</GlassBadge>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── Render: File table ───
  const renderTableView = () => (
    <div className="oz-glass-panel rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10">
            <th className="w-10 p-3"><input type="checkbox" checked={selectedItems.size === filteredDocuments.length && filteredDocuments.length > 0} onChange={handleSelectAll} className="accent-[#86BBD8]" /></th>
            <th className="w-10 p-3"></th>
            <th className="text-left p-3 text-white/60 font-medium cursor-pointer hover:text-white" onClick={() => { setSortBy('name'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>
              Name {sortBy === 'name' && (sortOrder === 'asc' ? <SortAsc className="inline h-3 w-3 ml-1" /> : <SortDesc className="inline h-3 w-3 ml-1" />)}
            </th>
            <th className="text-left p-3 text-white/60 font-medium cursor-pointer hover:text-white" onClick={() => { setSortBy('type'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Type</th>
            <th className="text-left p-3 text-white/60 font-medium cursor-pointer hover:text-white" onClick={() => { setSortBy('size'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Size</th>
            <th className="text-left p-3 text-white/60 font-medium cursor-pointer hover:text-white" onClick={() => { setSortBy('date'); setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}>Modified</th>
            <th className="w-20 p-3"></th>
          </tr>
        </thead>
        <tbody>
          {filteredDocuments.map((doc) => (
            <tr key={doc.id} className="border-b border-white/[0.05] hover:bg-white/[0.05] cursor-pointer group" onClick={() => handlePreview(doc)}>
              <td className="p-3" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedItems.has(doc.id)} onChange={() => toggleSelectItem(doc.id)} className="accent-[#86BBD8]" /></td>
              <td className="p-3">{doc.type === 'image' && doc.blobUrl ? <div className="h-7 w-7 rounded overflow-hidden"><img src={doc.blobUrl} alt={doc.name} className="h-full w-full object-cover" /></div> : getFileIcon(doc.type)}</td>
              <td className="p-3 font-medium text-white">
                <div className="flex items-center gap-2">{doc.name}{doc.starred && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}</div>
              </td>
              <td className="p-3"><GlassBadge variant="neutral" size="sm">{doc.type.toUpperCase()}</GlassBadge></td>
              <td className="p-3 text-white/50">{formatFileSize(doc.file_size)}</td>
              <td className="p-3 text-white/50">{formatDate(doc.updated_at || doc.created_at)}</td>
              <td className="p-3" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" onClick={() => handleToggleStar(doc)} title={doc.starred ? 'Unstar' : 'Star'} aria-label={doc.starred ? 'Unstar' : 'Star'} className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 transition-colors">
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

  // ─── Render: Subfolder view (file listing) ───
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
            <button type="button" onClick={() => setViewMode('grid')} title="Grid view" aria-label="Grid view" className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'grid' ? 'bg-[#2A4D69]/60 text-[#86BBD8]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}><Grid2X2 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setViewMode('table')} title="Table view" aria-label="Table view" className={`h-8 w-8 flex items-center justify-center transition-colors ${viewMode === 'table' ? 'bg-[#2A4D69]/60 text-[#86BBD8]' : 'text-white/50 hover:text-white hover:bg-white/10'}`}><ListTree className="h-4 w-4" /></button>
          </div>
          <GlassButton icon={Upload} variant="primary" onClick={() => setIsUploadOpen(true)}>Upload</GlassButton>
        </div>
      </div>

      {/* Search & filter bar */}
      <GlassPanel title="Search & Filters" defaultOpen {...sections.panel('searchFilters')}>
        <div className="flex flex-col gap-4 p-1">
          <div className="flex items-center gap-3 flex-wrap">
            <GlassInput placeholder="Search files…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} icon={Search} wrapperClassName="flex-1 min-w-[200px]" />
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
                options={Object.entries(FILE_TYPE_CATEGORIES).map(([key, { label }]) => ({ value: key, label }))} />
              <GlassSelect label="Date Range" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                options={[{value:'all',label:'All time'},{value:'today',label:'Today'},{value:'week',label:'Last 7 days'},{value:'month',label:'Last 30 days'}]} />
              <GlassSelect label="File Size" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}
                options={[{value:'all',label:'Any size'},{value:'small',label:'Small (<1MB)'},{value:'medium',label:'Medium (1-10MB)'},{value:'large',label:'Large (>10MB)'}]} />
              <div className="flex flex-col gap-1">
                <label className="text-xs text-white/50">Sort By</label>
                <div className="flex gap-2">
                  <GlassSelect value={sortBy} onChange={e => setSortBy(e.target.value)} wrapperClassName="flex-1"
                    options={[{value:'name',label:'Name'},{value:'date',label:'Date'},{value:'size',label:'Size'},{value:'type',label:'Type'}]} />
                  <GlassButton size="sm" onClick={() => setSortOrder(v => v === 'asc' ? 'desc' : 'asc')} title={sortOrder} aria-label="Toggle sort order">
                    {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                  </GlassButton>
                </div>
              </div>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Files', value: stats.totalFiles, icon: FileText },
          { label: 'Storage Used', value: formatFileSize(stats.totalSize), icon: HardDrive },
          { label: 'Starred', value: stats.starredItems, icon: Star },
        ].map(s => (
          <div key={s.label} className="oz-glass-panel rounded-2xl p-3 flex items-center justify-between">
            <div><p className="text-xs text-white/50">{s.label}</p><p className="text-xl font-bold text-white">{s.value}</p></div>
            <s.icon className="h-7 w-7 text-white/20" />
          </div>
        ))}
      </div>

      <p className="text-sm text-white/50">Found <span className="font-semibold text-white">{filteredDocuments.length}</span> files</p>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="oz-glass-panel rounded-2xl h-24 animate-pulse" />)}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="oz-glass-panel rounded-2xl p-12 text-center">
          <Archive className="h-12 w-12 mx-auto text-white/20 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No files found</h3>
          <p className="text-white/50 text-sm mb-4">{hasActiveFilters ? 'Try adjusting your search or filters' : 'Upload your first document!'}</p>
          {!hasActiveFilters && <GlassButton icon={Upload} variant="primary" onClick={() => setIsUploadOpen(true)}>Upload Files</GlassButton>}
          {hasActiveFilters && <GlassButton icon={FilterX} onClick={clearAllFilters}>Clear Filters</GlassButton>}
        </div>
      ) : viewMode === 'grid' ? renderGridView() : renderTableView()}
    </div>
  );

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <GlassButton size="sm" icon={Menu} className="lg:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} title="Menu" aria-label="Open menu" />
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
          <div className="flex items-center gap-2">
            <MasterCollapseButton collapse={sections} />
            <div className="flex items-center gap-2 oz-glass-panel rounded-full px-3 py-1.5">
              <div className="h-7 w-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-sm font-bold text-white">
                {user?.name?.[0] || 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-white">{user?.name || 'Guest'}</p>
                <p className="text-xs text-white/50">{user?.email || 'guest@example.com'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed left-0 top-0 h-full w-64 oz-glass-dark z-50 shadow-xl p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-semibold text-white">Categories</h2>
                <GlassButton size="xs" icon={X} onClick={() => setMobileMenuOpen(false)} title="Close" aria-label="Close menu" />
              </div>
              <div className="space-y-1">
                {BASE_CATEGORIES.map(category => {
                  const Icon = category.icon;
                  return (
                    <button key={category.id} type="button" className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                      onClick={() => { handleCategoryClick(category); setMobileMenuOpen(false); }}>
                      <Icon className="h-4 w-4" /> {category.name}
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
            <button type="button" onClick={() => { setCurrentFolder(null); setPath(path.slice(0, 1)); loadFolderContents(); }}
              className={`transition-colors ${path.length === 1 ? 'text-white font-medium' : 'text-white/50 hover:text-white'}`}>
              {currentCategory.name}
            </button>
            {path.slice(1).map((item, index) => (
              <React.Fragment key={item.id}>
                <ChevronRight className="h-3.5 w-3.5 text-white/30" />
                {index === path.slice(1).length - 1
                  ? <span className="text-white font-medium">{item.name}</span>
                  : <button type="button" onClick={() => handleBreadcrumbClick(index + 1)} className="text-white/50 hover:text-white transition-colors">{item.name}</button>}
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
      <GlassModal isOpen={isUploadOpen} onClose={() => { setIsUploadOpen(false); setUploadedFiles([]); }} title="Upload Files" size="md"
        footer={<div className="flex justify-end gap-2">
          <GlassButton onClick={() => { setIsUploadOpen(false); setUploadedFiles([]); }}>Cancel</GlassButton>
          <GlassButton variant="primary" icon={Upload} onClick={handleFileUpload} disabled={uploadedFiles.length === 0 || isUploading} loading={isUploading}>
            Upload {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s)` : ''}
          </GlassButton>
        </div>}>
        <div className="space-y-4">
          <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer hover:border-white/40 hover:bg-white/[0.03] transition-all"
            onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-10 w-10 mx-auto text-white/30 mb-3" />
            <p className="text-sm text-white/50 mb-3">Click to browse or drag and drop files</p>
            <GlassButton size="sm">Browse Files</GlassButton>
            <input ref={fileInputRef} type="file" multiple title="Upload files" className="hidden"
              onChange={e => setUploadedFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
          </div>
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-white/50 font-medium">Selected ({uploadedFiles.length})</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {uploadedFiles.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white/[0.05] rounded-lg">
                    <span className="text-xs text-white truncate">{file.name}</span>
                    <GlassButton size="xs" icon={X} onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))} title="Remove" aria-label="Remove file" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {isUploading && (
            <div>
              <GlassProgress value={uploadProgress} showLabel size="md" />
            </div>
          )}
        </div>
      </GlassModal>

      {/* Rename Modal */}
      <GlassModal isOpen={isRenameDialogOpen} onClose={() => setIsRenameDialogOpen(false)} title={`Rename ${itemToRename?.type === 'folder' ? 'Folder' : 'File'}`} size="sm"
        footer={<div className="flex justify-end gap-2"><GlassButton onClick={() => setIsRenameDialogOpen(false)}>Cancel</GlassButton><GlassButton variant="primary" onClick={itemToRename?.type === 'folder' ? handleRenameSubfolder : handleRenameConfirm}>Rename</GlassButton></div>}>
        <GlassInput value={newName} onChange={e => setNewName(e.target.value)} placeholder="Enter new name" autoFocus />
      </GlassModal>

      {/* File Preview Modal */}
      <GlassModal isOpen={isFilePreviewOpen} onClose={() => setIsFilePreviewOpen(false)} title={selectedFile?.name ?? ''} size="xl"
        footer={<div className="flex justify-end gap-2">
          <GlassButton icon={Download} onClick={() => handleDownload(selectedFile)}>Download</GlassButton>
          <GlassButton variant="danger" icon={TrashIcon} onClick={() => { handleDeleteClick(selectedFile); setIsFilePreviewOpen(false); }}>Delete</GlassButton>
        </div>}>
        <div className="space-y-4">
          <div className="min-h-[250px] flex items-center justify-center bg-white/[0.03] rounded-xl p-4">
            {selectedFile?.type === 'image' && previewUrl
              ? <img src={previewUrl} alt={selectedFile.name} className="max-w-full max-h-[400px] object-contain rounded" />
              : <div className="text-center">{getFileIcon(selectedFile?.type)}<p className="mt-2 text-white/40 text-sm">Preview not available</p></div>}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            {[
              { label: 'Size', value: formatFileSize(selectedFile?.file_size) },
              { label: 'Type', value: selectedFile?.type?.toUpperCase() },
              { label: 'Uploaded', value: formatDate(selectedFile?.created_at) },
              { label: 'Location', value: selectedFile?.folderPath || currentCategory?.name },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/[0.05] rounded-lg p-2">
                <p className="text-white/40 mb-0.5">{label}</p>
                <p className="text-white font-medium">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </GlassModal>

      {/* Delete Modal */}
      <GlassModal isOpen={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} title={`Delete ${itemToDelete?.type === 'folder' ? 'Folder' : 'File'}?`} size="sm"
        footer={<div className="flex justify-end gap-2">
          <GlassButton onClick={() => setIsDeleteDialogOpen(false)}>Cancel</GlassButton>
          <GlassButton variant="danger" icon={TrashIcon} onClick={itemToDelete?.type === 'folder' ? handleDeleteSubfolder : handleDeleteConfirm}>Delete</GlassButton>
        </div>}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-white/70 text-sm">
            {itemToDelete?.type === 'folder'
              ? `This will permanently delete the folder "${itemToDelete?.name}" and ALL files inside it. This cannot be undone.`
              : `This will permanently delete "${itemToDelete?.name}". This cannot be undone.`}
          </p>
        </div>
      </GlassModal>

      <Toaster richColors />
    </PageShell>
  );
}
