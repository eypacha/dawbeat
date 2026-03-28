# AGENTS.md

This document defines how an agent should work inside this repository.

The goal is to keep development:

- modular
- maintainable
- predictable
- easy to extend

## Real Project State

The project is no longer a simple timeline mockup.

Today it includes:

- start screen to unlock audio before entering the app
- real bytebeat playback in the browser with Web Audio + vendor `ByteBeat.js`
- toolbar with `record`, `play`, `pause`, `stop`, `loop`, `new/open/save JSON`, bundled demo shuffle, project metadata, share snapshot, WAV/MP3 export, `sampleRate` editing, editable BPM, BPM derived from a unit like `t >> 4`, `MIDI Clock` badge/lock state, and settings
- playhead scrubbing from the ruler and from the playhead
- horizontal zoom with `Ctrl/Cmd + wheel`
- timeline auto-scroll during playback
- timeline with four lane types:
  - formula tracks
  - variable tracks
  - value tracker tracks
  - automation lanes
- editable loop region
- vertical resizing for formula tracks, variable tracks, value tracker tracks, and automation lanes
- clip creation by drag on empty lanes
- moving clips within the lane and across compatible tracks
- start/end resize
- duplication with `Alt/Option + drag`
- temporary snap bypass with `Shift + drag`
- marquee multi-selection with `Shift + drag` in the timeline
- moving, duplicating, renaming, copying, ungrouping, deleting, and focused editing of clip groups
- copy/paste at the playhead
- nudging with left/right arrows
- undo/redo with store history
- track reorder and duplication
- track rename, color, mute, solo, `unionOperator`, and delete
- clips with inline formula
- formula editing through `FormulaInputDialog` for clips and variable clips
- hex editor for value tracker clips through `ValueTrackerClipEditorDialog`
- binding dialog for value trackers through `ValueTrackerBindingDialog`, with `keyboard`, `variable`, `midiCc`, `midiNote`, and MIDI Learn
- optional `MIDI Clock receive` from a single selected MIDI input, with runtime effective BPM/hz and slave transport (`Start`, `Continue`, `Stop`)
- `SettingsModal` uses tabs; `MIDI` is no longer an embedded block but a full tab
- value tracker clip recording from transport, with lane preview and optional auto-creation of the destination track
- optional waveform preview per clip
- optional evaluated formula panel
- copy of evaluated formulas from the footer for `Channel`, `Left Channel`, and `Right Channel`
- formula inspector / analysis for clips and evaluated expressions
- eval effects: `Stereo Offset`, `T Replacement`
- formula effects layer inside the `Master Gain` visualizer, rendered with `ByteBeat.js#getSamplesForTimeRange(...)`
- currently exposed audio effects: `EQ3`, `Distortion`, `Stereo Widener`, `Feedback Delay`, `Compressor`, `Limiter`, `Reverb`, and `Master Gain`
- automation lanes for `masterGain` and audio effect parameters
- final audio visualizer inside the `Master Gain` card
- per-segment automation curves with `Straight`, `Ease In`, `Ease Out`, and `Ease In-Out` (`Ease In-Out` by default)
- phone automation companion via PeerJS, opened from each automation lane header with a QR modal
- companion sessions persisted in `localStorage`, allowing the same phone to accumulate multiple automation lanes from the same host
- automatic persistence in `localStorage`
- separate formula library persistence in `localStorage`
- JSON project import/export
- immutable shared project snapshots via Supabase, with shared route loading
- project metadata dialog with name, description, author, and license used by exports and shared snapshots
- offline WAV and MP3 export with timeline render, loop renders, eval effects, master gain, supported audio effects, and offline automation
- keyboard override for value trackers with `0-9` and `A-F`
- landing route, full desktop layout with Library, Timeline, and Effects panels, a general mobile placeholder for the main DAW UI, a shared project route, and a dedicated mobile automation companion route

## What Not To Assume

Do not assume the timeline only handles formula tracks.
Today these also exist:

- `variableTracks`
- `valueTrackerTracks`
- `automationLanes`

Do not assume all editing happens inline in `TimelineClip.vue`.
Today there are separate dialogs and flows for:

