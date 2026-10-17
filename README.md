# Tiny Desktop Pet

A small Electron desktop companion for Windows and macOS, based on the supplied character reference. It runs as a transparent, frameless, always-on-top pet window plus a draggable avatar button. It is not a webpage demo.

## Start it (first time)
1. Install **Node.js LTS** from https://nodejs.org/ if it is not already installed.
2. Open this folder and double-click `start-windows.bat` (Windows) or `start-mac.command` (macOS). The first run downloads Electron, so an internet connection is needed.
3. The pet and small summon avatar should appear. Right-click the pet to hide it. Click the pet to chat.

## If the pet disappears
Double-click `bring-pet-back.bat` on Windows or `bring-pet-back.command` on macOS. This starts the app if needed and opens the pet again, resetting the summon button to the screen edge.

## Settings and tray
Use the system-tray icon for Summon Pet, Chat, Settings, pause controls, and Quit. Settings include visit and water intervals, size, animation speed, quiet hours, startup, and AI mode. Reminder/check-in visits are disabled during a pause; manual summon still works.

## AI mode and API key
Basic chat works offline with built-in replies. To enable AI, open Settings, enable AI chat, and paste your OpenAI API key. The app stores the key encrypted using Electron `safeStorage` when the operating system supports it. In AI mode, chat text is sent to OpenAI's API. Keep your key private; do not share the app's user-data folder. The model is configured as `gpt-4o-mini` in `main.js`.

## Customize
- `config/personality.txt`: editable pet personality/system prompt.
- `config/messages.json`: editable reminder message categories.
- `assets/pet-reference.jpg`: the provided character image. Replace it with a transparent PNG for cleaner edges if you have one. Animation is created in CSS and can later be replaced/extended with sprite frames.
- `renderer/pet.css`: bobbing, walking, and enter/leave animation.

## Local data and privacy
Settings are stored in Electron's user-data directory. Chat history only lives in the open chat window and is not saved. No OS notifications are used. The app does not send reminder messages anywhere. AI mode sends only the chat message and personality prompt to the OpenAI API.

## Troubleshooting
- If first launch fails, confirm Node.js is installed and internet access is available, then run `npm install` in this folder and launch again with `npm start`.
- To check JavaScript syntax, run `npm run check`.
- On macOS, if the shell script is not executable, right-click it, choose Open, or run `chmod +x start-mac.command bring-pet-back.command` in Terminal.
- This source project is intended to be run locally. For a distributable installer, use Electron Forge or electron-builder to package it for each target operating system.
