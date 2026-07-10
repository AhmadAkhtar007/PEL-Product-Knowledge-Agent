# Issue #5: Appliance Registration + Service History + Parts

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

Build the appliance registration system (manual + simulated QR), service history tracking linked to appliances and tickets, and a browse-only parts inventory catalog.

**End-to-end behavior**: A customer registers an appliance via `POST /appliances` (with manual entry or mock QR data). Their registered appliances appear via `GET /appliances` with status indicators (active tickets, last serviced date). When a technician resolves a ticket for a registered appliance, a service history record is created. Technicians can view service history for any appliance. A parts catalog is available for browsing.

Specific deliverables:

1. **Appliance registration API** (`backend/app/modules/appliances/router.py`):
   - `POST /appliances` — register: `{ product_category, model, serial_number?, purchase_date?, qr_data? }`
   - `GET /appliances` — list registered appliances with status indicators:
     - Active ticket count
     - Last serviced date (from service_history)
     - Registration date
   - `GET /appliances/{id}` — single appliance with full details + service history + tickets
   - `DELETE /appliances/{id}` — unregister an appliance

2. **Mock QR data**: Pre-define a set of mock QR payloads that map to real PEL models (e.g., `{ "model": "PWD-425", "serial": "PEL-WD-2024-001", "category": "Water Dispenser" }`). The client will simulate scanning and send this data to the registration endpoint.

3. **Service history API** (`backend/app/modules/service_history/router.py`):
   - `POST /service-history` — create: `{ appliance_id, ticket_id?, technician_name, description, photos_json? }`
   - `GET /service-history?appliance_id={id}` — list service history for an appliance
   - `GET /service-history?technician_name={name}` — list service history by technician

4. **Parts catalog API** (`backend/app/modules/parts/router.py`):
   - `GET /parts` — list all parts, filterable by `?category=compressor&appliance_type=Refrigerator`
   - `GET /parts/{id}` — single part details
   - Seed data: 10-15 common PEL appliance parts across categories (compressors, thermostats, control boards, filters, etc.)

5. **Integration with tickets**: When a ticket is resolved, the technician can optionally create a service history entry linked to both the ticket and the appliance.

## Acceptance criteria

- [ ] `POST /appliances` registers an appliance and returns its ID
- [ ] `GET /appliances` lists appliances with active ticket count and last serviced date
- [ ] `GET /appliances/{id}` returns full details including linked service history and tickets
- [ ] Mock QR data payloads are accepted and correctly populate registration fields
- [ ] `POST /service-history` creates a service record linked to an appliance
- [ ] `GET /service-history?appliance_id={id}` returns service history for a specific appliance
- [ ] `GET /parts` returns the seeded parts catalog, filterable by category and appliance type
- [ ] Parts seed data contains at least 10 realistic PEL appliance parts
- [ ] Tests cover: appliance registration, appliance listing with computed status, service history creation and querying, parts filtering

## Blocked by

- [Issue #4: Ticket Lifecycle + Escalation](./004-ticket-lifecycle-escalation.md)
