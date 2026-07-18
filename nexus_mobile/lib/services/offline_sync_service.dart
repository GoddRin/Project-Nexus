import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'server_config_service.dart';

/// Manages the offline sign-off queue.
/// When the device is offline, sign-off payloads are stored here.
/// When connectivity returns, they are automatically flushed to the server.
class OfflineSyncService {
  static const String _queueKey = 'offlineSignOffQueue';

  /// Save a sign-off payload to the local queue for later sync.
  /// Always uses the timestamp of when the sign-off was initiated (not when synced).
  static Future<void> enqueue(Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_queueKey);
    final List<dynamic> queue = raw != null ? jsonDecode(raw) : [];
    queue.add(payload);
    await prefs.setString(_queueKey, jsonEncode(queue));
  }

  /// Returns the number of pending sign-offs waiting to sync.
  static Future<int> pendingCount() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_queueKey);
    if (raw == null) return 0;
    final List<dynamic> queue = jsonDecode(raw);
    return queue.length;
  }

  /// Attempt to flush all pending sign-offs to the server.
  /// Uses ServerConfigService so it works on any access point.
  static Future<SyncResult> flushQueue() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_queueKey);
    if (raw == null) return SyncResult(synced: 0, failed: 0);

    final List<dynamic> queue = jsonDecode(raw);
    if (queue.isEmpty) return SyncResult(synced: 0, failed: 0);

    // Resolve the server URL dynamically — works on any access point
    final String apiBase = await ServerConfigService.getApiBaseUrl();
    final String endpointUrl = '$apiBase/daily-logs';

    int synced = 0;
    final List<dynamic> failed = [];

    for (final payload in queue) {
      try {
        final response = await http
            .post(
              Uri.parse(endpointUrl),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode(payload),
            )
            .timeout(const Duration(seconds: 10));

        if (response.statusCode == 201 || response.statusCode == 200) {
          synced++;
        } else {
          failed.add(payload);
        }
      } catch (_) {
        failed.add(payload);
      }
    }

    // Keep only failed entries in the queue
    if (failed.isEmpty) {
      await prefs.remove(_queueKey);
    } else {
      await prefs.setString(_queueKey, jsonEncode(failed));
    }

    return SyncResult(synced: synced, failed: failed.length);
  }

  /// Clear the entire queue (use only for testing/reset purposes)
  static Future<void> clearQueue() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_queueKey);
  }
}

class SyncResult {
  final int synced;
  final int failed;
  const SyncResult({required this.synced, required this.failed});
  bool get hasSync => synced > 0;
}
