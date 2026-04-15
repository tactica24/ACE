import '../../config/app_config.dart';

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
