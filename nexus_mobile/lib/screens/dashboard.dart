import 'package:flutter/material.dart';
import 'dart:ui';
import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'weather_screen.dart';
import 'server_settings_screen.dart';
import '../models/dashboard_mock_data.dart';
import '../services/offline_sync_service.dart';
import '../services/server_config_service.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  // Real-time connectivity state
  bool isOnline = true;
  bool _wasPreviouslyOffline = false; // tracks transitions for auto-sync
  int _pendingSyncCount = 0;          // number of queued offline sign-offs
  late StreamSubscription<List<ConnectivityResult>> _connectivitySub;
  Timer? _pingTimer;

  // Headcount State
  bool _isEditingHeadcount = false;
  final Map<String, int> _zoneBreakdown = Map.from(DashboardMockData.zoneBreakdown);
  int get _totalWorkers => _zoneBreakdown.values.fold(0, (sum, count) => sum + count);

  // PTW State
  bool _isEditingPTWs = false;
  Timer? _ptwStatusTimer; // Ticks every minute to recompute expired statuses

  // Daily Safety Checklist State
  bool _toolboxTalkCompleted = false;
  bool _heavyEqInspected = false;
  bool _ppeChecked = false;
  bool _signedOff = false;
  bool _isSigningOff = false;

  bool get _canSignOff => _toolboxTalkCompleted && _heavyEqInspected && _ppeChecked && !_signedOff;

  @override
  void initState() {
    super.initState();
    _loadChecklistState();
    _initConnectivity();
    // Load persisted PTWs from storage
    DashboardMockData.loadPTWs().then((_) => setState(() {}));
    // Tick every minute to auto-update Expired / Expiring Soon statuses
    _ptwStatusTimer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (mounted) setState(() {});
    });
    // Check if there are pending sign-offs from previous offline session
    _refreshPendingSyncCount();
  }

  Future<void> _initConnectivity() async {
    // 1. Immediately check real internet access on launch
    await _checkRealInternet();

    // 2. Listen for interface-level changes (fast but unreliable alone)
    _connectivitySub = Connectivity()
        .onConnectivityChanged
        .listen((results) async {
      // When interface changes, do a real ping to confirm
      await _checkRealInternet();
    });

    // 3. Also ping every 5 seconds as a safety net
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
        final justReconnected = !isOnline && online;
        setState(() => isOnline = online);
        if (justReconnected) {
          // Back online — flush any queued sign-offs automatically
          _flushOfflineQueue();
        }
      }
    } on SocketException catch (_) {
      if (mounted) setState(() => isOnline = false);
    } on TimeoutException catch (_) {
      if (mounted) setState(() => isOnline = false);
    } catch (_) {
      if (mounted) setState(() => isOnline = false);
    }
  }

  Future<void> _refreshPendingSyncCount() async {
    final count = await OfflineSyncService.pendingCount();
    if (mounted) setState(() => _pendingSyncCount = count);
  }

  /// Flush offline sign-off queue after reconnecting
  Future<void> _flushOfflineQueue() async {
    final result = await OfflineSyncService.flushQueue();
    await _refreshPendingSyncCount();
    if (result.hasSync && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.cloud_done, color: Colors.white, size: 18),
              const SizedBox(width: 8),
              Text('${result.synced} offline sign-off${result.synced > 1 ? 's' : ''} synced to database'),
            ],
          ),
          backgroundColor: const Color(0xFF059669),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  @override
  void dispose() {
    _connectivitySub.cancel();
    _pingTimer?.cancel();
    _ptwStatusTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadChecklistState() async {
    final prefs = await SharedPreferences.getInstance();
    final today = DateTime.now().toIso8601String().substring(0, 10); // "YYYY-MM-DD"
    final savedDate = prefs.getString('checklist_date');

    // Load headcount (it persists regardless of the date)
    final savedHeadcount = prefs.getString('zoneBreakdown');
    if (savedHeadcount != null) {
      final Map<String, dynamic> decoded = jsonDecode(savedHeadcount);
      setState(() {
        decoded.forEach((key, value) {
          _zoneBreakdown[key] = value as int;
        });
      });
    }

    if (savedDate == today) {
      setState(() {
        _toolboxTalkCompleted = prefs.getBool('toolboxTalk') ?? false;
        _heavyEqInspected = prefs.getBool('heavyEq') ?? false;
        _ppeChecked = prefs.getBool('ppeChecked') ?? false;
        _signedOff = prefs.getBool('signedOff') ?? false;
      });
    } else {
      // It's a new day, clear ONLY the checklist state
      await prefs.remove('toolboxTalk');
      await prefs.remove('heavyEq');
      await prefs.remove('ppeChecked');
      await prefs.remove('signedOff');
      await prefs.setString('checklist_date', today);
    }
  }

  Future<void> _saveChecklistState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('toolboxTalk', _toolboxTalkCompleted);
    await prefs.setBool('heavyEq', _heavyEqInspected);
    await prefs.setBool('ppeChecked', _ppeChecked);
    await prefs.setBool('signedOff', _signedOff);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Gradient (matching web app aesthetics)
          Positioned.fill(
            child: Container(
              decoration: const BoxDecoration(
                gradient: RadialGradient(
                  center: Alignment(-0.8, -0.6),
                  radius: 1.5,
                  colors: [
                    Color(0xFF0F172A), // Dark Slate
                    Color(0xFF020617), // Very Dark Slate
                  ],
                ),
              ),
            ),
          ),
          
          SafeArea(
            child: Column(
              children: [
                _buildTopBar(),
                Expanded(
                  child: _buildBodyContent(),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Row(
            children: [
              CircleAvatar(
                radius: 20,
                backgroundColor: Color(0xFF2DD4BF),
                child: Text('AA', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
              ),
              SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Alfredo Ariz',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  Text(
                    'Safety Officer Head',
                    style: TextStyle(color: Colors.grey, fontSize: 12),
                  ),
                ],
              ),
            ],
          ),
          Row(
            children: [
              // Pending sync badge — shown when offline sign-offs are queued
              if (_pendingSyncCount > 0)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: GestureDetector(
                    onTap: () {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text(
                            '$_pendingSyncCount sign-off${_pendingSyncCount > 1 ? 's' : ''} pending sync. Will upload automatically when online.',
                          ),
                          backgroundColor: Colors.orangeAccent.shade700,
                          duration: const Duration(seconds: 4),
                        ),
                      );
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.orange.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.orangeAccent, width: 1),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.cloud_upload_outlined, color: Colors.orangeAccent, size: 13),
                          const SizedBox(width: 4),
                          Text(
                            '$_pendingSyncCount pending',
                            style: const TextStyle(color: Colors.orangeAccent, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // Online / Offline badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: isOnline ? Colors.green.withValues(alpha: 0.2) : Colors.orange.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: isOnline ? Colors.green : Colors.orange, width: 1),
                ),
                child: Row(
                  children: [
                    Icon(isOnline ? Icons.wifi : Icons.wifi_off,
                        color: isOnline ? Colors.green : Colors.orange, size: 13),
                    const SizedBox(width: 4),
                    Text(
                      isOnline ? 'Online' : 'Offline',
                      style: TextStyle(
                        color: isOnline ? Colors.green : Colors.orange,
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
              ),

              // Server settings button
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ServerSettingsScreen()),
                  ).then((_) {
                    // Clear discovery cache when returning from settings
                    ServerConfigService.clearCache();
                  });
                },
                child: Container(
                  padding: const EdgeInsets.all(7),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.07),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.12)),
                  ),
                  child: const Icon(Icons.settings_ethernet, color: Colors.white54, size: 16),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }


  Widget _buildBodyContent() {
    // Basic routing
    switch (_selectedIndex) {
      case 0:
        return _buildHomeTab();
      case 1:
        return const WeatherScreen();
      case 2:
        return const Center(child: Text("Incident Dispatch"));
      default:
        return const Center(child: Text("Home"));
    }
  }

  Widget _buildHomeTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildSectionHeader(
            'Site Headcount', 
            Icons.people_alt,
            trailing: IconButton(
              icon: Icon(
                _isEditingHeadcount ? Icons.check_circle : Icons.edit_note, 
                color: _isEditingHeadcount ? Colors.green : const Color(0xFF2DD4BF),
              ),
              onPressed: () {
                setState(() {
                  _isEditingHeadcount = !_isEditingHeadcount;
                });
              },
              padding: EdgeInsets.zero,
              constraints: const BoxConstraints(),
            ),
          ),
          const SizedBox(height: 12),
          _buildHeadcountSection(),
          
          const SizedBox(height: 24),
          _buildSectionHeader(
            'Active Permits to Work', 
            Icons.assignment_late,
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                IconButton(
                  icon: const Icon(Icons.add_circle_outline, color: Color(0xFF2DD4BF)),
                  onPressed: () => _showPTWModal(),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
                const SizedBox(width: 12),
                IconButton(
                  icon: Icon(
                    _isEditingPTWs ? Icons.check_circle : Icons.edit_note, 
                    color: _isEditingPTWs ? Colors.green : const Color(0xFF2DD4BF),
                  ),
                  onPressed: () {
                    setState(() {
                      _isEditingPTWs = !_isEditingPTWs;
                    });
                  },
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          _buildPTWSection(),

          const SizedBox(height: 24),
          _buildSectionHeader('Daily Safety Checklist', Icons.fact_check),
          const SizedBox(height: 12),
          _buildChecklistSection(),
          const SizedBox(height: 24), // Bottom padding
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, {Widget? trailing}) {
    return Row(
      children: [
        Icon(icon, color: const Color(0xFF2DD4BF), size: 20),
        const SizedBox(width: 8),
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        if (trailing != null) ...[
          const Spacer(),
          trailing,
        ]
      ],
    );
  }

  void _showPTWModal({PTWMock? existingPtw, int? index}) {
    final bool isEditing = existingPtw != null && index != null;

    String selectedType = isEditing ? existingPtw.type : 'Hot Work';
    final locationController = TextEditingController(text: isEditing ? existingPtw.location : '');
    final teamController = TextEditingController(text: isEditing ? existingPtw.team : '');

    // Default expiry = today + 8 hours
    DateTime selectedExpiry = isEditing
        ? existingPtw.expiryDateTime
        : DateTime.now().add(const Duration(hours: 8));

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return StatefulBuilder(
          builder: (BuildContext context, StateSetter setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
              ),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      isEditing ? 'Edit Permit to Work' : 'Add Permit to Work',
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 24),

                    // Type Dropdown
                    DropdownButtonFormField<String>(
                      value: selectedType,
                      dropdownColor: const Color(0xFF1E293B),
                      decoration: _inputDecoration('Permit Type', Icons.assignment),
                      style: const TextStyle(color: Colors.white),
                      items: ['Hot Work', 'Confined Space', 'Working at Heights', 'Lifting Operations']
                          .map((type) => DropdownMenuItem(value: type, child: Text(type)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setModalState(() => selectedType = val);
                      },
                    ),
                    const SizedBox(height: 16),

                    // Location
                    TextField(
                      controller: locationController,
                      style: const TextStyle(color: Colors.white),
                      decoration: _inputDecoration('Location', Icons.location_on),
                    ),
                    const SizedBox(height: 16),

                    // Team
                    TextField(
                      controller: teamController,
                      style: const TextStyle(color: Colors.white),
                      decoration: _inputDecoration('Team Assigned', Icons.group),
                    ),
                    const SizedBox(height: 16),

                    // Expiry — real date + time picker
                    GestureDetector(
                      onTap: () async {
                        final pickedDate = await showDatePicker(
                          context: context,
                          initialDate: selectedExpiry,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 90)),
                          builder: (context, child) => Theme(
                            data: ThemeData.dark().copyWith(
                              colorScheme: const ColorScheme.dark(primary: Color(0xFF2DD4BF)),
                            ),
                            child: child!,
                          ),
                        );
                        if (pickedDate == null) return;
                        if (!context.mounted) return;
                        final pickedTime = await showTimePicker(
                          context: context,
                          initialTime: TimeOfDay.fromDateTime(selectedExpiry),
                          builder: (context, child) => Theme(
                            data: ThemeData.dark().copyWith(
                              colorScheme: const ColorScheme.dark(primary: Color(0xFF2DD4BF)),
                            ),
                            child: child!,
                          ),
                        );
                        if (pickedTime == null) return;
                        setModalState(() {
                          selectedExpiry = DateTime(
                            pickedDate.year, pickedDate.month, pickedDate.day,
                            pickedTime.hour, pickedTime.minute,
                          );
                        });
                      },
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFF2DD4BF).withValues(alpha: 0.4)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.access_time, color: Color(0xFF2DD4BF), size: 18),
                            const SizedBox(width: 12),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Expiry Date & Time', style: TextStyle(color: Colors.white54, fontSize: 11)),
                                const SizedBox(height: 2),
                                Text(
                                  PTWMock.buildLabel(selectedExpiry),
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
                                ),
                              ],
                            ),
                            const Spacer(),
                            const Icon(Icons.chevron_right, color: Colors.white38, size: 18),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Submit
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: () async {
                          if (locationController.text.isEmpty || teamController.text.isEmpty) return;

                          final newPtw = PTWMock(
                            id: isEditing
                                ? existingPtw.id
                                : 'PTW-${DateTime.now().millisecondsSinceEpoch.toString().substring(7)}',
                            type: selectedType,
                            location: locationController.text,
                            team: teamController.text,
                            expiryDateTime: selectedExpiry,
                            expiryLabel: PTWMock.buildLabel(selectedExpiry),
                          );

                          setState(() {
                            if (isEditing) {
                              DashboardMockData.activePTWs[index] = newPtw;
                            } else {
                              DashboardMockData.activePTWs.insert(0, newPtw);
                            }
                          });
                          await DashboardMockData.savePTWs();
                          if (context.mounted) Navigator.pop(context);
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2DD4BF),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: Text(
                          isEditing ? 'UPDATE PERMIT' : 'ADD PERMIT',
                          style: const TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  InputDecoration _inputDecoration(String label, IconData icon) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: Colors.white54),
      prefixIcon: Icon(icon, color: Colors.white54),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF2DD4BF)),
      ),
      filled: true,
      fillColor: Colors.white.withValues(alpha: 0.05),
    );
  }

  Widget _buildHeadcountSection() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 2,
          child: _buildGlassCard(
            title: 'Total On-Site',
            icon: Icons.person,
            value: _totalWorkers.toString(),
            subtitle: 'Across all zones',
            color: const Color(0xFF2DD4BF),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          flex: 3,
          child: Column(
            children: _zoneBreakdown.entries.map((entry) {
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.05),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        entry.key,
                        style: const TextStyle(color: Colors.white70, fontSize: 13),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Row(
                      children: [
                        if (_isEditingHeadcount)
                          InkWell(
                            onTap: () {
                              if (entry.value > 0) {
                                setState(() => _zoneBreakdown[entry.key] = entry.value - 1);
                              }
                            },
                            child: const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 8.0),
                              child: Icon(Icons.remove_circle_outline, color: Colors.redAccent, size: 20),
                            ),
                          ),
                        InkWell(
                          onTap: _isEditingHeadcount
                              ? () => _showHeadcountEditDialog(entry.key, entry.value)
                              : null,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: _getZoneColor(entry.key).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${entry.value}',
                              style: TextStyle(
                                color: _getZoneColor(entry.key),
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                        if (_isEditingHeadcount)
                          InkWell(
                            onTap: () {
                              setState(() => _zoneBreakdown[entry.key] = entry.value + 1);
                            },
                            child: const Padding(
                              padding: EdgeInsets.symmetric(horizontal: 8.0),
                              child: Icon(Icons.add_circle_outline, color: Colors.greenAccent, size: 20),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              );
            }).toList(),
          ),
        ),
      ],
    );
  }

  Color _getZoneColor(String zone) {
    if (zone == 'Tunnels') return Colors.redAccent;
    if (zone == 'Weir') return Colors.orangeAccent;
    return const Color(0xFF2DD4BF);
  }

  void _showHeadcountEditDialog(String zone, int currentValue) {
    final controller = TextEditingController(
        text: currentValue == 0 ? '' : currentValue.toString());
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF1E293B),
          title: Text('Edit Headcount: $zone', style: const TextStyle(color: Colors.white)),
          content: TextField(
            controller: controller,
            keyboardType: TextInputType.number,
            style: const TextStyle(color: Colors.white),
            decoration: _inputDecoration('Enter new headcount', Icons.numbers),
            autofocus: true,
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('CANCEL', style: TextStyle(color: Colors.white54)),
            ),
            ElevatedButton(
              onPressed: () async {
                final newValue = int.tryParse(controller.text);
                if (newValue != null && newValue >= 0) {
                  setState(() {
                    _zoneBreakdown[zone] = newValue;
                  });
                  final prefs = await SharedPreferences.getInstance();
                  await prefs.setString('zoneBreakdown', jsonEncode(_zoneBreakdown));
                }
                Navigator.pop(context);
              },
              style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2DD4BF)),
              child: const Text('SAVE', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
            ),
          ],
        );
      },
    );
  }

  Widget _buildPTWSection() {
    return Column(
      children: DashboardMockData.activePTWs.asMap().entries.map((entry) {
        final int index = entry.key;
        final PTWMock ptw = entry.value;
        final String status = ptw.computedStatus; // Live computed from clock

        return InkWell(
          onTap: _isEditingPTWs
              ? () => _showPTWModal(existingPtw: ptw, index: index)
              : null,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: status == 'Expired' ? 0.03 : 0.05),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: _isEditingPTWs
                    ? const Color(0xFF2DD4BF).withValues(alpha: 0.5)
                    : (status == 'Expired'
                        ? Colors.redAccent.withValues(alpha: 0.2)
                        : Colors.white.withValues(alpha: 0.1)),
              ),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: _getPtwColor(status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.assignment, color: _getPtwColor(status)),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        ptw.type,
                        style: TextStyle(
                          color: status == 'Expired' ? Colors.white54 : Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                          decoration: status == 'Expired' ? TextDecoration.lineThrough : null,
                          decorationColor: Colors.white38,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${ptw.location} • ${ptw.team}',
                        style: const TextStyle(color: Colors.white70, fontSize: 12),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                if (_isEditingPTWs)
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
                    onPressed: () async {
                      setState(() {
                        DashboardMockData.activePTWs.removeAt(index);
                      });
                      await DashboardMockData.savePTWs();
                    },
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  )
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        status,
                        style: TextStyle(
                          color: _getPtwColor(status),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Exp: ${ptw.expiryLabel}',
                        style: const TextStyle(color: Colors.white54, fontSize: 11),
                      ),
                    ],
                  ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Color _getPtwColor(String status) {
    if (status == 'Expired') return Colors.redAccent;
    if (status == 'Expiring Soon') return Colors.orangeAccent;
    return const Color(0xFF2DD4BF);
  }

  Widget _buildChecklistSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          _buildChecklistItem('Morning Toolbox Talk', _toolboxTalkCompleted, _signedOff ? null : (val) {
            setState(() => _toolboxTalkCompleted = val ?? false);
            _saveChecklistState();
          }),
          _buildChecklistItem('Heavy Equipment Inspected', _heavyEqInspected, _signedOff ? null : (val) {
            setState(() => _heavyEqInspected = val ?? false);
            _saveChecklistState();
          }),
          _buildChecklistItem('PPE Compliance Checked', _ppeChecked, _signedOff ? null : (val) {
            setState(() => _ppeChecked = val ?? false);
            _saveChecklistState();
          }),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: ElevatedButton(
              onPressed: _canSignOff && !_isSigningOff
                  ? () async {
                      final int finalHeadcount = _totalWorkers;
                      final int finalPtwCount = DashboardMockData.activePTWs.length;

                      setState(() => _isSigningOff = true);

                      // Build the sign-off payload with timestamp of NOW (sign-off time, not sync time)
                      final signOffPayload = {
                        'projectId': 'dummy-project-123',
                        'loggedById': 'dummy-user-123',
                        'date': DateTime.now().toIso8601String(), // Actual sign-off time
                        'totalHeadcount': finalHeadcount,
                        'zoneBreakdown': _zoneBreakdown,
                        'ptws': DashboardMockData.activePTWs.map((ptw) => {
                          'type': ptw.type,
                          'location': ptw.location,
                          'team': ptw.team,
                          'status': ptw.computedStatus,
                          'expiry': ptw.expiryLabel,
                        }).toList(),
                      };

                      if (!isOnline) {
                        // ── OFFLINE PATH: queue locally and complete sign-off ──
                        await OfflineSyncService.enqueue(signOffPayload);
                        await _refreshPendingSyncCount();
                        setState(() {
                          _signedOff = true;
                          _isSigningOff = false;
                        });
                        _saveChecklistState();
                        if (context.mounted) {
                          showDialog(
                            context: context,
                            builder: (context) => AlertDialog(
                              backgroundColor: const Color(0xFF1E293B),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              content: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  const Icon(Icons.cloud_off, color: Colors.orangeAccent, size: 60),
                                  const SizedBox(height: 16),
                                  const Text(
                                    'Saved Offline',
                                    style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 12),
                                  const Text(
                                    'No connection detected. Your sign-off has been saved on this device and will automatically sync to the database when you return to the office.',
                                    style: TextStyle(color: Colors.white70),
                                    textAlign: TextAlign.center,
                                  ),
                                  const SizedBox(height: 24),
                                  ElevatedButton(
                                    onPressed: () => Navigator.pop(context),
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.orangeAccent),
                                    child: const Text('UNDERSTOOD', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                                  )
                                ],
                              ),
                            ),
                          );
                        }
                        return;
                      }

                      // ── ONLINE PATH: send directly to server ──
                      try {
                        // Resolve server URL dynamically — works on any access point
                        final apiBase = await ServerConfigService.getApiBaseUrl();
                        final response = await http.post(
                          Uri.parse('$apiBase/daily-logs'),
                          headers: {'Content-Type': 'application/json'},
                          body: jsonEncode(signOffPayload),
                        );

                        if (response.statusCode == 201) {
                          setState(() {
                            _signedOff = true;
                            _isSigningOff = false;
                          });
                          _saveChecklistState();
                          if (context.mounted) {
                            showDialog(
                              context: context,
                              builder: (context) => AlertDialog(
                                backgroundColor: const Color(0xFF1E293B),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                content: Column(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(Icons.cloud_done, color: Colors.green, size: 60),
                                    const SizedBox(height: 16),
                                    const Text(
                                      'Shift Logged to Database',
                                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'Successfully archived $finalPtwCount closed Permits to Work and signed out $finalHeadcount workers.',
                                      style: const TextStyle(color: Colors.white70),
                                      textAlign: TextAlign.center,
                                    ),
                                    const SizedBox(height: 24),
                                    ElevatedButton(
                                      onPressed: () => Navigator.pop(context),
                                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2DD4BF)),
                                      child: const Text('ACKNOWLEDGE', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
                                    )
                                  ],
                                ),
                              ),
                            );
                          }
                        } else {
                          // Server returned error — queue offline as fallback
                          await OfflineSyncService.enqueue(signOffPayload);
                          await _refreshPendingSyncCount();
                          setState(() {
                            _signedOff = true;
                            _isSigningOff = false;
                          });
                          _saveChecklistState();
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Server error — saved locally, will retry when online.'),
                                backgroundColor: Colors.orangeAccent,
                              ),
                            );
                          }
                        }
                      } catch (e) {
                        // Network exception — queue and complete sign-off locally
                        await OfflineSyncService.enqueue(signOffPayload);
                        await _refreshPendingSyncCount();
                        setState(() {
                          _signedOff = true;
                          _isSigningOff = false;
                        });
                        _saveChecklistState();
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(
                              content: Text('Saved locally — will sync to server automatically.'),
                              backgroundColor: Colors.orangeAccent,
                            ),
                          );
                        }
                      }
                    }
                  : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: _signedOff ? Colors.green : const Color(0xFF2DD4BF),
                disabledBackgroundColor: Colors.white.withValues(alpha: 0.1),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _isSigningOff
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                    )
                  : Text(
                      _signedOff ? 'SIGNED OFF' : 'SIGN OFF SITE',
                      style: TextStyle(
                        color: _canSignOff || _signedOff ? Colors.black : Colors.white54,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.2,
                      ),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChecklistItem(String label, bool value, ValueChanged<bool?>? onChanged) {
    return Theme(
      data: ThemeData(
        unselectedWidgetColor: Colors.white54,
      ),
      child: CheckboxListTile(
        title: Text(
          label,
          style: TextStyle(
            color: value ? Colors.white : Colors.white70,
            decoration: value ? TextDecoration.lineThrough : null,
          ),
        ),
        value: value,
        onChanged: onChanged,
        activeColor: const Color(0xFF2DD4BF),
        checkColor: Colors.black,
        contentPadding: EdgeInsets.zero,
        controlAffinity: ListTileControlAffinity.leading,
        visualDensity: VisualDensity.compact,
      ),
    );
  }

  Widget _buildGlassCard({
    required String title,
    required IconData icon,
    required String value,
    required String subtitle,
    required Color color,
  }) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Text(
                      title, 
                      style: const TextStyle(color: Colors.grey, fontSize: 13),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 4),
                  Icon(icon, color: color, size: 18),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                value,
                style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(color: color.withValues(alpha: 0.8), fontSize: 12),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    return ClipRRect(
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.5),
            border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.1))),
          ),
          child: BottomNavigationBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            selectedItemColor: const Color(0xFF2DD4BF),
            unselectedItemColor: Colors.grey,
            currentIndex: _selectedIndex,
            onTap: (index) {
              setState(() {
                _selectedIndex = index;
              });
            },
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home),
                label: 'Dashboard',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.cloud),
                label: 'Weather',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.shield),
                label: 'Dispatch',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
