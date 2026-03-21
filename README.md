# DawBeat

Experimental DAW for composing bytebeat formulas on a timeline with real browser playback.

The app is no longer just a mockup of formula clips. It now integrates bytebeat playback, formula tracks, variable tracks, value tracker tracks, automation lanes, a library, effects, persistence, and offline export.

## Current Status

Implemented today:

- start screen to unlock audio before entering the app
- real playback with Web Audio + `public/vendors/ByteBeat.js`
- toolbar with `record`, `play`, `pause`, `stop`, `loop`, `new/open/save project`, `export WAV`, settings, `sampleRate` editing, editable BPM, BPM calculation based on a unit like `t >> 4`, and `MIDI Clock` badge/lock state
- playhead scrubbing from the ruler and from the playhead itself
- horizontal zoom with `Ctrl/Cmd + wheel`
- timeline auto-scroll during playback
- timeline with:
  - formula tracks
  - variable tracks
  - value tracker tracks
  - automation lanes
  - editable loop region
- vertical resizing for formula tracks, variable tracks, value tracker tracks, and automation lanes
- clip creation by dragging over empty lanes
- moving clips within a lane and across compatible tracks
- clip start/end resize
- duplication with `Alt/Option + drag`
- temporary snap bypass with `Shift + drag`
- marquee multi-selection with `Shift + drag`
- moving and duplicating groups of selected clips
- copy/paste of clips at the playhead
- nudging selected clips with left/right arrows
- undo/redo with store history
- track reorder and duplication
- track rename, color, mute, solo, and delete
- per-track union operator (`|`, `+`, `-`, `*`, `<<`, `>>`, `&`, `^`, `%`)
- fully working formula library with create, select, edit, delete, and drag and drop
- clips with inline formula or `formulaId` reference
- formula editing via dialog for clips, library formulas, and variable clips
- hex editor for value tracker clips
- binding dialog for value trackers with `keyboard`, `variable`, `midiCc`, and `midiNote`, including MIDI Learn
- optional `MIDI Clock receive` from a selected MIDI input, with runtime effective BPM/hz and slave transport (`Start`, `Continue`, `Stop`)
- value tracker clip recording from transport with lane preview and optional auto-creation of the destination track
- initialization of missing variables from the formula editor
- conversion of numeric initializers into value trackers from the formula editor
- optional real-time evaluated expression panel
- copy of evaluated formulas from the footer for `Channel`, `Left Channel`, and `Right Channel`
- optional waveform preview per clip
- formula effects: `Stereo Offset`, `T Replacement`
- formula effects layer inside the `Master Gain` visualizer, rendered with `ByteBeat.js#getSamplesForTimeRange(...)`
- currently exposed audio effects: `EQ3`, `Distortion`, `Stereo Widener`, `Feedback Delay`, `Compressor`, `Limiter`, `Reverb`, and `Master Gain`
- automation lanes for `masterGain` and audio effect parameters
- final audio visualizer inside the `Master Gain` card
- per-segment automation curves with `Straight`, `Ease In`, `Ease Out`, and `Ease In-Out` (`Ease In-Out` by default)
- automatic persistence in `localStorage`
- JSON project import/export
- offline WAV export
- full desktop layout, compact layout with side drawers for Library/Effects, and the current mobile placeholder

## Important Notes

- the timeline is no longer only about formula clips; `variableTracks` and `valueTrackerTracks` participate in the active expression
- value tracker bindings model `keyboard`, `variable`, `midiCc`, and `midiNote`; today the wired paths are keyboard override for the selected target, `variable` binding resolution, and MIDI CC/Note input through `midiInputService`
- the `keyboard` binding type still depends on the selected target; it does not route through a dedicated binding path the way `midiCc` and `midiNote` do
- live playback and offline export both support audio effects and automation, but they are still separate internal paths; if you touch audio or export, verify both
- the repo contains some files that do not necessarily represent features currently exposed in the UI; for the real state, use `EffectsPanel.vue`, `dawStore.js`, and `projectPersistence.js` as source of truth

## Stack

- Vue 3
- Vite
- Tailwind CSS 4
- Pinia
- Web Audio API
- Tone.js for part of the offline render path
- `public/vendors/ByteBeat.js`
- `lucide-vue-next`

## Running It

```bash
pnpm install
pnpm dev
```

Production build:

```bash
pnpm build
```

Local preview:

```bash
pnpm preview
```

## Current Interactions

