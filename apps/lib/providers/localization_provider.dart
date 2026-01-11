import 'package:flutter/foundation.dart';
import '../services/localization_service.dart';

/// Provider for managing localization state
/// Exposes translation functions and locale switching to the app
class LocalizationProvider extends ChangeNotifier {
  final LocalizationService _service = LocalizationService();

  bool _initialized = false;
  bool _loading = false;

  bool get initialized => _initialized;
  bool get loading => _loading;
  AppLocale get currentLocale => _service.currentLocale;

  /// Get all available locales
  List<AppLocale> get availableLocales => AppLocale.values.toList();

  /// Initialize the localization provider
  Future<void> initialize() async {
    if (_initialized) return;

    _loading = true;
    notifyListeners();

    await _service.initialize();

    // Also load English as fallback
    if (_service.currentLocale != AppLocale.en) {
      await _service.loadTranslations(AppLocale.en);
    }

    _loading = false;
    _initialized = true;
    notifyListeners();
  }

  /// Set the current locale
  Future<void> setLocale(AppLocale locale) async {
    if (locale == _service.currentLocale) return;

    _loading = true;
    notifyListeners();

    await _service.setLocale(locale);

    _loading = false;
    notifyListeners();
  }

  /// Translate a key to the current locale
  /// Supports dot notation (e.g., 'common.search')
  /// Supports parameter interpolation (e.g., t('search.resultsCount', {'count': 5}))
  String t(String key, [Map<String, dynamic>? params]) {
    return _service.t(key, params);
  }

  /// Clear translation cache
  Future<void> clearCache() async {
    await _service.clearCache();
    notifyListeners();
  }

  /// Preload all translations for offline use
  Future<void> preloadAllTranslations() async {
    _loading = true;
    notifyListeners();

    await _service.preloadAllTranslations();

    _loading = false;
    notifyListeners();
  }
}
