import 'package:firebase_core/firebase_core.dart';

class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'ACE_API_BASE_URL',
    defaultValue: 'https://api.acestudio.global',
  );
  
  static const environment = String.fromEnvironment(
    'ACE_ENVIRONMENT',
    defaultValue: 'production',
  );

  static const firebaseApiKey = String.fromEnvironment('ACE_FIREBASE_API_KEY');
  static const firebaseAppId = String.fromEnvironment('ACE_FIREBASE_APP_ID');
  static const firebaseMessagingSenderId = String.fromEnvironment(
    'ACE_FIREBASE_MESSAGING_SENDER_ID',
  );
  static const firebaseProjectId = String.fromEnvironment('ACE_FIREBASE_PROJECT_ID');
  static const firebaseAuthDomain = String.fromEnvironment('ACE_FIREBASE_AUTH_DOMAIN');
  static const firebaseStorageBucket = String.fromEnvironment('ACE_FIREBASE_STORAGE_BUCKET');
  static const iosBundleId = String.fromEnvironment('ACE_IOS_BUNDLE_ID');

  static bool get hasFirebaseConfig =>
      firebaseApiKey.isNotEmpty &&
      firebaseAppId.isNotEmpty &&
      firebaseMessagingSenderId.isNotEmpty &&
      firebaseProjectId.isNotEmpty;

  static FirebaseOptions get firebaseOptions => FirebaseOptions(
        apiKey: firebaseApiKey,
        appId: firebaseAppId,
        messagingSenderId: firebaseMessagingSenderId,
        projectId: firebaseProjectId,
        authDomain: firebaseAuthDomain.isEmpty ? null : firebaseAuthDomain,
        storageBucket: firebaseStorageBucket.isEmpty ? null : firebaseStorageBucket,
        iosBundleId: iosBundleId.isEmpty ? null : iosBundleId,
      );
}
