// Supabase's JS client expects a browser-style URL global, which React Native
// doesn't have. Must be the very first import, before anything that touches
// networking (including Supabase itself) runs.
import 'react-native-url-polyfill/auto';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
