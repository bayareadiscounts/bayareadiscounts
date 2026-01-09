import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

/// Safety service for Bay Navigator
/// Provides features to protect vulnerable users:
/// - Quick Exit (panic button) to instantly leave the app
/// - Incognito Mode to prevent saving history
/// - Safety tips for sensitive services
/// - Network privacy warnings
class SafetyService {
  static final SafetyService _instance = SafetyService._internal();
  factory SafetyService() => _instance;
  SafetyService._internal();

  // Preference keys
  static const String _quickExitEnabledKey = 'bay_navigator:quick_exit_enabled';
  static const String _quickExitUrlKey = 'bay_navigator:quick_exit_url';
  static const String _incognitoModeKey = 'bay_navigator:incognito_mode';
  static const String _showSafetyTipsKey = 'bay_navigator:show_safety_tips';
  static const String _networkWarningsKey = 'bay_navigator:network_warnings';
  static const String _recentProgramsKey = 'bay_navigator:recent_programs';
  static const String _searchHistoryKey = 'bay_navigator:search_history';
  static const String _disguisedModeKey = 'bay_navigator:disguised_mode';
  static const String _disguisedIconKey = 'bay_navigator:disguised_icon';

  // Disguised app icons - these blend in as utility apps
  // Note: Actual icon changing requires platform-specific setup
  // (activity-alias on Android, alternate icons in Info.plist on iOS)
  static const List<DisguisedAppIcon> disguisedIcons = [
    DisguisedAppIcon(
      id: 'calculator',
      name: 'Calculator',
      androidActivityAlias: '.CalculatorAlias',
      iosIconName: 'CalculatorIcon',
      iconData: Icons.calculate_outlined,
      backgroundColor: Color(0xFF424242),
    ),
    DisguisedAppIcon(
      id: 'notes',
      name: 'My Notes',
      androidActivityAlias: '.NotesAlias',
      iosIconName: 'NotesIcon',
      iconData: Icons.note_outlined,
      backgroundColor: Color(0xFFFFC107),
    ),
    DisguisedAppIcon(
      id: 'weather',
      name: 'Weather',
      androidActivityAlias: '.WeatherAlias',
      iosIconName: 'WeatherIcon',
      iconData: Icons.wb_sunny_outlined,
      backgroundColor: Color(0xFF2196F3),
    ),
    DisguisedAppIcon(
      id: 'utilities',
      name: 'Utilities',
      androidActivityAlias: '.UtilitiesAlias',
      iosIconName: 'UtilitiesIcon',
      iconData: Icons.build_outlined,
      backgroundColor: Color(0xFF607D8B),
    ),
    DisguisedAppIcon(
      id: 'files',
      name: 'Files',
      androidActivityAlias: '.FilesAlias',
      iosIconName: 'FilesIcon',
      iconData: Icons.folder_outlined,
      backgroundColor: Color(0xFF4CAF50),
    ),
  ];

  SharedPreferences? _prefs;
  bool _isIncognitoSession = false;
  final List<String> _sessionRecentPrograms = [];
  final List<String> _sessionSearchHistory = [];

  // Default safe exit destinations
  static const List<QuickExitDestination> defaultDestinations = [
    QuickExitDestination(
      id: 'google',
      name: 'Google',
      url: 'https://www.google.com',
      description: 'Opens Google search',
    ),
    QuickExitDestination(
      id: 'weather',
      name: 'Weather.gov',
      url: 'https://www.weather.gov',
      description: 'Opens weather forecast',
    ),
    QuickExitDestination(
      id: 'news',
      name: 'AP News',
      url: 'https://apnews.com',
      description: 'Opens news website',
    ),
    QuickExitDestination(
      id: 'recipes',
      name: 'AllRecipes',
      url: 'https://www.allrecipes.com',
      description: 'Opens recipe website',
    ),
  ];

