import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

/// Manages the Nexus server URL for the mobile app.
///
/// SIMPLE resolution: Manual URL > Known Fallback > Error.
/// No complex mDNS chains. No stale caches. Just works.
class ServerConfigService {
  static const String _manualUrlKey = 'nexus_manual_server_url';

  // Known virtual-adapter subnets that are NEVER reachable from a phone
  static const List<String> _blockedSubnets = [
    '192.168.119.', // VMware VMnet1
    '192.168.155.', // VMware VMnet8
    '192.168.137.', // Windows Mobile Hotspot
    '169.254.',     // APIPA / link-local
  ];

  // The office server IP — hardcoded as the guaranteed fallback
  static const String _officeFallback = 'http://10.0.3.72:3000';

  /// Returns a working base URL for the API (e.g. "http://10.0.3.72:3000/api").
  ///
  /// Resolution:
  /// 1. If a manual URL is saved and is NOT a blocked virtual IP → use it
  /// 2. Otherwise → use the office fallback
  static Future<String> getApiBaseUrl() async {
    final manual = await getManualUrl();

    // Use manual URL if it's set and not a blocked virtual adapter IP
    if (manual != null && manual.isNotEmpty && !_isBlockedIp(manual)) {
      return '$manual/api';
    }

    // Always fall back to the known office server
    return '$_officeFallback/api';
  }

  /// Check if a URL contains a known-blocked virtual adapter IP.
  static bool _isBlockedIp(String url) {
    return _blockedSubnets.any((subnet) => url.contains(subnet));
  }

  // ─── Manual URL Management ───────────────────────────────────

  static Future<String?> getManualUrl() async {
    final prefs = await SharedPreferences.getInstance();
    final url = prefs.getString(_manualUrlKey);
    // Auto-clean blocked IPs from storage
    if (url != null && _isBlockedIp(url)) {
      await prefs.remove(_manualUrlKey);
      return null;
    }
    return url;
  }

  static Future<void> setManualUrl(String url) async {
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    if (_isBlockedIp(clean)) return; // Refuse to save blocked IPs
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_manualUrlKey, clean);
  }

  /// Test if a URL is reachable — used by the settings screen
  static Future<bool> testUrl(String url) async {
    final clean = url.trim().replaceAll(RegExp(r'/+$'), '');
    try {
      final response = await http
          .get(Uri.parse('$clean/api/health'))
          .timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  /// Returns the last saved manual URL (for display in Settings)
  static Future<String?> getLastWorkingUrl() async {
    return getManualUrl();
  }

  /// Wipe all saved URLs. Used by Settings screen "Reset" button.
  static Future<void> resetAll() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_manualUrlKey);
    // Also clean up legacy keys from the old implementation
    await prefs.remove('nexus_last_working_url');
  }

  /// Call once at app startup to clean up any legacy stale data.
  static Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    // Clean legacy keys from the old complex implementation
    await prefs.remove('nexus_last_working_url');
    // Clean blocked IPs from manual URL
    final manual = prefs.getString(_manualUrlKey);
    if (manual != null && _isBlockedIp(manual)) {
      await prefs.remove(_manualUrlKey);
    }
  }

  /// No-op for backward compatibility — old code calls this
  static void clearCache() {}
}
