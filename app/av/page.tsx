'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

// ─── TypeScript Interfaces ───────────────────────────────────────────────────

interface EquipmentItem {
  id: number;
  name: string;
  type: string;
  category: string;
  model: string;
  serial: string;
  location: string;
  status: string;
  lastMaintenance: string;
  nextMaintenance: string;
  utilization: number;
  color: string;
}

interface MaintenanceLog {
  id: number;
  equipmentId: number;
  equipmentName: string;
  type: string;
  description: string;
  date: string;
  duration: number;
  cost: number;
  technician: string;
  status: string;
  notes?: string;
}

interface Reservation {
  id: number;
  equipmentId: number;
  equipmentName: string;
  project: string;
  requestedBy: string;
  startDate: string;
  endDate: string;
  status: string;
  notes?: string;
}

interface DowntimeRecord {
  id: number;
  equipmentId: number;
  equipmentName: string;
  reason: string;
  startDate: string;
  endDate: string;
  duration: number;
  cost: number;
  status: string;
}

interface AppSettings {
  darkMode: boolean;
  showOffline: boolean;
  autoCalculate: boolean;
  maintenanceThreshold: number;
}

interface EquipmentFilters {
  location: string;
  category: string;
  type: string;
  status: string;
  search: string;
}

interface MaintenanceLogFormData {
  equipmentId: number;
  equipmentName: string;
  type: string;
  description: string;
  date: string;
  duration: number;
  cost: number;
  technician: string;
  notes: string;
}

interface ReservationFormData {
  equipmentId: number;
  equipmentName: string;
  project: string;
  requestedBy: string;
  startDate: string;
  endDate: string;
  notes: string;
}

