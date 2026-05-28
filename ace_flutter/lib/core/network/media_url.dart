import '../../config/app_config.dart';

String? resolveApiUrl(String? pathOrUrl) {
  if (pathOrUrl == null || pathOrUrl.isEmpty) {
    return null;
  }

  final parsed = Uri.tryParse(pathOrUrl);
  if (parsed != null && parsed.hasScheme) {
    return pathOrUrl;
  }

  final base = Uri.parse(AppConfig.apiBaseUrl);
  final normalizedBasePath = base.path.endsWith('/')
      ? base.path.substring(0, base.path.length - 1)
      : base.path;
  final rawPath = parsed?.path.isNotEmpty == true ? parsed!.path : pathOrUrl;
  final normalizedPath = rawPath.startsWith('/') ? rawPath : '/$rawPath';

  return base
      .replace(
        path: '$normalizedBasePath$normalizedPath',
        query: parsed?.query.isNotEmpty == true ? parsed?.query : null,
      )
      .toString();
}

String? resolveMediaUrl(String? key) {
  if (key == null || key.isEmpty) {
    return null;
  }

  final base = Uri.parse(AppConfig.apiBaseUrl);
  final normalizedBasePath = base.path.endsWith('/')
      ? base.path.substring(0, base.path.length - 1)
      : base.path;

  return base
      .replace(
        path: '$normalizedBasePath/api/media/$key',
      )
      .toString();
}

String? resolvePosterUrl(String? posterUrl, String? posterKey) {
  return resolveApiUrl(posterUrl) ?? resolveMediaUrl(posterKey);
}
