import 'dart:async';
import 'dart:io';
import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/gestures.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../providers/weather_provider.dart';
import '../models/weather_models.dart';
import 'server_settings_screen.dart';

class WeatherScreen extends StatefulWidget {
  const WeatherScreen({super.key});

  @override
  State<WeatherScreen> createState() => _WeatherScreenState();
}

class _WeatherScreenState extends State<WeatherScreen> {
  late final WebViewController _mapController;

  // Connectivity tracking
  bool _isOnline = true;
  StreamSubscription<List<ConnectivityResult>>? _connectivitySub;
  Timer? _pingTimer;
  bool _wasOffline = false; // track transitions for auto-refresh

  String getWindyUrl({double lat = 12.0, double lon = 122.0, int zoom = 5}) {
    return 'https://embed.windy.com/embed2.html?lat=$lat&lon=$lon&zoom=$zoom&level=surface&overlay=wind&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1';
  }

  // Track expanded storms
  final Set<String> _expandedStorms = {};

  void _injectCustomCss(WebViewController controller) {
    controller.runJavaScript('''
      var style = document.createElement('style');
      style.innerHTML = `
        #logo { display: none !important; }
        .logo { display: none !important; }
        a[href*="windy.com"] { display: none !important; }
        #mobile-zoom { display: none !important; }
        .zoom-controls { display: none !important; }
        .leaflet-control-zoom { display: none !important; }
        .leaflet-control-zoom-in { display: none !important; }
        .leaflet-control-zoom-out { display: none !important; }
        .leaflet-bar { display: none !important; }
      `;
      document.head.appendChild(style);
    ''');
  }

