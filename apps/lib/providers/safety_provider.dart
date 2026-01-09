import 'dart:async';
import 'package:flutter/foundation.dart';
import '../services/safety_service.dart';

/// Provider for safety features state management
class SafetyProvider extends ChangeNotifier {
  final SafetyService _safetyService = SafetyService();

  bool _initialized = false;
  bool _quickExitEnabled = false;
  String _quickExitUrl = SafetyService.defaultDestinations[0].url;
  bool _incognitoModeEnabled = false;
  bool _isIncognitoSession = false;
  bool _showSafetyTips = true;
  bool _networkWarningsEnabled = true;
  NetworkPrivacyStatus? _networkStatus;
  StreamSubscription? _networkSubscription;

  // Disguised mode
  bool _disguisedModeEnabled = false;
  DisguisedAppIcon? _currentDisguisedIcon;

  // Getters
  bool get initialized => _initialized;
  bool get quickExitEnabled => _quickExitEnabled;
  String get quickExitUrl => _quickExitUrl;
  bool get incognitoModeEnabled => _incognitoModeEnabled;
  bool get isIncognitoSession => _isIncognitoSession;
  bool get showSafetyTips => _showSafetyTips;
  bool get networkWarningsEnabled => _networkWarningsEnabled;
  NetworkPrivacyStatus? get networkStatus => _networkStatus;
  SafetyService get safetyService => _safetyService;

  // Disguised mode getters
  bool get disguisedModeEnabled => _disguisedModeEnabled;
  DisguisedAppIcon? get currentDisguisedIcon => _currentDisguisedIcon;
  List<DisguisedAppIcon> get disguisedIcons => SafetyService.disguisedIcons;

  List<QuickExitDestination> get quickExitDestinations =>
      SafetyService.defaultDestinations;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      _quickExitEnabled = await _safetyService.isQuickExitEnabled();
      _quickExitUrl = await _safetyService.getQuickExitUrl();
      _incognitoModeEnabled = await _safetyService.isIncognitoModeEnabled();
      _isIncognitoSession = _safetyService.isIncognitoSession;
      _showSafetyTips = await _safetyService.shouldShowSafetyTips();
      _networkWarningsEnabled = await _safetyService.isNetworkWarningsEnabled();
      _networkStatus = await _safetyService.getNetworkPrivacyStatus();

      // Load disguised mode state
      _disguisedModeEnabled = await _safetyService.isDisguisedModeEnabled();
      _currentDisguisedIcon = await _safetyService.getCurrentDisguisedIcon();

      // Start listening to network changes
      _networkSubscription = _safetyService.networkPrivacyStream.listen((status) {
        _networkStatus = status;
        notifyListeners();
      });

      // If incognito mode was enabled, start session
      if (_incognitoModeEnabled) {
        _safetyService.startIncognitoSession();
        _isIncognitoSession = true;
      }
    } catch (e) {
      // Use defaults
    }

    _initialized = true;
    notifyListeners();
  }

  @override
  void dispose() {
    _networkSubscription?.cancel();
    super.dispose();
  }

  // ============================================
  // QUICK EXIT
  // ============================================

  Future<void> setQuickExitEnabled(bool enabled) async {
    _quickExitEnabled = enabled;
    await _safetyService.setQuickExitEnabled(enabled);
    notifyListeners();
  }

  Future<void> setQuickExitUrl(String url) async {
    _quickExitUrl = url;
    await _safetyService.setQuickExitUrl(url);
    notifyListeners();
  }

  Future<void> executeQuickExit() async {
    await _safetyService.executeQuickExit();
  }

  // ============================================
  // INCOGNITO MODE
  // ============================================

  Future<void> setIncognitoModeEnabled(bool enabled) async {
    _incognitoModeEnabled = enabled;
    _isIncognitoSession = enabled;
    await _safetyService.setIncognitoModeEnabled(enabled);
    notifyListeners();
  }

  void startIncognitoSession() {
    _safetyService.startIncognitoSession();
    _isIncognitoSession = true;
    notifyListeners();
  }

  Future<void> endIncognitoSession() async {
    await _safetyService.endIncognitoSession();
    _isIncognitoSession = false;
    notifyListeners();
  }

  // ============================================
  // HISTORY
  // ============================================

  Future<void> addRecentProgram(String programId) async {
    await _safetyService.addRecentProgram(programId);
  }

  Future<List<String>> getRecentPrograms() async {
    return await _safetyService.getRecentPrograms();
  }

  Future<void> addSearchQuery(String query) async {
    await _safetyService.addSearchQuery(query);
  }

  Future<List<String>> getSearchHistory() async {
    return await _safetyService.getSearchHistory();
  }

  Future<void> clearAllHistory() async {
    await _safetyService.clearAllHistory();
    notifyListeners();
  }

  // ============================================
  // SAFETY TIPS
  // ============================================

  Future<void> setShowSafetyTips(bool show) async {
    _showSafetyTips = show;
    await _safetyService.setShowSafetyTips(show);
    notifyListeners();
  }

  bool isProgramSensitive(String? category, List<String>? eligibility) {
    return _safetyService.isProgramSensitive(category, eligibility);
  }

  List<SafetyTip> getSafetyTips(String? category) {
    return _safetyService.getSafetyTips(category);
  }

  // ============================================
  // NETWORK WARNINGS
  // ============================================

  Future<void> setNetworkWarningsEnabled(bool enabled) async {
    _networkWarningsEnabled = enabled;
    await _safetyService.setNetworkWarningsEnabled(enabled);
    notifyListeners();
  }

  Future<void> refreshNetworkStatus() async {
    _networkStatus = await _safetyService.getNetworkPrivacyStatus();
    notifyListeners();
  }

  // ============================================
  // DISGUISED APP MODE
  // ============================================

  /// Apply a disguised icon to hide the app's identity
  Future<DisguiseResult> applyDisguisedIcon(DisguisedAppIcon icon) async {
    final result = await _safetyService.applyDisguisedIcon(icon.id);
    if (result.success) {
      _disguisedModeEnabled = true;
      _currentDisguisedIcon = icon;
      notifyListeners();
    }
    return result;
  }

  /// Reset to the default app icon
  Future<DisguiseResult> resetToDefaultIcon() async {
    final result = await _safetyService.resetToDefaultIcon();
    if (result.success) {
      _disguisedModeEnabled = false;
      _currentDisguisedIcon = null;
      notifyListeners();
    }
    return result;
  }
}