- `Click` on formula clip: selects the clip
- `Double click` on formula clip: opens formula editing for that clip
- `Double click` on variable clip: opens variable formula editing
- `Double click` on value tracker clip: opens the clip hex editor
- `Drag` on formula clip: moves it with snap enabled
- `Shift + drag` on clip: moves it without snap
- `Alt/Option + drag` on clip: duplicates on drop
- `Drag` across compatible tracks: moves the clip to the destination lane
- `Drag` on side handles: resize
- `Shift + drag` during resize: resize without snap
- `Shift + drag` on an empty timeline area: marquee multi-selection
- `Drag` on empty space in a lane: creates a clip of that lane type
- `Drag` a formula from Library to a lane: creates a clip referencing that formula
- `Drag` a formula from Library to a clip: reassigns the clip formula
- `Drag` the track header: reorders tracks
- `Click` in Library: selects a formula
- `Double click` in Library: opens library formula editing
- `Click` on automation lane: creates an automation point
- `Drag` an automation point: moves the point
- `Context menu` on automation point: changes the following segment curve or removes the point
- `Context menu` on value tracker header: rename, delete, or edit binding
- `Click` on the keyboard target button of a value tracker: arms/disarms the track for keyboard override
- `Settings > MIDI input`: enables/refreshes Web MIDI, shows recent messages, and allows configuring `MIDI Clock receive`
- `Settings`: uses tabs; `MIDI` lives as a dedicated tab with inputs, clock, and debug
- `Record`: starts/ends value tracker recording on the active target; if there is no target, it can auto-create one
- editing `BPM`: recalculates `sampleRate` for the current unit (`t >> n` or `t / n`)
- editing the BPM unit (`t >> n` or `t / n`): recalculates BPM while keeping `sampleRate`
- with `MIDI Clock` locked: `BPM`, unit, and `hz` become read-only and show the effective external values
- `0-9` and `A-F`: send live input to the active value tracker for keyboard override
- `Space`: play/pause
- `L`: toggle loop
- `Cmd/Ctrl + C`: copy selected clips
- `Cmd/Ctrl + V`: paste clips at the playhead
- `Cmd/Ctrl + Z`: undo
- `Cmd/Ctrl + Shift + Z` or `Ctrl + Y`: redo
- `ArrowLeft` / `ArrowRight`: nudge selected clips
- `Delete` or `Backspace`: delete selected clip(s) or the selected automation point
- `Esc`: clears selection when no editor is open

## Playback Rules

- snap to grid is enabled by default
- `Shift` disables snap only during the current gesture
- `Alt/Option` confirms duplication on `pointerup`
- muted tracks do not participate in the active expression
- if at least one track is soloed, only `soloed` tracks participate in the active expression
- `timelineEngine` combines active audible clips using each track’s `unionOperator`
- then it prepends active definitions coming from `variableTracks` and `valueTrackerTracks`
- `formulaService` resolves inline and referenced clips before applying eval effects
- the evaluated panel shows the effective expression that reaches playback after eval effects are applied
- `valueTrackerLiveInputs` allows live value tracker override during playback or scrub
- during recording, keyboard/MIDI input can be captured into `valueTrackerRecordingSession` and consolidated as a clip when recording ends

## Formula Editor, Variables, and Value Trackers

- `FormulaInputDialog` validates and highlights formula tokens
- if a formula uses missing variables, the dialog can initialize them
- a text initializer creates a `variableTrack`
- a numeric initializer can be converted into a `valueTrackerTrack` with `variable` binding
- value tracker clips edit a per-step hex grid with `SET`, `HOLD`, and `EMPTY` states
- `ValueTrackerBindingDialog` allows editing the binding, choosing device/channel/controller/note, and using MIDI Learn
- `SettingsModal` exposes MIDI enable/refresh and debug for inputs/recent messages
- the evaluated panel and playback use the combined result of tracks, variables, and value trackers according to the current time

## Effects and Automation

Current eval effects:

- `Stereo Offset`
- `T Replacement`

Currently exposed audio effects:

- `EQ3`
- `Distortion`
- `Stereo Widener`
- `Feedback Delay`
- `Compressor`
- `Limiter`
- `Reverb`
- `Master Gain`

Current automation:

- `masterGain` lane
- per-audio-effect-parameter lanes
- per-segment curves on automation points: `Straight`, `Ease In`, `Ease Out`, `Ease In-Out` (`Ease In-Out` by default)

Live playback resolves automation by time.
Offline export renders the timeline, eval effects, master gain, supported audio effects, and offline automation for the current project.

## Persistence

- on startup, the app tries to load the project saved in `localStorage`
- if none exists, it starts from `src/data/demo.json`
- `projectPersistence` normalizes imported projects and serializes the persistable state
- the current project serializes `version: 14`
- persisted fields include `tracks`, `variableTracks`, `valueTrackerTracks`, `formulas`, `audioEffects`, `evalEffects`, `automationLanes`, `masterGain`, `bpmMeasure`, `zoom`, `loopStart`, `loopEnd`, `loopEnabled`, `sampleRate`, `tickSize`, `showClipWaveforms`, and `showEvaluatedPanel`, including `height` inside tracks and lanes
- `MIDI Clock receive` is not serialized into the project and does not write persisted `sampleRate`; it only applies a runtime override to the live engine
- from the toolbar you can create an empty project, open JSON, save JSON, and export WAV
- from Settings you can reset local storage, toggle waveform/evaluated panel, and inspect MIDI

## Current Structure

