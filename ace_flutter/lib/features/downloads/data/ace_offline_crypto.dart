import 'dart:typed_data';
import 'dart:io';

import 'package:pointycastle/export.dart';

const _ivLength = 12;
const _tagLength = 16;
Future<void> decryptAceFile({
  required File sourceFile,
  required File targetFile,
  required Uint8List key,
}) async {
  final sourceBytes = await sourceFile.readAsBytes();
  if (sourceBytes.length <= (_ivLength + _tagLength)) {
    throw Exception('Offline package is invalid.');
  }

  try {
    final iv = Uint8List.sublistView(sourceBytes, 0, _ivLength);
    final encryptedPayload = Uint8List.sublistView(sourceBytes, _ivLength);

    final cipher = GCMBlockCipher(AESEngine())
      ..init(
        false,
        AEADParameters(
          KeyParameter(key),
          _tagLength * 8,
          iv,
          Uint8List(0),
        ),
      );

    final output = Uint8List(encryptedPayload.length);
    var outputLength = cipher.processBytes(
      encryptedPayload,
      0,
      encryptedPayload.length,
      output,
      0,
    );
    outputLength += cipher.doFinal(output, outputLength);

    await targetFile.writeAsBytes(output.sublist(0, outputLength), flush: true);
  } on InvalidCipherTextException {
    throw Exception('Offline package could not be unlocked on this device.');
  }
}