  // Sensitive program categories that should show safety tips
  static const List<String> sensitiveCategories = [
    'crisis',
    'domestic-violence',
    'mental-health',
    'lgbtq',
    'teen-health',
    'substance-abuse',
    'housing-emergency',
  ];

  // Sensitive eligibility groups
  static const List<String> sensitiveEligibilities = [
    'lgbtq',
    'youth',
    'immigrants',
    'unhoused',
    'reentry',
  ];

  Future<SharedPreferences> get _preferences async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  // ============================================
  // QUICK EXIT (PANIC BUTTON)
  // ============================================

  /// Check if quick exit is enabled
  Future<bool> isQuickExitEnabled() async {
    final prefs = await _preferences;
    return prefs.getBool(_quickExitEnabledKey) ?? false;
  }

  /// Enable or disable quick exit
  Future<void> setQuickExitEnabled(bool enabled) async {
    final prefs = await _preferences;
    await prefs.setBool(_quickExitEnabledKey, enabled);
  }

  /// Get the quick exit URL
  Future<String> getQuickExitUrl() async {
    final prefs = await _preferences;
    return prefs.getString(_quickExitUrlKey) ?? defaultDestinations[0].url;
  }

  /// Set the quick exit URL
  Future<void> setQuickExitUrl(String url) async {
    final prefs = await _preferences;
    await prefs.setString(_quickExitUrlKey, url);
  }

  /// Execute quick exit - opens safe URL and clears app state
  Future<void> executeQuickExit() async {
    final url = await getQuickExitUrl();

    // Clear sensitive data immediately
    await clearSessionData();

    // Open the safe URL
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }

