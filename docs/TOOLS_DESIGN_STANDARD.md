# Tools & Equipment design and engineering standard

**Status:** active product standard  
**Scope:** the standalone Tools & Equipment workspace inside the unified MyOffice ERP/MIS

This standard adapts Apple’s published design principles to an operational mining system. It is a decision guide, not a request to imitate Apple’s visual style.

## Product principles

| Principle | Required behaviour in Tools & Equipment | Current evidence |
|---|---|---|
| Purpose | Every visible element helps people find, hand over, return, understand or administer equipment. Optional overview and guidance can be hidden. | Contextual actions, collapsible overview, focused empty states. |
| Agency | People can understand consequences, recover from mistakes and tailor the workspace. | Undo/redo audit commands, archive/restore, reversible layout choices, persistent view and appearance preferences. |
| Responsibility | Protect operational records, make collection transparent and never disguise failure as an empty state. | Permission checks, hashed-password backend, error states/toasts, audit history, concise analytics disclosure. |
| Familiarity | Use recognised terms, icons, navigation and interaction patterns. | Equipment, Employees, History and Analytics navigation; thin outline icons; standard search, tabs, dialogs and notifications. |
| Flexibility | Work across roles, departments, devices and individual needs. | Responsive layout, department scope, grid/list views, text scale, font and icon choices, light/dark appearance. |
| Simplicity | Use plain language, progressive disclosure and the fewest safe steps. | Filters, secondary actions, hints and customization stay folded until requested. |
| Craft | Treat type, icons, spacing, color, motion, focus, loading and edge cases as product quality. | Harmonised black/white dark appearance, restrained violet accent, readable microcopy, fluid reduced-motion-aware animation. |
| Delight | Feedback should feel immediate and calm without distracting from work. | Short transitions, animated status changes, tactile upright card lift, recording feedback and clear success messages. |
| Consistency | A control with the same purpose behaves and looks the same everywhere. | Shared icon, dialog, select, help, status and motion components. |
| Clear design | Hierarchy, labels, grouping, contrast and feedback must communicate what happens next. | One primary page action, labelled controls, grouped toolbar, visible selected states and direct search destinations. |

## Interaction requirements

- Search spans equipment, employees, attachment names, history, pages, actions and settings. It tolerates close spelling errors, recognises common domain synonyms and presents keyboard-accessible destination links.
- Search results state both the destination type and the context. Choosing a result opens the record, page, action or setting directly.
- Interactive targets reach at least 44 by 44 CSS pixels on coarse-pointer devices.
- Text used as interface guidance remains at least 11 CSS pixels and supports the workspace text scale.
- Meaning never depends on color alone. Statuses pair color with text or an icon.
- Focus is visible. Keyboard users can reach, operate and dismiss every control and dialog.
- Nonessential animation respects `prefers-reduced-motion`; contrast increases with `prefers-contrast`.
- Dark appearance uses black and near-black surfaces, white text, neutral borders and a restrained violet accent. Semantic red, amber and green remain reserved for operational meaning.
- User layout, typography, icon, theme, sidebar, overview and view choices persist on the device.

## Engineering rules

- Keep scoring, filtering and preference validation in testable pure modules outside the page component.
- Surface load and mutation errors. A network or permission failure must never appear as “no records.”
- Keep state changes auditable and make destructive-looking actions reversible where the domain permits.
- Validate stored preferences and imported data before use. Corrupt local state falls back safely.
- Add tests for algorithms and interactions that can silently misdirect a user, especially search ranking, permissions, persistence and movement state transitions.
- Prefer the smallest implementation that fully satisfies the workflow. New abstractions must remove duplication or isolate meaningful behaviour.

## Review checklist

Before merging a Tools change, verify:

1. The feature has a clear operational purpose and no duplicate control.
2. The happy path, empty state, error state, permission state and recovery path are understandable.
3. Keyboard, touch, small-screen, dark-mode, high-contrast and reduced-motion behaviour remain usable.
4. Terms, icons, colors and control placement match existing patterns.
5. New calculations or ranking logic have focused tests; the affected user journey is exercised in the browser.
6. Records persist through the backend when persistence is promised; preferences persist locally when they are personal to a device.

## Primary references

- Apple Human Interface Guidelines — Design principles: https://developer.apple.com/design/human-interface-guidelines/design-principles
- Apple UI Design Dos and Don’ts: https://developer.apple.com/design/tips/
- Apple Human Interface Guidelines — Color: https://developer.apple.com/design/human-interface-guidelines/color
- Apple Human Interface Guidelines — Typography: https://developer.apple.com/design/human-interface-guidelines/typography
- Apple Human Interface Guidelines — Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple Human Interface Guidelines — Toolbars: https://developer.apple.com/design/human-interface-guidelines/toolbars
- Apple accessibility — Accessible appearance: https://developer.apple.com/documentation/swiftui/accessible-appearance

