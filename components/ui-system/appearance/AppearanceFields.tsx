// components/ui-system/appearance/AppearanceFields.tsx — the appearance controls (typeface, text size, helpful hints,
// plus the light/dark look for the trial), shared by the app Settings dialog and the Tools Settings dialog so
// both change the same saved choice. The look switch renders only when showThemes is set: the trial flag gates
// it, and Tools never shows it (it keeps its sage floor).
'use client';

import { Checkbox } from '../primitives/Checkbox';
import { Field } from '../primitives/Field';
import { Select } from '../overlays/Select';
import {
  APPEARANCE_FONTS,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  type AppearanceFont,
} from './appearance';
import { useAppearance } from './AppearanceProvider';

export function AppearanceFields({ showThemes = false }: { showThemes?: boolean }) {
  const { appearance, update } = useAppearance();
  return (
    <>
      <Field label="Typeface" description={APPEARANCE_FONTS.find(font => font.id === appearance.font)?.description}>
        <Select
          aria-label="Typeface"
          value={appearance.font}
          onValueChange={value => update({ font: value as AppearanceFont })}
          options={APPEARANCE_FONTS.map(font => ({ value: font.id, label: font.label, description: font.description }))}
        />
      </Field>
      <Field label={`Text size: ${appearance.fontSize}%`} description="Scales text across the whole app, including menus and dialogs.">
        <input
          type="range"
          min={FONT_SIZE_MIN}
          max={FONT_SIZE_MAX}
          step={FONT_SIZE_STEP}
          value={appearance.fontSize}
          onChange={event => update({ fontSize: Number(event.target.value) })}
          aria-label="Text size"
          aria-valuetext={`${appearance.fontSize} percent`}
          className="focus-ring h-6 w-full cursor-pointer accent-action"
        />
        <div className="flex justify-between font-sans text-caption text-ink-muted" aria-hidden="true">
          <span>{FONT_SIZE_MIN}%</span><span>100%</span><span>{FONT_SIZE_MAX}%</span>
        </div>
      </Field>
      <Checkbox
        label="Show helpful hints"
        description="Small question-mark hints beside complex fields."
        checked={appearance.guidance}
        onChange={event => update({ guidance: event.target.checked })}
      />
      {showThemes && (
        <Field
          label="Look"
          description={
            appearance.darkness === 'dark'
              ? 'Black-and-white dark pages, light text'
              : 'Bright pages, dark text'
          }
        >
          <Select
            aria-label="Look"
            value={appearance.darkness}
            onValueChange={value =>
              update(
                value === 'dark'
                  ? { theme: 'mono', darkness: 'dark' }
                  : { theme: 'sage', darkness: 'light' },
              )
            }
            options={[
              { value: 'light', label: 'Light', description: 'Bright pages, dark text' },
              { value: 'dark', label: 'Dark', description: 'Black-and-white dark pages, light text' },
            ]}
          />
        </Field>
      )}
    </>
  );
}
