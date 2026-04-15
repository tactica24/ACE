import 'dart:math';

import 'package:shared_preferences/shared_preferences.dart';

class DeviceSessionStore {
  DeviceSessionStore();

  static const _deviceSessionKey = 'ace_device_session_id';

  Future<String> getOrCreate() async {
    final prefs = await SharedPreferences.getInstance();
    final existing = prefs.getString(_deviceSessionKey);
    if (existing != null && existing.isNotEmpty) {
      return existing;
    }

    final nextValue = _generateId();
    await prefs.setString(_deviceSessionKey, nextValue);
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
