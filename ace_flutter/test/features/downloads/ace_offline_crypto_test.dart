import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:pointycastle/export.dart';

import 'package:ace_studio_flutter/features/downloads/data/ace_offline_crypto.dart';

void main() {
  test('decryptAceFile restores encrypted package bytes', () async {
    final tempDir = await Directory.systemTemp.createTemp('ace-offline-test');
    addTearDown(() async {
      if (await tempDir.exists()) {
        await tempDir.delete(recursive: true);
      }
    });

    final plainBytes = Uint8List.fromList(
      'ACE Studio offline package test payload'.codeUnits,
    );
    final key = Uint8List.fromList(
      List<int>.generate(32, (index) => index + 1),
    );
    final iv = Uint8List.fromList(
      List<int>.generate(12, (index) => 32 - index),
    );

    final encryptedBytes = _buildAcePackage(
      plainBytes: plainBytes,
      key: key,
      iv: iv,
    );

    final sourceFile = File('${tempDir.path}/sample.ace');
    final targetFile = File('${tempDir.path}/sample.mp4');
    await sourceFile.writeAsBytes(encryptedBytes, flush: true);

    await decryptAceFile(
      sourceFile: sourceFile,
      targetFile: targetFile,
      key: key,
    );

    expect(await targetFile.readAsBytes(), plainBytes);
  });
}

Uint8List _buildAcePackage({
  required Uint8List plainBytes,
  required Uint8List key,
  required Uint8List iv,
}) {
  final cipher = GCMBlockCipher(AESEngine())
    ..init(
      true,
      AEADParameters(
        KeyParameter(key),
        128,
        iv,
        Uint8List(0),
      ),
    );

  final output = Uint8List(plainBytes.length + 32);
  var length = cipher.processBytes(
    plainBytes,
    0,
    plainBytes.length,
    output,
    0,
  );
  length += cipher.doFinal(output, length);

  final encryptedWithTag = output.sublist(0, length);
  final tagOffset = encryptedWithTag.length - 16;

  return Uint8List.fromList([
    ...iv,
    ...encryptedWithTag.sublist(0, tagOffset),
    ...encryptedWithTag.sublist(tagOffset),
  ]);
}
