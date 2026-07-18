import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import '../providers/weather_provider.dart';
import '../services/server_config_service.dart';

/// Settings screen for configuring the Nexus server connection.
/// Accessible when the safety officer needs to manually set the server IP
/// or when mDNS auto-discovery is unavailable on the current network.
class ServerSettingsScreen extends StatefulWidget {
  const ServerSettingsScreen({super.key});

  @override
  State<ServerSettingsScreen> createState() => _ServerSettingsScreenState();
}

class _ServerSettingsScreenState extends State<ServerSettingsScreen> {
  final TextEditingController _urlController = TextEditingController();
  bool _isTesting = false;
  bool _isDiscovering = false;
  String? _testResult;
  bool? _testSuccess;

  @override
  void initState() {
    super.initState();
    _loadCurrentConfig();
  }

  Future<void> _loadCurrentConfig() async {
    // Show the currently active URL — skip any virtual adapter IPs
    final manual = await ServerConfigService.getManualUrl();
    if (manual != null && manual.isNotEmpty && !_isVirtualIp(manual) && mounted) {
      setState(() => _urlController.text = manual);
      return;
    }
    final lastWorking = await ServerConfigService.getLastWorkingUrl();
    if (lastWorking != null && !_isVirtualIp(lastWorking) && mounted) {
      setState(() => _urlController.text = lastWorking);
    }
  }

  // Quick check for known virtual adapter IPs that won't work from a phone
  bool _isVirtualIp(String url) {
    const badSubnets = ['192.168.119.', '192.168.155.', '192.168.137.'];
    return badSubnets.any((s) => url.contains(s));
  }

  Future<void> _reset() async {
    // Wipe all saved URLs and force fresh discovery
    await ServerConfigService.resetAll();
    if (mounted) {
      setState(() {
        _urlController.text = '';
        _testResult = '🔄 Cleared. App will auto-discover on next launch.';
        _testSuccess = true;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Server config reset. Tap Auto-Discover to find the server.'),
          backgroundColor: Color(0xFF0EA5E9),
        ),
      );
    }
  }

  Future<void> _testConnection() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;

    setState(() {
      _isTesting = true;
      _testResult = null;
      _testSuccess = null;
    });

    // Full diagnostic — show every detail so we can debug from a screenshot
    final clean = url.replaceAll(RegExp(r'/+$'), '');
    final healthUrl = '$clean/api/health';
    String diagnostics = '🔍 Testing: $healthUrl\n';

