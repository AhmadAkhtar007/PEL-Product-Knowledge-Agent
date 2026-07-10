# Issue #7: Technician App — Full Rebuild

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

Complete rebuild of the technician-facing React Native/Expo mobile app with a dashboard-style layout, PEL dark theme (technical variant), micro-animations, and all technician features.

**End-to-end behavior**: The technician opens the app to a data-dense dashboard showing key stats (pending tickets, completed today, escalated), recent activity, and pending tickets. They can drill into: diagnostic AI chat (streaming with fault codes/specs), ticket management (view/update status through lifecycle), expert directory (one-tap calling), service history (past repairs), and parts browser. The app uses the same base design system as the customer app but with a more technical, data-dense feel.

Specific deliverables:

1. **Design system** (PEL branded dark theme — technical variant):
   - Same base colors: `#0A0A0A` background, `#007DC5` primary, `#E4E4E4` secondary
   - Technical personality: tighter spacing, monospace font for values/specs/codes, status-indicator-heavy, sharper corners (6-8px)
   - Data-dense layouts with compact cards

2. **Dashboard home screen**:
   - Stats bar at top: 3 cards showing — Pending Tickets (count), Completed Today (count), Escalated (count)
   - Recent Activity feed: latest ticket updates, completed repairs, new assignments
   - Quick Actions: "Start Diagnostic", "View Tickets", "Expert Directory"
   - Pending Tickets list below (top 5, with "View All" link)
   - Each ticket card: customer name, appliance model, status badge, created date

3. **Diagnostic AI chat**:
   - Full-screen chat view (navigated from dashboard, not overlay)
   - Streaming responses with thinking indicator
   - Technical depth: AI provides fault codes, resistance values, component testing steps, wiring specs
   - Model selector: ability to select which appliance model the diagnostic is about
   - Image upload for circuit boards, compressor labels, error displays
   - Escalation: when AI can't resolve, expert contacts appear inline in the chat
   - Markdown rendering for structured diagnostic output (tables, lists, code blocks)

4. **Ticket management**:
   - Full ticket list with status filters (tabs: All, New, Assigned, In Progress, Resolved)
   - Ticket detail view: customer info, appliance details, issue description, status timeline
   - Status update: dropdown/buttons to advance ticket through lifecycle
   - Add resolution notes text field
   - One-tap call customer button (using phone number from ticket)

5. **Expert directory**:
   - List of division heads: name, title, department, phone, email
   - Filterable by department (Refrigerator, AC, Washing Machine)
   - One-tap call button (opens phone dialer)
   - One-tap email button

6. **Service history**:
   - List of past repairs by the technician
   - Each entry: appliance model, issue summary, resolution, date, linked photos
   - Filterable by appliance type
   - Ability to create new service history records

7. **Parts browser**:
   - Catalog of available parts
   - Filterable by category (compressor, thermostat, control board, etc.) and appliance type
   - Each part: name, part number, description, quantity in stock, unit price
   - Search functionality

8. **Photo documentation**:
   - In ticket detail and service history: camera button to capture before/after photos
   - Photo gallery view for each repair record
   - Image preview with remove option

9. **Micro-animations**:
   - Dashboard cards entrance (stagger animation)
   - Tab switching transitions
   - Ticket status update confirmation animation
   - Pull-to-refresh on all lists
   - Button press feedback (scale + haptic)
   - Loading skeletons throughout

10. **API integration**: Connect to all backend endpoints (conversations with SSE, rag/query, tickets with PATCH, experts, appliances, service-history, parts)

## Acceptance criteria

- [ ] App opens to a dashboard with stats cards (pending, completed, escalated counts)
- [ ] Recent activity feed shows latest ticket updates
- [ ] Diagnostic chat streams AI responses with technical depth (fault codes, specs)
- [ ] Model selector in diagnostic chat filters RAG responses to the selected model
- [ ] Escalation shows expert contacts inline in the chat
- [ ] Ticket list with status filter tabs shows all tickets
- [ ] Ticket status can be updated through the lifecycle with validation
- [ ] Resolution notes can be added when resolving a ticket
- [ ] Expert directory lists experts with one-tap call and email buttons
- [ ] Service history lists past repairs filterable by appliance type
- [ ] Parts browser shows catalog filterable by category and appliance type
- [ ] Photo capture and attachment works for repair documentation
- [ ] PEL dark theme (technical variant) applied consistently with tighter spacing and monospace values
- [ ] All interactions have micro-animations

## Blocked by

- [Issue #3: Streaming Chat with History Persistence](./003-streaming-chat-history.md)
- [Issue #5: Appliance Registration + Service History + Parts](./005-appliance-registration-service-history.md)
