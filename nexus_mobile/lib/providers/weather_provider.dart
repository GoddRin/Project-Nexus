import 'dart:async';
import 'package:flutter/foundation.dart';
import '../models/weather_models.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';
import '../services/weather_cache_service.dart';

class WeatherProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  final NotificationService _notificationService = NotificationService();

  PagasaSignalData? _signalData;
  TyphoonsResponse? _typhoonData;
  RainForecastData? _rainForecast;

  bool _isLoading = false;
  bool _isOfflineCached = false; // true when showing cached data
  String _errorMessage = '';

  // Track previous impact level for escalation detection
  String _previousImpactLevel = 'CLEAR';
  Timer? _pollingTimer;

  PagasaSignalData? get signalData => _signalData;
  TyphoonsResponse? get typhoonData => _typhoonData;
  RainForecastData? get rainForecast => _rainForecast;
  bool get isLoading => _isLoading;
  bool get isOfflineCached => _isOfflineCached;
  String get errorMessage => _errorMessage;

  WeatherProvider() {
    // Start background polling every 5 minutes for all weather data
    _pollingTimer = Timer.periodic(const Duration(minutes: 5), (_) {
      fetchWeatherData();
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> fetchWeatherData() async {
    _isLoading = true;
    _errorMessage = '';
    notifyListeners();

    try {
      // Fetch all three endpoints in parallel for faster loading
      final results = await Future.wait([
        _apiService.fetchPagasaSignals(),
        _apiService.fetchTyphoons(),
        _apiService.fetchRainForecast(),
      ]);

      _signalData = results[0] as PagasaSignalData;
      _typhoonData = results[1] as TyphoonsResponse;
      _rainForecast = results[2] as RainForecastData;
      _isOfflineCached = false;

      // Check for rain notifications
      _checkAndNotify();
    } catch (e) {
      // Log the actual URL being used for debugging
      String resolvedUrl = 'unknown';
      try {
        resolvedUrl = await _apiService.getResolvedBaseUrl();
      } catch (_) {}
      debugPrint('Weather fetch failed [URL: $resolvedUrl]: $e');
      await _loadFromCache(debugUrl: resolvedUrl, debugError: e.toString());
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Load last cached weather data when offline
  Future<void> _loadFromCache({String debugUrl = '', String debugError = ''}) async {
    final cachedRain = await WeatherCacheService.loadRainForecast();
    final cachedSignal = await WeatherCacheService.loadPagasaSignal();
    final cachedTyphoons = await WeatherCacheService.loadTyphoons();

    if (cachedRain != null || cachedSignal != null || cachedTyphoons != null) {
      _rainForecast = cachedRain ?? _rainForecast;
      _signalData = cachedSignal ?? _signalData;
      _typhoonData = cachedTyphoons ?? _typhoonData;
      _isOfflineCached = true;
      _errorMessage = '';
    } else {
      // No cache at all — show the exact URL and error so we can diagnose
      _errorMessage = 'Server: $debugUrl\nError: ${debugError.length > 120 ? debugError.substring(0, 120) : debugError}';
    }
  }

  /// Silent background check — fetches rain data only and fires notifications
  Future<void> _backgroundRainCheck() async {
    try {
      _rainForecast = await _apiService.fetchRainForecast();
      _isOfflineCached = false;
      _checkAndNotify();
      notifyListeners();
    } catch (e) {
      // Silent fail for background polling
      debugPrint('Background rain check failed: $e');
    }
  }

  /// Evaluate rain forecast and send notifications if needed
  void _checkAndNotify() {
    if (_rainForecast == null) return;

    final rain = _rainForecast!;
    final currentLevel = rain.upcomingImpact.level;
    final nextRain = rain.nextRainInMinutes;

    // Trigger 1: Rain is coming within the next 2 hours and site is currently CLEAR
    if (nextRain != null && nextRain <= 120 && _previousImpactLevel == 'CLEAR') {
      String timeStr;
      if (nextRain < 60) {
        timeStr = '$nextRain minutes';
      } else {
        final hours = nextRain ~/ 60;
        final mins = nextRain % 60;
        timeStr = mins > 0 ? '$hours hr ${mins} min' : '$hours hour${hours > 1 ? 's' : ''}';
      }

      _notificationService.showRainAlert(
        title: '🌧️ Rain Approaching Site',
        body: 'Precipitation expected in ~$timeStr. Peak: ${rain.peakRainMm} mm/hr. ${rain.upcomingImpact.recommendation}',
      );
    }

    // Trigger 2: Impact level escalation (e.g., LIGHT → HEAVY)
    if (_isEscalation(_previousImpactLevel, currentLevel)) {
      _notificationService.showRainAlert(
        title: '⚠️ Rain Impact Escalation: $currentLevel',
        body: rain.upcomingImpact.recommendation,
        force: true,
      );
    }

    _previousImpactLevel = currentLevel;
  }

  bool _isEscalation(String oldLevel, String newLevel) {
    const levels = ['CLEAR', 'LIGHT', 'MODERATE', 'HEAVY', 'EXTREME'];
    final oldIdx = levels.indexOf(oldLevel);
    final newIdx = levels.indexOf(newLevel);
    return newIdx > oldIdx && (newIdx - oldIdx) >= 2;
  }
}
