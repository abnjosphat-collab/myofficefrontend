import type { CSSProperties } from 'react';
import {
  MagnifyingGlass, Plus, ArrowRight, ArrowUpRight, ArrowLeft, CaretRight, CaretDown,
  X, SquaresFour, List, SlidersHorizontal, Clock, ClockCounterClockwise, MapPin,
  Check, Cube, User, ArrowsLeftRight, DownloadSimple, ArrowCounterClockwise,
  DotsThree, WarningCircle,
  ArrowUUpLeft, ArrowUUpRight, PencilSimple, Archive, Paperclip, ImageSquare,
  FilePdf, UploadSimple, Info, Eye, EyeSlash, ArrowUp, ArrowDown,
  TreeStructure, TextAa, Bell, Wrench, House, ChatCircleText, DotsSixVertical, MagnifyingGlassPlus,
  MagnifyingGlassMinus, ChartLineUp, UserGear, Toolbox, CalendarBlank,
} from '@/components/shared/design-system/icons';

// A consistent thin Phosphor set gives equipment distinct, familiar silhouettes.
const icons = {
  search: MagnifyingGlass, plus: Plus, arrow: ArrowRight, out: ArrowUpRight,
  back: ArrowLeft, chevron: CaretRight, down: CaretDown, close: X,
  grid: SquaresFour, list: List, filter: SlidersHorizontal, clock: Clock,
  history: ClockCounterClockwise, pin: MapPin, check: Check, box: Cube,
  user: User, swap: ArrowsLeftRight, download: DownloadSimple,
  reset: ArrowCounterClockwise, more: DotsThree, alert: WarningCircle,
  undo: ArrowUUpLeft, redo: ArrowUUpRight,
  edit: PencilSimple, archive: Archive, attachment: Paperclip, image: ImageSquare,
  pdf: FilePdf, upload: UploadSimple, info: Info, show: Eye, hide: EyeSlash,
  up: ArrowUp, moveDown: ArrowDown, department: TreeStructure,
  font: TextAa, bell: Bell, settings: Wrench, home: House, chat: ChatCircleText, grip: DotsSixVertical,
  zoomIn: MagnifyingGlassPlus, zoomOut: MagnifyingGlassMinus,
  analytics: ChartLineUp,
  accounts: UserGear,
  app: Toolbox,
  calendar: CalendarBlank,
} as const;
export type IconName = keyof typeof icons;
export function ToolsIcon({ name, size = 18, style, weight = 'light' }: { name: IconName; size?: number; style?: CSSProperties; weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' }) {
  const Glyph = icons[name];
  return <Glyph size={size} weight={weight} aria-hidden="true" style={style} />;
}

