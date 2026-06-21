import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../../../app/app_theme.dart';
import '../data/live_match_repository.dart';
import '../models/live_match.dart';

class LiveMatchPage extends ConsumerStatefulWidget {
  const LiveMatchPage({super.key, required this.matchId});

  final String matchId;

  @override
  ConsumerState<LiveMatchPage> createState() => _LiveMatchPageState();
}

class _LiveMatchPageState extends ConsumerState<LiveMatchPage> {
  final _messageController = TextEditingController();
  final _chatScrollController = ScrollController();
  Timer? _pollTimer;
  LiveMatchRoom? _room;
  List<LiveChatMessage> _messages = const [];
  LiveChatProfile? _profile;
  LiveChatMessage? _replyingTo;
  WebViewController? _webViewController;
  String? _error;
  bool _loading = true;
  bool _sending = false;
  bool _lightChat = false;

  LiveMatchRepository get _repository => ref.read(liveMatchRepositoryProvider);

  @override
  void initState() {
    super.initState();
    _loadTheme();
    _loadRoom();
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _messageController.dispose();
    _chatScrollController.dispose();
    super.dispose();
  }

  Future<void> _loadTheme() async {
    final preferences = await SharedPreferences.getInstance();
    if (!mounted) return;
    setState(() {
      _lightChat = preferences.getBool('ace_live_chat_light') ?? false;
    });
  }

  Future<void> _toggleTheme() async {
    setState(() => _lightChat = !_lightChat);
    final preferences = await SharedPreferences.getInstance();
    await preferences.setBool('ace_live_chat_light', _lightChat);
  }