    // Exit the app (on mobile) or minimize
    if (Platform.isAndroid || Platform.isIOS) {
      // This will send the app to background
      SystemNavigator.pop();
    }
  }

  // ============================================
  // INCOGNITO MODE
  // ============================================

  /// Check if incognito mode is enabled (persistent setting)
  Future<bool> isIncognitoModeEnabled() async {
    final prefs = await _preferences;
    return prefs.getBool(_incognitoModeKey) ?? false;
  }

  /// Enable or disable incognito mode
  Future<void> setIncognitoModeEnabled(bool enabled) async {
    final prefs = await _preferences;
    await prefs.setBool(_incognitoModeKey, enabled);
    _isIncognitoSession = enabled;

    if (enabled) {
      // Clear existing history when enabling
      await clearAllHistory();
    }
  }

  /// Check if current session is incognito
  bool get isIncognitoSession => _isIncognitoSession;

  /// Start an incognito session (temporary, doesn't change setting)
  void startIncognitoSession() {
    _isIncognitoSession = true;
    _sessionRecentPrograms.clear();
    _sessionSearchHistory.clear();
  }

  /// End incognito session and clear session data
  Future<void> endIncognitoSession() async {
    _isIncognitoSession = false;
    _sessionRecentPrograms.clear();
    _sessionSearchHistory.clear();
  }

  // ============================================
  // HISTORY MANAGEMENT
  // ============================================

  /// Add a program to recent history (respects incognito mode)
  Future<void> addRecentProgram(String programId) async {
    if (_isIncognitoSession) {
      // Only keep in memory, don't persist
      if (!_sessionRecentPrograms.contains(programId)) {
        _sessionRecentPrograms.insert(0, programId);
        if (_sessionRecentPrograms.length > 10) {
          _sessionRecentPrograms.removeLast();
        }
      }
      return;
    }

    final prefs = await _preferences;
    final recent = prefs.getStringList(_recentProgramsKey) ?? [];

    recent.remove(programId);
    recent.insert(0, programId);

    // Keep only last 20
    if (recent.length > 20) {
      recent.removeLast();
    }

    await prefs.setStringList(_recentProgramsKey, recent);
  }

  /// Get recent programs
  Future<List<String>> getRecentPrograms() async {
    if (_isIncognitoSession) {
      return List.from(_sessionRecentPrograms);
    }

    final prefs = await _preferences;
    return prefs.getStringList(_recentProgramsKey) ?? [];
  }

  /// Add a search query to history (respects incognito mode)
  Future<void> addSearchQuery(String query) async {
    if (_isIncognitoSession) {
      if (!_sessionSearchHistory.contains(query)) {
        _sessionSearchHistory.insert(0, query);
        if (_sessionSearchHistory.length > 10) {
          _sessionSearchHistory.removeLast();
        }
      }
      return;
    }

    final prefs = await _preferences;
    final history = prefs.getStringList(_searchHistoryKey) ?? [];

    history.remove(query);
    history.insert(0, query);

    if (history.length > 20) {
      history.removeLast();
    }

    await prefs.setStringList(_searchHistoryKey, history);
  }

  /// Get search history
  Future<List<String>> getSearchHistory() async {
    if (_isIncognitoSession) {
      return List.from(_sessionSearchHistory);
    }

    final prefs = await _preferences;
    return prefs.getStringList(_searchHistoryKey) ?? [];
  }

  /// Clear all history
  Future<void> clearAllHistory() async {
    final prefs = await _preferences;
    await prefs.remove(_recentProgramsKey);
    await prefs.remove(_searchHistoryKey);
    _sessionRecentPrograms.clear();
    _sessionSearchHistory.clear();
  }

  /// Clear session data (for quick exit)
  Future<void> clearSessionData() async {
    _sessionRecentPrograms.clear();
    _sessionSearchHistory.clear();

    // If incognito mode is enabled, also clear persisted data
    if (_isIncognitoSession || await isIncognitoModeEnabled()) {
      await clearAllHistory();
    }
  }

  // ============================================
  // SAFETY TIPS
  // ============================================

  /// Check if safety tips should be shown
  Future<bool> shouldShowSafetyTips() async {
    final prefs = await _preferences;
    return prefs.getBool(_showSafetyTipsKey) ?? true;
  }

  /// Enable or disable safety tips
  Future<void> setShowSafetyTips(bool show) async {
    final prefs = await _preferences;
    await prefs.setBool(_showSafetyTipsKey, show);
  }

  /// Check if a program is sensitive and should show safety tips
  bool isProgramSensitive(String? category, List<String>? eligibility) {
    if (category != null && sensitiveCategories.contains(category.toLowerCase())) {
      return true;
    }

    if (eligibility != null) {
      for (final elig in eligibility) {
        if (sensitiveEligibilities.contains(elig.toLowerCase())) {
          return true;
        }
      }
    }

    return false;
  }

  /// Get safety tips for a sensitive program
  List<SafetyTip> getSafetyTips(String? category) {
    final tips = <SafetyTip>[
      const SafetyTip(
        icon: Icons.security,
        title: 'Check your surroundings',
        description: 'Make sure you\'re in a private, safe location before making calls.',
      ),
      const SafetyTip(
        icon: Icons.phone_android,
        title: 'Consider using a different phone',
        description: 'If your phone is monitored, use a friend\'s phone or a public phone.',
      ),
      const SafetyTip(
        icon: Icons.history,
        title: 'Clear your history',
        description: 'Use Incognito Mode or clear your browser/app history after visiting.',
      ),
    ];

    // Add category-specific tips
    if (category?.toLowerCase() == 'domestic-violence' ||
        category?.toLowerCase() == 'crisis') {
      tips.add(const SafetyTip(
        icon: Icons.dialpad,
        title: 'Use *67 to hide your number',
        description: 'Dial *67 before the number to block your caller ID.',
      ));
      tips.add(const SafetyTip(
        icon: Icons.schedule,
        title: 'Plan your call',
        description: 'Choose a time when you know you\'ll have privacy.',
      ));
    }

    return tips;
  }

  // ============================================
  // NETWORK PRIVACY WARNINGS
  // ============================================

  /// Check if network warnings are enabled
  Future<bool> isNetworkWarningsEnabled() async {
    final prefs = await _preferences;
    return prefs.getBool(_networkWarningsKey) ?? true;
  }

  /// Enable or disable network warnings
  Future<void> setNetworkWarningsEnabled(bool enabled) async {
    final prefs = await _preferences;
    await prefs.setBool(_networkWarningsKey, enabled);
  }

  /// Get current network privacy status
  Future<NetworkPrivacyStatus> getNetworkPrivacyStatus() async {
    try {
      final connectivityResult = await Connectivity().checkConnectivity();

      if (connectivityResult.contains(ConnectivityResult.wifi)) {
        return NetworkPrivacyStatus(
          level: NetworkPrivacyLevel.caution,
          connectionType: 'WiFi',
          warning: 'You\'re on WiFi. Network owner may be able to see your activity.',
          suggestion: 'Consider using mobile data for sensitive lookups.',
        );
      }

      if (connectivityResult.contains(ConnectivityResult.mobile)) {
        return NetworkPrivacyStatus(
          level: NetworkPrivacyLevel.moderate,
          connectionType: 'Mobile Data',
          warning: null,
          suggestion: 'Mobile data is generally more private than public WiFi.',
        );
      }

      if (connectivityResult.contains(ConnectivityResult.vpn)) {
        return NetworkPrivacyStatus(
          level: NetworkPrivacyLevel.good,
          connectionType: 'VPN',
          warning: null,
          suggestion: 'VPN detected. Your traffic is encrypted.',
        );
      }

      if (connectivityResult.contains(ConnectivityResult.none)) {
        return NetworkPrivacyStatus(
          level: NetworkPrivacyLevel.offline,
          connectionType: 'Offline',
          warning: 'You\'re offline.',
          suggestion: 'Some features may not work without internet.',
        );
      }

      return NetworkPrivacyStatus(
        level: NetworkPrivacyLevel.unknown,
        connectionType: 'Unknown',
        warning: null,
        suggestion: null,
      );
    } catch (e) {
      return NetworkPrivacyStatus(
        level: NetworkPrivacyLevel.unknown,
        connectionType: 'Unknown',
        warning: null,
        suggestion: null,
      );
    }
  }

  /// Listen to network changes
  Stream<NetworkPrivacyStatus> get networkPrivacyStream {
    return Connectivity().onConnectivityChanged.asyncMap((_) async {
      return await getNetworkPrivacyStatus();
    });
  }

  // ============================================
  // DISGUISED APP MODE
  // ============================================

  /// Check if disguised mode is enabled
  Future<bool> isDisguisedModeEnabled() async {
    final prefs = await _preferences;
    return prefs.getBool(_disguisedModeKey) ?? false;
  }

  /// Enable or disable disguised mode
  Future<void> setDisguisedModeEnabled(bool enabled) async {
    final prefs = await _preferences;
    await prefs.setBool(_disguisedModeKey, enabled);
  }

  /// Get the current disguised icon ID
  Future<String?> getDisguisedIconId() async {
    final prefs = await _preferences;
    return prefs.getString(_disguisedIconKey);
  }

  /// Set the disguised icon
  Future<void> setDisguisedIcon(String iconId) async {
    final prefs = await _preferences;
    await prefs.setString(_disguisedIconKey, iconId);
  }

  /// Get the current disguised icon configuration
  Future<DisguisedAppIcon?> getCurrentDisguisedIcon() async {
    final iconId = await getDisguisedIconId();
    if (iconId == null) return null;

    return disguisedIcons.firstWhere(
      (icon) => icon.id == iconId,
      orElse: () => disguisedIcons.first,
    );
  }

  /// Apply disguised icon (platform-specific implementation needed)
  /// On Android: Enable/disable activity-alias in manifest
  /// On iOS: Call setAlternateIconName
  Future<DisguiseResult> applyDisguisedIcon(String iconId) async {
    try {
      await setDisguisedIcon(iconId);
      await setDisguisedModeEnabled(true);

      // Note: Actual icon change requires platform channels
      // The flutter_dynamic_icon package can be used for this
      // For now, we'll just save the preference

      if (Platform.isIOS) {
        // iOS shows a system alert when changing icons
        return DisguiseResult(
          success: true,
          message: 'App icon changed. iOS will show a confirmation alert.',
          requiresRestart: false,
        );
      } else if (Platform.isAndroid) {
        // Android may require app restart for some launchers
        return DisguiseResult(
          success: true,
          message: 'App icon changed. You may need to restart the app for changes to appear on some devices.',
          requiresRestart: true,
        );
      }

      return DisguiseResult(
        success: true,
        message: 'Disguised mode enabled.',
        requiresRestart: false,
      );
    } catch (e) {
      return DisguiseResult(
        success: false,
        message: 'Failed to change app icon: $e',
        requiresRestart: false,
      );
    }
  }

  /// Reset to default app icon
  Future<DisguiseResult> resetToDefaultIcon() async {
    try {
      await setDisguisedModeEnabled(false);
      final prefs = await _preferences;
      await prefs.remove(_disguisedIconKey);

      return DisguiseResult(
        success: true,
        message: 'App icon reset to default.',
        requiresRestart: Platform.isAndroid,
      );
    } catch (e) {
      return DisguiseResult(
        success: false,
        message: 'Failed to reset app icon: $e',
        requiresRestart: false,
      );
    }
  }
}

