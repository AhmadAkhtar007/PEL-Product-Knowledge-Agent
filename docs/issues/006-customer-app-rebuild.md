# Issue #6: Customer App — Full Rebuild

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

Complete rebuild of the customer-facing React Native/Expo mobile app with a premium AI chatbot layout, PEL dark theme, micro-animations, and all customer features.

**End-to-end behavior**: The customer opens the app to a "My Appliances" home screen showing their registered appliances as visual cards with status indicators. A floating chat input at the bottom opens a full-screen chat overlay when tapped. The chat streams AI responses word-by-word with a thinking indicator. Chat History (top-left button) opens a drawer listing previous conversations. Profile/Settings (top-right button) opens preferences. Users can register appliances (simulated QR scan or manual), submit tickets, and view ticket history with status progression.

Specific deliverables:

1. **Design system** (PEL branded dark theme):
   - Background: `#0A0A0A` / `#111111`
   - Primary accent: Lochmara Blue `#007DC5`
   - Secondary: Mercury Gray `#E4E4E4`
   - Warmer/friendlier personality: softer corner radii (12-16px), approachable typography, gentle ease-out animations
   - Loading skeletons for all async content

2. **My Appliances home screen** (default view):
   - Visual cards showing: appliance type icon/placeholder image, model name, status indicators (active ticket badge, last serviced date)
   - "+" button to register a new appliance
   - Header: Chat History button (top-left), "My Appliances" title (center), Profile/Settings button (top-right)

3. **Chat overlay**:
   - Floating chat input bar at the bottom of the home screen
   - Tapping opens a full-screen chat overlay (slide up animation)
   - Streaming AI responses: thinking animation dots → word-by-word text appearance
   - Chat bubbles with entrance animations (fade + slide)
   - Image attachment: camera/gallery picker with preview thumbnail and remove button
   - "Talk to a human" button visible in chat toolbar
   - Auto-scroll to latest message
   - Markdown rendering for AI responses (bold, lists, code blocks)

4. **Chat History drawer**:
   - Slides in from the left
   - Lists conversations with title, timestamp, and message count
   - Tap to load a previous conversation
   - "New Chat" button at the top

5. **Appliance registration flow**:
   - "Scan QR Code" option: shows camera view with scan animation frame, simulates scanning, shows confirmation with pre-populated model details
   - "Manual Entry" option: pick product category → select model from list → optionally enter serial number and purchase date
   - Success animation on registration

6. **Ticket submission**:
   - Form: customer name, phone, appliance (select from registered), issue description, optional photo
   - Submit triggers AI escalation or manual "Talk to a human" flow
   - Success confirmation with ticket ID

7. **Ticket history view**:
   - List of submitted tickets with status badge (color-coded: New=blue, Assigned=yellow, In Progress=orange, Resolved=green, Closed=gray)
   - Visual progress bar showing current position in the lifecycle
   - Tap for full ticket details

8. **Profile/Settings screen**:
   - Language preference display
   - App version info
   - PEL branding and support contact

9. **Micro-animations throughout**:
   - Screen transitions (slide/fade)
   - Chat bubble entrance (fade + translate)
   - Button press feedback (scale down + haptic)
   - Loading skeletons (shimmer effect)
   - Status badge pulse animation for active tickets
   - Pull-to-refresh on lists

10. **API integration**: Connect to all backend endpoints (conversations, rag/query with SSE streaming, tickets, appliances, experts)

## Acceptance criteria

- [ ] App opens to "My Appliances" with visual appliance cards showing status indicators
- [ ] Floating chat input opens a full-screen chat overlay with slide-up animation
- [ ] AI responses stream word-by-word with a thinking indicator
- [ ] Chat History drawer lists previous conversations and loads them on tap
- [ ] QR scan simulation shows camera view, scan animation, and confirms with mock model data
- [ ] Manual appliance registration form works with category → model selection
- [ ] Ticket submission form creates a ticket via the API
- [ ] Ticket history shows all tickets with color-coded status badges and progress bar
- [ ] "Talk to a human" button is visible in chat and triggers escalation flow
- [ ] All interactions have micro-animations (transitions, entrance effects, button feedback)
- [ ] PEL dark theme is consistently applied throughout (#0A0A0A background, #007DC5 accents)
- [ ] Image attachment with preview and remove button works in chat

## Blocked by

- [Issue #3: Streaming Chat with History Persistence](./003-streaming-chat-history.md)
- [Issue #5: Appliance Registration + Service History + Parts](./005-appliance-registration-service-history.md)