  Future<void> _loadRoom() async {
    try {
      final room = await _repository.fetchRoom(widget.matchId);
      final controller = WebViewController()
        ..setJavaScriptMode(JavaScriptMode.unrestricted)
        ..setBackgroundColor(Colors.black)
        ..loadRequest(Uri.parse(room.match.embedUrl));

      if (!mounted) return;
      setState(() {
        _room = room;
        _profile = room.profile;
        _webViewController = controller;
        _loading = false;
        _error = null;
      });
      await _loadMessages(scrollToEnd: true);
      _pollTimer?.cancel();
      _pollTimer = Timer.periodic(
        const Duration(seconds: 4),
        (_) => _loadMessages(),
      );
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = error.toString();
      });
    }
  }

  Future<void> _loadMessages({bool scrollToEnd = false}) async {
    try {
      final messages = await _repository.fetchMessages(widget.matchId);
      if (!mounted) return;
      final changed = messages.length != _messages.length;
      setState(() => _messages = messages);
      if (scrollToEnd || changed) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (_chatScrollController.hasClients) {
            _chatScrollController.animateTo(
              _chatScrollController.position.maxScrollExtent,
              duration: const Duration(milliseconds: 220),
              curve: Curves.easeOut,
            );
          }
        });
      }
    } catch (_) {
      // Polling failures should not replace a usable room with an error screen.
    }
  }

  Future<void> _sendMessage() async {
    final content = _messageController.text.trim();
    if (content.isEmpty || _sending) return;
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await _repository.sendMessage(
        matchId: widget.matchId,
        content: content,
        parentId: _replyingTo?.id,
      );
      _messageController.clear();
      setState(() => _replyingTo = null);
      await _loadMessages(scrollToEnd: true);
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _react(LiveChatMessage message, String emoji) async {
    try {
      await _repository.react(
        matchId: widget.matchId,
        messageId: message.id,
        emoji: emoji,
      );
      await _loadMessages();
    } catch (error) {
      if (mounted) setState(() => _error = error.toString());
    }
  }

  Future<void> _createProfile() async {
    final profile = await showDialog<LiveChatProfile>(
      context: context,
      builder: (context) => _CreateChatProfileDialog(
        repository: _repository,
      ),
    );
    if (profile != null && mounted) {
      setState(() => _profile = profile);
    }
  }

  Future<void> _pickEmoji() async {
    final emoji = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: _lightChat ? const Color(0xFFF5F5F7) : AppTheme.surface,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Wrap(
            alignment: WrapAlignment.center,
            spacing: 10,
            runSpacing: 10,
            children: liveChatEmojis
                .map(
                  (item) => InkWell(
                    onTap: () => Navigator.pop(context, item),
                    borderRadius: BorderRadius.circular(8),
                    child: Container(
                      width: 48,
                      height: 48,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(
                          color: _lightChat
                              ? const Color(0xFFD9DADF)
                              : AppTheme.border,
                        ),
                      ),
                      child: Text(item, style: const TextStyle(fontSize: 23)),
                    ),
                  ),
                )
                .toList(),
          ),
        ),
      ),
    );
    if (emoji != null) {
      _messageController.text += emoji;
      _messageController.selection = TextSelection.collapsed(
        offset: _messageController.text.length,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (_room == null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error ?? 'This match room is unavailable.'),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  onPressed: _loadRoom,
                  icon: const Icon(Icons.refresh_rounded),
                  label: const Text('Try again'),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final match = _room!.match;
    final chatBackground =
        _lightChat ? const Color(0xFFFBFBFC) : const Color(0xFF0B0D12);
    final chatSurface =
        _lightChat ? const Color(0xFFF0F1F3) : const Color(0xFF11141B);
    final chatText =
        _lightChat ? const Color(0xFF17181C) : const Color(0xFFF3F1F2);
    final chatMuted =
        _lightChat ? const Color(0xFF6E7078) : const Color(0xFF99949A);
    final chatLine =
        _lightChat ? const Color(0xFFDDE0E4) : const Color(0x1FFFFFFF);

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${match.homeTeam} vs ${match.awayTeam}',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16),
            ),
            Text(
              match.competition,
              style: const TextStyle(color: AppTheme.textMuted, fontSize: 11),
            ),
          ],
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            AspectRatio(
              aspectRatio: 16 / 9,
              child: ColoredBox(
                color: Colors.black,
                child: _webViewController == null
                    ? const Center(child: CircularProgressIndicator())
                    : WebViewWidget(controller: _webViewController!),
              ),
            ),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 11),
              color: const Color(0xFF0D0F16),
              child: Row(
                children: [
                  _MobileStatus(status: match.status),
                  const SizedBox(width: 9),
                  Expanded(
                    child: Text(
                      DateFormat('EEE, d MMM • HH:mm')
                          .format(match.kickoffAt.toLocal()),
                      style: const TextStyle(
                          color: AppTheme.textMuted, fontSize: 11),
                    ),
                  ),
                  IconButton(
                    onPressed: _toggleTheme,
                    tooltip: _lightChat ? 'Use dark chat' : 'Use light chat',
                    icon: Icon(
                      _lightChat
                          ? Icons.dark_mode_outlined
                          : Icons.light_mode_outlined,
                      size: 20,
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ColoredBox(
                color: chatBackground,
                child: _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.chat_bubble_outline_rounded,
                                color: chatMuted, size: 36),
                            const SizedBox(height: 10),
                            Text('Kick off the conversation',
                                style: TextStyle(
                                    color: chatText,
                                    fontWeight: FontWeight.w800)),
                            const SizedBox(height: 5),
                            Text('Share predictions and celebrate every goal.',
                                style:
                                    TextStyle(color: chatMuted, fontSize: 12)),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _chatScrollController,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 6),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final message = _messages[index];
                          return _ChatMessageTile(
                            message: message,
                            textColor: chatText,
                            mutedColor: chatMuted,
                            surfaceColor: chatSurface,
                            lineColor: chatLine,
                            canInteract: _profile != null &&
                                match.chatEnabled &&
                                _room!.isSignedIn,
                            onReply: () =>
                                setState(() => _replyingTo = message),
                            onReact: (emoji) => _react(message, emoji),
                          );
                        },
                      ),
              ),
            ),
            _buildComposer(
              match: match,
              background: chatSurface,
              textColor: chatText,
              mutedColor: chatMuted,
              lineColor: chatLine,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildComposer({
    required LiveMatchDetail match,
    required Color background,
    required Color textColor,
    required Color mutedColor,
    required Color lineColor,
  }) {
    if (!match.chatEnabled) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        color: background,
        child: Text(
          'Chat has been closed for this match.',
          textAlign: TextAlign.center,
          style: TextStyle(color: mutedColor),
        ),
      );
    }
    if (!_room!.isSignedIn) {
      return Container(
        padding: const EdgeInsets.all(14),
        color: background,
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => context.push('/login'),
            icon: const Icon(Icons.login_rounded),
            label: const Text('Sign in to join the chat'),
          ),
        ),
      );
    }
    if (_profile == null) {
      return Container(
        padding: const EdgeInsets.all(14),
        color: background,
        child: SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _createProfile,
            icon: const Icon(Icons.alternate_email_rounded),
            label: const Text('Create match-day identity'),
          ),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
      decoration: BoxDecoration(
        color: background,
        border: Border(top: BorderSide(color: lineColor)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (_replyingTo != null)
            Container(
              margin: const EdgeInsets.only(bottom: 7),
              padding: const EdgeInsets.fromLTRB(9, 7, 5, 7),
              decoration: BoxDecoration(
                border: const Border(
                    left: BorderSide(color: AppTheme.brand, width: 2)),
                color: lineColor.withValues(alpha: .38),
              ),
              child: Row(
                children: [
                  const Icon(Icons.reply_rounded,
                      size: 17, color: AppTheme.brand),
                  const SizedBox(width: 7),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Replying to @${_replyingTo!.author?.handle ?? 'fan'}',
                          style: TextStyle(
                              color: textColor,
                              fontWeight: FontWeight.w700,
                              fontSize: 11),
                        ),
                        Text(
                          _replyingTo!.content,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: TextStyle(color: mutedColor, fontSize: 10),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    onPressed: () => setState(() => _replyingTo = null),
                    icon: const Icon(Icons.close_rounded, size: 18),
                    color: mutedColor,
                  ),
                ],
              ),
            ),
          Row(
            children: [
              IconButton(
                onPressed: _pickEmoji,
                tooltip: 'Choose emoji',
                icon: const Icon(Icons.emoji_emotions_outlined),
                color: mutedColor,
              ),
              Expanded(
                child: TextField(
                  controller: _messageController,
                  minLines: 1,
                  maxLines: 3,
                  maxLength: 280,
                  style: TextStyle(color: textColor),
                  decoration: InputDecoration(
                    counterText: '',
                    hintText: _replyingTo == null
                        ? 'Message as @${_profile!.handle}'
                        : 'Write a reply',
                    hintStyle: TextStyle(color: mutedColor),
                    isDense: true,
                    filled: true,
                    fillColor:
                        _lightChat ? Colors.white : const Color(0xFF080A0E),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: lineColor),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: BorderSide(color: lineColor),
                    ),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
              const SizedBox(width: 7),
              IconButton.filled(
                onPressed: _sending ? null : _sendMessage,
                tooltip: 'Send message',
                icon: _sending
                    ? const SizedBox(
                        width: 17,
                        height: 17,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Icon(Icons.send_rounded, size: 19),
              ),
            ],
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                _error!,
                style: const TextStyle(color: AppTheme.coral, fontSize: 11),
              ),
            ),
        ],
      ),
    );
  }
}

