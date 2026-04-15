import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;

import '../../../core/network/api_client.dart';
import '../models/app_user.dart';

final firebaseAuthProvider = Provider<FirebaseAuth>((ref) => FirebaseAuth.instance);

final httpClientProvider = Provider<http.Client>((ref) => http.Client());

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    httpClient: ref.watch(httpClientProvider),
    firebaseAuth: ref.watch(firebaseAuthProvider),
  );
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    firebaseAuth: ref.watch(firebaseAuthProvider),
    apiClient: ref.watch(apiClientProvider),
  );
});

final firebaseUserChangesProvider = StreamProvider<User?>((ref) {
  return ref.watch(firebaseAuthProvider).authStateChanges();
});

final currentAccountProvider = FutureProvider<AppUser?>((ref) async {
  return ref.watch(authRepositoryProvider).fetchCurrentAccount();
});

class AuthRepository {
  AuthRepository({
    required this.firebaseAuth,
    required this.apiClient,
  });

  final FirebaseAuth firebaseAuth;
  final ApiClient apiClient;

  Future<AppUser?> fetchCurrentAccount() async {
    final payload = await apiClient.getJson('/api/mobile/me') as Map<String, dynamic>;
    final user = payload['user'];
    if (user is Map<String, dynamic>) {
      return AppUser.fromJson(user);
    }

    return null;
  }

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    final credential = await firebaseAuth.signInWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    final idToken = await credential.user!.getIdToken();
    await apiClient.postJson('/api/auth/login', body: {'idToken': idToken});
  }

  Future<void> register({
    required String name,
    required String email,
    required String phone,
    required String password,
  }) async {
    final credential = await firebaseAuth.createUserWithEmailAndPassword(
      email: email.trim(),
      password: password,
    );

    await credential.user!.updateDisplayName(name.trim());
    await credential.user!.sendEmailVerification().catchError((_) {});
    final idToken = await credential.user!.getIdToken();

    await apiClient.postJson(
      '/api/auth/register',
      body: {
        'idToken': idToken,
        'name': name.trim(),
        'phone': phone.trim(),
        'signupIntent': 'VIEWER',
      },
    );
  }

  Future<void> signOut() async {
    await firebaseAuth.signOut().catchError((_) {});
    await apiClient.postJson('/api/auth/logout');
  }
}
