import 'dart:convert';

import 'package:firebase_core/firebase_core.dart';
import 'package:http/http.dart' as http;

class AppConfig {
  static const apiBaseUrl = String.fromEnvironment(
    'ACE_API_BASE_URL',
    defaultValue: 'https://www.acestudio.ng',
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

  static bool get hasBuildFirebaseConfig =>
      firebaseApiKey.isNotEmpty &&
      firebaseAppId.isNotEmpty &&
      firebaseMessagingSenderId.isNotEmpty &&
      firebaseProjectId.isNotEmpty;

  static FirebaseOptions get buildFirebaseOptions => FirebaseOptions(
        apiKey: firebaseApiKey,
        appId: firebaseAppId,
        messagingSenderId: firebaseMessagingSenderId,
        projectId: firebaseProjectId,
        authDomain: firebaseAuthDomain.isEmpty ? null : firebaseAuthDomain,
        storageBucket: firebaseStorageBucket.isEmpty ? null : firebaseStorageBucket,
        iosBundleId: iosBundleId.isEmpty ? null : iosBundleId,
      );

  static Future<FirebaseOptions> resolveFirebaseOptions() async {
    if (hasBuildFirebaseConfig) {
      return buildFirebaseOptions;
    }

    final uri = Uri.parse(apiBaseUrl).replace(path: '/api/mobile/firebase-config');
    final response = await http.get(uri, headers: {'Accept': 'application/json'});

    if (response.statusCode >= 400) {
      throw StateError(
        'Firebase configuration could not be loaded from $uri. Server returned ${response.statusCode}.',
      );
    }

    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    final firebase = payload['firebase'];
    if (firebase is! Map<String, dynamic>) {
      throw StateError('Firebase configuration response from $uri was invalid.');
    }

    String read(String key) {
      final value = firebase[key]?.toString().trim() ?? '';
      if (value.isEmpty) {
        throw StateError('Firebase configuration from $uri is missing $key.');
      }
      return value;
    }

    return FirebaseOptions(
      apiKey: read('apiKey'),
      appId: read('appId'),
      messagingSenderId: read('messagingSenderId'),
      projectId: read('projectId'),
      authDomain: firebase['authDomain']?.toString().trim().isEmpty ?? true
          ? null
          : firebase['authDomain']?.toString().trim(),
      storageBucket: firebase['storageBucket']?.toString().trim().isEmpty ?? true
          ? null
          : firebase['storageBucket']?.toString().trim(),
      iosBundleId: iosBundleId.isEmpty ? null : iosBundleId,
    );
  }
}
