# Issue #10: Web Landing Page + Live Demos

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

A premium Next.js web landing page that showcases the PEL AI Support Suite to senior stakeholders, with two full-screen-takeover interactive demo experiences rendered inside realistic phone mockup frames.

**End-to-end behavior**: A stakeholder opens a URL in their browser and sees a stunning, PEL-branded landing page with animated hero section, feature highlights, tech stack overview, and two prominent "Try Demo" buttons. Clicking "Try Customer Demo" transitions to a full-screen takeover showing the customer app experience inside a realistic phone bezel. Clicking "Try Technician Demo" shows the technician app. The demos are fully interactive web replicas of the core app flows (chat with streaming, appliance cards, ticket view) connected to the live backend API. A close/back button returns to the landing page.

Specific deliverables:

1. **Next.js project** (`web/`):
   - Initialize with Next.js 15, App Router
   - PEL dark theme consistent with mobile apps: `#0A0A0A` background, `#007DC5` primary, `#E4E4E4` secondary

2. **Landing page** (`/`):
   - **Hero section**: Large headline ("PEL AI Support Suite" or similar), subheadline describing the product, animated background (subtle gradient shift or particle effect), PEL logo, two CTA buttons ("Try Customer Demo", "Try Technician Demo")
   - **Features section**: 4-6 feature cards with icons and descriptions (Multimodal AI, Multilingual, Smart Escalation, Voice Support, Appliance Registration, Diagnostic Chat)
   - **How It Works section**: 3-step visual flow (Register Appliance → Chat with AI → Get Resolution)
   - **Tech Stack section**: Visual display of technologies used (FastAPI, Gemini, ChromaDB, React Native, PostgreSQL)
   - **Footer**: PEL branding, "Thanda Ya Garam, Bas Aik Button" tagline, copyright

3. **Customer demo** (`/demo/customer`):
   - Full-screen takeover with dark overlay background
   - Phone mockup frame (realistic bezel, notch, rounded corners) centered on screen
   - Inside the frame: a web replica of the customer app experience:
     - My Appliances view with sample appliance cards
     - Chat interface with streaming AI responses (connected to live backend)
     - Ticket submission form
   - Close/back button (X or "Back to Home") in the corner outside the phone frame

4. **Technician demo** (`/demo/technician`):
   - Same full-screen takeover + phone mockup pattern
   - Inside the frame: a web replica of the technician app experience:
     - Dashboard with stats cards (mock data)
     - Diagnostic chat with streaming (connected to live backend)
     - Ticket list with status management
     - Expert directory
   - Close/back button

5. **Premium animations**:
   - Hero section: text fade-in with stagger, floating gradient orbs or subtle particle background
   - Feature cards: scroll-triggered entrance animation (fade up + translate)
   - Phone mockup: smooth scale-up transition when entering demo mode
   - Page transitions: smooth route animations
   - Hover effects on all interactive elements

6. **Responsive design**: Optimized for desktop/laptop viewing (primary use case for stakeholder presentations), with basic tablet responsiveness

7. **SEO**: Proper title tags, meta descriptions, semantic HTML, single H1 per page

## Acceptance criteria

- [ ] Landing page loads with hero section, features, how-it-works, tech stack, and footer
- [ ] PEL dark theme is consistently applied with brand colors
- [ ] "Try Customer Demo" navigates to a full-screen takeover with phone mockup frame
- [ ] Customer demo inside the phone frame shows appliance cards and a working chat with streaming AI responses
- [ ] "Try Technician Demo" navigates to a full-screen takeover with phone mockup frame
- [ ] Technician demo inside the phone frame shows dashboard, chat, and ticket management
- [ ] Both demos connect to the live backend API for real AI responses
- [ ] Close button returns to the landing page smoothly
- [ ] Hero section has animated background (gradient/particles)
- [ ] Feature cards animate in on scroll
- [ ] Phone mockup transition is smooth (scale up from CTA button position)
- [ ] Page is responsive on desktop and tablet
- [ ] All pages have proper SEO meta tags

## Blocked by

- [Issue #6: Customer App — Full Rebuild](./006-customer-app-rebuild.md)
- [Issue #7: Technician App — Full Rebuild](./007-technician-app-rebuild.md)
