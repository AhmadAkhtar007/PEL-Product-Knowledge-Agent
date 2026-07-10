# Issue #9: Multimodal Image Analysis

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

Enhance the image upload and multimodal analysis experience in both mobile apps — polished image picker, preview with remove, base64 encoding to the API, Gemini multimodal processing, and image display in chat bubbles.

**End-to-end behavior**: In the chat of either app, the user taps a camera/attachment button. They can choose to take a new photo or pick from their gallery. A preview thumbnail appears above the chat input with a remove button. When they send the message, the image is base64-encoded and sent alongside the text query to the streaming chat endpoint. The AI (Gemini 1.5 Flash multimodal) analyzes both the text and the image and responds with visual diagnosis. The sent image appears in the user's chat bubble, and the AI's response references what it sees in the image.

Specific deliverables:

1. **Image picker** in both apps:
   - Camera/attachment button in the chat input bar (next to the mic button and send button)
   - Options: "Take Photo" (camera) or "Choose from Gallery" (library)
   - Use `expo-image-picker` for both camera and gallery
   - Handle camera and gallery permissions with graceful denied-state messaging

2. **Image preview**:
   - After selection, a thumbnail preview appears above the chat input bar
   - Preview has a remove/X button to discard the image before sending
   - Image info: small file size indicator
   - Multiple images: support attaching one image per message (keep it simple)

3. **Image in chat bubbles**:
   - User's message bubble shows the attached image (thumbnail, tappable to view full-size)
   - Full-size image viewer: modal overlay with pinch-to-zoom and close button
   - Images are displayed with proper aspect ratio and rounded corners matching the chat bubble style

4. **API integration**:
   - Image is base64-encoded on the client before sending
   - Sent as `image_base64` field in the conversation query request
   - Backend passes the image alongside text context to Gemini's multimodal API
   - Image URL/data is persisted in the `messages` table (`image_url` field) for chat history

5. **Photo documentation for technicians** (repair before/after):
   - In ticket detail and service history, a "Add Photo" button opens the same image picker
   - Photos are attached to the service history record as JSON array
   - Gallery view of repair photos in the service history detail

6. **Optimizations**:
   - Image compression before base64 encoding (reduce to reasonable size, e.g., 800px max dimension)
   - Loading indicator while image is being processed by the AI

## Acceptance criteria

- [ ] Camera/attachment button appears in chat input of both apps
- [ ] Tapping opens options for camera or gallery
- [ ] Selected image shows as a preview thumbnail above the input with a remove button
- [ ] Sending a message with an image encodes it as base64 and includes it in the API request
- [ ] The AI response references visual content from the image (e.g., "I can see frost buildup on...")
- [ ] The sent image appears in the user's chat bubble
- [ ] Tapping the image in the chat bubble opens a full-size viewer with pinch-to-zoom
- [ ] Images are persisted in chat history and display when loading old conversations
- [ ] Camera and gallery permissions are requested and handled gracefully
- [ ] Technician app supports photo attachment in service history records
- [ ] Images are compressed before encoding to prevent excessive payload sizes

## Blocked by

- [Issue #6: Customer App — Full Rebuild](./006-customer-app-rebuild.md)
- [Issue #7: Technician App — Full Rebuild](./007-technician-app-rebuild.md)
