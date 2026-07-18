import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/weather_models.dart';

/// Caches the last successful weather API response locally.
/// When offline, the provider reads from this cache instead of failing silently.
class WeatherCacheService {
  static const String _rainKey = 'cachedRainForecast';
  static const String _signalKey = 'cachedPagasaSignal';
  static const String _typhoonKey = 'cachedTyphoons';

  // --- SAVE ---

  static Future<void> saveRainForecast(Map<String, dynamic> json) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_rainKey, jsonEncode(json));
  }

  static Future<void> savePagasaSignal(Map<String, dynamic> json) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_signalKey, jsonEncode(json));
  }

  static Future<void> saveTyphoons(Map<String, dynamic> json) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_typhoonKey, jsonEncode(json));
  }

  // --- LOAD ---

  static Future<RainForecastData?> loadRainForecast() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_rainKey);
    if (raw == null) return null;
    try {
      return RainForecastData.fromJson(jsonDecode(raw));
    } catch (_) {
      return null;
    }
  }

  static Future<PagasaSignalData?> loadPagasaSignal() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_signalKey);
    if (raw == null) return null;
    try {
      return PagasaSignalData.fromJson(jsonDecode(raw));
    } catch (_) {
      return null;
    }
  }

  static Future<TyphoonsResponse?> loadTyphoons() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_typhoonKey);
    if (raw == null) return null;
    try {
      return TyphoonsResponse.fromJson(jsonDecode(raw));
    } catch (_) {
      return null;
    }
  }

  /// Returns true if cached data exists and is less than 6 hours old.
  static Future<bool> hasFreshCache() async {
    final cached = await loadRainForecast();
    if (cached == null || cached.fetchedAt.isEmpty) return false;
    try {
      final fetchedTime = DateTime.parse(cached.fetchedAt);
      return DateTime.now().toUtc().difference(fetchedTime).inHours < 6;
    } catch (_) {
      return false;
    }
  }
}
