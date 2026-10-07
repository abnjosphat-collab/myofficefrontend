/**
 * @/components/ui-system — the one MyOffice UI system (see README.md).
 * Import everything from this path. Do not deep-import internals.
 */

// Foundations
export { cn } from './foundations/cn';
export { type } from './foundations/typography';
export type { TypeRole } from './foundations/typography';
export { Icon, Glyph, ICON_SIZE, isIconMeaning } from './foundations/Icon';
export type { IconSize, IconContextWeight } from './foundations/Icon';
export { ICON_MEANINGS, ICON_BY_MEANING, meaningFromStatLabel, meaningFromViewValue } from './foundations/icon-meanings';
export type { IconMeaning } from './foundations/icon-meanings';
export * from './foundations/glyphs';

// Appearance
export { AppearanceProvider, useAppearance } from './appearance/AppearanceProvider';
export {
  APPEARANCE_FONTS, APPEARANCE_BOOTSTRAP, DEFAULT_APPEARANCE, FONT_SIZE_MAX, FONT_SIZE_MIN, FONT_SIZE_STEP,
  clampFontSize, migrateAppearance, parseAppearance,
} from './appearance/appearance';
export type { Appearance, AppearanceFont } from './appearance/appearance';

// Primitives
export { Button, IconButton, Spinner, buttonVariants, iconButtonVariants } from './primitives/Button';
export type { ButtonProps, ButtonSize, ButtonVariant, IconButtonProps } from './primitives/Button';
export { StatusBadge, Tag, CountBadge } from './primitives/Badge';
export type { Tone } from './primitives/Badge';
export { Field, useFieldProps, controlClasses } from './primitives/Field';
export { Input, Textarea, NativeSelect } from './primitives/Input';
export { Checkbox } from './primitives/Checkbox';
export { SearchField } from './primitives/SearchField';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './primitives/Tabs';
export { Card, Panel, cardVariants } from './primitives/Card';
export { Skeleton, SkeletonRows } from './primitives/Skeleton';
export { Segmented } from './primitives/Segmented';
export type { SegmentedOption } from './primitives/Segmented';
export { Rating } from './primitives/Rating';
export { Progress } from './primitives/Progress';

// Overlays
export { Dialog } from './overlays/Dialog';
export type { DialogProps } from './overlays/Dialog';
export { Drawer } from './overlays/Drawer';
export { ConfirmProvider, useConfirm } from './overlays/Confirm';
export type { ConfirmOptions, ConfirmFn } from './overlays/Confirm';
export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose } from './overlays/Popover';
export { Tooltip, TooltipProvider, HelpHint } from './overlays/Tooltip';
export { Select } from './overlays/Select';
export type { SelectOption, SelectProps } from './overlays/Select';
export { Combobox } from './overlays/Combobox';
export type { ComboboxOption, ComboboxProps } from './overlays/Combobox';
export { floatingSurface, optionRow } from './overlays/surfaces';
export { Menu, MenuTrigger, MenuContent, MenuItem, MenuSeparator, MenuLabel } from './overlays/Menu';

// Patterns
export { PageHeader, Toolbar, FilterField } from './patterns/PageHeader';
export { MoreMenu, type MoreMenuItem } from './patterns/MoreMenu';
export type { Crumb } from './patterns/PageHeader';
export { MetricTile, MetricGrid } from './patterns/MetricTile';
export { RecordCard } from './patterns/RecordCard';
export { DataTable } from './patterns/DataTable';
export type { Column, DataTableProps } from './patterns/DataTable';
export { Pagination } from './patterns/Pagination';
export { ViewToggle, useViewPreference, VIEW_GRID_LIST, VIEW_CARDS_TABLE } from './patterns/ViewToggle';
export { DataRegion, EmptyState, Notice, StatusLine } from './patterns/DataRegion';
export { DestinationSearch } from './patterns/DestinationSearch';
export { ChartPanel } from './patterns/ChartPanel';
export { Distribution } from './patterns/Distribution';
export { FormDialog } from './patterns/FormDialog';
export type { FormDialogProps } from './patterns/FormDialog';
export { chartTheme, chartColor } from './foundations/chartTheme';
export type { DestinationResult } from './patterns/DestinationSearch';
export { deriveDataStatus, isTransientStatus } from './patterns/dataStatus';
export type { DataStatus, DataStatusInput } from './patterns/dataStatus';
export { nextSort, sortRows, selectionState, toggleAllVisible, toggleOne, pruneSelection, pageSlice, pageCount, pageRangeLabel, clampPage } from './patterns/tableLogic';
export type { SortState, SortDirection } from './patterns/tableLogic';

// Hooks
export { usePersistentState, oneOf } from './hooks/usePersistentState';
export { useMediaQuery, DESKTOP_QUERY } from './hooks/useMediaQuery';

// Shell
export { NavItem, NavGroup, NavHeading, NavSpotlight } from './shell/Nav';
export type { NavItemProps, NavGroupProps } from './shell/Nav';
export { SidebarFrame, TopBar, AppFrame } from './shell/Frame';
