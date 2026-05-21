class TitleAccessState {
  const TitleAccessState({
    required this.hasAccess,
    required this.status,
    required this.message,
    this.canPreview = true,
    this.requiresAuth = false,
  });

  final bool hasAccess;
  final String status;
  final String message;
  final bool canPreview;
  final bool requiresAuth;

  factory TitleAccessState.fromJson(Map<String, dynamic> json) {
    final hasAccess = json['hasAccess'] as bool? ?? false;
    final status = json['status'] as String? ?? 'NO_ACCESS';
    final message = json['message'] as String? ??
        (hasAccess ? 'You have access to this title' : 'Access required');

    return TitleAccessState(
      hasAccess: hasAccess,
      status: status,
      message: message,
      canPreview: json['canPreview'] as bool? ?? true,
      requiresAuth: json['requiresAuth'] as bool? ?? false,
    );
  }
}
