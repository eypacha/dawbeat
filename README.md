# DawBeat

Browser-based ByteBeat DAW focused on fast timeline composition, formula-driven sound design, automation, and live control.

![DawBeat UI](docs/screenshots/dawbeat-ui.png)

## Overview

DawBeat combines a lightweight DAW workflow with a ByteBeat-first approach:

- Formula clips (mono or stereo).
- Variable tracks and value trackers to modulate formulas over time.
- Parameter automation and an audio effects chain.
- Playback, looping, automation recording, and offline export.
- Mobile companion controls for automation lanes via QR link.

The main app is desktop-oriented. On phones/tablets, the companion view is intended as a remote controller.

## Features

- Multi-track timeline with clip editing and section labels.
- Undo/redo history.
- Formula evaluation with visual previews.
- Variable tracks and value trackers with keyboard and MIDI input.
- Automation lanes with curve controls and live automation input.
- Audio effects (EQ, distortion, stereo widener, delay, compressor, reverb, limiter, and master gain).
- WAV and MP3 export (full render or looped render passes).
- Auto-save in localStorage plus JSON project import/export.
- Web MIDI support:
- MIDI input for bindings and live value capture.
- MIDI Clock receive for transport sync and effective BPM/sample-rate locking.
- PeerJS-based remote companion:
- Shareable lane control link/QR.
- Phone/tablet control on the companion route.

## Stack

- Vue 3 + Composition API
- Pinia
- Vue Router (hash history)
- Vite
- Tailwind CSS v4
- Tone.js (audio/effects)
- PeerJS (remote companion)
- lamejs (MP3 encoding)

## Requirements

- Node.js 20+ recommended
- Yarn
- Modern browser with Web Audio support
- For MIDI: browser with Web MIDI support (usually secure context: HTTPS or localhost)

## Installation

```bash
yarn install
```

## Development

```bash
yarn dev
```

Vite runs with --host, so you can open the app from other devices on your local network.

## Build and Preview

```bash
yarn build
yarn preview
```

## Scripts

- yarn dev: start development server.
- yarn build: create production build.
- yarn preview: preview production build locally.

## Quick Start

1. Click START to initialize audio.
2. Create or edit clips in the timeline.
3. Adjust BPM/measure/sample rate from the transport toolbar.
4. Enable loop to iterate on a section.
5. Use Export to generate WAV or MP3.
6. Save a project snapshot with Save JSON or load one with Open JSON.

You can also load bundled demos using Shuffle Demo.

## Keyboard Shortcuts

- Space: play/pause.
- L: toggle loop.
- ArrowLeft / ArrowRight: nudge selected clips.
- Shift + ArrowLeft / Shift + ArrowRight: nudge without strict snap behavior.
- ArrowUp / ArrowDown: adjust selected automation point value.
- Cmd/Ctrl + C: copy selected clips.
- Cmd/Ctrl + V: paste at playhead.
- Cmd/Ctrl + Z: undo.
- Cmd+Shift+Z or Ctrl+Y: redo.
- 0-9 and A-F: quick value input for value trackers (hex-like input).

## Mobile Companion

The app includes a dedicated remote-control route:

- Route: #/companion
- Connection: scan/open the shared QR link from an automation lane.
- Behavior: the companion sends gestures and values for subscribed lanes.

If you open the main app on mobile, you will see a desktop-only notice with guidance to use companion mode.

## Project Persistence and Format

- Auto-save: project state is saved in localStorage.
- Exchange: JSON import/export for sharing and backup.
- Version migration: payload normalization is applied on load for compatibility.

## Project Structure

```text
src/
  components/
    timeline/      # Timeline, lanes, menus, and editing
    transport/     # Toolbar, transport, export/settings/about
    effects/       # Audio effect UI
    companion/     # Remote controller view
    ui/            # Dialogs, panels, and base UI components
  services/        # Domain logic (audio, MIDI, export, persistence, formulas, etc.)
  stores/          # Global state (Pinia)
  engine/          # Timeline/formula evaluation runtime
  composables/     # Reusable UI and transport interactions
  views/           # DawView and CompanionView
```

## Architecture Notes

- In main.js, automatic project persistence is initialized only outside companion mode.
- Hash-based routing is used to simplify static hosting.
- Export rendering is offline and applies formulas, automation, and supported effects.

## Current Status

This repository is under active development and already includes a full functional base for composition, automation, MIDI workflows, and export.

