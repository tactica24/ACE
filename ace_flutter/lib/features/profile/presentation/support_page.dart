import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/app_theme.dart';
import '../../../widgets/premium_scaffold.dart';
import '../../auth/data/auth_repository.dart';
import '../data/support_repository.dart';

class SupportPage extends ConsumerStatefulWidget {
  const SupportPage({super.key});

  @override
  ConsumerState<SupportPage> createState() => _SupportPageState();
}

class _SupportPageState extends ConsumerState<SupportPage> {
  final _formKey = GlobalKey<FormState>();
  final _subjectController = TextEditingController();
  final _messageController = TextEditingController();
  String _category = 'CATALOG_HELP';
  String? _feedback;
  bool _sending = false;

  @override
  void dispose() {
    _subjectController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _sendMessage() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _sending = true;
      _feedback = null;
    });

    try {
      await ref.read(supportRepositoryProvider).createTicket(
            category: _category,
            subject: _subjectController.text.trim(),
            message: _messageController.text.trim(),
          );

      _subjectController.clear();
      _messageController.clear();
      if (!mounted) return;
      setState(() {
        _feedback = 'Your message has been sent to admin support.';
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _feedback = error.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _sending = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final accountAsync = ref.watch(currentAccountProvider);

    return PremiumScaffold(
      title: 'Help',
      currentLocation: '/profile',
      body: accountAsync.when(
        data: (user) {
          if (user == null) {
            return Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: AppTheme.surface,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppTheme.border),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Sign in to contact admin',
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    'Support messages are attached to your account so admin can review and respond with the right context.',
                    style: TextStyle(color: AppTheme.textMuted, height: 1.5),
                  ),
                ],
              ),
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Contact admin',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 8),
              Text(
                'Send a message about account access, payments, catalog, playback, or downloads. Admin will see it in the support inbox.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textMuted,
                      height: 1.5,
                    ),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(18),
                decoration: BoxDecoration(
                  color: AppTheme.surface,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppTheme.border),
                ),
                child: Form(
                  key: _formKey,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      DropdownButtonFormField<String>(
                        initialValue: _category,
                        decoration:
                            const InputDecoration(labelText: 'Issue type'),
                        items: const [
                          DropdownMenuItem(
                              value: 'CATALOG_HELP',
                              child: Text('Catalog or viewing help')),
                          DropdownMenuItem(
                              value: 'ACCOUNT_ACCESS',
                              child: Text('Account access')),
                          DropdownMenuItem(
                              value: 'PAYMENT',
                              child: Text('Payment challenge')),
                          DropdownMenuItem(
                              value: 'OTHER', child: Text('Other')),
                        ],
                        onChanged: (value) {
                          if (value != null) setState(() => _category = value);
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _subjectController,
                        decoration: const InputDecoration(labelText: 'Subject'),
                        textInputAction: TextInputAction.next,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Enter a subject.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _messageController,
                        decoration: const InputDecoration(labelText: 'Message'),
                        minLines: 5,
                        maxLines: 8,
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Enter a message.';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: _sending ? null : _sendMessage,
                          icon: _sending
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child:
                                      CircularProgressIndicator(strokeWidth: 2),
                                )
                              : const Icon(Icons.send_rounded),
                          label: Text(_sending ? 'Sending...' : 'Send message'),
                        ),
                      ),
                      if (_feedback != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _feedback!,
                          style: TextStyle(
                            color: _feedback!.startsWith('Your message')
                                ? AppTheme.textMuted
                                : Colors.redAccent,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              const _SupportHint(
                question: 'What should I include?',
                answer:
                    'Include the title name, what you were trying to do, and any error text shown in the app.',
              ),
              const _SupportHint(
                question: 'Where will this message go?',
                answer:
                    'It creates a support ticket attached to your account, visible to admin in the support inbox.',
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Text(error.toString()),
      ),
    );
  }
}

class _SupportHint extends StatelessWidget {
  const _SupportHint({
    required this.question,
    required this.answer,
  });

  final String question;
  final String answer;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppTheme.border),
      ),
      child: ExpansionTile(
        title: Text(question),
        childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        children: [
          Align(
            alignment: Alignment.centerLeft,
            child: Text(
              answer,
              style: const TextStyle(color: AppTheme.textMuted, height: 1.5),
            ),
          ),
        ],
      ),
    );
  }
}
