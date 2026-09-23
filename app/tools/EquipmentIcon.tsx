import type { ComponentType, SVGProps } from 'react';
import { IconDeviceLaptop, IconHammerDrill } from '@tabler/icons-react';
import { Briefcase, Flashlight, Gauge, HardHat, Laptop, ToolCase, Wrench, Zap } from '@/components/shared/design-system';
import type { EquipmentIconFamily } from './ToolsUI';
import type { EquipmentKind } from './prototype';

type EquipmentGlyphProps = SVGProps<SVGSVGElement> & {
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
};

function EquipmentSvg({ size = 48, children, ...props }: EquipmentGlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

const CordlessDrill = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M4 7.5h10.2l2.1 2.1v3.1H9.8l-2.2-2.1H4z"/><path d="M16.3 10h2.3m0-1.3v2.6m0-1.3H21"/><path d="M8.7 12.7 10 17H8.4l.5 3H5.6l-1.3-7.3"/><path d="M6.2 17h3.4"/></EquipmentSvg>;
const AngleGrinder = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><circle cx="17.2" cy="14.8" r="3.6"/><path d="m4 8.2 8.7 2.3 2.4 2.2-2.2 3-3.4-.9-1.2-2.1-4.8-1.3z"/><path d="m11.1 10.1 1.2-3.3 2.4.7-1.3 3.5"/><path d="M19.7 12.2 22 9.8"/></EquipmentSvg>;
const DigitalMultimeter = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><rect x="6.2" y="2.5" width="11.6" height="18.7" rx="2"/><rect x="8.3" y="5" width="7.4" height="3.4" rx=".6"/><circle cx="12" cy="13.2" r="2.2"/><path d="m12 11.1 1.3 1.1M9 18h1m4 0h1M6.2 17.4C3.7 18.2 3.3 20 3.3 21.5m14.5-4.1c2.5.8 2.9 2.6 2.9 4.1"/></EquipmentSvg>;
const ClampMeter = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M8.5 8.7a4.7 4.7 0 0 1-.7-2.4A4.2 4.2 0 0 1 12 2.2a4.2 4.2 0 0 1 4.2 4.1 4.7 4.7 0 0 1-.7 2.4"/><path d="M9.7 8.4V5.9a2.3 2.3 0 0 1 4.6 0v2.5"/><rect x="7" y="8.4" width="10" height="13.1" rx="2"/><rect x="9" y="10.5" width="6" height="2.6" rx=".5"/><circle cx="12" cy="17" r="1.8"/></EquipmentSvg>;
const TorqueWrench = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><circle cx="17.7" cy="6.3" r="3.2"/><circle cx="17.7" cy="6.3" r="1"/><path d="m15.4 8.6-8.8 8.8m-1.7-.1 1.8-1.8 2.7 2.7L7.6 20a1.9 1.9 0 0 1-2.7-2.7Z"/><path d="m9.8 14.2 1.8 1.8m.2-4 1.7 1.7"/></EquipmentSvg>;
const InverterWelder = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M6 5.8h12a2 2 0 0 1 2 2v9.6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7.8a2 2 0 0 1 2-2Z"/><path d="M8 5.8V4.3h8v1.5M7.2 9h5.2m-5.2 3h3.2"/><circle cx="16.2" cy="10.5" r="1.6"/><path d="M7.2 16.3h2m5.7 0h1.9M6 19.4c-.2 1.1.3 1.8 1.5 2.2m10.5-2.2c.2 1.1-.3 1.8-1.5 2.2"/></EquipmentSvg>;
const LaserLevel = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M7 8.5h10l1.6 10H5.4z"/><path d="M9 8.5V5.2a3 3 0 0 1 6 0v3.3"/><circle cx="12" cy="13" r="1.4"/><path d="M2 13h7m6 0h7M12 2v3.2"/></EquipmentSvg>;
const SocketSet = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M4 7.2h16a2 2 0 0 1 2 2v9.1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9.2a2 2 0 0 1 2-2Z"/><path d="M8.5 7.2V4.7h7v2.5M2 11h20"/><circle cx="6" cy="15" r="1.3"/><circle cx="10" cy="15" r="1.3"/><circle cx="14" cy="15" r="1.3"/><circle cx="18" cy="15" r="1.3"/></EquipmentSvg>;
const SurveyEquipment = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M8 5.2h8l1.8 3.2-1.8 3.2H8L6.2 8.4z"/><circle cx="12" cy="8.4" r="1.8"/><path d="M12 11.6v2.2m-3 7.7 3-7.7 3 7.7m-3-7.7 6 7.7"/></EquipmentSvg>;
const WorkLamp = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="m8 4 8-1 2 8-8 1z"/><path d="m10 12-2 9m6-10 2 10M8.7 18h6.6M18 5l3-1m-2 4 3 .5"/><circle cx="13" cy="7.5" r="1.6"/></EquipmentSvg>;
const ToolKit = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M4 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><path d="M8.5 7V4h7v3M2 12h20M10 12v2h4v-2"/><path d="m7 17 2-2m8 2-2-2"/></EquipmentSvg>;
const PowerTool = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M4 8h10l3 3v3H9l-2-2H4z"/><path d="m8 14 1 6H5l-1-8m13-1h4"/><path d="m19 9 2 2-2 2"/></EquipmentSvg>;
const HandTool = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M14.8 5.2a4 4 0 0 0-5.2 5.2L3 17l4 4 6.6-6.6a4 4 0 0 0 5.2-5.2l-2.5 2.5-2.8-.7-.7-2.8z"/></EquipmentSvg>;
const TestInstrument = DigitalMultimeter;
const WeldingEquipment = InverterWelder;
const LiftingEquipment = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M12 3v5m-4-5h8M9 8h6l1 5H8z"/><path d="M12 13v3.5a3.5 3.5 0 1 0 3.5 3.5"/><path d="M12 20h3.5"/></EquipmentSvg>;
const OtherEquipment = (props: EquipmentGlyphProps) => <EquipmentSvg {...props}><path d="M5 6h14v14H5zM8 6V3h8v3M5 11h14"/><path d="M9 15h6m-3-3v6"/></EquipmentSvg>;

const tabler = {
  'rotary-hammer': IconHammerDrill,
  laptop: IconDeviceLaptop,
} satisfies Partial<Record<EquipmentKind, ComponentType<EquipmentGlyphProps>>>;

const custom = {
  'cordless-drill': CordlessDrill,
  'angle-grinder': AngleGrinder,
  'digital-multimeter': DigitalMultimeter,
  'clamp-meter': ClampMeter,
  'torque-wrench': TorqueWrench,
  'inverter-welder': InverterWelder,
  'laser-level': LaserLevel,
  'socket-set': SocketSet,
  'survey-equipment': SurveyEquipment,
  'work-lamp': WorkLamp,
  'tool-kit': ToolKit,
  'power-tool': PowerTool,
  'hand-tool': HandTool,
  'test-instrument': TestInstrument,
  'welding-equipment': WeldingEquipment,
  'lifting-equipment': LiftingEquipment,
  'other-equipment': OtherEquipment,
} satisfies Partial<Record<EquipmentKind, ComponentType<EquipmentGlyphProps>>>;

const glyphs = { ...custom, ...tabler } satisfies Record<EquipmentKind, ComponentType<EquipmentGlyphProps>>;

const myOfficeGlyphs = {
  'cordless-drill': Wrench, 'rotary-hammer': Wrench, 'angle-grinder': Wrench,
  'digital-multimeter': Gauge, 'clamp-meter': Gauge, 'torque-wrench': Wrench,
  'inverter-welder': Zap, 'laser-level': Gauge, 'socket-set': Briefcase,
  laptop: Laptop, 'work-lamp': Flashlight, 'survey-equipment': HardHat,
  'tool-kit': ToolCase, 'power-tool': Wrench, 'hand-tool': Wrench,
  'test-instrument': Gauge, 'welding-equipment': Zap,
  'lifting-equipment': ToolCase, 'other-equipment': ToolCase,
} satisfies Record<EquipmentKind, ComponentType<EquipmentGlyphProps>>;

export function EquipmentIcon({ kind, size = 48, family = 'technical' }: { kind: EquipmentKind; size?: number; family?: EquipmentIconFamily }) {
  const Glyph = family === 'myoffice' ? myOfficeGlyphs[kind] : glyphs[kind] ?? OtherEquipment;
  return family === 'myoffice'
    ? <Glyph size={size} weight="light" aria-hidden="true" focusable="false" />
    : <Glyph size={size} strokeWidth={1.35} aria-hidden="true" focusable="false" />;
}
