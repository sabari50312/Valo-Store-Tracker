// Stand-in for expo-notifications' FCM topic module. Expo Go on Android ships
// without it (no push since SDK 53), and expo-notifications loads it on import,
// which crashes the app. We only use local notifications, so an empty module is
// enough: subscribeToTopicAsync() then throws "unavailable" instead.
export default {};
