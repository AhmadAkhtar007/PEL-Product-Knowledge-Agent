# Issue #8: Voice Integration (STT + TTS)

## Parent

[PRD: PEL Appliance Chatbot & RAG Suite — Full Rebuild](../superpowers/specs/2026-07-06-pel-suite-rebuild-prd.md)

## What to build

Add voice input (speech-to-text) and voice output (text-to-speech) to both the customer and technician mobile apps, enabling hands-free interaction with the AI assistant.

**End-to-end behavior**: In the chat interface of either app, the user taps a microphone button next to the text input. The app listens to their speech, transcribes it to text, and populates the chat input. They can review/edit before sending, or it auto-sends after a silence pause. When the AI responds, each message bubble has a small play/speaker button. Tapping it reads the response aloud using the device's native TTS engine. The TTS language matches the response language (English or Urdu).

Specific deliverables:

1. **Voice input (STT)** in both apps:
   - Microphone button in the chat input bar (replaces or sits alongside the send button when input is empty)
   - Tap to start listening: button animates (pulse/glow) to indicate active recording
   - Speech recognized and transcribed in real-time, appearing in the text input field
   - Auto-stop after silence detection or tap to stop manually
   - User can edit the transcribed text before sending
   - Use Expo-compatible speech recognition (e.g., `expo-speech-recognition` or `@react-native-voice/voice`)
   - Handle permission requests for microphone access

2. **Voice output (TTS)** in both apps:
   - Each AI response message bubble has a small speaker/play icon button
   - Tapping plays the response text using `expo-speech`
   - While playing: button changes to a stop icon, with a subtle waveform animation on the message bubble
   - Tapping again stops playback
   - Language detection: configure TTS to use the appropriate language/voice (English vs Urdu) based on the response content
   - Queue management: if user taps play on another message while one is playing, stop the current and start the new one

3. **Visual feedback**:
   - Recording state: mic button pulses with a colored ring animation, input field shows "Listening..." placeholder
   - Playing state: speaker button highlighted, subtle waveform visualization on the message bubble
   - Smooth transitions between states

4. **Integration**:
   - Works in both customer app chat overlay and technician app diagnostic chat
   - Voice input feeds into the same chat send flow (query goes to streaming endpoint)
   - TTS works on both streamed responses (plays after stream completes) and loaded historical messages

## Acceptance criteria

- [ ] Microphone button appears in chat input bar of both apps
- [ ] Tapping mic starts speech recognition with visual recording indicator (pulse animation)
- [ ] Speech is transcribed to text in the input field in real-time
- [ ] User can edit transcribed text before sending
- [ ] Auto-stop after silence or manual stop via tap
- [ ] Each AI response has a speaker/play button
- [ ] Tapping play reads the message aloud using device TTS
- [ ] TTS language matches the response language (English/Urdu detection)
- [ ] Tapping play on a new message stops the currently playing one
- [ ] Microphone permission is requested and handled gracefully (denied state shows explanation)
- [ ] Voice features work in both customer and technician apps

## Blocked by

- [Issue #6: Customer App — Full Rebuild](./006-customer-app-rebuild.md)
- [Issue #7: Technician App — Full Rebuild](./007-technician-app-rebuild.md)
