// components/shared/SuggestField.tsx — PredictiveInput (typeahead from this user's input
// history) inside a UI-system <Field>: binds the Field's label/description/error to the input.
'use client';

import { controlClasses, useFieldProps } from '@/components/ui-system';
import { PredictiveInput } from '@/components/shared/PredictiveInput';

export function SuggestField({ historyKey, placeholder, value, onChange }: { historyKey: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  const field = useFieldProps();
  // The Field owns the message: pass invalid/describedBy, never `error` (that
  // would render the alert twice — here and in PredictiveInput itself).
  return (
    <PredictiveInput
      id={field.id}
      historyKey={historyKey}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      inputClassName={controlClasses}
      invalid={field['aria-invalid'] === true}
      describedBy={field['aria-describedby']}
      required={field['aria-required'] === true}
    />
  );
}
