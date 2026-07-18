import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class PTWMock {
  final String id;
  final String type;
  final String location;
  final String team;
  final DateTime expiryDateTime; // Real DateTime for live comparison
  final String expiryLabel;      // Display label e.g. "Today, 17:00"

  PTWMock({
    required this.id,
    required this.type,
    required this.location,
    required this.team,
    required this.expiryDateTime,
    required this.expiryLabel,
  });

  /// Computed status — derived live from clock every time it's accessed
  String get computedStatus {
    final now = DateTime.now();
    if (now.isAfter(expiryDateTime)) return 'Expired';
    final minutesLeft = expiryDateTime.difference(now).inMinutes;
    if (minutesLeft <= 30) return 'Expiring Soon';
    return 'Active';
  }

  /// Serialize to JSON for SharedPreferences persistence
  Map<String, dynamic> toJson() => {
    'id': id,
    'type': type,
    'location': location,
    'team': team,
    'expiryDateTime': expiryDateTime.toIso8601String(),
    'expiryLabel': expiryLabel,
  };

  /// Deserialize from JSON
  factory PTWMock.fromJson(Map<String, dynamic> json) {
    return PTWMock(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      location: json['location'] ?? '',
      team: json['team'] ?? '',
      expiryDateTime: DateTime.parse(json['expiryDateTime']),
      expiryLabel: json['expiryLabel'] ?? '',
    );
  }

  /// Build a human-readable display label from a DateTime
  static String buildLabel(DateTime dt) {
    final now = DateTime.now();
    final isToday =
        dt.year == now.year && dt.month == now.month && dt.day == now.day;
    final tomorrow = now.add(const Duration(days: 1));
    final isTomorrow = dt.year == tomorrow.year &&
        dt.month == tomorrow.month &&
        dt.day == tomorrow.day;

    final timeStr =
        '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';

    if (isToday) return 'Today, $timeStr';
    if (isTomorrow) return 'Tomorrow, $timeStr';

    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[dt.month - 1]} ${dt.day}, $timeStr';
  }
}

class DashboardMockData {
  static const Map<String, int> zoneBreakdown = {
    'Tunnels': 0,
    'Weir': 0,
    'Temfacil': 0,
    'Powerhouse': 0,
    'Switchyard': 0,
  };

  // PTWs are persisted to SharedPreferences — not hardcoded mock data.
  // Populated by loadPTWs() on app start.
  static List<PTWMock> activePTWs = [];

  /// Persist the full PTW list to SharedPreferences
  static Future<void> savePTWs() async {
    final prefs = await SharedPreferences.getInstance();
    final jsonList = activePTWs.map((p) => p.toJson()).toList();
    await prefs.setString('ptwList', jsonEncode(jsonList));
  }

  /// Load PTW list from SharedPreferences on app start
  static Future<void> loadPTWs() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString('ptwList');
    if (raw != null) {
      final List<dynamic> decoded = jsonDecode(raw);
      final List<PTWMock> loaded = [];
      for (final e in decoded) {
        try {
          loaded.add(PTWMock.fromJson(e as Map<String, dynamic>));
        } catch (_) {
          // Skip old-format records that don't have a valid expiryDateTime
        }
      }
      activePTWs = loaded;
    }

    // If no PTWs exist yet, seed with sample data
    if (activePTWs.isEmpty) {
      activePTWs = [
        PTWMock(
          id: 'PTW-2026-001',
          type: 'Hot Work',
          location: 'Powerhouse Unit 2',
          team: 'Welding Team Alpha',
          expiryDateTime: DateTime(2026, 7, 25, 17, 0),
          expiryLabel: PTWMock.buildLabel(DateTime(2026, 7, 25, 17, 0)),
        ),
        PTWMock(
          id: 'PTW-2026-002',
          type: 'Confined Space',
          location: 'Tunnel 3B',
          team: 'Inspection Crew Charlie',
          expiryDateTime: DateTime(2026, 7, 25, 14, 0),
          expiryLabel: PTWMock.buildLabel(DateTime(2026, 7, 25, 14, 0)),
        ),
        PTWMock(
          id: 'PTW-2026-003',
          type: 'Working at Heights',
          location: 'Switchyard Tower A',
          team: 'Maintenance Team',
          expiryDateTime: DateTime(2026, 7, 25, 9, 0),
          expiryLabel: PTWMock.buildLabel(DateTime(2026, 7, 25, 9, 0)),
        ),
      ];
      await savePTWs(); // Persist seed data immediately
    }
  }
}