- clip formulas and library formulas through `FormulaInputDialog`
- value tracker clips through `ValueTrackerClipEditorDialog`
- value tracker bindings through `ValueTrackerBindingDialog`
- track name/color
- value tracker track rename
- automation point curves through context menu

Do not assume clip and formula are always the same entity.
Today a formula clip always stores a `formula` inline.

Do not assume all modeled entities have a dedicated visible UI entrypoint.
`variableTracks` and `valueTrackerTracks` can appear through:

- loaded project
- project normalization
- initialization from `FormulaInputDialog`

Always verify the real entrypoint before documenting or modifying a flow.

Do not assume binding support implies full hardware integration.
Today `valueTrackerService` models:

- `keyboard`
- `variable`
- `midiCc`
- `midiNote`

but the effective integration today covers:

- keyboard override
- resolution through `variable` binding
- MIDI CC / MIDI Note input through `midiInputService` + `ValueTrackerBindingDialog`

Do not assume the `keyboard` type routes input through a dedicated binding path.
Today it still depends on the selected target in the UI.

Do not assume desktop, compact layout, and mobile share the same visible composition.
Today the app uses:

- desktop layout with Library + Timeline + Effects panels
- the current mobile placeholder instead of the full app for the main DAW route
- a dedicated automation companion route on mobile for phone-based remote automation control

Do not assume an existing component means an active feature.
Concrete example:

- `AudioBitCrusherItem.vue` exists in the tree
- the audio effects actually exposed today are the ones wired in `EffectsPanel.vue` + `audioEffectService.js`

Do not assume automatic parity between live playback and offline export.
Today both paths support audio effects and automation, but they live in separate implementations:

- `bytebeatService` for live playback
- `exportService` for offline

If a task touches audio, automation, or export, verify both paths separately.

Do not assume all persisted changes belong only to the musical domain.
Today UI flags are also persisted, such as:

- `showClipWaveforms`
- `showEvaluatedPanel`

Do not assume the BPM in the toolbar is read-only.
Today the real flow is:

- editing `bpmMeasure` (`t >> n` or `t / n`) recalculates the displayed BPM while keeping `sampleRate`
- editing the numeric BPM value recalculates `sampleRate` for that unit

Do not assume the `sampleRate` visible in the toolbar always matches `store.sampleRate`.
Today, when `MIDI Clock receive` is locked:

- the toolbar shows effective external `BPM`, `bpmMeasure`, and `hz` in read-only mode
- the `hz` override lives only at runtime
- no history or project persistence is written for each clock pulse

## Current Goal

The priority is to consolidate a composition flow that combines:

- formula tracks
- variable tracks
- value tracker tracks
- automation lanes
- bytebeat playback
- persistence
- history and editing utilities

without degrading editing, playback, export, or project restore.

The system must continue allowing:

- creating and editing formula clips
- moving clips within a track and across tracks
- duplicating clips and groups with modifiers
- creating, renaming, copying, and deleting groups of selected clips
- editing variable clip formulas
- editing value tracker clips by steps
- creating or initializing missing variables from the formula editor
- converting numeric initializers into value trackers from the formula editor
- playing the timeline
- moving the playhead manually
- combining audible tracks with `unionOperator`
- resolving active variables over time
- applying live value tracker input without breaking playback
- recording value tracker takes from keyboard/MIDI without breaking playback or history
- editing value tracker bindings and learning MIDI without breaking the composition flow
- automating `masterGain` and audio effect parameters
- editing project metadata and generating shared snapshot links
- saving, opening, and exporting projects

## Development Principles

### DRY

Do not duplicate logic.

If something is reused, move it into:

- `utils`
- `services`
- `composables`
- `stores`

Never copy and paste logic between timeline, library, automation, value tracker, effects, settings, export, or persistence.

### Modularity

Prefer small, explicit modules.

If a file grows beyond roughly 200-300 lines, consider splitting it.

Pay special attention to:

- `Timeline.vue`
- `TimelineTrack.vue`
- `TimelineClip.vue`
- `TimelineVariableTrack.vue`
- `TimelineValueTrackerTrack.vue`
- `TimelineAutomationLane.vue`
- `FormulaLibrary.vue`
- `EffectsPanel.vue`
- `dawStore.js`
- `useTransportPlayback.js`

