# Tools & Equipment workspace

The standalone `/tools` workspace is the current interface for the mine-wide portable Tools & Equipment register. It shares the MyOffice deployment and Supabase database while keeping a focused interface. Initial departments are Engineering, Mining, Mine Technical Services and IT.

## Durable interaction decisions

- The initial department scope is **All departments**. A user may narrow it at any time.
- The top identity and account controls remain visible while the register scrolls.
- Filters and sorting stay folded until requested. The button uses a chevron and contextual guidance so the hidden controls remain discoverable.
- Primary operational actions use plain language: issue, receive, transfer, extend, edit, archive and restore.
- Viewer accounts may read registers and history. Administrator accounts manage records and custody.
- Notification acknowledgement is per account. Viewing an alert must not clear it for another account.
- A notification failure must be visible but must not prevent the equipment and employee registers from loading.
- Motion provides orientation and feedback, respects reduced-motion preferences, and must never delay the underlying action.
- Photographs take priority over equipment symbols when available.

## Iconography standard

Equipment symbols must communicate the physical item before they decorate the card. Use this order:

1. A real, well-cropped photograph when one exists.
2. A close domain-specific outline from the selected established family.
3. A custom precision-line SVG when an established family has no credible equivalent.
4. The generic equipment case only when the item type is genuinely unknown.

Every custom symbol uses the same 24×24 coordinate system, round line caps and joins, optical size, and approximately 1.35 stroke width. Compare each drawing at 16, 24 and 48 pixels in light and dark modes. The silhouette must remain recognizable without a label. Do not substitute a screwdriver, lightning bolt or other loosely related metaphor for a named machine.

Precision Line remains the default because industrial equipment coverage in general-purpose icon families is incomplete. Tabler, Iconoir and MyOffice remain user-selectable; missing domain symbols deliberately fall back to the normalized precision drawings. Add or change an equipment kind in `app/tools/prototype.ts` and provide its mapping in `app/tools/EquipmentIcon.tsx`. Guard recognizable mappings with `EquipmentIcon.test.tsx`.

## UI acceptance checks

- No horizontal overflow at 390, 820 and 1440 pixel viewport widths.
- Sticky controls do not cover mobile navigation or opened menus.
- The visible and accessible heading reads “A place for every tool.”
- Keyboard focus, touch targets, menus and dialogs remain usable at every supported text size.
- Grid and list views expose the same actions, statuses, imagery and motion quality.
- Empty, loading, permission and request-failure states are distinguishable.