  @override
  void initState() {
    super.initState();
    _initConnectivity();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<WeatherProvider>().fetchWeatherData();
    });

    _mapController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0x00000000))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) => _injectCustomCss(_mapController),
        ),
      )
      ..loadRequest(Uri.parse(getWindyUrl(zoom: 4)));
  }

  Future<void> _initConnectivity() async {
    await _checkRealInternet();
    _connectivitySub = Connectivity().onConnectivityChanged.listen((_) async {
      await _checkRealInternet();
    });
    // Ping every 5 seconds as safety net
    _pingTimer = Timer.periodic(const Duration(seconds: 5), (_) async {
      await _checkRealInternet();
    });
  }

  Future<void> _checkRealInternet() async {
    try {
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 3));
      final online = result.isNotEmpty && result[0].rawAddress.isNotEmpty;
      if (mounted) {
        final justReconnected = !_isOnline && online;
        setState(() => _isOnline = online);
        if (justReconnected) {
          // Back online — auto-refresh all weather data
          _wasOffline = false;
          context.read<WeatherProvider>().fetchWeatherData();
          // Reload the satellite map WebView
          _mapController.loadRequest(Uri.parse(getWindyUrl(zoom: 4)));
        } else if (!online) {
          _wasOffline = true;
        }
      }
    } on SocketException catch (_) {
      if (mounted) setState(() => _isOnline = false);
    } on TimeoutException catch (_) {
      if (mounted) setState(() => _isOnline = false);
    } catch (_) {
      if (mounted) setState(() => _isOnline = false);
    }
  }

  @override
  void dispose() {
    _connectivitySub?.cancel();
    _pingTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Consumer<WeatherProvider>(
        builder: (context, weather, child) {
          // Show loading spinner only on FIRST load with zero data
          if (weather.isLoading && weather.signalData == null && weather.rainForecast == null) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFF2DD4BF)));
          }

          // Always show the weather UI — never blank out the screen
          // Errors are shown as an inline banner inside the scroll view
          return RefreshIndicator(
            color: const Color(0xFF2DD4BF),
            backgroundColor: const Color(0xFF0F172A),
            onRefresh: () => weather.fetchWeatherData(),
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Offline banner when no internet
                  if (!_isOnline)
                    _buildOfflineBanner(weather),
                  // Server error banner when online but server unreachable
                  if (_isOnline && weather.errorMessage.isNotEmpty)
                    _buildServerErrorBanner(weather),
                  _buildHeader(weather),
                  const SizedBox(height: 20),
                  _buildKPIGrid(weather),
                  const SizedBox(height: 24),
                  _buildPrecipitationForecast(weather),
                  const SizedBox(height: 24),
                  _buildInteractiveMap(),
                  const SizedBox(height: 24),
                  _buildTropicalCycloneAnalysis(weather),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  /// Shown when online but the Nexus server is unreachable
  Widget _buildServerErrorBanner(WeatherProvider weather) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.redAccent.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.redAccent.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.dns_outlined, color: Colors.redAccent, size: 15),
              const SizedBox(width: 8),
              const Expanded(
                child: Text(
                  'Cannot reach Nexus Server',
                  style: TextStyle(color: Colors.redAccent, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
              GestureDetector(
                onTap: () => weather.fetchWeatherData(),
                child: const Icon(Icons.refresh, color: Colors.white54, size: 16),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            weather.errorMessage,
            style: const TextStyle(color: Colors.white54, fontSize: 10, height: 1.4, fontFamily: 'monospace'),
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 10),
          GestureDetector(
            onTap: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ServerSettingsScreen()),
              );
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
              decoration: BoxDecoration(
                color: const Color(0xFF2DD4BF).withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFF2DD4BF).withValues(alpha: 0.3)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.settings_ethernet, color: Color(0xFF2DD4BF), size: 13),
                  SizedBox(width: 6),
                  Text('Configure Server URL', style: TextStyle(color: Color(0xFF2DD4BF), fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Offline banner shown at the top when there's no internet
  Widget _buildOfflineBanner(WeatherProvider weather) {
    String cacheAge = '';
    if (weather.rainForecast != null && weather.rainForecast!.fetchedAt.isNotEmpty) {
      try {
        final fetched = DateTime.parse(weather.rainForecast!.fetchedAt);
        final diff = DateTime.now().toUtc().difference(fetched);
        if (diff.inMinutes < 60) {
          cacheAge = 'Last updated ${diff.inMinutes} min ago';
        } else {
          cacheAge = 'Last updated ${diff.inHours}h ago';
        }
      } catch (_) {}
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.orangeAccent.withValues(alpha: 0.4)),
      ),
      child: Row(
        children: [
          const Icon(Icons.wifi_off, color: Colors.orangeAccent, size: 16),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Offline — Showing Cached Data',
                  style: TextStyle(color: Colors.orangeAccent, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                if (cacheAge.isNotEmpty)
                  Text(
                    cacheAge,
                    style: TextStyle(color: Colors.orange.withValues(alpha: 0.7), fontSize: 10),
                  ),
              ],
            ),
          ),
          const Text(
            'Auto-syncs on reconnect',
            style: TextStyle(color: Colors.white38, fontSize: 9),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(WeatherProvider weather) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, color: Colors.redAccent, size: 48),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Text(
              'Error: ${weather.errorMessage}',
              style: const TextStyle(color: Colors.white70, fontSize: 12),
              textAlign: TextAlign.center,
            ),
          ),
          TextButton(
            onPressed: () => weather.fetchWeatherData(),
            child: const Text('Retry', style: TextStyle(color: Color(0xFF2DD4BF))),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader(WeatherProvider weather) {
    return Row(
      children: [
        const Text(
          'Weather & Typhoon Monitor',
          style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
        ),
        const Spacer(),
        // Show LIVE badge when online, CACHED when offline
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: _isOnline
                ? const Color(0xFF2DD4BF).withValues(alpha: 0.1)
                : Colors.orange.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: _isOnline
                  ? const Color(0xFF2DD4BF).withValues(alpha: 0.3)
                  : Colors.orangeAccent.withValues(alpha: 0.4),
            ),
          ),
          child: Row(
            children: [
              Icon(
                _isOnline ? Icons.radar : Icons.cloud_off,
                color: _isOnline ? const Color(0xFF2DD4BF) : Colors.orangeAccent,
                size: 14,
              ),
              const SizedBox(width: 4),
              Text(
                _isOnline ? 'LIVE' : 'CACHED',
                style: TextStyle(
                  color: _isOnline ? const Color(0xFF2DD4BF) : Colors.orangeAccent,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildKPIGrid(WeatherProvider weather) {
    int activeStorms = weather.typhoonData?.storms.length ?? 0;
    final bool hasAlert = weather.signalData?.hasActiveBulletin ?? false;
    
    // Fallback: If PAGASA has an active bulletin but JTWC returned 0, ensure we count the PAR storm.
    if (activeStorms == 0 && hasAlert) {
      activeStorms = 1;
    }

    final int signalNum = weather.signalData?.siteSignalNumber ?? 0;
    String signalText = 'No Signal';
    Color signalColor = Colors.grey;
    if (hasAlert) {
      if (signalNum > 0) {
        signalText = 'Signal #$signalNum';
        signalColor = signalNum >= 3 ? Colors.redAccent : Colors.orangeAccent;
      } else {
        signalText = 'Monitoring';
        signalColor = const Color(0xFF2DD4BF);
      }
    }

    // Build "last updated" string from fetchedAt
    String lastUpdated = '';
    if (weather.rainForecast != null && weather.rainForecast!.fetchedAt.isNotEmpty) {
      try {
        final fetchedTime = DateTime.parse(weather.rainForecast!.fetchedAt);
        final diff = DateTime.now().toUtc().difference(fetchedTime);
        if (diff.inSeconds < 60) {
          lastUpdated = 'Updated just now';
        } else if (diff.inMinutes < 60) {
          lastUpdated = 'Updated ${diff.inMinutes} min ago';
        } else {
          lastUpdated = 'Updated ${diff.inHours}h ago';
        }
      } catch (_) {
        lastUpdated = '';
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GridView.count(
          crossAxisCount: 2,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
          childAspectRatio: 1.6,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            _buildGlassCard(
              title: 'SITE WIND SPEED',
              value: weather.rainForecast != null
                  ? weather.rainForecast!.windSpeed.toStringAsFixed(1)
                  : '--',
              unit: 'km/h',
              icon: Icons.air,
              color: const Color(0xFF2DD4BF),
            ),
            _buildGlassCard(
              title: 'SITE PRESSURE',
              value: weather.rainForecast != null
                  ? weather.rainForecast!.pressure.toString()
                  : '--',
              unit: 'hPa',
              icon: Icons.compress,
              color: const Color(0xFF2DD4BF),
            ),
            _buildGlassCard(
              title: 'ACTIVE STORMS',
              value: activeStorms.toString(),
              unit: '',
              icon: Icons.cyclone,
              color: activeStorms > 0 ? Colors.orangeAccent : const Color(0xFF2DD4BF),
            ),
            _buildGlassCard(
              title: 'SIGNAL ALERT',
              value: signalText,
              unit: '',
              icon: Icons.warning_amber_rounded,
              color: signalColor,
              isAlert: hasAlert,
            ),
          ],
        ),
        if (lastUpdated.isNotEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 8),
            child: Row(
              children: [
                Icon(Icons.access_time, size: 11, color: Colors.white.withValues(alpha: 0.3)),
                const SizedBox(width: 4),
                Text(
                  lastUpdated,
                  style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.3)),
                ),
                const Spacer(),
                Text(
                  'Auto-refreshes every 5 min',
                  style: TextStyle(fontSize: 10, color: Colors.white.withValues(alpha: 0.2)),
                ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _buildGlassCard({
    required String title,
    required String value,
    required String unit,
    required IconData icon,
    required Color color,
    bool isAlert = false,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: isAlert ? 0.4 : 0.1)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      title,
                      style: const TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Icon(icon, color: color, size: 16),
                ],
              ),
              Row(
                crossAxisAlignment: CrossAxisAlignment.baseline,
                textBaseline: TextBaseline.alphabetic,
                children: [
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: value.length > 8 ? 16 : 24, 
                      fontWeight: FontWeight.bold, 
                      color: isAlert ? color : Colors.white
                    ),
                  ),
                  if (unit.isNotEmpty) ...[
                    const SizedBox(width: 4),
                    Text(unit, style: const TextStyle(color: Colors.grey, fontSize: 12)),
                  ],
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInteractiveMap() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.map, color: Color(0xFF2DD4BF), size: 18),
            const SizedBox(width: 8),
            const Text(
              'Interactive Satellite Overlay',
              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
            const Spacer(),
            if (!_isOnline)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.orange.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: Colors.orangeAccent.withValues(alpha: 0.3)),
                ),
                child: const Text(
                  'Unavailable Offline',
                  style: TextStyle(color: Colors.orangeAccent, fontSize: 9, fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          height: 350,
          width: double.infinity,
          decoration: BoxDecoration(
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
            borderRadius: BorderRadius.circular(16),
          ),
          child: _isOnline
              ? Stack(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: WebViewWidget(
                        controller: _mapController,
                        gestureRecognizers: {
                          Factory<EagerGestureRecognizer>(() => EagerGestureRecognizer()),
                        },
                      ),
                    ),
                    // Full screen button
                    Positioned(
                      top: 8,
                      right: 8,
                      child: Container(
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A).withValues(alpha: 0.8),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                        ),
                        child: IconButton(
                          icon: const Icon(Icons.fullscreen, color: Colors.white),
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => FullScreenMapScreen(initialUrl: getWindyUrl(zoom: 4)),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                  ],
                )
              : _buildOfflineMapPlaceholder(),
        ),
      ],
    );
  }

  /// Offline placeholder shown instead of the WebView satellite map
  Widget _buildOfflineMapPlaceholder() {
    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        height: double.infinity,
        color: const Color(0xFF0A0F1E),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.08),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.orangeAccent.withValues(alpha: 0.2)),
              ),
              child: const Icon(Icons.satellite_alt, color: Colors.orangeAccent, size: 40),
            ),
            const SizedBox(height: 16),
            const Text(
              'Satellite Map Unavailable',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const SizedBox(height: 6),
            const Text(
              'Internet connection required to load\nthe live satellite wind overlay.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white38, fontSize: 12, height: 1.5),
            ),
            const SizedBox(height: 20),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFF2DD4BF).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFF2DD4BF).withValues(alpha: 0.2)),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.refresh, color: Color(0xFF2DD4BF), size: 14),
                  SizedBox(width: 6),
                  Text(
                    'Will load automatically when back online',
                    style: TextStyle(color: Color(0xFF2DD4BF), fontSize: 10),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTropicalCycloneAnalysis(WeatherProvider weather) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.assessment, color: Color(0xFF2DD4BF), size: 18),
            SizedBox(width: 8),
            Text(
              'Tropical Cyclone Analysis Briefing',
              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        if (weather.typhoonData?.storms.isEmpty ?? true)
          _buildNoStormsCard(weather.signalData)
        else
          ...weather.typhoonData!.storms.map((storm) => _buildStormAccordion(storm)).toList(),
      ],
    );
  }

  Widget _buildNoStormsCard(PagasaSignalData? signal) {
    if (signal?.hasActiveBulletin == true) {
      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          border: Border.all(color: Colors.redAccent.withValues(alpha: 0.3)),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.redAccent.withValues(alpha: 0.1),
              blurRadius: 10,
              spreadRadius: 2,
            )
          ]
        ),
        child: Column(
          children: [
            // Header
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.redAccent.withValues(alpha: 0.15),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                border: Border(bottom: BorderSide(color: Colors.redAccent.withValues(alpha: 0.3))),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning_amber_rounded, color: Colors.redAccent, size: 24),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'PAGASA SEVERE WEATHER BULLETIN',
                          style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 0.5),
                        ),
                        Text(
                          '${signal?.tcCategory} ${signal?.tcName}',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            
            // Metrics Grid
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _buildTyphoonMetric(
                          icon: Icons.air,
                          label: 'MAX WINDS',
                          value: '${signal?.maxWindsKph} km/h',
                          color: Colors.orangeAccent,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildTyphoonMetric(
                          icon: Icons.speed,
                          label: 'GUSTINESS',
                          value: 'Up to ${signal?.gustsKph} km/h',
                          color: Colors.redAccent,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTyphoonMetric(
                          icon: Icons.explore,
                          label: 'MOVEMENT',
                          value: signal?.movement ?? 'Stationary',
                          color: const Color(0xFF2DD4BF),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _buildTyphoonMetric(
                          icon: Icons.cell_tower,
                          label: 'SITE SIGNAL',
                          value: signal != null && signal.siteSignalNumber > 0 
                            ? 'Signal #${signal.siteSignalNumber}' 
                            : 'No Signal',
                          color: signal != null && signal.siteSignalNumber > 0 ? Colors.redAccent : Colors.grey,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Stay alert and follow all safety protocols. Operations may be suspended if Signal #2 or higher is raised for the site.',
                    style: TextStyle(color: Colors.white70, fontSize: 11, fontStyle: FontStyle.italic),
                    textAlign: TextAlign.center,
                  )
                ],
              ),
            ),
          ],
        ),
      );
    }
    
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.02),
        border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(Icons.check_circle_outline, color: const Color(0xFF2DD4BF).withValues(alpha: 0.5), size: 40),
          const SizedBox(height: 12),
          const Text(
            'Philippine Area of Responsibility (PAR) Clear',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 8),
          const Text(
            'There is currently no active tropical depression, storm, or typhoon activity within warning range of Tumauini operations.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey, fontSize: 11, height: 1.5),
          ),
        ],
      ),
    );
  }

  Widget _buildTyphoonMetric({required IconData icon, required String label, required String value, required Color color}) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(color: color, fontSize: 16, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(color: Colors.white54, fontSize: 9),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  // ============================================================
  // Precipitation Forecast Section
  // ============================================================

  Widget _buildPrecipitationForecast(WeatherProvider weather) {
    final rain = weather.rainForecast;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.water_drop, color: Color(0xFF38BDF8), size: 18),
            SizedBox(width: 8),
            Text(
              'Precipitation Forecast',
              style: TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 12),

        if (rain == null)
          _buildRainLoadingCard()
        else ...
        [
          _buildSiteImpactBanner(rain),
          const SizedBox(height: 12),
          _buildCurrentConditionsRow(rain),
          const SizedBox(height: 12),
          _buildNextRainIndicator(rain),
          const SizedBox(height: 12),
          _buildHourlyTimeline(rain),
        ],
      ],
    );
  }

  Widget _buildRainLoadingCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: const Column(
        children: [
          CircularProgressIndicator(color: Color(0xFF38BDF8), strokeWidth: 2),
          SizedBox(height: 12),
          Text('Loading precipitation data...', style: TextStyle(color: Colors.white54, fontSize: 12)),
        ],
      ),
    );
  }

  Color _parseHexColor(String hex) {
    hex = hex.replaceFirst('#', '');
    if (hex.length == 6) hex = 'FF$hex';
    return Color(int.parse(hex, radix: 16));
  }

  Widget _buildSiteImpactBanner(RainForecastData rain) {
    final impact = rain.upcomingImpact;
    final color = _parseHexColor(impact.color);

    IconData impactIcon;
    switch (impact.level) {
      case 'CLEAR':
        impactIcon = Icons.wb_sunny;
        break;
      case 'LIGHT':
        impactIcon = Icons.grain;
        break;
      case 'MODERATE':
        impactIcon = Icons.umbrella;
        break;
      case 'HEAVY':
        impactIcon = Icons.thunderstorm;
        break;
      case 'EXTREME':
        impactIcon = Icons.dangerous;
        break;
      default:
        impactIcon = Icons.help_outline;
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withValues(alpha: 0.2), color.withValues(alpha: 0.05)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(impactIcon, color: color, size: 28),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'SITE IMPACT: ',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.7), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.3),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        impact.level,
                        style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  impact.recommendation,
                  style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.4),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCurrentConditionsRow(RainForecastData rain) {
    return Row(
      children: [
        Expanded(
          child: _buildConditionChip(
            icon: Icons.thermostat,
            label: 'Temp',
            value: '${rain.temperature.toStringAsFixed(1)}\u00b0C',
            color: const Color(0xFFFBBF24),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildConditionChip(
            icon: Icons.water_drop,
            label: 'Humidity',
            value: '${rain.humidity}%',
            color: const Color(0xFF38BDF8),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildConditionChip(
            icon: Icons.cloud,
            label: 'Cloud',
            value: '${rain.cloudCover}%',
            color: const Color(0xFF94A3B8),
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildConditionChip(
            icon: Icons.water,
            label: '24h Rain',
            value: '${rain.total24hMm}mm',
            color: const Color(0xFF818CF8),
          ),
        ),
      ],
    );
  }

  Widget _buildConditionChip({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.15)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(color: Colors.white38, fontSize: 9)),
        ],
      ),
    );
  }

  Widget _buildNextRainIndicator(RainForecastData rain) {
    final nextRain = rain.nextRainInMinutes;
    String message;
    IconData icon;
    Color color;

    if (rain.currentRainMm > 0) {
      message = 'It is currently raining at the site (${rain.currentRainMm} mm/hr)';
      icon = Icons.umbrella;
      color = const Color(0xFF38BDF8);
    } else if (nextRain != null) {
      if (nextRain < 60) {
        message = '\ud83c\udf27\ufe0f Rain expected in ~$nextRain minutes \u2014 prepare site!';
        icon = Icons.notification_important;
        color = Colors.orangeAccent;
      } else {
        final hours = nextRain ~/ 60;
        final mins = nextRain % 60;
        final timeStr = mins > 0 ? '$hours hr ${mins} min' : '$hours hour${hours > 1 ? 's' : ''}';
        message = 'Rain expected in ~$timeStr. Peak: ${rain.peakRainMm} mm/hr.';
        icon = Icons.schedule;
        color = const Color(0xFFFBBF24);
      }
    } else {
      message = 'No rain expected in the next 24 hours. All clear.';
      icon = Icons.check_circle;
      color = const Color(0xFF2DD4BF);
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.25)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHourlyTimeline(RainForecastData rain) {
    if (rain.hourlyForecast.isEmpty) {
      return const SizedBox.shrink();
    }

    double maxPrecip = rain.hourlyForecast.fold(0.0, (max, h) => h.precipitationMm > max ? h.precipitationMm : max);
    if (maxPrecip < 1) maxPrecip = 1;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          children: [
            Icon(Icons.timeline, color: Colors.white54, size: 14),
            SizedBox(width: 6),
            Text('24-Hour Precipitation Timeline', style: TextStyle(color: Colors.white54, fontSize: 11, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),
        SizedBox(
          height: 140,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            itemCount: rain.hourlyForecast.length,
            itemBuilder: (context, index) {
              final hour = rain.hourlyForecast[index];
              return _buildHourlyCard(hour, maxPrecip);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildHourlyCard(HourlyRain hour, double maxPrecip) {
    String displayTime = '';
    try {
      final dt = DateTime.parse(hour.time);
      final h = dt.hour;
      displayTime = h == 0 ? '12AM' : h < 12 ? '${h}AM' : h == 12 ? '12PM' : '${h - 12}PM';
    } catch (_) {
      displayTime = hour.time;
    }

    final barHeight = hour.precipitationMm > 0
        ? (hour.precipitationMm / maxPrecip * 50).clamp(4.0, 50.0)
        : 2.0;

    Color barColor;
    if (hour.precipitationMm <= 0) {
      barColor = Colors.white.withValues(alpha: 0.1);
    } else if (hour.precipitationMm <= 2.5) {
      barColor = const Color(0xFF38BDF8);
    } else if (hour.precipitationMm <= 7.5) {
      barColor = const Color(0xFFFBBF24);
    } else if (hour.precipitationMm <= 15) {
      barColor = Colors.orangeAccent;
    } else {
      barColor = Colors.redAccent;
    }

    return Container(
      width: 56,
      margin: const EdgeInsets.only(right: 6),
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 4),
      decoration: BoxDecoration(
        color: hour.precipitationMm > 0
            ? barColor.withValues(alpha: 0.08)
            : Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: hour.precipitationMm > 0
              ? barColor.withValues(alpha: 0.25)
              : Colors.white.withValues(alpha: 0.05),
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text(
            hour.precipitationMm > 0 ? '${hour.precipitationMm}' : '-',
            style: TextStyle(
              color: hour.precipitationMm > 0 ? barColor : Colors.white24,
              fontSize: 10,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 2),
          Text('mm', style: TextStyle(color: Colors.white.withValues(alpha: 0.3), fontSize: 7)),
          const SizedBox(height: 4),
          Container(
            width: 14,
            height: barHeight,
            decoration: BoxDecoration(
              color: barColor,
              borderRadius: BorderRadius.circular(7),
            ),
          ),
          const SizedBox(height: 4),
          if (hour.probability > 0)
            Text('${hour.probability}%', style: TextStyle(color: Colors.white.withValues(alpha: 0.5), fontSize: 8)),
          const Spacer(),
          Text(displayTime, style: const TextStyle(color: Colors.white54, fontSize: 8), textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Widget _buildStormAccordion(storm) {
    final bool isExpanded = _expandedStorms.contains(storm.id);
    
    Color catColor = Colors.orangeAccent;
    if (storm.category.toLowerCase().contains("typhoon") || storm.maxWinds > 118) {
      catColor = Colors.redAccent;
    } else if (storm.category.toLowerCase().contains("depression")) {
      catColor = const Color(0xFF2DD4BF);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        children: [
          InkWell(
            onTap: () {
              setState(() {
                if (isExpanded) {
                  _expandedStorms.remove(storm.id);
                } else {
                  _expandedStorms.add(storm.id);
                }
              });
            },
            borderRadius: BorderRadius.circular(16),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: catColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: catColor.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      storm.category.toUpperCase().split(' ').first,
                      style: TextStyle(color: catColor, fontSize: 9, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          storm.name.toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'ID: ${storm.id}',
                          style: const TextStyle(color: Colors.grey, fontSize: 10, fontFamily: 'monospace'),
                        ),
                      ],
                    ),
                  ),
                  Icon(
                    isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                    color: Colors.grey,
                  ),
                ],
              ),
            ),
          ),
          if (isExpanded)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.05))),
              ),
              child: Column(
                children: [
                  _buildDetailRow('Position', '${storm.latitude.toStringAsFixed(2)}°N, ${storm.longitude.toStringAsFixed(2)}°E'),
                  const SizedBox(height: 12),
                  _buildDetailRow('Max Sustained Winds', '${storm.maxWinds} kph'),
                  const SizedBox(height: 12),
                  _buildDetailRow('Estimated Category', storm.category),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class FullScreenMapScreen extends StatefulWidget {
  final String initialUrl;

  const FullScreenMapScreen({super.key, required this.initialUrl});

  @override
  State<FullScreenMapScreen> createState() => _FullScreenMapScreenState();
}

class _FullScreenMapScreenState extends State<FullScreenMapScreen> {
  late final WebViewController _fullScreenController;

  void _injectCustomCss(WebViewController controller) {
    controller.runJavaScript('''
      var style = document.createElement('style');
      style.innerHTML = `
        #logo { display: none !important; }
        .logo { display: none !important; }
        a[href*="windy.com"] { display: none !important; }
        #mobile-zoom { display: none !important; }
        .zoom-controls { display: none !important; }
        .leaflet-control-zoom { display: none !important; }
        .leaflet-control-zoom-in { display: none !important; }
        .leaflet-control-zoom-out { display: none !important; }
        .leaflet-bar { display: none !important; }
      `;
      document.head.appendChild(style);
    ''');
  }

  @override
  void initState() {
    super.initState();
    // Enable immersive full screen (hides status bar and navigation bar)
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

    // Create a new controller for the full screen view to avoid blank screen conflicts
    _fullScreenController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(const Color(0xFF0F172A))
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (String url) => _injectCustomCss(_fullScreenController),
        ),
      )
      ..loadRequest(Uri.parse(widget.initialUrl));
  }

  @override
  void dispose() {
    // Restore system UI when leaving full screen
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Stack(
        children: [
          // True full screen without safe area, no clipping
          WebViewWidget(
            controller: _fullScreenController,
            gestureRecognizers: {
              Factory<EagerGestureRecognizer>(() => EagerGestureRecognizer()),
            },
          ),

          // Close Button
          Positioned(
            top: 45, 
            right: 16,
            child: Container(
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A).withValues(alpha: 0.9),
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
              ),
              child: IconButton(
                icon: const Icon(Icons.close, color: Colors.white),
                onPressed: () => Navigator.pop(context),
              ),
            ),
          ),

          // Current Location / Site Location Button
          Positioned(
            bottom: 32,
            right: 16,
            child: FloatingActionButton(
              backgroundColor: const Color(0xFF2DD4BF),
              foregroundColor: const Color(0xFF0F172A),
              elevation: 4,
              onPressed: () {
                const url = 'https://embed.windy.com/embed2.html?lat=17.276&lon=121.806&zoom=9&level=surface&overlay=wind&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1';
                _fullScreenController.loadRequest(Uri.parse(url));
              },
              child: const Icon(Icons.my_location),
            ),
          ),
          
          // Reset to Philippines Button
          Positioned(
            bottom: 100,
            right: 16,
            child: FloatingActionButton.small(
              backgroundColor: const Color(0xFF0F172A).withValues(alpha: 0.9),
              foregroundColor: Colors.white,
              elevation: 4,
              onPressed: () {
                const url = 'https://embed.windy.com/embed2.html?lat=12.0&lon=122.0&zoom=4&level=surface&overlay=wind&menu=&message=&marker=&calendar=&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1';
                _fullScreenController.loadRequest(Uri.parse(url));
              },
              child: const Icon(Icons.map),
            ),
          ),
        ],
      ),
    );
  }
}
