class PagasaSignalData {
  final bool hasActiveBulletin;
  final String tcName;
  final String tcCategory;
  final int siteSignalNumber;
  final String movement;
  final int maxWindsKph;
  final int gustsKph;
  final String fetchedAt;

  PagasaSignalData({
    required this.hasActiveBulletin,
    required this.tcName,
    required this.tcCategory,
    required this.siteSignalNumber,
    required this.movement,
    required this.maxWindsKph,
    required this.gustsKph,
    required this.fetchedAt,
  });

  factory PagasaSignalData.fromJson(Map<String, dynamic> json) {
    return PagasaSignalData(
      hasActiveBulletin: json['hasActiveBulletin'] ?? false,
      tcName: json['tcName'] ?? '',
      tcCategory: json['tcCategory'] ?? '',
      siteSignalNumber: json['siteSignalNumber'] ?? 0,
      movement: json['movement'] ?? '',
      maxWindsKph: json['maxWindsKph'] ?? 0,
      gustsKph: json['gustsKph'] ?? 0,
      fetchedAt: json['fetchedAt'] ?? '',
    );
  }
}

class StormData {
  final String id;
  final String name;
  final String category;
  final double latitude;
  final double longitude;
  final int maxWinds;

  StormData({
    required this.id,
    required this.name,
    required this.category,
    required this.latitude,
    required this.longitude,
    required this.maxWinds,
  });

  factory StormData.fromJson(Map<String, dynamic> json) {
    return StormData(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      category: json['category'] ?? '',
      latitude: (json['latitude'] ?? 0.0).toDouble(),
      longitude: (json['longitude'] ?? 0.0).toDouble(),
      maxWinds: json['maxWinds'] ?? 0,
    );
  }
}

class TyphoonsResponse {
  final List<StormData> storms;
  final String source;

  TyphoonsResponse({
    required this.storms,
    required this.source,
  });

  factory TyphoonsResponse.fromJson(Map<String, dynamic> json) {
    var list = json['storms'] as List? ?? [];
    List<StormData> stormList = list.map((i) => StormData.fromJson(i)).toList();
    return TyphoonsResponse(
      storms: stormList,
      source: json['source'] ?? '',
    );
  }
}

class SiteImpact {
  final String level;
  final String color;
  final String recommendation;

  SiteImpact({required this.level, required this.color, required this.recommendation});

  factory SiteImpact.fromJson(Map<String, dynamic> json) {
    return SiteImpact(
      level: json['level'] ?? 'UNKNOWN',
      color: json['color'] ?? '#6B7280',
      recommendation: json['recommendation'] ?? '',
    );
  }
}

class HourlyRain {
  final String time;
  final double precipitationMm;
  final int probability;
  final int weatherCode;
  final String weatherDescription;
  final double temperature;

  HourlyRain({
    required this.time,
    required this.precipitationMm,
    required this.probability,
    required this.weatherCode,
    required this.weatherDescription,
    required this.temperature,
  });

  factory HourlyRain.fromJson(Map<String, dynamic> json) {
    return HourlyRain(
      time: json['time'] ?? '',
      precipitationMm: (json['precipitationMm'] ?? 0.0).toDouble(),
      probability: json['probability'] ?? 0,
      weatherCode: json['weatherCode'] ?? 0,
      weatherDescription: json['weatherDescription'] ?? '',
      temperature: (json['temperature'] ?? 0.0).toDouble(),
    );
  }
}

class RainForecastData {
  final double currentRainMm;
  final int currentWeatherCode;
  final String currentWeatherDescription;
  final double temperature;
  final int humidity;
  final double windSpeed;
  final int pressure;
  final int cloudCover;
  final SiteImpact currentImpact;
  final SiteImpact upcomingImpact;
  final int? nextRainInMinutes;
  final double peakRainMm;
  final String peakRainTime;
  final double total24hMm;
  final List<HourlyRain> hourlyForecast;
  final String fetchedAt;

  RainForecastData({
    required this.currentRainMm,
    required this.currentWeatherCode,
    required this.currentWeatherDescription,
    required this.temperature,
    required this.humidity,
    required this.windSpeed,
    required this.pressure,
    required this.cloudCover,
    required this.currentImpact,
    required this.upcomingImpact,
    required this.nextRainInMinutes,
    required this.peakRainMm,
    required this.peakRainTime,
    required this.total24hMm,
    required this.hourlyForecast,
    required this.fetchedAt,
  });

  factory RainForecastData.fromJson(Map<String, dynamic> json) {
    var list = json['hourlyForecast'] as List? ?? [];
    return RainForecastData(
      currentRainMm: (json['currentRainMm'] ?? 0.0).toDouble(),
      currentWeatherCode: json['currentWeatherCode'] ?? 0,
      currentWeatherDescription: json['currentWeatherDescription'] ?? '',
      temperature: (json['temperature'] ?? 0.0).toDouble(),
      humidity: json['humidity'] ?? 0,
      windSpeed: (json['windSpeed'] ?? 0.0).toDouble(),
      pressure: json['pressure'] ?? 0,
      cloudCover: json['cloudCover'] ?? 0,
      currentImpact: SiteImpact.fromJson(json['currentImpact'] ?? {}),
      upcomingImpact: SiteImpact.fromJson(json['upcomingImpact'] ?? {}),
      nextRainInMinutes: json['nextRainInMinutes'],
      peakRainMm: (json['peakRainMm'] ?? 0.0).toDouble(),
      peakRainTime: json['peakRainTime'] ?? '',
      total24hMm: (json['total24hMm'] ?? 0.0).toDouble(),
      hourlyForecast: list.map((i) => HourlyRain.fromJson(i)).toList(),
      fetchedAt: json['fetchedAt'] ?? '',
    );
  }
}

