class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    required this.role,
    this.name,
  });

  final String id;
  final String email;
  final String role;
  final String? name;

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        id: json['id'] as String,
        email: json['email'] as String,
        role: json['role'] as String? ?? 'USER',
        name: json['name'] as String?,
      );
}
