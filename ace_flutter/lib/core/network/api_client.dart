import 'dart:convert';

import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;

import '../../config/app_config.dart';

class ApiClient {
  ApiClient({
    required this.httpClient,
    required this.firebaseAuth,
  });

  final http.Client httpClient;
  final FirebaseAuth firebaseAuth;

  Uri resolve(String path, [Map<String, String>? query]) {
    final base = Uri.parse(AppConfig.apiBaseUrl);
    final parsedPath = Uri.tryParse(path);

    if (parsedPath != null && parsedPath.hasScheme) {
      return query?.isNotEmpty == true
          ? parsedPath.replace(queryParameters: query)
          : parsedPath;
    }

    final rawPath = parsedPath?.path.isNotEmpty == true ? parsedPath!.path : path;
    final normalizedPath = rawPath.startsWith('/') ? rawPath : '/$rawPath';
    final resolvedQuery = query?.isNotEmpty == true
        ? query
        : parsedPath?.queryParameters.isNotEmpty == true
            ? parsedPath!.queryParameters
            : null;

    return base.replace(
      path: '${base.path.endsWith('/') ? base.path.substring(0, base.path.length - 1) : base.path}$normalizedPath',
      queryParameters: resolvedQuery,
    );
  }

  Future<Map<String, String>> _headers({Map<String, String>? extra}) async {
    final headers = <String, String>{
      'Accept': 'application/json',
      ...?extra,
    };

    final token = await firebaseAuth.currentUser?.getIdToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    return headers;
  }

  Future<dynamic> getJson(String path, {Map<String, String>? query}) async {
    final response = await httpClient.get(
      resolve(path, query),
      headers: await _headers(),
    );

    return _decode(response);
  }

  Future<dynamic> postJson(String path, {Object? body}) async {
    final response = await httpClient.post(
      resolve(path),
      headers: await _headers(extra: {'Content-Type': 'application/json'}),
      body: body == null ? null : jsonEncode(body),
    );

    return _decode(response);
  }

  String mediaUrl(String key) {
    final uri = resolve('/api/media/$key');
    return uri.toString();
  }

  dynamic _decode(http.Response response) {
    final contentType = response.headers['content-type'] ?? '';
    final payload = contentType.contains('application/json') && response.body.isNotEmpty
        ? jsonDecode(response.body)
        : response.body;

    if (response.statusCode >= 400) {
      final message = payload is Map<String, dynamic>
          ? (payload['error']?.toString() ?? payload['message']?.toString() ?? 'Request failed')
          : response.body;
      throw ApiException(message, statusCode: response.statusCode);
    }

    return payload;
  }
}

class ApiException implements Exception {
  ApiException(this.message, {required this.statusCode});

  final String message;
  final int statusCode;

  @override
  String toString() => message;
}
