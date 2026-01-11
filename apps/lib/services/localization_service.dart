import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';

/// Supported locales in Bay Navigator
/// Matches the web i18n configuration
enum AppLocale {
  en('en', 'English', 'English'),
  es('es', 'Spanish', 'Español'),
  zhHans('zh-Hans', 'Chinese (Simplified)', '简体中文'),
  vi('vi', 'Vietnamese', 'Tiếng Việt'),
  tl('tl', 'Tagalog', 'Tagalog'),
  ko('ko', 'Korean', '한국어');

  final String code;
  final String name;
  final String nativeName;

  const AppLocale(this.code, this.name, this.nativeName);

  /// Get Flutter Locale from AppLocale
  Locale get flutterLocale {
    if (code == 'zh-Hans') {
      return const Locale.fromSubtags(languageCode: 'zh', scriptCode: 'Hans');
    }
    return Locale(code);
  }

  /// Get AppLocale from language code
  static AppLocale fromCode(String code) {
    return AppLocale.values.firstWhere(
      (locale) => locale.code == code,
      orElse: () => AppLocale.en,
    );
  }
}

/// Localization service for Bay Navigator
/// Fetches translations from the web API and caches them locally
class LocalizationService {
  static const String _baseUrl = 'https://baynavigator.org/i18n';
  static const String _localeKey = 'baynavigator_locale';
  static const String _translationsCachePrefix = 'baynavigator_i18n_';
  static const Duration _cacheDuration = Duration(days: 7);

  final http.Client _client;
  SharedPreferences? _prefs;

  // In-memory cache of loaded translations
  final Map<String, Map<String, dynamic>> _translations = {};

  // Current locale
  AppLocale _currentLocale = AppLocale.en;

  LocalizationService({http.Client? client}) : _client = client ?? http.Client();

  AppLocale get currentLocale => _currentLocale;

  Future<SharedPreferences> get _preferences async {
    _prefs ??= await SharedPreferences.getInstance();
    return _prefs!;
  }

  /// Initialize the localization service
  /// Loads saved locale preference or detects from system
  Future<void> initialize() async {
    final prefs = await _preferences;

    // Check for saved locale preference
    final savedLocale = prefs.getString(_localeKey);
    if (savedLocale != null) {
      _currentLocale = AppLocale.fromCode(savedLocale);
    } else {
      // Use system locale if supported, otherwise default to English
      final systemLocale = WidgetsBinding.instance.platformDispatcher.locale;
      final systemLangCode = systemLocale.languageCode;

      // Check if system language is supported
      final matchingLocale = AppLocale.values.where((l) {
        if (l.code.contains('-')) {
          return l.code.split('-')[0] == systemLangCode;
        }
        return l.code == systemLangCode;
      }).firstOrNull;

      if (matchingLocale != null) {
        _currentLocale = matchingLocale;
      }
    }

    // Load translations for current locale
    await loadTranslations(_currentLocale);
  }

  /// Set the current locale and persist preference
  Future<void> setLocale(AppLocale locale) async {
    _currentLocale = locale;

    final prefs = await _preferences;
    await prefs.setString(_localeKey, locale.code);

    // Load translations if not already loaded
    await loadTranslations(locale);
  }

  /// Load translations for a locale
  /// First checks cache, then fetches from web if needed
  Future<void> loadTranslations(AppLocale locale) async {
    // Check if already loaded in memory
    if (_translations.containsKey(locale.code)) {
      return;
    }

    // Try to load from cache
    final cached = await _loadFromCache(locale.code);
    if (cached != null) {
      _translations[locale.code] = cached;
      return;
    }

    // Fetch from web
    await _fetchTranslations(locale.code);
  }

  /// Fetch translations from web API
  Future<void> _fetchTranslations(String localeCode) async {
    try {
      final response = await _client.get(
        Uri.parse('$_baseUrl/$localeCode.json'),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        _translations[localeCode] = data;

        // Save to cache
        await _saveToCache(localeCode, data);
      }
    } catch (e) {
      // If fetch fails, try to use stale cache
      final staleCache = await _loadFromCache(localeCode, allowStale: true);
      if (staleCache != null) {
        _translations[localeCode] = staleCache;
      }
    }
  }

  /// Load translations from local cache
  Future<Map<String, dynamic>?> _loadFromCache(
    String localeCode, {
    bool allowStale = false,
  }) async {
    try {
      final prefs = await _preferences;
      final cached = prefs.getString('$_translationsCachePrefix$localeCode');
      if (cached == null) return null;

      final data = jsonDecode(cached) as Map<String, dynamic>;
      final timestamp = data['timestamp'] as int;
      final age = DateTime.now().millisecondsSinceEpoch - timestamp;

      if (!allowStale && age > _cacheDuration.inMilliseconds) {
        return null;
      }

      return data['translations'] as Map<String, dynamic>;
    } catch (e) {
      return null;
    }
  }

  /// Save translations to local cache
  Future<void> _saveToCache(String localeCode, Map<String, dynamic> data) async {
    try {
      final prefs = await _preferences;
      final cached = jsonEncode({
        'translations': data,
        'timestamp': DateTime.now().millisecondsSinceEpoch,
      });
      await prefs.setString('$_translationsCachePrefix$localeCode', cached);
    } catch (e) {
      // Ignore cache write errors
    }
  }

  /// Get a translation by key
  /// Supports dot notation (e.g., 'common.search')
  /// Falls back to English if translation not found
  String t(String key, [Map<String, dynamic>? params]) {
    // Try current locale first
    var value = _getNestedValue(_translations[_currentLocale.code], key);

    // Fall back to English if not found
    if (value == null && _currentLocale != AppLocale.en) {
      value = _getNestedValue(_translations[AppLocale.en.code], key);
    }

    // Return key if still not found
    if (value == null) {
      return key;
    }

    // Interpolate parameters
    if (params != null) {
      value = _interpolate(value, params);
    }

    return value;
  }

  /// Get nested value from map using dot notation
  String? _getNestedValue(Map<String, dynamic>? map, String key) {
    if (map == null) return null;

    final keys = key.split('.');
    dynamic current = map;

    for (final k in keys) {
      if (current is! Map<String, dynamic>) {
        return null;
      }
      current = current[k];
      if (current == null) {
        return null;
      }
    }

    return current is String ? current : null;
  }

  /// Interpolate parameters into a string
  /// Supports {param} syntax
  String _interpolate(String str, Map<String, dynamic> params) {
    var result = str;
    params.forEach((key, value) {
      result = result.replaceAll('{$key}', value.toString());
    });
    return result;
  }

  /// Clear all cached translations
  Future<void> clearCache() async {
    final prefs = await _preferences;
    for (final locale in AppLocale.values) {
      await prefs.remove('$_translationsCachePrefix${locale.code}');
    }
    _translations.clear();
  }

  /// Preload translations for all supported locales
  /// Useful for offline support
  Future<void> preloadAllTranslations() async {
    for (final locale in AppLocale.values) {
      await loadTranslations(locale);
    }
  }
}