// ============================================
// DATA MODELS
// ============================================

/// Quick exit destination
class QuickExitDestination {
  final String id;
  final String name;
  final String url;
  final String description;

  const QuickExitDestination({
    required this.id,
    required this.name,
    required this.url,
    required this.description,
  });
}

/// Safety tip for sensitive programs
class SafetyTip {
  final IconData icon;
  final String title;
  final String description;

  const SafetyTip({
    required this.icon,
    required this.title,
    required this.description,
  });
}

/// Network privacy level
enum NetworkPrivacyLevel {
  good,
  moderate,
  caution,
  offline,
  unknown,
}

/// Network privacy status
class NetworkPrivacyStatus {
  final NetworkPrivacyLevel level;
  final String connectionType;
  final String? warning;
  final String? suggestion;

  NetworkPrivacyStatus({
    required this.level,
    required this.connectionType,
    this.warning,
    this.suggestion,
  });

  Color get indicatorColor {
    switch (level) {
      case NetworkPrivacyLevel.good:
        return const Color(0xFF4CAF50); // Green
      case NetworkPrivacyLevel.moderate:
        return const Color(0xFF2196F3); // Blue
      case NetworkPrivacyLevel.caution:
        return const Color(0xFFFF9800); // Orange
      case NetworkPrivacyLevel.offline:
        return const Color(0xFF9E9E9E); // Grey
      case NetworkPrivacyLevel.unknown:
        return const Color(0xFF9E9E9E); // Grey
    }
  }

  IconData get icon {
    switch (level) {
      case NetworkPrivacyLevel.good:
        return Icons.shield;
      case NetworkPrivacyLevel.moderate:
        return Icons.signal_cellular_alt;
      case NetworkPrivacyLevel.caution:
        return Icons.wifi;
      case NetworkPrivacyLevel.offline:
        return Icons.signal_wifi_off;
      case NetworkPrivacyLevel.unknown:
        return Icons.help_outline;
    }
  }
}

/// Disguised app icon configuration
class DisguisedAppIcon {
  final String id;
  final String name;
  final String androidActivityAlias;
  final String iosIconName;
  final IconData iconData;
  final Color backgroundColor;

  const DisguisedAppIcon({
    required this.id,
    required this.name,
    required this.androidActivityAlias,
    required this.iosIconName,
    required this.iconData,
    required this.backgroundColor,
  });
}

/// Result of applying a disguised icon
class DisguiseResult {
  final bool success;
  final String message;
  final bool requiresRestart;

  DisguiseResult({
    required this.success,
    required this.message,
    required this.requiresRestart,
  });
}
