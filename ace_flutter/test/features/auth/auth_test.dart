import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:ace_studio_flutter/core/network/api_client.dart';
import 'package:ace_studio_flutter/features/auth/data/auth_repository.dart';

void main() {
  group('AuthRepository', () {
    late StubApiClient apiClient;
    late StubFirebaseAuth firebaseAuth;
    late AuthRepository authRepository;

    setUp(() {
      apiClient = StubApiClient();
      firebaseAuth = StubFirebaseAuth();
      authRepository = AuthRepository(
        firebaseAuth: firebaseAuth,
        apiClient: apiClient,
      );
    });

    test('signIn signs in user with email and password', () async {
      const email = 'test@example.com';
      const password = 'password123';
      const idToken = 'mock_id_token';

      firebaseAuth.signInResult =
          StubUserCredential(StubUser(idToken: idToken));
      apiClient.postResponses['/api/auth/login'] = {'success': true};

      await authRepository.signIn(email: email, password: password);

      expect(firebaseAuth.signInCalls.length, 1);
      expect(firebaseAuth.signInCalls.first.email, email.trim());
      expect(firebaseAuth.signInCalls.first.password, password);
      expect(apiClient.postCalls.length, 1);
      expect(apiClient.postCalls.first.path, '/api/auth/login');
      expect(apiClient.postCalls.first.body, {'idToken': idToken});
    });

    test('signIn throws exception when firebase sign in fails', () async {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      firebaseAuth.signInError = FirebaseAuthException(code: 'user-not-found');

      expect(
        () => authRepository.signIn(email: email, password: password),
        throwsA(isA<FirebaseAuthException>()),
      );
    });

    test('register creates account and syncs backend profile', () async {
      const name = 'Test User';
      const email = 'test@example.com';
      const password = 'password123';
      const idToken = 'mock_id_token';

      final user = StubUser(idToken: idToken);
      firebaseAuth.registerResult = StubUserCredential(user);
      apiClient.postResponses['/api/auth/register'] = {'success': true};

      await authRepository.register(
        name: name,
        email: email,
        password: password,
      );

      expect(firebaseAuth.registerCalls.length, 1);
      expect(firebaseAuth.registerCalls.first.email, email.trim());
      expect(firebaseAuth.registerCalls.first.password, password);
      expect(user.updatedDisplayName, name.trim());
      expect(user.emailVerificationSent, isTrue);
      expect(apiClient.postCalls.last.path, '/api/auth/register');
      expect(apiClient.postCalls.last.body, {
        'idToken': idToken,
        'name': name.trim(),
        'signupIntent': 'VIEWER',
      });
    });

    test('signOut calls backend logout then clears local auth', () async {
      apiClient.postResponses['/api/auth/logout'] = {'success': true};

      await authRepository.signOut();

      expect(apiClient.postCalls.length, 1);
      expect(apiClient.postCalls.first.path, '/api/auth/logout');
      expect(firebaseAuth.signOutCalls, 1);
    });

    test('signOut still clears local auth when backend logout fails', () async {
      apiClient.postErrors['/api/auth/logout'] = Exception('Logout failed');

      await authRepository.signOut();

      expect(apiClient.postCalls.length, 1);
      expect(apiClient.postCalls.first.path, '/api/auth/logout');
      expect(firebaseAuth.signOutCalls, 1);
    });

    test('fetchCurrentAccount returns user data when authenticated', () async {
      apiClient.getResponses['/api/mobile/me'] = {
        'user': {
          'id': 'user123',
          'email': 'test@example.com',
          'name': 'Test User',
          'role': 'USER',
        },
      };

      final result = await authRepository.fetchCurrentAccount();

      expect(result, isNotNull);
      expect(result!.id, 'user123');
      expect(result.email, 'test@example.com');
      expect(result.name, 'Test User');
    });

    test('fetchCurrentAccount returns null when unauthenticated', () async {
      apiClient.getResponses['/api/mobile/me'] = {'user': null};

      final result = await authRepository.fetchCurrentAccount();

      expect(result, isNull);
    });
  });
}

class StubApiClient extends Fake implements ApiClient {
  final List<ApiPostCall> postCalls = [];
  final List<ApiGetCall> getCalls = [];
  final Map<String, dynamic> postResponses = {};
  final Map<String, Exception> postErrors = {};
  final Map<String, dynamic> getResponses = {};
  final Map<String, Exception> getErrors = {};

  @override
  Future<dynamic> postJson(String path, {Object? body}) async {
    postCalls.add(ApiPostCall(path: path, body: body));
    final error = postErrors[path];
    if (error != null) {
      throw error;
    }
    if (postResponses.containsKey(path)) {
      return postResponses[path];
    }
    throw StateError('No POST stub configured for $path');
  }

  @override
  Future<dynamic> getJson(String path, {Map<String, String>? query}) async {
    getCalls.add(ApiGetCall(path: path, query: query));
    final error = getErrors[path];
    if (error != null) {
      throw error;
    }
    if (getResponses.containsKey(path)) {
      return getResponses[path];
    }
    throw StateError('No GET stub configured for $path');
  }
}

class StubFirebaseAuth extends Fake implements FirebaseAuth {
  final List<AuthCall> signInCalls = [];
  final List<AuthCall> registerCalls = [];
  int signOutCalls = 0;

  UserCredential? signInResult;
  Exception? signInError;
  UserCredential? registerResult;
  Exception? registerError;
  Exception? signOutError;

  @override
  Future<UserCredential> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    signInCalls.add(AuthCall(email: email, password: password));
    if (signInError != null) {
      throw signInError!;
    }
    if (signInResult == null) {
      throw StateError('No signInResult configured');
    }
    return signInResult!;
  }

  @override
  Future<UserCredential> createUserWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    registerCalls.add(AuthCall(email: email, password: password));
    if (registerError != null) {
      throw registerError!;
    }
    if (registerResult == null) {
      throw StateError('No registerResult configured');
    }
    return registerResult!;
  }

  @override
  Future<void> signOut() async {
    signOutCalls += 1;
    if (signOutError != null) {
      throw signOutError!;
    }
  }
}

class StubUserCredential extends Fake implements UserCredential {
  StubUserCredential(this._user);

  final User _user;

  @override
  User? get user => _user;
}

class StubUser extends Fake implements User {
  StubUser({required this.idToken});

  final String idToken;
  String? updatedDisplayName;
  bool emailVerificationSent = false;

  @override
  Future<String> getIdToken([bool forceRefresh = false]) async => idToken;

  @override
  Future<void> updateDisplayName(String? displayName) async {
    updatedDisplayName = displayName;
  }

  @override
  Future<void> sendEmailVerification(
      [ActionCodeSettings? actionCodeSettings]) async {
    emailVerificationSent = true;
  }
}

class AuthCall {
  const AuthCall({
    required this.email,
    required this.password,
  });

  final String email;
  final String password;
}

class ApiPostCall {
  const ApiPostCall({
    required this.path,
    required this.body,
  });

  final String path;
  final Object? body;
}

class ApiGetCall {
  const ApiGetCall({
    required this.path,
    required this.query,
  });

  final String path;
  final Map<String, String>? query;
}