because they concentrate interaction and can grow poorly.

### Small Components

Each Vue component should have a clear responsibility.

The UI should continue being composed with subcomponents instead of concentrating timeline, library, transport, effects, or dialogs into a single file.

## Stack

Frontend:

- Vue 3
- Vite
- Tailwind CSS 4

Global state:

- Pinia

Realtime controller connectivity:

- PeerJS
- `qrcode`

Audio:

- Web Audio API
- Tone.js for part of the offline render/export path
- vendor `ByteBeat.js`

UI / iconography:

- `lucide-vue-next`

Do not introduce heavy dependencies without justification.

## Forbidden Dependencies

Do not use:

- Monaco Editor
- heavy timeline libraries
- full UI frameworks

The UI should remain lightweight and controlled by the project.

## Current Architecture

Current architecture:

```text
UI
↓
Store
↓
Services / Composables
↓
Engine
↓
Bytebeat Service / Export / Persistence
↓
Web Audio / Tone Offline / File APIs / localStorage
```

Practical rule:

- the UI should not contain complex timeline, formula, variable, value tracker, automation, history, or effects logic if it can live in `services` or `composables`
- `dawStore` centralizes DAW state, actions, clipboard, selection, and history, while `libraryStore` persists library formulas separately
- `timelineEngine` decides the active expression and combines audible tracks
- `variableTrackService` resolves formula variables and variables coming from value trackers
- `valueTrackerService` resolves steps, holds, events, and live input
- `valueTrackerInputService` and `midiInputService` centralize keyboard/MIDI input into the store
- `automationService` resolves `masterGain` lanes and audio effect parameters
- `automationCompanionService` owns PeerJS host/client state, QR routes, multi-lane controller sessions, and remote automation messages
- `formulaService` resolves inline and referenced formulas
- `formulaWaveformService` renders waveform previews
- `useFormulaInspector` + `services/formulaAnalysis/*` own expression inspection and analysis
- `timelineLaneLayoutService` normalizes persistable lane heights
- `timelineSectionLabelService` manages timeline section markers and their normalization
- `bpmService` centralizes BPM/unit parsing and conversion helpers
- `midiClockService` owns runtime MIDI Clock lock state and transport sync commands
- `demoProjectService` resolves bundled demos from `src/data/*.json`
- `groupService` and `groupContextMenuService` own clip grouping and group actions
- `sharedProjectService` creates, deduplicates, fetches, and formats immutable shared snapshots
- visualizer services (`visualizerConfigService`, `visualizerFrameService`, `visualizerRenderer`) own visualizer configuration and frame rendering
- `bytebeatService` handles live audio integration
- `projectPersistence` normalizes, serializes, and restores projects

## Current Structure

