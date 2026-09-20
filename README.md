# Go Beyond

React Native (Expo) + TypeScript implementation of the Go Beyond redesign.
Core idea: your comfort zone is a shape, and every challenge pushes its edge a little further out.

## Run it

```bash
npm install
npx expo start        # press a for Android, i for iOS, or scan the QR code with Expo Go
npx expo install --check   # optional: confirms native module versions match your Expo SDK
```

Uses Expo SDK 57, React Navigation 7, Reanimated 4 (with `react-native-worklets`), and `react-native-svg`.
No extra Babel config is needed; `babel-preset-expo` wires up the worklets plugin.
Type-check with `npx tsc --noEmit`.

## Structure

```
App.tsx                      fonts + providers
src/
  data/content.ts            dimensions, baseline questions, challenge library, XP and gain tables
  state/store.tsx            reducer + AsyncStorage persistence + the adaptive logic
  navigation/                root stack (onboarding / main / focus / complete) and bottom tabs
  screens/                   Baseline, Reveal, Today, Focus, Complete, Zone, Journal
  components/                RadarChart, Button, TabBar, CaptureSheet, Confetti, Ripples, ...
  theme/                     tokens (light + dark), motion constants (springs, easing, stagger)
  lib/                       date helpers and small hooks
```

## How it adapts

- `scoreBaseline` turns the 8 answers into a starting zone (0..1 per dimension).
- `ensureToday` picks the weakest dimension (never the same one two days in a row) and a level from that zone value.
- "Make it smaller" drops one level for today only.
- Completing a challenge moves that dimension's zone by 0.02 / 0.04 / 0.06 (levels 1 / 2 / 3), adds XP,
  and updates the streak. Moments are logged but never score.

Tune the numbers in `src/data/content.ts` (`GAIN`, `XP`, `EDGE_GAP`) and the thresholds in `levelFor` (`src/state/store.tsx`).

## Motion

- `theme/motion.ts` holds the springs and the one easing curve. Touch uses springs, scenes and lists use the easing.
- `PressableScale` gives every tappable thing the same press feel.
- `StaggerIn` and `WordReveal` handle entrances; tab screens remount on focus (`useReplayKey`) so they replay.
- `RadarChart` animates the zone with a spring that overshoots slightly. Everything runs on the UI thread.
- Confetti, count-ups, the tab pill, and the capture sheet are in their own components.

To add a screen-level transition, set `animation` on the screen in `RootNavigator.tsx`.

## Notes

- State lives in one reducer. To reset during development, call `resetAll()` from `useStore()`.
- Haptics are on for taps, selection, and the completion celebration.
- Reduced motion: Reanimated respects the system setting for its layout animations. If you want to also
  disable the custom loops (ripples, flame), gate them with `useReducedMotion()` from `react-native-reanimated`.
