import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/weather_models.dart';
import 'weather_cache_service.dart';
import 'server_config_service.dart';

class ApiService {
  /// Gets the current API base URL. Called fresh each time — no stale cache.
  Future<String> getResolvedBaseUrl() => ServerConfigService.getApiBaseUrl();

  Future<PagasaSignalData> fetchPagasaSignals() async {
    final base = await ServerConfigService.getApiBaseUrl();
    final response = await http
        .get(Uri.parse('$base/weather/pagasa-signals'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      await WeatherCacheService.savePagasaSignal(json);
      return PagasaSignalData.fromJson(json);
    } else {
      throw Exception('Failed to load PAGASA signals: ${response.statusCode}');
    }
  }

  Future<TyphoonsResponse> fetchTyphoons() async {
    final base = await ServerConfigService.getApiBaseUrl();
    final response = await http
        .get(Uri.parse('$base/weather/typhoons'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      await WeatherCacheService.saveTyphoons(json);
      return TyphoonsResponse.fromJson(json);
    } else {
      throw Exception('Failed to load Typhoons: ${response.statusCode}');
    }
  }

  Future<RainForecastData> fetchRainForecast() async {
    final base = await ServerConfigService.getApiBaseUrl();
    final response = await http
        .get(Uri.parse('$base/weather/rain-forecast'))
        .timeout(const Duration(seconds: 10));
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      await WeatherCacheService.saveRainForecast(json);
      return RainForecastData.fromJson(json);
    } else {
      throw Exception('Failed to load Rain Forecast: ${response.statusCode}');
    }
  }
}