```text
src/
  components/
    boot/
      StartScreen.vue
    companion/
      AutomationCompanionView.vue
    editor/
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
      TimelineSectionLabels.vue
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
      AboutModal.vue
      AutomationCompanionModal.vue
      Button.vue
      CollapseTransition.vue
      ConfirmDialog.vue
      ContextMenu.vue
      Divider.vue
      Dropdown.vue
      ExportModal.vue
      FloatingWindow.vue
      FormulaInputDialog.vue
      FormulaInspector.vue
      IconButton.vue
      Input.vue
      Modal.vue
      Panel.vue
      ProjectInfoDialog.vue
      SettingsModal.vue
      ShareProjectDialog.vue
      SnackbarContainer.vue
      SnackbarItem.vue
      SideDrawer.vue
      Tabs.vue
      TextInputDialog.vue
      Toolbar.vue
      TrackPresentationDialog.vue
      ValueTrackerBindingDialog.vue
      ValueTrackerClipEditorDialog.vue

  composables/
    useContextMenu.js
    useFormulaInspector.js
    usePointerEdgeAutoScroll.js
    useTimelineClipInteraction.js
    useTimelineLaneResize.js
    useTimelineMarqueeSelection.js
    useTransportPlayback.js

  data/
    defaultLibraryItems.js
    demo.json
    demo-boss-level.json
    demo-stereo-madness.json

  engine/
    timelineEngine.js

  i18n/
    locales/

  services/
    audioEffectService.js
    automationCompanionService.js
    automationService.js
    bpmService.js
    bytebeatNodeLoader.js
    bytebeatService.js
    clipboard.js
    dawStoreService.js
    demoProjectService.js
    evalEffectService.js
    exportService.js
    floatingWindowService.js
    formulaAnalysis/
      activityAnalyzer.js
      analysisConfig.js
      bitplaneAnalyzer.js
      periodAnalyzer.js
      pitchAnalyzer.js
      pitchStabilityAnalyzer.js
      rangeAnalyzer.js
    formulaService.js
    formulaWaveformService.js
    groupContextMenuService.js
    groupService.js
    keyboardShortcuts.js
    midiClockService.js
    midiInputService.js
    notifications.js
    projectPersistence.js
    sharedProjectService.js
    snapService.js
    timelineHeaderWidthService.js
    timelineLaneLayoutService.js
    timelineSectionLabelService.js
    timelineService.js
    trackPlaybackState.js
    trackUnionOperatorService.js
    valueTrackerInputService.js
    valueTrackerService.js
    variableTrackService.js
    visualizerConfigService.js
    visualizerFrameService.js
    visualizerRenderer.js

  stores/
    dawStore.js
    libraryStore.js

  utils/
    audioSettings.js
    colorUtils.js
    formulaTokenizer.js
    formulaValidation.js
    macroNodes.js
    projectTitle.js
    timeUtils.js
    visualizerPalettes.js

  views/
    CompanionView.vue
    DawView.vue
    LandingView.vue
```

The agent must respect this structure and extend it without mixing responsibilities.

## Central Store

The main global state lives in `dawStore`.

Relevant fields today:

```js
{
  audioReady: false,
  projectTitle: "Untitled",
  projectDescription: "",
  projectAuthor: "",
  projectLicense: "CC0",
  shared: false,
  sharedProjectMeta: null,
  playing: false,
  time: 0,
  zoom: 1,
  sampleRate: 8000,
  bpmMeasure: "t >> 4",
  tickSize: 1024,
  loopEnabled: false,
  loopStart: 0,
  loopEnd: 16,
  tracks: [],
  variableTracks: [],
  valueTrackerTracks: [],
  groups: [],
  audioEffects: [],
  evalEffects: [],
  automationLanes: [],
  automationLiveOverrides: {},
  automationRecordingArmed: false,
  masterGain: 1,
  showEvaluatedPanel: true,
  showClipWaveforms: true,
  timelineAutoscrollEnabled: true,
  snapToGridEnabled: true,
  snapSubdivision: TIMELINE_SNAP_SUBDIVISIONS,
  timelineSectionLabels: [],
  selectedClipIds: [],
  selectedClipId: null,
  selectedTrackId: null,
  selectedTimelineSectionLabelId: null,
  selectedValueTrackerTrackId: null,
  selectedAutomationPoint: null,
  editingClipId: null,
  editingGroupId: null,
  clipDragPreview: null,
  clipClipboard: null,
  valueTrackerRecordingSession: null,
  valueTrackerLiveInputs: {},
  historyPast: [],
  historyFuture: [],
  historyTransaction: null,
  historyApplying: false,
  historyRecording: false,
  formulaAnalysisCache: {}
}
```

Each formula track should be modeled like this:

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

Each formula clip should be modeled like this:

```js
{
  id: "clip-id",
  formula: "t*(t>>5|t>>8)", // optional
  formulaId: "formula-id",  // optional
  formulaName: "Bass",      // optional
  start: 0,
  duration: 4
}
```

Each variable track should be modeled like this:

```js
{
  name: "a",
  height: 44,
  clips: []
}
```

Each variable clip should be modeled like this:

```js
{
  id: "clip-id",
  formula: "0",
  start: 0,
  duration: 4
}
```

Each value tracker track should be modeled like this:

```js
{
  id: "value-track-id",
  name: "Value Tracker 1",
  binding: {
    type: null, // or "variable", "keyboard", "midiCc", "midiNote"
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

Each value tracker clip should be modeled like this:

```js
{
  id: "clip-id",
  start: 0,
  duration: 4,
  stepSubdivision: 4,
  values: [64, null, null, 96]
}
```

Each library formula should be modeled like this:

```js
{
  id: "formula-id",
  name: "Bass",
  formula: "t*(t>>5|t>>8)",
  leftFormula: "",
  rightFormula: "",
  formulaStereo: false,
  duration: 4
}
```

Each automation lane should be modeled like this:

```js
{
  id: "masterGain" || "audioEffect:<effectId>:<paramKey>",
  type: "masterGain" || "audioEffectParam",
  effectId: "audio-effect-id",   // only for audioEffectParam
  effectType: "delay",           // only for audioEffectParam
  paramKey: "wet",               // only for audioEffectParam
  height: 52,
  points: [
    { time: 0, value: 1, curve: "easeInOut" }
  ]
}
```

## Timeline

The timeline is the core of the app.

It must continue supporting:

- time grid
- formula tracks
- variable tracks
- value tracker tracks
- automation lanes
- single and multi clip selection
- marquee selection
- dragging within the track
- dragging across compatible lanes
- start/end resize
- vertical lane resizing
- drag preview
- clip creation by drag
- dropping formulas from the library
- editable loop region
- playhead and scrub
- horizontal zoom
- track reorder
- automation points

### Interactions That Already Exist And Must Not Break

- normal drag with snap enabled
- `Shift + drag` for temporary snap bypass
- `Alt/Option + drag` to duplicate on drop
- `Shift + drag` on empty area for marquee selection
- drag formula from library to lane to create a clip
- drag formula from library to clip to reassign the reference
- double click on formula clip to edit the formula
- double click on variable clip to edit the variable formula
- double click on value tracker clip to open the hex editor
- click on automation lane to create a point
- drag automation point to move it
- context menu on automation point to change the following segment curve
- click on the phone button in an automation lane header to open the QR modal for the automation companion
- `Delete` / `Backspace` on the selected automation point to delete it
- mute per track
- solo per track
- copy/paste of clips
- nudge with arrows
- undo/redo
- `Space` for play/pause
- `L` for loop
- `Ctrl/Cmd + wheel` for zoom
- `0-9` and `A-F` for keyboard override of the active value tracker

If a timeline, formula, or automation interaction is modified, always verify these cases.

## Playback

Current playback uses real bytebeat.

Rules:

- do not remove or degrade the integration with `bytebeatService`
- any change in clips, tracks, formulas, variables, value trackers, `unionOperator`, mute, or solo must keep the active expression consistent
- `timelineEngine.getActiveFormula` must ignore non-audible tracks
- `timelineEngine.getActiveFormula` must prepend active definitions coming from `variableTracks` and `valueTrackerTracks`
- `formulaService` must continue resolving inline and referenced formulas correctly
- eval effects must continue applying before sending expressions to playback
- the evaluated panel must continue reflecting the effective expression after eval effects
- `valueTrackerLiveInputs` can temporarily override the value of a value tracker during playback or scrub
- `automationLiveOverrides` can temporarily override an automation lane value during playback when a phone controller is connected and automation writing is not armed

## Formulas, Variables, and Value Trackers

Current state:

- formula clips store inline formula
- variable clips store inline formula and do not use `formulaId`
- value tracker clips store discrete steps/values
- double click on a clip opens the correct editor according to `laneType`
- binding editing exists through `ValueTrackerBindingDialog`
- `SettingsModal` exposes MIDI enable/refresh and recent messages
- value tracker recording from transport exists through `valueTrackerRecordingSession`
- `FormulaInputDialog` can detect missing variables
- `FormulaInputDialog` can initialize missing variables as variable tracks
- `FormulaInputDialog` can convert numeric initializers into value trackers with `variable` binding

If this flow is modified:

- do not duplicate resolution logic between clip and library
- use `formulaService`, `variableTrackService`, and `valueTrackerService` where appropriate
- preserve the flows `ensureInitializedVariableTracks`, `ensureInitializedValueTrackerTracks`, `updateValueTrackerTrackBinding`, `startValueTrackerRecording`, and `finishValueTrackerRecording`

## Effects and Automation

Today there are two categories of effects:

- eval effects: transform the bytebeat expression before playback/render
- audio effects: transform the audio signal in live and offline paths when the effect is supported

Currently implemented and exposed:

- eval: `Stereo Offset`, `T Replacement`
- audio: `EQ3`, `Distortion`, `Stereo Widener`, `Feedback Delay`, `Compressor`, `Limiter`, `Reverb`
- master gain: `Master Gain`

Current automation:

- `masterGain` lane
- per-audio-effect-parameter lanes
- per-segment curves: `Straight`, `Ease In`, `Ease Out`, `Ease In-Out` (`Ease In-Out` by default)
- remote phone controllers per automation lane through PeerJS + QR
- companion sessions can retain multiple subscribed lanes for the same host across rescans on the same phone
- with `Record` disarmed, remote phone moves apply live runtime overrides
- with `Record` armed, remote phone moves write automation points and participate in history transactions

If a task touches effects or automation:

- do not mix formula effects with audio effects
- validate impact on live playback
- validate impact on offline export separately
- do not break effect reorder, enable/disable, or expand/collapse
- do not break creation, editing, and deletion of automation lanes and points
- do not serialize runtime-only remote override state into the project unless the project model explicitly changes

## Persistence and Export

Today there is:

- automatic save in `localStorage`
- separate `localStorage` persistence for library formulas through `libraryStore`
- separate `localStorage` persistence for automation companion controller sessions
- JSON project import
- JSON project export
- local storage reset
- immutable shared project snapshots via Supabase and shared project loading from `/#/app/p/:id`
- offline WAV and MP3 export, including loop-count renders
- project normalization with `version: 25`
- persistence of `projectTitle`, `projectDescription`, `projectAuthor`, `projectLicense`, and shared project metadata (`projectMeta`)
- persistence of `tracks`, `variableTracks`, `valueTrackerTracks`, `groups`, and `timelineSectionLabels`
- persistence of `audioEffects`, `evalEffects`, `automationLanes`, `masterGain`
- persistence of `zoom`, `loopStart`, `loopEnd`, `loopEnabled`, `sampleRate`, `bpmMeasure`, `tickSize`, `timelineAutoscrollEnabled`, `snapToGridEnabled`, and `snapSubdivision`
- persistence of `height` inside formula tracks, variable tracks, value tracker tracks, and automation lanes
- persistence of `showClipWaveforms` and `showEvaluatedPanel`
- formula library items are not embedded in project JSON; they are managed separately by `libraryStore`
- `automationLiveOverrides`, `automationRecordingArmed`, selection state, drag previews, and live input state are runtime-only and are not part of project serialization