```text
src/
  components/
    boot/
      StartScreen.vue
    effects/
      AudioOutputVisualizer.vue
      AudioBitCrusherItem.vue
      AudioCompressorItem.vue
      AudioDelayItem.vue
      AudioDistortionItem.vue
      AudioEqItem.vue
      AudioLimiterItem.vue
      AudioMasterGainItem.vue
      AudioReverbItem.vue
      AudioStereoWidenerItem.vue
      EffectItem.vue
      EffectsPanel.vue
      EvalEffectItem.vue
      EffectParamAutomationButton.vue
    evaluated/
      EvaluatedPanel.vue
    library/
      FormulaLibrary.vue
    timeline/
      AutomationCurveMenu.vue
      Playhead.vue
      Timeline.vue
      TimelineAutomationLane.vue
      TimelineClip.vue
      TimelineClipPreview.vue
      TimelineClipWaveform.vue
      TimelineLoopRegion.vue
      TimelineTrack.vue
      TimelineValueTrackerClip.vue
      TimelineValueTrackerTrack.vue
      TimelineVariableClip.vue
      TimelineVariableTrack.vue
      TrackColorPalette.vue
      TrackUnionOperatorMenu.vue
    transport/
      Toolbar.vue
    ui/
      Button.vue
      CollapseTransition.vue
      ConfirmDialog.vue
      ContextMenu.vue
      Divider.vue
      Dropdown.vue
      FormulaInputDialog.vue
      IconButton.vue
      Input.vue
      Modal.vue
      Panel.vue
      SettingsModal.vue
      SnackbarContainer.vue
      SnackbarItem.vue
      SideDrawer.vue
      TextInputDialog.vue
      Toolbar.vue
      TrackPresentationDialog.vue
      ValueTrackerBindingDialog.vue
      ValueTrackerClipEditorDialog.vue
  composables/
    useContextMenu.js
    usePointerEdgeAutoScroll.js
    useTimelineClipInteraction.js
    useTimelineLaneResize.js
    useTimelineMarqueeSelection.js
    useTransportPlayback.js
  engine/
    timelineEngine.js
  services/
    audioEffectService.js
    automationService.js
    bytebeatNodeLoader.js
    bytebeatService.js
    dawStoreService.js
    evalEffectService.js
    exportService.js
    formulaService.js
    formulaWaveformService.js
    keyboardShortcuts.js
    midiInputService.js
    notifications.js
    projectPersistence.js
    snapService.js
    timelineLaneLayoutService.js
    timelineService.js
    trackPlaybackState.js
    trackUnionOperatorService.js
    valueTrackerInputService.js
    valueTrackerService.js
    variableTrackService.js
  stores/
    dawStore.js
  utils/
    audioSettings.js
    colorUtils.js
    formulaTokenizer.js
    formulaValidation.js
    macroNodes.js
    timeUtils.js
```

## Current Architecture

```text
UI
↓
Pinia Store
↓
Services / Composables
↓
Timeline Engine
↓
Bytebeat Service / Export / Persistence
↓
Web Audio / Tone Offline / File APIs / localStorage
```

Practical notes:

- `timelineEngine` decides the active expression based on time, audible tracks, active variables, and active value trackers
- `formulaService` resolves name and code for both inline and referenced clips
- `variableTrackService` and `valueTrackerService` participate in resolving definitions prepended to the active formula
- `automationService` resolves `masterGain` and audio effect parameters by time
- `timelineLaneLayoutService` normalizes persistable lane heights
- `valueTrackerInputService` and `midiInputService` centralize keyboard/MIDI input into the store
- `bytebeatService` controls live audio, sample rate, master gain, and the real-time audio chain
- `exportService` uses a separate offline Tone.js path to render WAV
- `projectPersistence` normalizes, versions, and serializes projects

## Main Models

Formula track:

```js
{
  id: "track-id",
  color: "#6366f1",
  muted: false,
  soloed: false,
  unionOperator: "|",
  name: undefined,
  height: 80,
  clips: []
}
```

Formula clip:

```js
{
  id: "clip-id",
  formula: "t*(t>>5|t>>8)", // optional if not referencing the library
  formulaId: "formula-id",  // optional
  formulaName: "Bass",      // optional
  start: 0,
  duration: 4
}
```

Variable track:

```js
{
  name: "a",
  height: 44,
  clips: []
}
```

Variable clip:

```js
{
  id: "clip-id",
  formula: "0",
  start: 0,
  duration: 4
}
```

Value tracker track:

```js
{
  id: "value-track-id",
  name: "Value Tracker 1",
  binding: {
    type: null,
    deviceId: null,
    channel: null,
    controller: null,
    note: null,
    variableName: null
  },
  height: 64,
  clips: []
}
```

Value tracker clip:

```js
{
  id: "clip-id",
  start: 0,
  duration: 4,
  stepSubdivision: 4,
  values: [64, null, null, 96]
}
```

Formula:

```js
{
  id: "formula-id",
  name: "Bass",
  code: "t*(t>>5|t>>8)"
}
```

Automation lane:

```js
{
  id: "masterGain" || "audioEffect:<effectId>:<paramKey>",
  type: "masterGain" || "audioEffectParam",
  effectId: "audio-effect-id",   // only for audioEffectParam
  effectType: "delay",           // only for audioEffectParam
  paramKey: "wet",               // only for audioEffectParam
  height: 52,
  points: [{ time: 0, value: 1 }]
}
```