interface AddEquipmentFormData {
  name: string;
  type: string;
  category: string;
  model: string;
  serial: string;
  location: string;
  status: string;
  utilization: number;
}
import { 
  Calendar as CalendarIcon,
  Download,
  ChevronLeft,
  ChevronRight,
  Settings,
  Filter,
  Search,
  BarChart3,
  Moon,
  Sun,
  Zap,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Wrench,
  Truck,
  Factory,
  ToolCase,
  FileText,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Play,
  Pause,
  Eye,
  EyeOff,
  Users,
  Building
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { format, addDays, startOfDay, endOfDay, isWithinInterval, eachDayOfInterval } from 'date-fns';

// Equipment types and categories
const EQUIPMENT_TYPES = {
  EXCAVATOR: 'excavator',
  LOADER: 'loader',
  CRANE: 'crane',
  COMPRESSOR: 'compressor',
  GENERATOR: 'generator',
  WELDER: 'welder',
  PUMP: 'pump',
  MIXER: 'mixer'
};

const EQUIPMENT_CATEGORIES = {
  EARTHMOVING: 'earthmoving',
  LIFTING: 'lifting',
  POWER: 'power',
  TOOLS: 'tools',
  PUMPS: 'pumps',
  CONCRETE: 'concrete'
};

// Status types
const STATUS_TYPES = {
  OPERATIONAL: 'operational',
  MAINTENANCE: 'maintenance',
  BREAKDOWN: 'breakdown',
  RESERVED: 'reserved',
  OFFLINE: 'offline'
};

const STATUS_CONFIG = {
  [STATUS_TYPES.OPERATIONAL]: { 
    label: 'Operational', 
    color: 'bg-green-100 text-green-800', 
    icon: CheckCircle2,
    availability: 100 
  },
  [STATUS_TYPES.MAINTENANCE]: { 
    label: 'Maintenance', 
    color: 'bg-orange-100 text-orange-800', 
    icon: Wrench,
    availability: 0 
  },
  [STATUS_TYPES.BREAKDOWN]: { 
    label: 'Breakdown', 
    color: 'bg-red-100 text-red-800', 
    icon: AlertTriangle,
    availability: 0 
  },
  [STATUS_TYPES.RESERVED]: { 
    label: 'Reserved', 
    color: 'bg-blue-100 text-blue-800', 
    icon: Clock,
    availability: 0 
  },
  [STATUS_TYPES.OFFLINE]: { 
    label: 'Offline', 
    color: 'bg-gray-100 text-gray-800', 
    icon: XCircle,
    availability: 0 
  }
};

// Priority levels
const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

const PRIORITY_CONFIG = {
  [PRIORITY_LEVELS.LOW]: { label: 'Low', color: 'bg-green-100 text-green-800' },
  [PRIORITY_LEVELS.MEDIUM]: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  [PRIORITY_LEVELS.HIGH]: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  [PRIORITY_LEVELS.CRITICAL]: { label: 'Critical', color: 'bg-red-100 text-red-800' }
};

// Initial equipment data
const INITIAL_EQUIPMENT = [
  {
    id: 1,
    name: 'Excavator CAT 320',
    type: EQUIPMENT_TYPES.EXCAVATOR,
    category: EQUIPMENT_CATEGORIES.EARTHMOVING,
    model: 'CAT 320',
    serial: 'CAT320-001',
    location: 'Site A',
    status: STATUS_TYPES.OPERATIONAL,
    lastMaintenance: '2024-01-15',
    nextMaintenance: '2024-02-15',
    utilization: 85,
    color: 'bg-blue-500'
  },
  {
    id: 2,
    name: 'Mobile Crane 50T',
    type: EQUIPMENT_TYPES.CRANE,
    category: EQUIPMENT_CATEGORIES.LIFTING,
    model: 'Liebherr LTM 1050',
    serial: 'LIE-1050-001',
    location: 'Site B',
    status: STATUS_TYPES.OPERATIONAL,
    lastMaintenance: '2024-01-20',
    nextMaintenance: '2024-02-20',
    utilization: 72,
    color: 'bg-purple-500'
  },
  {
    id: 3,
    name: 'Generator 150kVA',
    type: EQUIPMENT_TYPES.GENERATOR,
    category: EQUIPMENT_CATEGORIES.POWER,
    model: 'Cummins C150D5',
    serial: 'CUM-C150-001',
    location: 'Main Plant',
    status: STATUS_TYPES.MAINTENANCE,
    lastMaintenance: '2024-01-10',
    nextMaintenance: '2024-01-25',
    utilization: 90,
    color: 'bg-green-500'
  },
  {
    id: 4,
    name: 'Concrete Pump 42M',
    type: EQUIPMENT_TYPES.PUMP,
    category: EQUIPMENT_CATEGORIES.CONCRETE,
    model: 'Putzmeister 42M',
    serial: 'PUTZ-42M-001',
    location: 'Site C',
    status: STATUS_TYPES.BREAKDOWN,
    lastMaintenance: '2024-01-05',
    nextMaintenance: '2024-01-25',
    utilization: 65,
    color: 'bg-pink-500'
  },
  {
    id: 5,
    name: 'Wheel Loader',
    type: EQUIPMENT_TYPES.LOADER,
    category: EQUIPMENT_CATEGORIES.EARTHMOVING,
    model: 'Volvo L120H',
    serial: 'VOL-L120-001',
    location: 'Site A',
    status: STATUS_TYPES.RESERVED,
    lastMaintenance: '2024-01-18',
    nextMaintenance: '2024-02-18',
    utilization: 78,
    color: 'bg-orange-500'
  },
  {
    id: 6,
    name: 'Air Compressor 750CFM',
    type: EQUIPMENT_TYPES.COMPRESSOR,
    category: EQUIPMENT_CATEGORIES.POWER,
    model: 'Atlas Copco XAS 750',
    serial: 'ATLAS-750-001',
    location: 'Workshop',
    status: STATUS_TYPES.OPERATIONAL,
    lastMaintenance: '2024-01-22',
    nextMaintenance: '2024-02-22',
    utilization: 60,
    color: 'bg-red-500'
  },
  {
    id: 7,
    name: 'Concrete Mixer 9m³',
    type: EQUIPMENT_TYPES.MIXER,
    category: EQUIPMENT_CATEGORIES.CONCRETE,
    model: 'Schwing Stetter 9m³',
    serial: 'SCHW-9M3-001',
    location: 'Batching Plant',
    status: STATUS_TYPES.OPERATIONAL,
    lastMaintenance: '2024-01-12',
    nextMaintenance: '2024-02-12',
    utilization: 82,
    color: 'bg-yellow-500'
  },
  {
    id: 8,
    name: 'Welding Machine 400A',
    type: EQUIPMENT_TYPES.WELDER,
    category: EQUIPMENT_CATEGORIES.TOOLS,
    model: 'Lincoln Electric Vantage 400',
    serial: 'LINCOLN-400-001',
    location: 'Fabrication Shop',
    status: STATUS_TYPES.OFFLINE,
    lastMaintenance: '2024-01-08',
    nextMaintenance: '2024-02-08',
    utilization: 45,
    color: 'bg-indigo-500'
  },
  {
    id: 9,
    name: 'Dump Truck 25T',
    type: EQUIPMENT_TYPES.LOADER,
    category: EQUIPMENT_CATEGORIES.EARTHMOVING,
    model: 'CAT 725',
    serial: 'CAT725-001',
    location: 'Site B',
    status: STATUS_TYPES.OPERATIONAL,
    lastMaintenance: '2024-01-14',
    nextMaintenance: '2024-02-14',
    utilization: 88,
    color: 'bg-teal-500'
  },
  {
    id: 10,
    name: 'Tower Crane 16T',
    type: EQUIPMENT_TYPES.CRANE,
    category: EQUIPMENT_CATEGORIES.LIFTING,
    model: 'Potain MDT 189',
    serial: 'POTAIN-189-001',
    location: 'Site C',
    status: STATUS_TYPES.MAINTENANCE,
    lastMaintenance: '2024-01-16',
    nextMaintenance: '2024-02-16',
    utilization: 75,
    color: 'bg-cyan-500'
  }
];

// Locations and categories
const LOCATIONS = ['Site A', 'Site B', 'Site C', 'Main Plant', 'Workshop', 'Batching Plant', 'Fabrication Shop'];
const CATEGORIES = Object.values(EQUIPMENT_CATEGORIES);
const TYPES = Object.values(EQUIPMENT_TYPES);

const EquipmentAvailabilitySystem = () => {
  const [isClient, setIsClient] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [downtimeRecords, setDowntimeRecords] = useState<DowntimeRecord[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState<AppSettings>({
    darkMode: false,
    showOffline: true,
    autoCalculate: true,
    maintenanceThreshold: 90
  });
  const [filters, setFilters] = useState<EquipmentFilters>({
    location: 'all',
    category: 'all',
    type: 'all',
    status: 'all',
    search: ''
  });
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize component with localStorage data
  useEffect(() => {
    setIsClient(true);
    loadAllData();
  }, []);

  // Load all data from localStorage
  const loadAllData = () => {
    try {
      setIsLoading(true);
      
      // Load equipment
      const savedEquipment = localStorage.getItem('equipment-data');
      if (savedEquipment) {
        setEquipment(JSON.parse(savedEquipment));
      } else {
        setEquipment(INITIAL_EQUIPMENT);
        localStorage.setItem('equipment-data', JSON.stringify(INITIAL_EQUIPMENT));
      }

      // Load maintenance logs
      const savedMaintenance = localStorage.getItem('equipment-maintenance');
      setMaintenanceLogs(savedMaintenance ? JSON.parse(savedMaintenance) : []);

      // Load reservations
      const savedReservations = localStorage.getItem('equipment-reservations');
      setReservations(savedReservations ? JSON.parse(savedReservations) : []);

      // Load downtime records
      const savedDowntime = localStorage.getItem('equipment-downtime');
      setDowntimeRecords(savedDowntime ? JSON.parse(savedDowntime) : []);

      // Load settings
      const savedSettings = localStorage.getItem('equipment-settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      // Generate sample data if none exists
      if (!savedMaintenance || !savedReservations || !savedDowntime) {
        generateSampleData();
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setEquipment(INITIAL_EQUIPMENT);
      setMaintenanceLogs([]);
      setReservations([]);
      setDowntimeRecords([]);
      generateSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const sampleMaintenance: MaintenanceLog[] = [];
    const sampleReservations: Reservation[] = [];
    const sampleDowntime: DowntimeRecord[] = [];
    
    const today = new Date();
    
    // Generate maintenance logs
    equipment.forEach(item => {
      for (let i = 0; i < 3; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - (i * 30));
        
        sampleMaintenance.push({
          id: Date.now() + i,
          equipmentId: item.id,
          equipmentName: item.name,
          type: 'scheduled',
          description: `Routine maintenance ${i + 1}`,
          date: date.toISOString().split('T')[0],
          duration: 4,
          cost: 500 + (i * 100),
          technician: `Tech ${i + 1}`,
          status: 'completed'
        });
      }
    });
    
    // Generate reservations
    equipment.forEach(item => {
      if (item.status === STATUS_TYPES.RESERVED) {
        const startDate = new Date(today);
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + 7);
        
        sampleReservations.push({
          id: Date.now(),
          equipmentId: item.id,
          equipmentName: item.name,
          project: 'Project Alpha',
          requestedBy: 'John Smith',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          status: 'approved'
        });
      }
    });
    
    // Generate downtime records
    equipment.forEach(item => {
      if (item.status === STATUS_TYPES.BREAKDOWN || item.status === STATUS_TYPES.MAINTENANCE) {
        const startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 2);
        const endDate = new Date(today);
        
        sampleDowntime.push({
          id: Date.now(),
          equipmentId: item.id,
          equipmentName: item.name,
          reason: item.status === STATUS_TYPES.BREAKDOWN ? 'Hydraulic failure' : 'Scheduled maintenance',
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          duration: 48,
          cost: 2500,
          status: item.status === STATUS_TYPES.MAINTENANCE ? 'completed' : 'in-progress'
        });
      }
    });
    
    setMaintenanceLogs(sampleMaintenance);
    setReservations(sampleReservations);
    setDowntimeRecords(sampleDowntime);
    
    localStorage.setItem('equipment-maintenance', JSON.stringify(sampleMaintenance));
    localStorage.setItem('equipment-reservations', JSON.stringify(sampleReservations));
    localStorage.setItem('equipment-downtime', JSON.stringify(sampleDowntime));
  };

  // Save data to localStorage
  const saveData = useCallback((key: string, data: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save data:', error);
      toast.error('Failed to save changes');
    }
  }, []);

  // Save equipment
  const saveEquipment = useCallback((newEquipment: EquipmentItem[]) => {
    setEquipment(newEquipment);
    saveData('equipment-data', newEquipment);
  }, [saveData]);

  // Save maintenance logs
  const saveMaintenanceLogs = useCallback((newLogs: MaintenanceLog[]) => {
    setMaintenanceLogs(newLogs);
    saveData('equipment-maintenance', newLogs);
  }, [saveData]);

  // Save reservations
  const saveReservations = useCallback((newReservations: Reservation[]) => {
    setReservations(newReservations);
    saveData('equipment-reservations', newReservations);
  }, [saveData]);

  // Save downtime records
  const saveDowntimeRecords = useCallback((newRecords: DowntimeRecord[]) => {
    setDowntimeRecords(newRecords);
    saveData('equipment-downtime', newRecords);
  }, [saveData]);

  // Save settings
  const saveSettings = useCallback((newSettings: AppSettings) => {
    setSettings(newSettings);
    saveData('equipment-settings', newSettings);
  }, [saveData]);

  // Calculate overall availability statistics
  const calculateAvailabilityStats = useCallback(() => {
    const totalEquipment = equipment.length;
    const operationalEquipment = equipment.filter(item => item.status === STATUS_TYPES.OPERATIONAL).length;
    const unavailableEquipment = equipment.filter(item => 
      [STATUS_TYPES.MAINTENANCE, STATUS_TYPES.BREAKDOWN, STATUS_TYPES.OFFLINE].includes(item.status)
    ).length;
    
    const availabilityRate = totalEquipment > 0 ? (operationalEquipment / totalEquipment) * 100 : 0;
    const utilizationRate = equipment.reduce((sum, item) => sum + item.utilization, 0) / totalEquipment;
    
    // Calculate maintenance due soon (within 7 days)
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const maintenanceDue = equipment.filter(item => {
      if (!item.nextMaintenance) return false;
      const nextMaintenance = new Date(item.nextMaintenance);
      return nextMaintenance <= nextWeek && nextMaintenance >= today;
    }).length;

    return {
      totalEquipment,
      operationalEquipment,
      unavailableEquipment,
      availabilityRate: parseFloat(availabilityRate.toFixed(1)),
      utilizationRate: parseFloat(utilizationRate.toFixed(1)),
      maintenanceDue
    };
  }, [equipment]);

  // Calculate category-wise statistics
  const calculateCategoryStats = useCallback(() => {
    const stats: Record<string, { total: number; operational: number; availability: number; utilization: number }> = {};
    
    CATEGORIES.forEach(category => {
      const categoryEquipment = equipment.filter(item => item.category === category);
      const operational = categoryEquipment.filter(item => item.status === STATUS_TYPES.OPERATIONAL).length;
      const total = categoryEquipment.length;
      
      stats[category] = {
        total,
        operational,
        availability: total > 0 ? parseFloat(((operational / total) * 100).toFixed(1)) : 0,
        utilization: categoryEquipment.reduce((sum, item) => sum + item.utilization, 0) / total || 0
      };
    });
    
    return stats;
  }, [equipment]);

  // Get equipment utilization status
  const getUtilizationStatus = (utilization: number) => {
    if (utilization >= 90) return { label: 'High', color: 'text-red-600', bg: 'bg-red-100' };
    if (utilization >= 70) return { label: 'Optimal', color: 'text-green-600', bg: 'bg-green-100' };
    if (utilization >= 50) return { label: 'Moderate', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: 'Low', color: 'text-blue-600', bg: 'bg-blue-100' };
  };

  // Update equipment status
  const updateEquipmentStatus = useCallback((equipmentId: number, status: string, reason: string = '') => {
    const newEquipment = equipment.map(item => 
      item.id === equipmentId ? { ...item, status } : item
    );
    
    saveEquipment(newEquipment);
    
    // Log status change
    if (status === STATUS_TYPES.BREAKDOWN || status === STATUS_TYPES.MAINTENANCE) {
      const equipmentItem = equipment.find(item => item.id === equipmentId);
      const newDowntime = {
        id: Date.now(),
        equipmentId,
        equipmentName: equipmentItem?.name ?? '',
        reason: reason || `Status changed to ${STATUS_CONFIG[status].label}`,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        duration: 0,
        cost: 0,
        status: 'in-progress'
      };
      
      saveDowntimeRecords([...downtimeRecords, newDowntime]);
    }
    
    toast.success(`Equipment status updated to ${STATUS_CONFIG[status].label}`);
  }, [equipment, saveEquipment, downtimeRecords, saveDowntimeRecords]);

  // Add maintenance log
  const addMaintenanceLog = useCallback((logData: MaintenanceLogFormData) => {
    const newLog = {
      id: Date.now(),
      ...logData,
      status: 'completed'
    };
    
    saveMaintenanceLogs([...maintenanceLogs, newLog]);
    
    // Update equipment last maintenance date
    const newEquipment = equipment.map(item => 
      item.id === logData.equipmentId 
        ? { 
            ...item, 
            lastMaintenance: logData.date,
            nextMaintenance: format(addDays(new Date(logData.date), 30), 'yyyy-MM-dd'),
            status: STATUS_TYPES.OPERATIONAL
          } 
        : item
    );
    
    saveEquipment(newEquipment);
    
    // Close any open downtime records
    const updatedDowntime = downtimeRecords.map(record => 
      record.equipmentId === logData.equipmentId && record.status === 'in-progress'
        ? { ...record, endDate: logData.date, status: 'completed' }
        : record
    );
    
    saveDowntimeRecords(updatedDowntime);
    
    toast.success('Maintenance log added successfully');
  }, [maintenanceLogs, saveMaintenanceLogs, equipment, saveEquipment, downtimeRecords, saveDowntimeRecords]);

  // Add reservation
  const addReservation = useCallback((reservationData: ReservationFormData) => {
    const newReservation = {
      id: Date.now(),
      ...reservationData,
      status: 'approved'
    };
    
    saveReservations([...reservations, newReservation]);
    
    // Update equipment status
    updateEquipmentStatus(reservationData.equipmentId, STATUS_TYPES.RESERVED);
    
    toast.success('Equipment reserved successfully');
  }, [reservations, saveReservations, updateEquipmentStatus]);

  // Get equipment availability for a date range
  const getEquipmentAvailability = useCallback((equipmentId: number, _startDate: string, _endDate: string) => {
    const equipmentItem = equipment.find(item => item.id === equipmentId);
    if (!equipmentItem) return 0;
    
    // Check for reservations
    const hasReservation = reservations.some(reservation => 
      reservation.equipmentId === equipmentId &&
      isWithinInterval(new Date(), {
        start: new Date(reservation.startDate),
        end: new Date(reservation.endDate)
      })
    );
    
    // Check for downtime
    const hasDowntime = downtimeRecords.some(record => 
      record.equipmentId === equipmentId &&
      record.status === 'in-progress' &&
      isWithinInterval(new Date(), {
        start: new Date(record.startDate),
        end: record.endDate ? new Date(record.endDate) : new Date()
      })
    );
    
    if (hasReservation || hasDowntime || equipmentItem.status !== STATUS_TYPES.OPERATIONAL) {
      return 0;
    }
    
    return equipmentItem.utilization;
  }, [equipment, reservations, downtimeRecords]);

  // Generate availability report
  const generateAvailabilityReport = () => {
    const stats = calculateAvailabilityStats();
    const categoryStats = calculateCategoryStats();
    
    const reportData = {
      generated: new Date().toISOString(),
      summary: stats,
      categories: categoryStats,
      equipment: equipment.map(item => ({
        name: item.name,
        type: item.type,
        category: item.category,
        location: item.location,
        status: item.status,
        utilization: item.utilization,
        lastMaintenance: item.lastMaintenance,
        nextMaintenance: item.nextMaintenance
      })),
      maintenanceAlerts: equipment.filter(item => {
        if (!item.nextMaintenance) return false;
        const nextMaintenance = new Date(item.nextMaintenance);
        const today = new Date();
        const daysUntilMaintenance = Math.ceil((nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilMaintenance <= 7;
      }).map(item => ({
        equipment: item.name,
        dueDate: item.nextMaintenance,
        daysUntil: Math.ceil((new Date(item.nextMaintenance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      }))
    };
    
    return reportData;
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Name', 'Type', 'Category', 'Location', 'Status', 'Utilization %', 'Last Maintenance', 'Next Maintenance', 'Availability'];
    const data = equipment.map(item => [
      item.name,
      item.type,
      item.category,
      item.location,
      STATUS_CONFIG[item.status].label,
      item.utilization,
      item.lastMaintenance,
      item.nextMaintenance,
      `${STATUS_CONFIG[item.status].availability}%`
    ]);
    
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `equipment-availability-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('CSV report exported successfully');
  };

  // Export to PDF
  const exportToPDF = () => {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF();
      const report = generateAvailabilityReport();
      
      // Header
      doc.setFillColor(30, 64, 175);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.text('EQUIPMENT AVAILABILITY REPORT', 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`Generated: ${format(new Date(), 'PPP')}`, 105, 22, { align: 'center' });
      
      // Summary
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text('SUMMARY', 20, 40);
      doc.setFontSize(10);
      doc.text(`Total Equipment: ${report.summary.totalEquipment}`, 20, 50);
      doc.text(`Operational: ${report.summary.operationalEquipment}`, 20, 57);
      doc.text(`Availability Rate: ${report.summary.availabilityRate}%`, 20, 64);
      doc.text(`Utilization Rate: ${report.summary.utilizationRate}%`, 20, 71);
      doc.text(`Maintenance Due: ${report.summary.maintenanceDue}`, 20, 78);
      
      let yPos = 90;
      
      // Category breakdown
      doc.setFontSize(14);
      doc.text('CATEGORY BREAKDOWN', 20, yPos);
      yPos += 10;
      
      Object.entries(report.categories).forEach(([category, stats]) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(10);
        doc.text(`${category.toUpperCase()}: ${stats.operational}/${stats.total} operational (${stats.availability}%)`, 20, yPos);
        yPos += 7;
      });
      
      yPos += 10;
      
      // Maintenance alerts
      if (report.maintenanceAlerts.length > 0) {
        doc.setFontSize(14);
        doc.text('MAINTENANCE ALERTS', 20, yPos);
        yPos += 10;
        
        report.maintenanceAlerts.forEach(alert => {
          if (yPos > 270) {
            doc.addPage();
            yPos = 20;
          }
          
          doc.setFontSize(10);
          doc.text(`${alert.equipment} - Due: ${alert.dueDate} (${alert.daysUntil} days)`, 20, yPos);
          yPos += 7;
        });
      }
      
      doc.save(`equipment-availability-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF report exported successfully');
    }).catch(error => {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF report');
    });
  };

  // Status Badge Component
  const StatusBadge = React.memo(({ status }: { status: string }) => {
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    
    const IconComponent = config.icon;
    
    return (
      <Badge variant="secondary" className={`text-xs ${config.color}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  });

  StatusBadge.displayName = 'StatusBadge';

  // Utilization Badge Component
  const UtilizationBadge = React.memo(({ utilization }: { utilization: number }) => {
    const status = getUtilizationStatus(utilization);
    
    return (
      <Badge variant="secondary" className={`text-xs ${status.bg} ${status.color}`}>
        {utilization}% - {status.label}
      </Badge>
    );
  });

  UtilizationBadge.displayName = 'UtilizationBadge';

  // Equipment Card Component
  const EquipmentCard = React.memo(({ item }: { item: EquipmentItem }) => {
    const utilizationStatus = getUtilizationStatus(item.utilization);
    const daysUntilMaintenance = item.nextMaintenance
      ? Math.ceil((new Date(item.nextMaintenance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    return (
      <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 ${item.color} rounded-full flex items-center justify-center text-white text-lg font-medium`}>
                <Factory className="w-6 h-6" />
              </div>
              <div>
                <CardTitle className="text-lg">{item.name}</CardTitle>
                <CardDescription className={settings.darkMode ? 'text-slate-400' : ''}>
                  {item.model} • {item.location}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={item.status} />
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className={settings.darkMode ? 'bg-slate-800' : ''}>
                  <DialogHeader>
                    <DialogTitle>Equipment Settings</DialogTitle>
                    <DialogDescription>
                      Manage {item.name} status and details
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Status</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                          const IconComponent = config.icon;
                          return (
                            <Button
                              key={statusKey}
                              variant={item.status === statusKey ? "default" : "outline"}
                              onClick={() => updateEquipmentStatus(item.id, statusKey)}
                              className="justify-start"
                            >
                              <IconComponent className="w-4 h-4 mr-2" />
                              {config.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full justify-start"
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${item.name}?`)) {
                          const newEquipment = equipment.filter(e => e.id !== item.id);
                          saveEquipment(newEquipment);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Equipment
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Utilization */}
          <div className={`p-3 rounded-lg border ${utilizationStatus.bg} ${utilizationStatus.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Utilization</div>
                <div className="text-2xl font-bold">{item.utilization}%</div>
              </div>
              <TrendingUp className="w-8 h-8 opacity-50" />
            </div>
            <Progress value={item.utilization} className="mt-2 h-2" />
          </div>

          {/* Maintenance Info */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Last Maintenance</span>
              <span className="font-medium">{item.lastMaintenance || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Next Maintenance</span>
              <span className={`font-medium ${
                daysUntilMaintenance && daysUntilMaintenance <= 7 ? 'text-orange-600' : ''
              }`}>
                {item.nextMaintenance || 'N/A'}
                {daysUntilMaintenance && daysUntilMaintenance <= 7 && (
                  <Badge variant="outline" className="ml-2 text-xs bg-orange-100 text-orange-800">
                    Soon
                  </Badge>
                )}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 text-xs">
                  <Wrench className="w-3 h-3 mr-1" />
                  Log Maintenance
                </Button>
              </DialogTrigger>
              <MaintenanceLogForm 
                equipment={item}
                onAdd={addMaintenanceLog}
              />
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 text-xs">
                  <Clock className="w-3 h-3 mr-1" />
                  Reserve
                </Button>
              </DialogTrigger>
              <ReservationForm 
                equipment={item}
                onAdd={addReservation}
              />
            </Dialog>
          </div>
        </CardContent>
      </Card>
    );
  });

  EquipmentCard.displayName = 'EquipmentCard';

  // Maintenance Log Form Component
  const MaintenanceLogForm = ({ equipment, onAdd }: { equipment: EquipmentItem; onAdd: (data: MaintenanceLogFormData) => void }) => {
    const [formData, setFormData] = useState({
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      type: 'scheduled',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      duration: 4,
      cost: 0,
      technician: '',
      notes: ''
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!formData.description || !formData.technician) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      onAdd(formData);
      setFormData({
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        type: 'scheduled',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        duration: 4,
        cost: 0,
        technician: '',
        notes: ''
      });
    };

    return (
      <DialogContent className={settings.darkMode ? 'bg-slate-800' : ''}>
        <DialogHeader>
          <DialogTitle>Log Maintenance</DialogTitle>
          <DialogDescription>
            Record maintenance for {equipment.name}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Maintenance Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the maintenance work..."
              className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (hours)</Label>
              <Input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cost">Cost ($)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost}
                onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="technician">Technician *</Label>
            <Input
              value={formData.technician}
              onChange={(e) => setFormData(prev => ({ ...prev, technician: e.target.value }))}
              placeholder="Technician name"
              className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button type="submit">
              Log Maintenance
            </Button>
          </div>
        </form>
      </DialogContent>
    );
  };

  // Reservation Form Component
  const ReservationForm = ({ equipment, onAdd }: { equipment: EquipmentItem; onAdd: (data: ReservationFormData) => void }) => {
    const [formData, setFormData] = useState({
      equipmentId: equipment.id,
      equipmentName: equipment.name,
      project: '',
      requestedBy: '',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      notes: ''
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!formData.project || !formData.requestedBy) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      onAdd(formData);
      setFormData({
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        project: '',
        requestedBy: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        notes: ''
      });
    };

    return (
      <DialogContent className={settings.darkMode ? 'bg-slate-800' : ''}>
        <DialogHeader>
          <DialogTitle>Reserve Equipment</DialogTitle>
          <DialogDescription>
            Reserve {equipment.name} for a project
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Input
              value={formData.project}
              onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
              placeholder="Project name"
              className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="requestedBy">Requested By *</Label>
            <Input
              value={formData.requestedBy}
              onChange={(e) => setFormData(prev => ({ ...prev, requestedBy: e.target.value }))}
              placeholder="Requester name"
              className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
            />
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button type="submit">
              Reserve Equipment
            </Button>
          </div>
        </form>
      </DialogContent>
    );
  };

  // Add Equipment Form Component
  const AddEquipmentForm = ({ onAdd, onCancel }: { onAdd: (data: AddEquipmentFormData & { lastMaintenance: string; nextMaintenance: string; color: string }) => void; onCancel: () => void }) => {
    const [formData, setFormData] = useState({
      name: '',
      type: '',
      category: '',
      model: '',
      serial: '',
      location: '',
      status: STATUS_TYPES.OPERATIONAL,
      utilization: 0
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!formData.name || !formData.type || !formData.category || !formData.model) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      onAdd({
        ...formData,
        lastMaintenance: format(new Date(), 'yyyy-MM-dd'),
        nextMaintenance: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        color: (['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-pink-500', 'bg-orange-500', 'bg-red-500', 'bg-yellow-500', 'bg-indigo-500', 'bg-teal-500', 'bg-cyan-500'] as const)[
          Math.floor(Math.random() * 10)
        ] ?? 'bg-blue-500'
      });
      
      setFormData({
        name: '',
        type: '',
        category: '',
        model: '',
        serial: '',
        location: '',
        status: STATUS_TYPES.OPERATIONAL,
        utilization: 0
      });
    };

    return (
      <DialogContent className={settings.darkMode ? 'bg-slate-800' : ''}>
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
          <DialogDescription>
            Enter the equipment details below.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Equipment Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Excavator CAT 320"
              className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select 
                value={formData.type} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select 
                value={formData.category} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => (
                    <SelectItem key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model">Model *</Label>
              <Input
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                placeholder="CAT 320"
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="serial">Serial Number</Label>
              <Input
                value={formData.serial}
                onChange={(e) => setFormData(prev => ({ ...prev, serial: e.target.value }))}
                placeholder="CAT320-001"
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Select 
                value={formData.location} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, location: value }))}
              >
                <SelectTrigger className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map(location => (
                    <SelectItem key={location} value={location}>{location}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="utilization">Utilization (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.utilization}
                onChange={(e) => setFormData(prev => ({ ...prev, utilization: parseInt(e.target.value) || 0 }))}
                className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              Add Equipment
            </Button>
          </div>
        </form>
      </DialogContent>
    );
  };

  // Filtered equipment based on search and filters
  const filteredEquipment = useMemo(() => {
    return equipment.filter(item => {
      if (filters.location !== 'all' && item.location !== filters.location) return false;
      if (filters.category !== 'all' && item.category !== filters.category) return false;
      if (filters.type !== 'all' && item.type !== filters.type) return false;
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
      if (!settings.showOffline && item.status === STATUS_TYPES.OFFLINE) return false;
      return true;
    });
  }, [equipment, filters, settings.showOffline]);

  const stats = calculateAvailabilityStats();
  const categoryStats = calculateCategoryStats();

  if (!isClient || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-emerald-50/20 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading Equipment Availability System...</p>
            </div>
          </div>
        </div>
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
              <span className="text-[#2A4D69] font-medium">Equipment Availability</span>
            </nav>
            <h1 className="text-3xl font-bold text-[#2A4D69] font-heading tracking-tight">Equipment Availability</h1>
            <p className="text-[#6B7B8E] mt-1">Track and manage equipment utilization, downtime, and maintenance schedules.</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto">
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-4xl mx-auto mb-6">
            <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-blue-600">{stats.totalEquipment}</div>
                <div className="text-xs text-slate-500">Total Equipment</div>
              </CardContent>
            </Card>
            <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-green-600">{stats.operationalEquipment}</div>
                <div className="text-xs text-slate-500">Operational</div>
              </CardContent>
            </Card>
            <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-purple-600">{stats.availabilityRate}%</div>
                <div className="text-xs text-slate-500">Availability</div>
              </CardContent>
            </Card>
            <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-orange-600">{stats.utilizationRate}%</div>
                <div className="text-xs text-slate-500">Utilization</div>
              </CardContent>
            </Card>
            <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-bold text-red-600">{stats.maintenanceDue}</div>
                <div className="text-xs text-slate-500">Maintenance Due</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={`grid w-full grid-cols-4 p-1 rounded-lg ${
            settings.darkMode ? 'bg-slate-800' : 'bg-slate-100'
          }`}>
            <TabsTrigger value="dashboard" className="rounded-md">
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="equipment" className="rounded-md">
              <Factory className="w-4 h-4 mr-2" />
              Equipment
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="rounded-md">
              <Wrench className="w-4 h-4 mr-2" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-md">
              <FileText className="w-4 h-4 mr-2" />
              Reports
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overall Stats */}
              <div className="lg:col-span-2 space-y-6">
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>Availability Overview</CardTitle>
                    <CardDescription>Current equipment status and utilization</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Status Distribution */}
                      <div>
                        <h4 className="font-semibold mb-4">Equipment Status</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                          {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                            const count = equipment.filter(item => item.status === statusKey).length;
                            const percentage = (count / stats.totalEquipment) * 100;
                            const IconComponent = config.icon;
                            
                            return (
                              <div key={statusKey} className={`p-4 rounded-lg border ${config.color} ${settings.darkMode ? 'border-slate-700' : ''}`}>
                                <div className="flex items-center gap-3">
                                  <IconComponent className="w-8 h-8" />
                                  <div>
                                    <div className="text-2xl font-bold">{count}</div>
                                    <div className="text-sm">{config.label}</div>
                                  </div>
                                </div>
                                <Progress value={percentage} className="mt-2 h-2" />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Category Performance */}
                      <div>
                        <h4 className="font-semibold mb-4">Category Performance</h4>
                        <div className="space-y-3">
                          {Object.entries(categoryStats).map(([category, catStats]) => (
                            <div key={category} className="flex items-center justify-between p-3 rounded-lg border">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  <ToolCase className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="font-medium capitalize">{category}</div>
                                  <div className="text-sm text-slate-500">
                                    {catStats.operational}/{catStats.total} operational
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">{catStats.availability}%</div>
                                <div className="text-sm text-slate-500">Availability</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Insights & Actions */}
              <div className="space-y-6">
                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>Quick Insights</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/10 border border-green-200">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-semibold text-green-600">Good Availability</div>
                        <div className="text-sm text-slate-600">{stats.availabilityRate}% of equipment is operational</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-200">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="font-semibold text-orange-600">Maintenance Due</div>
                        <div className="text-sm text-slate-600">{stats.maintenanceDue} equipment due for maintenance</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-200">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-semibold text-blue-600">Optimal Utilization</div>
                        <div className="text-sm text-slate-600">Average utilization at {stats.utilizationRate}%</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button className="w-full justify-start">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Equipment
                          </Button>
                        </DialogTrigger>
                        <AddEquipmentForm 
                          onAdd={(data) => {
                            const newEquipment = [...equipment, { ...data, id: Date.now() }];
                            saveEquipment(newEquipment);
                            toast.success('Equipment added successfully');
                          }}
                          onCancel={() => {}} 
                        />
                      </Dialog>
                      
                      <Button 
                        onClick={exportToCSV}
                        className="w-full justify-start"
                        variant="outline"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Equipment Tab */}
          <TabsContent value="equipment">
            <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Equipment Inventory</CardTitle>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4 text-slate-400" />
                      <Input
                        placeholder="Search equipment..."
                        value={filters.search}
                        onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className={`w-48 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}
                      />
                    </div>
                    <Select 
                      value={filters.location} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}
                    >
                      <SelectTrigger className={`w-32 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}>
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {LOCATIONS.map(location => (
                          <SelectItem key={location} value={location}>{location}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={filters.category} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger className={`w-32 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {CATEGORIES.map(category => (
                          <SelectItem key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select 
                      value={filters.status} 
                      onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger className={`w-32 ${settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}`}>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => (
                          <SelectItem key={statusKey} value={statusKey}>{config.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Equipment
                        </Button>
                      </DialogTrigger>
                      <AddEquipmentForm 
                        onAdd={(data) => {
                          const newEquipment = [...equipment, { ...data, id: Date.now() }];
                          saveEquipment(newEquipment);
                          toast.success('Equipment added successfully');
                        }}
                        onCancel={() => {}} 
                      />
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredEquipment.map(item => (
                    <EquipmentCard
                      key={item.id}
                      item={item}
                    />
                  ))}
                </div>
                
                {filteredEquipment.length === 0 && (
                  <div className="text-center py-12">
                    <Factory className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-600 mb-2">No equipment found</h3>
                    <p className="text-slate-500 mb-4">Try adjusting your filters or add new equipment.</p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add First Equipment
                        </Button>
                      </DialogTrigger>
                      <AddEquipmentForm 
                        onAdd={(data) => {
                          const newEquipment = [...equipment, { ...data, id: Date.now() }];
                          saveEquipment(newEquipment);
                          toast.success('Equipment added successfully');
                        }}
                        onCancel={() => {}} 
                      />
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Tab */}
          <TabsContent value="maintenance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardHeader>
                  <CardTitle>Maintenance Logs</CardTitle>
                  <CardDescription>Recent maintenance activities</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {maintenanceLogs.slice(0, 10).map(log => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-medium">{log.equipmentName}</div>
                          <div className="text-sm text-slate-500">{log.description}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {log.date} • {log.duration}h • ${log.cost}
                          </div>
                        </div>
                        <Badge variant="secondary">{log.type}</Badge>
                      </div>
                    ))}
                    
                    {maintenanceLogs.length === 0 && (
                      <div className="text-center py-8">
                        <Wrench className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">No maintenance logs yet</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardHeader>
                  <CardTitle>Upcoming Maintenance</CardTitle>
                  <CardDescription>Equipment due for maintenance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {equipment
                      .filter(item => {
                        if (!item.nextMaintenance) return false;
                        const nextMaintenance = new Date(item.nextMaintenance);
                        const today = new Date();
                        const daysUntil = Math.ceil((nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        return daysUntil <= 14;
                      })
                      .sort((a, b) => new Date(a.nextMaintenance).getTime() - new Date(b.nextMaintenance).getTime())
                      .map(item => {
                        const daysUntil = Math.ceil((new Date(item.nextMaintenance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        
                        return (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border">
                            <div>
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-slate-500">Due: {item.nextMaintenance}</div>
                            </div>
                            <Badge variant={daysUntil <= 7 ? "destructive" : "secondary"}>
                              {daysUntil} days
                            </Badge>
                          </div>
                        );
                      })}
                    
                    {equipment.filter(item => {
                      if (!item.nextMaintenance) return false;
                      const nextMaintenance = new Date(item.nextMaintenance);
                      const today = new Date();
                      return Math.ceil((nextMaintenance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) <= 14;
                    }).length === 0 && (
                      <div className="text-center py-8">
                        <CheckCircle2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-slate-500">No upcoming maintenance</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardHeader>
                  <CardTitle>Export Reports</CardTitle>
                  <CardDescription>Generate equipment availability reports</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button 
                      onClick={exportToCSV}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <FileText className="w-4 h-4 mr-2" />
                      Export to CSV
                    </Button>
                    
                    <Button 
                      onClick={exportToPDF}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export to PDF
                    </Button>
                  </div>
                  
                  <div className="text-xs text-slate-500 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg">
                    <p><strong>Current Statistics:</strong></p>
                    <p>• Total Equipment: {stats.totalEquipment}</p>
                    <p>• Availability Rate: {stats.availabilityRate}%</p>
                    <p>• Utilization Rate: {stats.utilizationRate}%</p>
                    <p>• Maintenance Due: {stats.maintenanceDue}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className={settings.darkMode ? 'bg-slate-800 border-slate-700' : ''}>
                <CardHeader>
                  <CardTitle>System Settings</CardTitle>
                  <CardDescription>Configure equipment tracking preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="show-offline" className="font-semibold">Show Offline Equipment</Label>
                      <div className="text-sm text-slate-500">Display offline equipment in lists</div>
                    </div>
                    <Switch
                      id="show-offline"
                      checked={settings.showOffline}
                      onCheckedChange={(checked) => {
                        const newSettings = { ...settings, showOffline: checked };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maintenance-threshold">Maintenance Alert Threshold (days)</Label>
                    <Input
                      id="maintenance-threshold"
                      type="number"
                      value={settings.maintenanceThreshold}
                      onChange={(e) => {
                        const newSettings = { ...settings, maintenanceThreshold: parseInt(e.target.value) || 90 };
                        setSettings(newSettings);
                        saveSettings(newSettings);
                      }}
                      className={settings.darkMode ? 'bg-slate-700 border-slate-600' : ''}
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <Button 
                      onClick={() => {
                        generateSampleData();
                        toast.success('Sample data generated successfully');
                      }}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Generate Sample Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </PageShell>
  );
};

export default EquipmentAvailabilitySystem;