    try {
      final stopwatch = Stopwatch()..start();
      final response = await http
          .get(Uri.parse(healthUrl))
          .timeout(const Duration(seconds: 8));
      stopwatch.stop();

      diagnostics += '⏱ Response in ${stopwatch.elapsedMilliseconds}ms\n';
      diagnostics += '📊 HTTP ${response.statusCode}\n';
      diagnostics += '📦 Body: ${response.body.length > 200 ? response.body.substring(0, 200) : response.body}\n';

      if (response.statusCode == 200) {
        diagnostics = '✅ Connected! (${stopwatch.elapsedMilliseconds}ms)\n$diagnostics';
        if (mounted) setState(() { _isTesting = false; _testSuccess = true; _testResult = diagnostics; });
      } else {
        diagnostics = '❌ Server returned ${response.statusCode}\n$diagnostics';
        if (mounted) setState(() { _isTesting = false; _testSuccess = false; _testResult = diagnostics; });
      }
    } on TimeoutException {
      diagnostics += '❌ TIMEOUT after 8 seconds\n';
      diagnostics += 'Phone cannot reach $clean — network issue';
      if (mounted) setState(() { _isTesting = false; _testSuccess = false; _testResult = diagnostics; });
    } on SocketException catch (e) {
      diagnostics += '❌ SOCKET ERROR: ${e.message}\n';
      diagnostics += 'Address: ${e.address?.address ?? "none"}\nPort: ${e.port ?? "none"}';
      if (mounted) setState(() { _isTesting = false; _testSuccess = false; _testResult = diagnostics; });
    } catch (e) {
      diagnostics += '❌ ${e.runtimeType}: $e';
      if (mounted) setState(() { _isTesting = false; _testSuccess = false; _testResult = diagnostics; });
    }
  }

  Future<void> _save() async {
    final url = _urlController.text.trim();
    if (url.isEmpty) return;
    await ServerConfigService.setManualUrl(url);
    if (mounted) {
      // Immediately re-fetch weather data with the new URL
      context.read<WeatherProvider>().fetchWeatherData();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Server URL saved. Refreshing weather data...'),
          backgroundColor: Color(0xFF059669),
        ),
      );
      Navigator.pop(context);
    }
  }

  Future<void> _autoDiscover() async {
    setState(() {
      _isDiscovering = true;
      _testResult = null;
      _testSuccess = null;
    });

    // Clear cache to force fresh mDNS discovery
    ServerConfigService.clearCache();
    final url = await ServerConfigService.getApiBaseUrl();

    if (mounted) {
      setState(() {
        _isDiscovering = false;
        // getApiBaseUrl returns the /api path — strip it for display
        final base = url.replaceAll('/api', '');
        _urlController.text = base;
        _testResult = '📡 Auto-discovered: $base';
        _testSuccess = true;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0F1E),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A0F1E),
        foregroundColor: Colors.white,
        title: const Text('Server Connection', style: TextStyle(color: Colors.white)),
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: Colors.white.withValues(alpha: 0.1), height: 1),
        ),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Info card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF2DD4BF).withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFF2DD4BF).withValues(alpha: 0.3)),
              ),
              child: const Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(Icons.info_outline, color: Color(0xFF2DD4BF), size: 16),
                      SizedBox(width: 8),
                      Text('Auto-Discovery', style: TextStyle(color: Color(0xFF2DD4BF), fontWeight: FontWeight.bold)),
                    ],
                  ),
                  SizedBox(height: 8),
                  Text(
                    'The app automatically finds the Nexus server on your local network. '
                    'Only use manual configuration if auto-discovery fails.',
                    style: TextStyle(color: Colors.white70, fontSize: 12, height: 1.5),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Auto-discover button
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: _isDiscovering ? null : _autoDiscover,
                icon: _isDiscovering
                    ? const SizedBox(
                        width: 14,
                        height: 14,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF2DD4BF)),
                      )
                    : const Icon(Icons.wifi_find, color: Color(0xFF2DD4BF), size: 18),
                label: Text(
                  _isDiscovering ? 'Searching...' : 'Auto-Discover Server',
                  style: const TextStyle(color: Color(0xFF2DD4BF)),
                ),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF2DD4BF)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 10),
            // Reset button — clears any wrong cached URL
            SizedBox(
              width: double.infinity,
              child: TextButton.icon(
                onPressed: _reset,
                icon: const Icon(Icons.delete_outline, color: Colors.redAccent, size: 16),
                label: const Text('Reset & Clear Saved URL', style: TextStyle(color: Colors.redAccent, fontSize: 12)),
              ),
            ),
            const SizedBox(height: 14),

            const Text(
              'Manual Server URL',
              style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 1),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _urlController,
              style: const TextStyle(color: Colors.white),
              keyboardType: TextInputType.url,
              decoration: InputDecoration(
                hintText: 'http://10.0.3.72:3000',
                hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.3)),
                prefixIcon: const Icon(Icons.dns, color: Color(0xFF2DD4BF), size: 18),
                filled: true,
                fillColor: Colors.white.withValues(alpha: 0.05),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.15)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.15)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF2DD4BF)),
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Test result
            if (_testResult != null)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: (_testSuccess == true ? Colors.green : Colors.red).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: (_testSuccess == true ? Colors.green : Colors.red).withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  _testResult!,
                  style: TextStyle(
                    color: _testSuccess == true ? Colors.greenAccent : Colors.redAccent,
                    fontSize: 10,
                    fontFamily: 'monospace',
                    height: 1.5,
                  ),
                ),
              ),

            const SizedBox(height: 16),

            // Test + Save buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isTesting ? null : _testConnection,
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: _isTesting
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Test', style: TextStyle(color: Colors.white70)),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2DD4BF),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    child: const Text('Save & Apply', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  @override
  void dispose() {
    _urlController.dispose();
    super.dispose();
  }
}
