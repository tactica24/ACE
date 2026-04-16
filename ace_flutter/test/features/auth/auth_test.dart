import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';

import 'package:ace_studio_flutter/features/auth/data/auth_repository.dart';
import 'package:ace_studio_flutter/features/auth/models/app_user.dart';
import 'package:ace_studio_flutter/core/network/api_client.dart';

import 'auth_test.mocks.dart';

@GenerateMocks([ApiClient, FirebaseAuth])
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
        // Arrange
        const email = 'test@example.com';
        const password = 'password123';
        const idToken = 'mock_id_token';
        
        final mockUserCredential = MockUserCredential();
        when(mockFirebaseAuth.signInWithEmailAndPassword(
          email: email.trim(),
          password: password,
        )).thenAnswer((_) async => mockUserCredential);
        
        when(mockUserCredential.user!.getIdToken())
            .thenAnswer((_) async => idToken);
        
        when(mockApiClient.postJson('/api/auth/login', body: {'idToken': idToken}))
            .thenAnswer((_) async => {'success': true});

        // Act
        await authRepository.signIn(email: email, password: password);

        // Assert
        verify(mockFirebaseAuth.signInWithEmailAndPassword(
          email: email.trim(),
          password: password,
        )).called(1);
        verify(mockApiClient.postJson('/api/auth/login', body: {'idToken': idToken}))
            .called(1);
      });

      test('should throw exception when sign in fails', () async {
        // Arrange
        const email = 'test@example.com';
        const password = 'wrongpassword';
        
        when(mockFirebaseAuth.signInWithEmailAndPassword(
          email: email.trim(),
          password: password,
        )).thenThrow(FirebaseAuthException(code: 'user-not-found'));

        // Act & Assert
        expect(
          () => authRepository.signIn(email: email, password: password),
          throwsA(isA<FirebaseAuthException>()),
        );
      });
    });

    group('register', () {
      test('should register new user successfully', () async {
        // Arrange
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

        // Act
        await authRepository.register(
          name: name,
          email: email,
          phone: phone,
          password: password,
        );

        // Assert
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
        // Arrange
        when(mockFirebaseAuth.signOut()).thenAnswer((_) async {});
        when(mockApiClient.postJson('/api/auth/logout'))
            .thenAnswer((_) async => {'success': true});

        // Act
        await authRepository.signOut();

        // Assert
        verify(mockFirebaseAuth.signOut()).called(1);
        verify(mockApiClient.postJson('/api/auth/logout')).called(1);
      });

      test('should handle sign out errors gracefully', () async {
        // Arrange
        when(mockFirebaseAuth.signOut()).thenThrow(Exception('Sign out failed'));
        when(mockApiClient.postJson('/api/auth/logout'))
            .thenAnswer((_) async => {'success': true});

        // Act & Assert
        expect(() => authRepository.signOut(), returnsNormally);
        verify(mockApiClient.postJson('/api/auth/logout')).called(1);
      });
    });

    group('fetchCurrentAccount', () {
      test('should return user data when authenticated', () async {
        // Arrange
        final userData = {
          'id': 'user123',
          'email': 'test@example.com',
          'name': 'Test User',
          'role': 'USER',
        };
        
        when(mockApiClient.getJson('/api/mobile/me'))
            .thenAnswer((_) async => {'user': userData});

        // Act
        final result = await authRepository.fetchCurrentAccount();

        // Assert
        expect(result, isNotNull);
        expect(result!.id, equals('user123'));
        expect(result.email, equals('test@example.com'));
        expect(result.name, equals('Test User'));
      });

      test('should return null when not authenticated', () async {
        // Arrange
        when(mockApiClient.getJson('/api/mobile/me'))
            .thenAnswer((_) async => {});

        // Act
        final result = await authRepository.fetchCurrentAccount();

        // Assert
        expect(result, isNull);
      });
    });
  });
}

// Mock classes for testing
class MockUserCredential extends Mock implements UserCredential {}

class MockUser extends Mock implements User {}

class MockFirebaseAuth extends Mock implements FirebaseAuth {}
