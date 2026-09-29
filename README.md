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

## RevenueCat subscriptions

Purchases use `react-native-purchases` and the native iOS/Android SDK. Expo Go does not include that native module; make a development build after installing dependencies (for example, `npx expo run:ios` or `npx expo run:android`). The web build keeps the rest of the app available but does not offer purchases.

### RevenueCat dashboard setup

1. Create the `go_beyond_pro` entitlement.
2. Create monthly and yearly subscription products in RevenueCat Test Store. Link both products to `go_beyond_pro`.
3. Create a `default` offering with Monthly and Annual packages using those products. This app renders the current offering packages in its Go Beyond Pro paywall, so package changes and localized prices come from RevenueCat.
4. Copy the Test Store API key to `.env` as `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY`, restart Expo, then rebuild the native app. The Test Store runs sandbox purchases without App Store or Play Store setup.
5. Apply all pending Supabase migrations, including `0005_monetization.sql`, `0006_push_me_daily_limit.sql`, and `0007_generated_challenge_history.sql`. Challenge entries increment an account-level counter in the same database transaction. Resetting or deleting journal history does not lower it.

Go Beyond Pro also includes one **Push Me** challenge per account day. It targets the user's weakest growth area, steps the difficulty above their usual level when possible, and asks the existing journal-aware challenge generator for a safe, achievable stretch. Its used date is persisted on the profile, including across app restarts and progress resets. The `generate-challenge` Edge Function verifies the `go_beyond_pro` entitlement with RevenueCat before generating a Push Me challenge, then uses Gemini to generate it. The function checks today's visible tasks and a persistent record of previously offered AI challenges, retries when Gemini suggests a similar action, and only returns a challenge after reserving its text. If it cannot find a distinct action after three attempts, Push Me shows an error and can be retried without consuming the day's use. Apply migration `0007` before deploying the updated function. Set both server-side secrets and deploy:

The Zone screen's personalized graph, next-edge insight, and per-dimension progress breakdown are Pro features. Free users keep basic challenge progress and journal history.

```sh
supabase secrets set REVENUECAT_SECRET_API_KEY="<RevenueCat secret API key>" GEMINI_API_KEY="<Google AI Studio API key>"
supabase functions deploy generate-challenge
```

Before any production store submission, add the platform-specific RevenueCat public keys as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` in the release build environment and configure real store products. Development builds use the Test Store key; release builds select the platform key. Never ship a Test Store key in a release build.

### Shipaton judge access

Judge access is a time-limited RevenueCat promotional grant for the same `go_beyond_pro` entitlement used by subscribers. There is no global app bypass and no judge code in the client bundle.

1. Set the judge code and RevenueCat **secret** API key as Supabase function secrets. Choose a code with high entropy and share it in the Shipaton submission instructions:

   ```sh
   supabase secrets set JUDGE_ACCESS_CODE="<private judge code>" REVENUECAT_SECRET_API_KEY="<RevenueCat secret API key>" JUDGE_ACCESS_DURATION="six_month"
   supabase functions deploy judge-access
   ```

2. A judge signs in to Go Beyond, reaches the paywall after challenge five (or opens it from Profile), selects **Have a Shipaton judge code?**, enters the code, and taps **Activate judge access**.
3. The authenticated Edge Function grants that Supabase account a six-month RevenueCat promotional entitlement. The client refreshes RevenueCat CustomerInfo; Pro access is unlocked only after RevenueCat reports `go_beyond_pro` active.
4. Include the code and those activation steps in the Shipaton submission. Rotate `JUDGE_ACCESS_CODE` after judging. `JUDGE_ACCESS_DURATION` can be `three_month`, `six_month`, or `yearly`.

To test a normal purchase, use a development build and RevenueCat Test Store. The paywall's Restore purchases action uses the native store restore flow.

Pro users can open **Profile → Manage or cancel subscription** to reach the App Store or Google Play subscription settings. RevenueCat supplies the platform-specific management link; the app falls back to the store's subscription settings page if the link is missing. Cancellation is completed by the store, and Pro remains active until the paid period ends. RevenueCat Test Store and judge promotional access do not have a paid store subscription to cancel; Test Store subscriptions automatically expire after up to five renewals.

Users can permanently delete their account from **Profile → Danger zone → Delete account**. The `delete-account` Edge Function verifies the signed-in user and deletes their Supabase Auth account; the database cascades deletion to their profile and journal entries. Account deletion does not cancel an App Store or Google Play subscription, so the confirmation explains that users need to cancel store billing separately.

Deploy the account deletion function with:

```sh
supabase functions deploy delete-account
```
