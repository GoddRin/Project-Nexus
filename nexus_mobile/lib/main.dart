import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'providers/weather_provider.dart';
import 'services/notification_service.dart';
import 'services/server_config_service.dart';
import 'screens/dashboard.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService().init();
  // Sanitize any stale/wrong server URLs from previous sessions
  await ServerConfigService.initialize();
  runApp(const NexusMobileApp());
}

class NexusMobileApp extends StatelessWidget {
  const NexusMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => WeatherProvider()),
      ],
      child: MaterialApp(
        title: 'SCIC Safety',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF0D0D12),
          primaryColor: const Color(0xFF2DD4BF),
          textTheme: GoogleFonts.interTextTheme(
            ThemeData(brightness: Brightness.dark).textTheme,
          ),
          colorScheme: const ColorScheme.dark(
            primary: Color(0xFF2DD4BF),
            secondary: Color(0xFF38BDF8),
            surface: Color(0xFF1E293B),
          ),
        ),
        home: const DashboardScreen(),
      ),
    );
  }
}
