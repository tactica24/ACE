class TitleAccessState {
  const TitleAccessState({
    required this.hasAccess,
    required this.status,
    required this.message,
  });

  final bool hasAccess;
  final String status;
  final String message;

  factory TitleAccessState.fromJson(Map<String, dynamic> json) => TitleAccessState(
        hasAccess: json['hasAccess'] as bool? ?? false,
        status: json['status'] as String? ?? 'NO_ACCESS',
        message: json['message'] as String? ?? 'Playback unavailable for this account.',
      );
}
