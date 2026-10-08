# Janet's Tracker v2

Static rebuild of the tracker. No build step. GitHub Pages serves these files as they are.
It uses the same Supabase project, anon key, tables and columns as `/index.html`, so both pages
work against the same data at the same time.

| File | What it does |
|---|---|
| `index.html` | Page shell and modals |
| `styles.css` | All styles, plus light, dark and auto themes and the mobile layout |
| `js/app.js` | State, rendering and actions. One generic code path for all four lists |
| `js/api.js` | Supabase REST client. Throws on any failed write so the UI can roll back |
| `js/dates.js` | Local-date helpers. Never call `new Date('YYYY-MM-DD')`, because it parses as UTC |
| `js/recurrence.js` | Recurring rules. Same `recurring_dates` JSON format as v1 |
| `js/order.js` | Plans the minimal set of `sort_order` changes when you reorder |
| `js/reminders.js` | Due-date reminders: browser notification plus EmailJS email |
| `js/sprint.js` | Sprint planner and timer. Same `sprintPlannerState` localStorage key as v1, so `/sprint-timer.html` still works |
| `js/quicklinks.js` | Quick links bar. Same localStorage keys as v1 |
| `js/drag.js` | Drag-to-reorder with pointer events, for mouse and touch |

Unit tests (date, recurrence and reorder logic, run in Pacific time): `cd v2 && npm test` (Node 20 or newer).
