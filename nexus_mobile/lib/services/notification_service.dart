import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();
  DateTime? _lastNotificationTime;

  Future<void> init() async {
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);
    await _plugin.initialize(initSettings);

    // Request notification permission on Android 13+
    final androidPlugin = _plugin.resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin>();
    if (androidPlugin != null) {
      await androidPlugin.requestNotificationsPermission();
    }
  }

  /// Show a rain alert notification with a 30-minute cooldown to prevent spam.
  Future<void> showRainAlert({
    required String title,
    required String body,
    bool force = false,
  }) async {
    // Enforce 30-minute cooldown between notifications
    if (!force && _lastNotificationTime != null) {
      final elapsed = DateTime.now().difference(_lastNotificationTime!);
      if (elapsed.inMinutes < 30) return;
    }

    const androidDetails = AndroidNotificationDetails(
      'rain_alert_channel',
      'Rain Alerts',
      channelDescription: 'Notifications for upcoming rain and precipitation at the project site',
      importance: Importance.high,
      priority: Priority.high,
      icon: '@mipmap/ic_launcher',
      playSound: true,
      enableVibration: true,
      styleInformation: BigTextStyleInformation(''),
    );

    const details = NotificationDetails(android: androidDetails);

    await _plugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000, // unique ID
      title,
      body,
      details,
    );

    _lastNotificationTime = DateTime.now();
  }
}
