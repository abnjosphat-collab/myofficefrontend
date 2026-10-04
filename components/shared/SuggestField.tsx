// components/shared/SuggestField.tsx — PredictiveInput (typeahead from this user's input
// history) inside a UI-system <Field>: binds the Field's label/description/error to the input.
'use client';

import { controlClasses, useFieldProps } from '@/components/ui-system';
import { PredictiveInput } from '@/components/shared/PredictiveInput';

export function SuggestField({ historyKey, placeholder, value, onChange }: { historyKey: string; placeholder: string; value: string; onChange: (value: string) => void }) {
  const { id } = useFieldProps();
  return <PredictiveInput id={id} historyKey={historyKey} placeholder={placeholder} value={value} onChange={onChange} inputClassName={controlClasses} />;
}
