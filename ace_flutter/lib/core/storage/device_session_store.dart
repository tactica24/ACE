import 'dart:math';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DeviceSessionStore {
  DeviceSessionStore();

  static const _deviceSessionKey = 'ace_device_session_id';
  static const _legacyPrefsKey = 'ace_device_session_id';

  final _secureStorage = const FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(
      accessibility: KeychainAccessibility.first_unlock_this_device,
    ),
  );

  Future<String> getOrCreate() async {
    // 1. Try secure storage first (new installs + migrated)
    final secureValue = await _secureStorage.read(key: _deviceSessionKey);
    if (secureValue != null && secureValue.isNotEmpty) {
      return secureValue;
    }

    // 2. Migration: check old SharedPreferences value
    final prefs = await SharedPreferences.getInstance();
    final legacy = prefs.getString(_legacyPrefsKey);
    if (legacy != null && legacy.isNotEmpty) {
      await _secureStorage.write(key: _deviceSessionKey, value: legacy);
      await prefs.remove(_legacyPrefsKey); // clean up
      return legacy;
    }

    // 3. Create new secure ID
    final nextValue = _generateId();
    await _secureStorage.write(key: _deviceSessionKey, value: nextValue);
    return nextValue;
  }

  String _generateId() {
    final random = Random.secure();
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

    return List.generate(
      32,
      (_) => chars[random.nextInt(chars.length)],
    ).join();
  }
}