class _ChatMessageTile extends StatelessWidget {
  const _ChatMessageTile({
    required this.message,
    required this.textColor,
    required this.mutedColor,
    required this.surfaceColor,
    required this.lineColor,
    required this.canInteract,
    required this.onReply,
    required this.onReact,
  });

  final LiveChatMessage message;
  final Color textColor;
  final Color mutedColor;
  final Color surfaceColor;
  final Color lineColor;
  final bool canInteract;
  final VoidCallback onReply;
  final ValueChanged<String> onReact;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 11),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: lineColor)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 35,
            height: 35,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: surfaceColor,
              borderRadius: BorderRadius.circular(7),
              border: Border.all(color: lineColor),
            ),
            child: Text(message.author?.avatarEmoji ?? '⚽'),
          ),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      '@${message.author?.handle ?? 'fan'}',
                      style: const TextStyle(
                        color: AppTheme.coral,
                        fontWeight: FontWeight.w800,
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(width: 7),
                    Text(
                      DateFormat('HH:mm').format(message.createdAt.toLocal()),
                      style: TextStyle(color: mutedColor, fontSize: 10),
                    ),
                  ],
                ),
                if (message.replyTo != null)
                  Container(
                    width: double.infinity,
                    margin: const EdgeInsets.only(top: 6),
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                    decoration: BoxDecoration(
                      color: surfaceColor,
                      border: const Border(
                        left: BorderSide(color: AppTheme.brand, width: 2),
                      ),
                    ),
                    child: Text(
                      '@${message.replyTo!.author?.handle ?? 'fan'}  ${message.replyTo!.content}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: mutedColor, fontSize: 10),
                    ),
                  ),
                const SizedBox(height: 4),
                Text(message.content,
                    style: TextStyle(color: textColor, height: 1.4)),
                if (message.reactions.isNotEmpty || canInteract)
                  Padding(
                    padding: const EdgeInsets.only(top: 7),
                    child: Wrap(
                      spacing: 5,
                      runSpacing: 5,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        ...message.reactions.map(
                          (reaction) => InkWell(
                            onTap: canInteract
                                ? () => onReact(reaction.emoji)
                                : null,
                            borderRadius: BorderRadius.circular(999),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 7, vertical: 4),
                              decoration: BoxDecoration(
                                color: reaction.reacted
                                    ? AppTheme.brand.withValues(alpha: .14)
                                    : surfaceColor,
                                borderRadius: BorderRadius.circular(999),
                                border: Border.all(
                                  color: reaction.reacted
                                      ? AppTheme.brand.withValues(alpha: .55)
                                      : lineColor,
                                ),
                              ),
                              child: Text(
                                '${reaction.emoji} ${reaction.count}',
                                style:
                                    TextStyle(color: textColor, fontSize: 11),
                              ),
                            ),
                          ),
                        ),
                        if (canInteract)
                          IconButton(
                            onPressed: onReply,
                            tooltip: 'Reply',
                            visualDensity: VisualDensity.compact,
                            icon: Icon(Icons.reply_rounded,
                                color: mutedColor, size: 18),
                          ),
                        if (canInteract)
                          ...liveChatEmojis.take(2).map(
                                (emoji) => IconButton(
                                  onPressed: () => onReact(emoji),
                                  tooltip: 'React with $emoji',
                                  visualDensity: VisualDensity.compact,
                                  icon: Text(emoji),
                                ),
                              ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MobileStatus extends StatelessWidget {
  const _MobileStatus({required this.status});

  final String status;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      decoration: BoxDecoration(
        color: status == 'LIVE' ? AppTheme.brand : const Color(0xFF242730),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Text(
        status == 'LIVE' ? '● LIVE' : status,
        style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900),
      ),
    );
  }
}

