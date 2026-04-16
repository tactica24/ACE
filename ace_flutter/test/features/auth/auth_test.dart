import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

import 'package:ace_studio_flutter/core/network/api_client.dart';
import 'package:ace_studio_flutter/features/auth/data/auth_repository.dart';

void main() {
  group('AuthRepository', () {
    late MockApiClient mockApiClient;
    late MockFirebaseAuth mockFirebaseAuth;
    late AuthRepository authRepository;

    setUp(() {
      mockApiClient = MockApiClient();
      mockFirebaseAuth = MockFirebaseAuth();
      authRepository = AuthRepository(
        firebaseAuth: mockFirebaseAuth,
        apiClient: mockApiClient,
      );
    });

    group('signIn', () {
      test('should sign in user with email and password', () async {
        const email = 'test@example.com';
        const password = 'password123';
        const idToken = 'mock_id_token';

        final mockUserCredential = MockUserCredential();
        final mockUser = MockUser();

        when(mockFirebaseAuth.signInWithEmailAndPassword(
          email: email.trim(),
          password: password,
        )).thenAnswer((_) async => mockUserCredential);
        when(mockUserCredential.user).thenReturn(mockUser);
        when(mockUser.getIdToken()).thenAnswer((_) async => idToken);
        when(mockApiClient.postJson('/api/auth/login', body: {'idToken': idToken}))
            .thenAnswer((_) async => {'success': true});

        await authRepository.signIn(email: email, password: password);

        verify(mockFirebaseAuth.signInWithEmailAndPassword(
          email: email.trim(),
          password: password,
        )).called(1);
        verify(mockApiClient.postJson('/api/auth/login', body: {'idToken': idToken}))
            .called(1);
      });

      test('should throw exception when sign in fails', () async {
        const email = 'test@example.com';
        const password = 'wrongpassword';

        when(mockFirebaseAuth.signInWithEmailAndPassword(
          email: email.trim(),
          password: password,
        )).thenThrow(FirebaseAuthException(code: 'user-not-found'));

        expect(
          () => authRepository.signIn(email: email, password: password),
          throwsA(isA<FirebaseAuthException>()),
        );
      });
    });

    group('register', () {
      test('should register new user successfully', () async {
        const name = 'Test User';
        const email = 'test@example.com';
        const phone = '+1234567890';
        const password = 'password123';
        const idToken = 'mock_id_token';

        final mockUserCredential = MockUserCredential();
        final mockUser = MockUser();

        when(mockFirebaseAuth.createUserWithEmailAndPassword(
          email: email.trim(),
          password: password,
        )).thenAnswer((_) async => mockUserCredential);
        when(mockUserCredential.user).thenReturn(mockUser);
        when(mockUser.updateDisplayName(name.trim())).thenAnswer((_) async {});
        when(mockUser.sendEmailVerification()).thenAnswer((_) async {});
        when(mockUser.getIdToken()).thenAnswer((_) async => idToken);
        when(mockApiClient.postJson('/api/auth/register', body: {
          'idToken': idToken,
          'name': name.trim(),
          'phone': phone.trim(),
          'signupIntent': 'VIEWER',
        })).thenAnswer((_) async => {'success': true});

        await authRepository.register(
          name: name,
          email: email,
          phone: phone,
          password: password,
        );

        verify(mockFirebaseAuth.createUserWithEmailAndPassword(
          email: email.trim(),
          password: password,
        )).called(1);
        verify(mockUser.updateDisplayName(name.trim())).called(1);
        verify(mockApiClient.postJson('/api/auth/register', body: {
          'idToken': idToken,
          'name': name.trim(),
          'phone': phone.trim(),
          'signupIntent': 'VIEWER',
        })).called(1);
      });
    });

    group('signOut', () {
      test('should sign out user successfully', () async {
        when(mockApiClient.postJson('/api/auth/logout'))
            .thenAnswer((_) async => {'success': true});
        when(mockFirebaseAuth.signOut()).thenAnswer((_) async {});

        await authRepository.signOut();

        verifyInOrder([
          mockApiClient.postJson('/api/auth/logout'),
          mockFirebaseAuth.signOut(),
        ]);
      });

      test('should clear local auth even when logout request fails', () async {
        when(mockApiClient.postJson('/api/auth/logout')).thenThrow(Exception('Logout failed'));
        when(mockFirebaseAuth.signOut()).thenAnswer((_) async {});

        await authRepository.signOut();

        verify(mockApiClient.postJson('/api/auth/logout')).called(1);
        verify(mockFirebaseAuth.signOut()).called(1);
      });
    });

    group('fetchCurrentAccount', () {
      test('should return user data when authenticated', () async {
        final userData = {
          'id': 'user123',
          'email': 'test@example.com',
          'name': 'Test User',
          'role': 'USER',
        };

        when(mockApiClient.getJson('/api/mobile/me'))
            .thenAnswer((_) async => {'user': userData});

        final result = await authRepository.fetchCurrentAccount();

        expect(result, isNotNull);
        expect(result!.id, equals('user123'));
        expect(result.email, equals('test@example.com'));
        expect(result.name, equals('Test User'));
      });

      test('should return null when not authenticated', () async {
        when(mockApiClient.getJson('/api/mobile/me'))
            .thenAnswer((_) async => {'user': null});

        final result = await authRepository.fetchCurrentAccount();

        expect(result, isNull);
      });
    });
  });
}

class MockApiClient extends Mock implements ApiClient {}

class MockUserCredential extends Mock implements UserCredential {}

class MockUser extends Mock implements User {}

class MockFirebaseAuth extends Mock implements FirebaseAuth {}