If the project shape changes:

- update `projectPersistence`
- preserve normalization compatibility when reasonable
- review `demo.json`

## Agent Responsibilities

When the agent implements a feature:

1. evaluate whether it requires new modules
2. avoid duplicating logic
3. split complex components
4. keep the architecture clear
5. verify impact on playback, formulas, variables, value trackers, automation, persistence, export, and history

## What NOT To Do

The agent must not:

- create monolithic files
- duplicate drag, resize, selection, clipboard, automation, or formula resolution logic
- introduce unnecessary dependencies
- mix UI with complex timeline, audio, history, automation, or persistence logic
- break current bytebeat playback
- document features as implemented if they are still partial or not wired
- assume offline export and live playback are the same internal path

## Current Priorities

Recommended order:

1. consolidate the existing timeline and transport
2. consolidate shared formulas, variables, and value trackers
3. consolidate audio effect and master gain automation
4. preserve playback and offline export integrity
5. keep persistence, import/export, history, and effects stable

## Goal of This Stage

Build a solid base for composing formulas and modulations over time, while keeping these aligned:

- timeline interaction
- global state
- formula library
- variable tracks
- value tracker tracks
- automation lanes
- bytebeat playback
- project persistence
- history, clipboard, and editing utilities

The next iterations should build on this structure, not replace it unnecessarily.