class _CreateChatProfileDialog extends StatefulWidget {
  const _CreateChatProfileDialog({required this.repository});

  final LiveMatchRepository repository;

  @override
  State<_CreateChatProfileDialog> createState() =>
      _CreateChatProfileDialogState();
}

class _CreateChatProfileDialogState extends State<_CreateChatProfileDialog> {
  final _handleController = TextEditingController();
  String _avatar = liveChatAvatars.first;
  String? _error;
  bool _saving = false;

  @override
  void dispose() {
    _handleController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_handleController.text.trim().isEmpty || _saving) return;
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final profile = await widget.repository.createProfile(
        handle: _handleController.text,
        avatarEmoji: _avatar,
      );
      if (mounted) Navigator.pop(context, profile);
    } catch (error) {
      if (mounted) {
        setState(() {
          _saving = false;
          _error = error.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Create match-day identity'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Your chat name is separate from your ACE account name.',
              style: TextStyle(color: AppTheme.textMuted, fontSize: 12),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _handleController,
              maxLength: 20,
              decoration: const InputDecoration(
                labelText: 'Chat name',
                hintText: 'GoalHunter9',
              ),
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 7,
              runSpacing: 7,
              children: liveChatAvatars
                  .map(
                    (emoji) => InkWell(
                      onTap: () => setState(() => _avatar = emoji),
                      borderRadius: BorderRadius.circular(8),
                      child: Container(
                        width: 42,
                        height: 42,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: _avatar == emoji
                              ? AppTheme.brand.withValues(alpha: .16)
                              : AppTheme.surface,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _avatar == emoji
                                ? AppTheme.brand
                                : AppTheme.border,
                          ),
                        ),
                        child:
                            Text(emoji, style: const TextStyle(fontSize: 20)),
                      ),
                    ),
                  )
                  .toList(),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!,
                  style: const TextStyle(color: AppTheme.coral, fontSize: 12)),
            ],
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _saving ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _saving ? null : _save,
          child: _saving
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Enter chat'),
        ),
      ],
    );
  }
}
