import 'dart:io' show Platform;
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:package_info_plus/package_info_plus.dart';
import 'package:http/http.dart' as http;
import '../providers/programs_provider.dart';
import '../providers/theme_provider.dart';
import '../providers/settings_provider.dart';
import '../providers/user_prefs_provider.dart';
import '../providers/safety_provider.dart';
import '../services/privacy_service.dart';
import '../services/safety_service.dart';
import '../config/theme.dart';
import 'profiles_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  String _version = '';
  String _buildNumber = '';
  String _cacheSize = 'Calculating...';
  bool _checkingForUpdate = false;

  @override
  void initState() {
    super.initState();
    _loadInfo();
  }

  Future<void> _loadInfo() async {
    if (!mounted) return;
    final provider = context.read<ProgramsProvider>();

    final packageInfo = await PackageInfo.fromPlatform();
    final cacheSize = await provider.getCacheSize();

    if (mounted) {
      setState(() {
        _version = packageInfo.version;
        _buildNumber = packageInfo.buildNumber;
        _cacheSize = _formatBytes(cacheSize);
      });
    }
  }

  String _formatBytes(int bytes) {
    if (bytes == 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    final i = (bytes > 0) ? (bytes.bitLength - 1) ~/ 10 : 0;
    final size = bytes / (1 << (i * 10));
    return '${size.toStringAsFixed(2)} ${sizes[i]}';
  }

  Future<void> _launchUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  Future<void> _checkForUpdate() async {
    if (_checkingForUpdate) return;

    setState(() => _checkingForUpdate = true);

    try {
      final response = await http.get(
        Uri.parse('https://api.github.com/repos/baytides/baynavigator/releases/latest'),
        headers: {'Accept': 'application/vnd.github.v3+json'},
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final latestTag = data['tag_name'] as String? ?? '';
        final latestVersion = latestTag.startsWith('v') ? latestTag.substring(1) : latestTag;

        // Compare versions
        final currentBuild = int.tryParse(_buildNumber) ?? 0;
        final latestBuild = _extractBuildNumber(latestVersion);

        if (latestBuild > currentBuild) {
          _showUpdateDialog(latestVersion, data['html_url'] as String? ?? '');
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('You have the latest version')),
          );
        }
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not check for updates')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not check for updates')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _checkingForUpdate = false);
      }
    }
  }

  int _extractBuildNumber(String version) {
    // Version format: 1.5.31+43 or just 1.5.31
    final parts = version.split('+');
    if (parts.length > 1) {
      return int.tryParse(parts[1]) ?? 0;
    }
    // If no build number, try to extract from version (e.g., 1.5.31 -> 43 based on pattern)
    // For simplicity, compare version strings
    final versionParts = parts[0].split('.');
    if (versionParts.length >= 3) {
      // Use patch version as a rough build indicator
      return int.tryParse(versionParts[2]) ?? 0;
    }
    return 0;
  }

  String _getDownloadUrl() {
    const baseUrl = 'https://github.com/baytides/baynavigator/releases/latest/download';
    if (Platform.isAndroid) {
      return '$baseUrl/bay-navigator.apk';
    } else if (Platform.isMacOS) {
      return '$baseUrl/Bay-Area-Discounts-macOS.dmg';
    } else if (Platform.isWindows) {
      return '$baseUrl/Bay-Area-Discounts-Windows-Setup.exe';
    } else if (Platform.isLinux) {
      return '$baseUrl/Bay-Area-Discounts-Linux.tar.gz';
    }
    return 'https://github.com/baytides/baynavigator/releases/latest';
  }

  void _showUpdateDialog(String newVersion, String releaseUrl) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Update Available'),
        content: Text('A new version ($newVersion) is available. Would you like to download it?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Later'),
          ),
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _launchUrl(_getDownloadUrl());
            },
            child: const Text('Download'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Logo banner
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(32),
              color: isDark ? AppColors.darkSurface : AppColors.lightSurface,
              child: Column(
                children: [
                  Semantics(
                    image: true,
                    label: 'Bay Navigator logo',
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.asset(
                        'assets/images/favicons/web-app-manifest-512x512.png',
                        width: 80,
                        height: 80,
                        semanticLabel: 'Bay Navigator logo',
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Bay Navigator',
                    style: theme.textTheme.headlineMedium,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Your guide to local savings & benefits',
                    style: theme.textTheme.bodySmall,
                  ),
                ],
              ),
            ),

            // Profiles Section (Family profiles with saved lists)
            _buildSection(
              context,
              title: 'Family Profiles',
              children: [
                _buildButton(
                  context,
                  icon: '👥',
                  label: 'Manage Profiles',
                  onTap: () {
                    HapticFeedback.lightImpact();
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const ProfilesScreen(),
                      ),
                    );
                  },
                ),
              ],
            ),

            // Your Preferences Section
            Consumer2<UserPrefsProvider, ProgramsProvider>(
              builder: (context, userPrefs, programsProvider, child) {
                final groups = userPrefs.selectedGroups;
                final countyId = userPrefs.selectedCounty;

                // Get group names
                final groupNames = groups
                    .map((id) => programsProvider.groups.where((g) => g.id == id).firstOrNull?.name)
                    .whereType<String>()
                    .toList();

                // Get county name
                final countyName = countyId != null
                    ? programsProvider.areas.where((a) => a.id == countyId).firstOrNull?.name
                    : null;

                return _buildSection(
                  context,
                  title: 'Your Preferences',
                  children: [
                    if (userPrefs.hasPreferences) ...[
                      if (groupNames.isNotEmpty)
                        _buildRow(context, 'Groups', groupNames.join(', ')),
                      if (groupNames.isNotEmpty && countyName != null)
                        _buildDivider(context),
                      if (countyName != null)
                        _buildRow(context, 'County', countyName),
                      _buildDivider(context),
                    ],
                    _buildButton(
                      context,
                      icon: '✏️',
                      label: userPrefs.hasPreferences ? 'Edit Preferences' : 'Set Up Preferences',
                      onTap: () {
                        HapticFeedback.lightImpact();
                        userPrefs.reopenOnboarding();
                      },
                    ),
                    if (userPrefs.hasPreferences) ...[
                      _buildDivider(context),
                      _buildButton(
                        context,
                        label: 'Clear Preferences',
                        isDanger: true,
                        onTap: () async {
                          HapticFeedback.lightImpact();
                          final confirmed = await showDialog<bool>(
                            context: context,
                            builder: (dialogContext) => AlertDialog(
                              title: const Text('Clear Preferences'),
                              content: const Text(
                                'This will remove your preferences. You can set them up again anytime.',
                              ),
                              actions: [
                                TextButton(
                                  onPressed: () => Navigator.pop(dialogContext, false),
                                  child: const Text('Cancel'),
                                ),
                                TextButton(
                                  onPressed: () => Navigator.pop(dialogContext, true),
                                  style: TextButton.styleFrom(
                                    foregroundColor: AppColors.danger,
                                  ),
                                  child: const Text('Clear'),
                                ),
                              ],
                            ),
                          );

                          if (confirmed == true && context.mounted) {
                            await userPrefs.clearPreferences();
                            if (context.mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Preferences cleared')),
                              );
                            }
                          }
                        },
                      ),
                    ],
                  ],
                );
              },
            ),

            // About Section
            _buildSection(
              context,
              title: 'About',
              children: [
                _buildRow(context, 'App Version', _version),
                Consumer<ProgramsProvider>(
                  builder: (context, provider, child) {
                    final metadata = provider.metadata;
                    if (metadata == null) return const SizedBox.shrink();
                    return Column(
                      children: [
                        _buildDivider(context),
                        _buildRow(context, 'Database Version', metadata.version),
                        _buildDivider(context),
                        _buildRow(context, 'Total Programs', '${metadata.totalPrograms}'),
                        _buildDivider(context),
                        _buildRow(
                          context,
                          'Last Updated',
                          _formatDate(metadata.generatedAt),
                        ),
                      ],
                    );
                  },
                ),
                _buildDivider(context),
                _buildButton(
                  context,
                  icon: '🔄',
                  label: 'Refresh Database',
                  onTap: () async {
                    HapticFeedback.lightImpact();
                    final provider = context.read<ProgramsProvider>();
                    final messenger = ScaffoldMessenger.of(context);
                    final hasUpdate = await provider.refreshMetadata();
                    if (mounted) {
                      messenger.showSnackBar(
                        SnackBar(
                          content: Text(
                            hasUpdate
                                ? 'Database updated!'
                                : 'Already up to date',
                          ),
                        ),
                      );
                    }
                  },
                ),
                // Show Check for Update on Android and desktop (iOS must update via App Store)
                if (Platform.isAndroid || Platform.isMacOS || Platform.isWindows || Platform.isLinux) ...[
                  _buildDivider(context),
                  _buildButton(
                    context,
                    icon: _checkingForUpdate ? '⏳' : '📲',
                    label: _checkingForUpdate ? 'Checking...' : 'Check for App Update',
                    onTap: _checkingForUpdate ? () {} : () {
                      HapticFeedback.lightImpact();
                      _checkForUpdate();
                    },
                  ),
                ],
                _buildDivider(context),
                _buildButton(
                  context,
                  icon: '🌐',
                  label: 'baynavigator.org',
                  onTap: () => _launchUrl('https://baynavigator.org'),
                ),
                _buildDivider(context),
                _buildButton(
                  context,
                  icon: '🌊',
                  label: 'baytides.org',
                  onTap: () => _launchUrl('https://baytides.org'),
                ),
              ],
            ),

            // Appearance Section
            _buildSection(
              context,
              title: 'Appearance',
              children: [
                Consumer<ThemeProvider>(
                  builder: (context, themeProvider, child) {
                    return _buildButton(
                      context,
                      icon: isDark ? '🌙' : '☀️',
                      label: 'Theme',
                      value: themeProvider.modeLabel,
                      onTap: () {
                        HapticFeedback.lightImpact();
                        _showThemeDialog(context);
                      },
                    );
                  },
                ),
              ],
            ),

            // Storage Section
            _buildSection(
              context,
              title: 'Storage',
              children: [
                _buildRow(context, 'Cache Size', _cacheSize),
                _buildDivider(context),
                _buildButton(
                  context,
                  label: 'Clear Cache',
                  isDanger: true,
                  onTap: () async {
                    HapticFeedback.lightImpact();
                    final provider = context.read<ProgramsProvider>();
                    final messenger = ScaffoldMessenger.of(context);
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (dialogContext) => AlertDialog(
                        title: const Text('Clear Cache'),
                        content: const Text(
                          'This will remove all cached program data. The app will re-download data on next use.',
                        ),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(dialogContext, false),
                            child: const Text('Cancel'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(dialogContext, true),
                            style: TextButton.styleFrom(
                              foregroundColor: AppColors.danger,
                            ),
                            child: const Text('Clear'),
                          ),
                        ],
                      ),
                    );

                    if (confirmed == true && mounted) {
                      await provider.clearCache();
                      setState(() {
                        _cacheSize = '0 Bytes';
                      });
                      messenger.showSnackBar(
                        const SnackBar(content: Text('Cache cleared')),
                      );
                    }
                  },
                ),
              ],
            ),

            // Support Section
            _buildSection(
              context,
              title: 'Support Our Work',
              children: [
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      Text(
                        'Help Keep This App Free',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Bay Navigator is a volunteer-run project. Your donation helps us maintain the app and add new programs.',
                        style: theme.textTheme.bodySmall,
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                  child: ElevatedButton(
                    onPressed: () {
                      HapticFeedback.lightImpact();
                      _launchUrl('https://baytides.org/donate');
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(48),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'Donate via Website',
                      style: TextStyle(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),

            // Links Section
            _buildSection(
              context,
              title: 'Links',
              children: [
                _buildButton(
                  context,
                  icon: '🌐',
                  label: 'Visit Website',
                  onTap: () => _launchUrl('https://baynavigator.org'),
                ),
                _buildDivider(context),
                _buildButton(
                  context,
                  icon: '🌊',
                  label: 'Bay Tides (Parent Org)',
                  onTap: () => _launchUrl('https://baytides.org'),
                ),
              ],
            ),

            // Feedback Section
            _buildSection(
              context,
              title: 'Feedback',
              children: [
                _buildButton(
                  context,
                  icon: '💬',
                  label: 'Send Feedback',
                  onTap: () => _launchUrl(
                    'https://github.com/baytides/baynavigator/issues/new?labels=feedback',
                  ),
                ),
                _buildDivider(context),
                _buildButton(
                  context,
                  icon: '🐛',
                  label: 'Report an Issue',
                  onTap: () => _launchUrl(
                    'https://github.com/baytides/baynavigator/issues/new?labels=bug',
                  ),
                ),
              ],
            ),

            // Advanced Privacy Section (similar to Signal's censorship circumvention)
            _buildSection(
              context,
              title: 'Advanced Privacy',
              children: [
                Consumer<SettingsProvider>(
                  builder: (context, settings, child) {
                    final status = settings.privacyStatus;
                    return Column(
                      children: [
                        // Privacy status indicator
                        if (status != null) ...[
                          Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Text(status.icon, style: const TextStyle(fontSize: 24)),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        status.description,
                                        style: theme.textTheme.bodyMedium,
                                      ),
                                      if (status.warning != null)
                                        Text(
                                          status.warning!,
                                          style: theme.textTheme.bodySmall?.copyWith(
                                            color: AppColors.warning,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          _buildDivider(context),
                        ],

                        // Tor/Onion toggle
                        _buildSwitchRow(
                          context,
                          label: 'Use Tor Network',
                          subtitle: Platform.isAndroid || Platform.isIOS
                              ? 'Route traffic through Tor (requires Orbot app)'
                              : 'Route traffic through Tor hidden service',
                          value: settings.useOnion,
                          onChanged: (value) async {
                            HapticFeedback.lightImpact();
                            await settings.setUseOnion(value);

                            if (value && !settings.orbotAvailable && mounted) {
                              _showOrbotRequiredDialog(context);
                            }
                          },
                        ),
                        _buildDivider(context),

                        // Custom proxy toggle
                        _buildSwitchRow(
                          context,
                          label: 'Use Custom Proxy',
                          subtitle: 'Route traffic through a SOCKS5 or HTTP proxy',
                          value: settings.proxyEnabled,
                          onChanged: (value) async {
                            HapticFeedback.lightImpact();
                            if (value) {
                              _showProxyConfigDialog(context);
                            } else {
                              await settings.setProxyEnabled(false);
                            }
                          },
                        ),

                        // Show proxy config if enabled
                        if (settings.proxyEnabled && settings.proxyConfig != null) ...[
                          _buildDivider(context),
                          _buildRow(
                            context,
                            'Proxy',
                            settings.proxyConfig.toString(),
                          ),
                        ],

                        _buildDivider(context),

                        // Test connection button
                        _buildButton(
                          context,
                          icon: '🔍',
                          label: 'Test Privacy Connection',
                          onTap: () => _testPrivacyConnection(context),
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),

            // Call Relay Section
            _buildSection(
              context,
              title: 'Call Relay',
              children: [
                Consumer<SettingsProvider>(
                  builder: (context, settings, child) {
                    return Column(
                      children: [
                        // Info text
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text(
                            'Choose how to make calls from the app. VoIP apps may keep calls off your carrier logs.',
                            style: theme.textTheme.bodySmall,
                          ),
                        ),
                        _buildDivider(context),

                        // Calling app selector
                        _buildButton(
                          context,
                          icon: '📞',
                          label: 'Calling App',
                          value: settings.preferredCallingApp.displayName,
                          onTap: () {
                            HapticFeedback.lightImpact();
                            _showCallingAppDialog(context);
                          },
                        ),

                        // Show privacy note for selected app
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.info_outline,
                                size: 16,
                                color: theme.colorScheme.secondary,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  settings.preferredCallingApp.privacyDescription,
                                  style: theme.textTheme.bodySmall?.copyWith(
                                    color: theme.colorScheme.secondary,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Show clipboard explanation when "Other" is selected
                        if (settings.preferredCallingApp == CallingApp.other)
                          Container(
                            margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.warning.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: AppColors.warning.withValues(alpha: 0.3),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  Icons.content_copy,
                                  size: 18,
                                  color: AppColors.warning,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Text(
                                    'For apps that don\'t support click-to-call, pressing a call link will copy the phone number to your clipboard. Paste it in your preferred app. The clipboard auto-clears after 2 minutes for your privacy.',
                                    style: theme.textTheme.bodySmall?.copyWith(
                                      color: isDark ? AppColors.darkText : AppColors.lightText,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),

                        _buildDivider(context),

                        // Refresh available apps button
                        _buildButton(
                          context,
                          icon: '🔄',
                          label: 'Refresh Available Apps',
                          onTap: () async {
                            HapticFeedback.lightImpact();
                            await settings.refreshAvailableCallingApps();
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    'Found ${settings.availableCallingApps.length} calling apps',
                                  ),
                                ),
                              );
                            }
                          },
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),

            // Safety Features Section (for vulnerable users)
            _buildSection(
              context,
              title: 'Safety Features',
              children: [
                Consumer<SafetyProvider>(
                  builder: (context, safety, child) {
                    return Column(
                      children: [
                        // Info text
                        Padding(
                          padding: const EdgeInsets.all(16),
                          child: Text(
                            'Privacy and safety features for users in sensitive situations. All safety settings stay on your device.',
                            style: theme.textTheme.bodySmall,
                          ),
                        ),
                        _buildDivider(context),

                        // Quick Exit toggle
                        _buildSwitchRow(
                          context,
                          label: 'Quick Exit',
                          subtitle: 'Shake device or triple-tap to instantly leave app',
                          value: safety.quickExitEnabled,
                          onChanged: (value) async {
                            HapticFeedback.lightImpact();
                            await safety.setQuickExitEnabled(value);
                          },
                        ),

                        // Quick Exit destination
                        if (safety.quickExitEnabled) ...[
                          _buildDivider(context),
                          _buildButton(
                            context,
                            icon: '🚪',
                            label: 'Exit Destination',
                            value: _getQuickExitDestinationName(safety.quickExitUrl),
                            onTap: () {
                              HapticFeedback.lightImpact();
                              _showQuickExitDestinationDialog(context);
                            },
                          ),
                        ],

                        _buildDivider(context),

                        // Incognito Mode toggle
                        _buildSwitchRow(
                          context,
                          label: 'Incognito Mode',
                          subtitle: 'Don\'t save search or browsing history',
                          value: safety.incognitoModeEnabled,
                          onChanged: (value) async {
                            HapticFeedback.lightImpact();
                            await safety.setIncognitoModeEnabled(value);
                            if (value && mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text('Incognito mode enabled. History will not be saved.'),
                                ),
                              );
                            }
                          },
                        ),

                        _buildDivider(context),

                        // Safety Tips toggle
                        _buildSwitchRow(
                          context,
                          label: 'Safety Tips',
                          subtitle: 'Show safety tips for sensitive programs',
                          value: safety.showSafetyTips,
                          onChanged: (value) async {
                            HapticFeedback.lightImpact();
                            await safety.setShowSafetyTips(value);
                          },
                        ),

                        _buildDivider(context),

                        // Network Privacy Warnings toggle
                        _buildSwitchRow(
                          context,
                          label: 'Network Warnings',
                          subtitle: 'Warn when on public WiFi or monitored networks',
                          value: safety.networkWarningsEnabled,
                          onChanged: (value) async {
                            HapticFeedback.lightImpact();
                            await safety.setNetworkWarningsEnabled(value);
                          },
                        ),

                        _buildDivider(context),

                        // Disguised App Icon
                        _buildButton(
                          context,
                          icon: '🎭',
                          label: 'Disguise App',
                          value: safety.disguisedModeEnabled
                              ? safety.currentDisguisedIcon?.name ?? 'Enabled'
                              : 'Off',
                          onTap: () {
                            HapticFeedback.lightImpact();
                            _showDisguisedIconDialog(context);
                          },
                        ),

                        _buildDivider(context),

                        // Clear History button
                        _buildButton(
                          context,
                          label: 'Clear All History',
                          isDanger: true,
                          onTap: () async {
                            HapticFeedback.lightImpact();
                            final confirmed = await showDialog<bool>(
                              context: context,
                              builder: (dialogContext) => AlertDialog(
                                title: const Text('Clear All History'),
                                content: const Text(
                                  'This will delete all search history and recent programs. This cannot be undone.',
                                ),
                                actions: [
                                  TextButton(
                                    onPressed: () => Navigator.pop(dialogContext, false),
                                    child: const Text('Cancel'),
                                  ),
                                  TextButton(
                                    onPressed: () => Navigator.pop(dialogContext, true),
                                    style: TextButton.styleFrom(
                                      foregroundColor: AppColors.danger,
                                    ),
                                    child: const Text('Clear'),
                                  ),
                                ],
                              ),
                            );

                            if (confirmed == true && context.mounted) {
                              await safety.clearAllHistory();
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('History cleared')),
                                );
                              }
                            }
                          },
                        ),
                      ],
                    );
                  },
                ),
              ],
            ),

            // Legal Section
            _buildSection(
              context,
              title: 'Legal & Privacy',
              children: [
                Consumer<SettingsProvider>(
                  builder: (context, settings, child) {
                    return _buildSwitchRow(
                      context,
                      label: 'Crash Reporting',
                      subtitle: 'Help improve the app by sending anonymous crash reports',
                      value: settings.crashReportingEnabled,
                      onChanged: (value) async {
                        HapticFeedback.lightImpact();
                        final messenger = ScaffoldMessenger.of(context);
                        await settings.setCrashReportingEnabled(value);
                        if (!value && mounted) {
                          messenger.showSnackBar(
                            const SnackBar(
                              content: Text(
                                'Crash reporting disabled. Restart app for full effect.',
                              ),
                            ),
                          );
                        }
                      },
                    );
                  },
                ),
                _buildDivider(context),
                _buildButton(
                  context,
                  icon: '⚠️',
                  label: 'Disclaimer',
                  onTap: () => _showDisclaimer(context),
                ),
                _buildDivider(context),
                _buildButton(
                  context,
                  icon: '📄',
                  label: 'Terms of Service',
                  onTap: () => _launchUrl('https://baynavigator.org/terms'),
                ),
                _buildDivider(context),
                _buildButton(
                  context,
                  icon: '🔒',
                  label: 'Privacy Policy',
                  onTap: () => _launchUrl('https://baynavigator.org/privacy'),
                ),
                _buildDivider(context),
                _buildButton(
                  context,
                  icon: '🙏',
                  label: 'Credits & Acknowledgments',
                  onTap: () => _launchUrl('https://baynavigator.org/credits'),
                ),
              ],
            ),

            // Footer
            Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                children: [
                  Text(
                    'Bay Navigator - a Bay Tides project',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Connecting residents to public benefits and community resources',
                    style: theme.textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required String title,
    required List<Widget> children,
  }) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
          child: Text(
            title.toUpperCase(),
            style: theme.textTheme.bodySmall?.copyWith(
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkCard : AppColors.lightCard,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildRow(BuildContext context, String label, String value) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: theme.textTheme.bodyMedium),
          Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildButton(
    BuildContext context, {
    String? icon,
    required String label,
    String? value,
    bool isDanger = false,
    required VoidCallback onTap,
  }) {
    final theme = Theme.of(context);
    final isDarkTheme = theme.brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            if (icon != null) ...[
              Text(icon, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Text(
                label,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isDanger ? AppColors.danger : AppColors.primary,
                ),
              ),
            ),
            if (value != null)
              Text(
                value,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: isDarkTheme ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
            if (!isDanger)
              Icon(
                Icons.chevron_right,
                color: isDarkTheme ? AppColors.darkBorder : AppColors.lightBorder,
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildSwitchRow(
    BuildContext context, {
    required String label,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: theme.textTheme.bodyMedium),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: theme.textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Switch(
            value: value,
            onChanged: onChanged,
            activeTrackColor: AppColors.primary,
            thumbColor: WidgetStateProperty.resolveWith((states) =>
                states.contains(WidgetState.selected) ? Colors.white : null),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Divider(
      height: 1,
      indent: 16,
      color: isDark ? AppColors.darkBorder : AppColors.lightBorder,
    );
  }

  void _showThemeDialog(BuildContext context) {
    final themeProvider = context.read<ThemeProvider>();

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Appearance'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final mode in AppThemeMode.values)
              ListTile(
                title: Text(mode.name[0].toUpperCase() + mode.name.substring(1)),
                leading: Icon(
                  themeProvider.mode == mode
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked,
                  color: themeProvider.mode == mode ? AppColors.primary : null,
                ),
                onTap: () {
                  themeProvider.setMode(mode);
                  Navigator.pop(dialogContext);
                },
              ),
          ],
        ),
      ),
    );
  }

  void _showDisclaimer(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Disclaimer'),
        content: const Text(
          'This app is not affiliated with, endorsed by, or connected to any government agency. Bay Navigator is an independent project of Bay Tides, a 501(c)(3) nonprofit organization.\n\nProgram information is compiled from publicly available sources. Each program listing includes a link to the official source where you can verify current eligibility requirements and apply directly.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  String _formatDate(String isoDate) {
    try {
      final date = DateTime.parse(isoDate);
      return '${date.month}/${date.day}/${date.year}';
    } catch (e) {
      return isoDate;
    }
  }

  // ============================================
  // PRIVACY DIALOGS
  // ============================================

  void _showOrbotRequiredDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Tor Client Required'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'To use Tor, you need a Tor client running on your device.\n',
            ),
            if (Platform.isAndroid || Platform.isIOS) ...[
              const Text(
                'We recommend Orbot, the official Tor client for mobile devices.',
              ),
              const SizedBox(height: 16),
              const Text(
                '1. Install Orbot from your app store\n'
                '2. Open Orbot and tap "Start"\n'
                '3. Wait for the connection to establish\n'
                '4. Return here and the setting will work',
                style: TextStyle(fontSize: 13),
              ),
            ] else ...[
              const Text(
                'Install and start Tor on your computer. The app will use the default SOCKS5 proxy at 127.0.0.1:9050.',
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('OK'),
          ),
          if (Platform.isAndroid)
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
                _launchUrl('https://play.google.com/store/apps/details?id=org.torproject.android');
              },
              child: const Text('Get Orbot'),
            ),
          if (Platform.isIOS)
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
                _launchUrl('https://apps.apple.com/app/orbot/id1609461599');
              },
              child: const Text('Get Orbot'),
            ),
        ],
      ),
    );
  }

  void _showProxyConfigDialog(BuildContext context) {
    final settings = context.read<SettingsProvider>();
    final hostController = TextEditingController(
      text: settings.proxyConfig?.host ?? '',
    );
    final portController = TextEditingController(
      text: settings.proxyConfig?.port.toString() ?? '9050',
    );
    var selectedType = settings.proxyConfig?.type ?? ProxyType.socks5;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Configure Proxy'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Configure a SOCKS5 or HTTP proxy to route app traffic through.',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 16),

              // Proxy type selector
              Row(
                children: [
                  const Text('Type: '),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('SOCKS5'),
                    selected: selectedType == ProxyType.socks5,
                    onSelected: (selected) {
                      if (selected) {
                        setDialogState(() => selectedType = ProxyType.socks5);
                      }
                    },
                  ),
                  const SizedBox(width: 8),
                  ChoiceChip(
                    label: const Text('HTTP'),
                    selected: selectedType == ProxyType.http,
                    onSelected: (selected) {
                      if (selected) {
                        setDialogState(() => selectedType = ProxyType.http);
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Host field
              TextField(
                controller: hostController,
                decoration: const InputDecoration(
                  labelText: 'Host',
                  hintText: '127.0.0.1',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.url,
              ),
              const SizedBox(height: 12),

              // Port field
              TextField(
                controller: portController,
                decoration: const InputDecoration(
                  labelText: 'Port',
                  hintText: '9050',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(dialogContext);
                // Don't enable proxy if cancelled
              },
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () async {
                final host = hostController.text.trim();
                final port = int.tryParse(portController.text.trim());

                if (host.isEmpty || port == null || port < 1 || port > 65535) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Please enter a valid host and port')),
                  );
                  return;
                }

                final config = ProxyConfig(
                  host: host,
                  port: port,
                  type: selectedType,
                );

                await settings.setProxyConfig(config);
                await settings.setProxyEnabled(true);

                if (dialogContext.mounted) {
                  Navigator.pop(dialogContext);
                }
              },
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _testPrivacyConnection(BuildContext context) async {
    final settings = context.read<SettingsProvider>();
    final messenger = ScaffoldMessenger.of(context);

    // Show loading
    messenger.showSnackBar(
      const SnackBar(
        content: Row(
          children: [
            SizedBox(
              width: 16,
              height: 16,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 12),
            Text('Testing connection...'),
          ],
        ),
        duration: Duration(seconds: 30),
      ),
    );

    final result = await settings.testPrivacyConnection();

    // Hide loading snackbar
    messenger.hideCurrentSnackBar();

    // Show result
    if (result.success) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            result.usedOnion
                ? '✓ Connected via Tor (${result.latencyMs}ms)'
                : '✓ Connection successful (${result.latencyMs}ms)',
          ),
          backgroundColor: AppColors.success,
        ),
      );
    } else {
      messenger.showSnackBar(
        SnackBar(
          content: Text('✗ Connection failed: ${result.message}'),
          backgroundColor: AppColors.danger,
        ),
      );
    }
  }

  // ============================================
  // VOIP CALLING APP DIALOGS
  // ============================================

  void _showCallingAppDialog(BuildContext context) {
    final settings = context.read<SettingsProvider>();
    final theme = Theme.of(context);

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Choose Calling App'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.builder(
            shrinkWrap: true,
            itemCount: settings.availableCallingApps.length,
            itemBuilder: (context, index) {
              final app = settings.availableCallingApps[index];
              final isSelected = settings.preferredCallingApp == app;

              return ListTile(
                leading: Icon(
                  isSelected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked,
                  color: isSelected ? AppColors.primary : null,
                ),
                title: Text(app.displayName),
                subtitle: Text(
                  app.privacyDescription,
                  style: theme.textTheme.bodySmall,
                ),
                onTap: () async {
                  HapticFeedback.lightImpact();
                  await settings.setPreferredCallingApp(app);
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext);
                  }

                  // Show explanation for "Other" option
                  if (app == CallingApp.other && context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text(
                          'When you tap Call, the number will be copied to your clipboard and auto-cleared after 2 minutes.',
                        ),
                        duration: Duration(seconds: 4),
                      ),
                    );
                  }
                },
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  // ============================================
  // SAFETY FEATURE DIALOGS
  // ============================================

  String _getQuickExitDestinationName(String url) {
    for (final dest in SafetyService.defaultDestinations) {
      if (dest.url == url) {
        return dest.name;
      }
    }
    return 'Custom';
  }

  void _showQuickExitDestinationDialog(BuildContext context) {
    final safety = context.read<SafetyProvider>();
    final theme = Theme.of(context);

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Quick Exit Destination'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Choose where to go when quick exit is triggered:',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            ...SafetyService.defaultDestinations.map((dest) {
              final isSelected = safety.quickExitUrl == dest.url;
              return ListTile(
                leading: Icon(
                  isSelected
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked,
                  color: isSelected ? AppColors.primary : null,
                ),
                title: Text(dest.name),
                subtitle: Text(
                  dest.description,
                  style: theme.textTheme.bodySmall,
                ),
                onTap: () async {
                  HapticFeedback.lightImpact();
                  await safety.setQuickExitUrl(dest.url);
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext);
                  }
                },
              );
            }),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  void _showDisguisedIconDialog(BuildContext context) {
    final safety = context.read<SafetyProvider>();
    final theme = Theme.of(context);

    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Disguise App'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Change the app icon and name to make it look like a different app. The app will appear as your chosen disguise in your app drawer.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, size: 16, color: AppColors.warning),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Some devices may require an app restart.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: AppColors.warning,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Show current state
            if (safety.disguisedModeEnabled && safety.currentDisguisedIcon != null) ...[
              ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: safety.currentDisguisedIcon!.backgroundColor,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    safety.currentDisguisedIcon!.iconData,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                title: Text(
                  'Current: ${safety.currentDisguisedIcon!.name}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                trailing: TextButton(
                  onPressed: () async {
                    final result = await safety.resetToDefaultIcon();
                    if (dialogContext.mounted) {
                      Navigator.pop(dialogContext);
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(result.message)),
                      );
                    }
                  },
                  child: const Text('Reset'),
                ),
              ),
              const Divider(),
            ],

            // Disguise options
            ...SafetyService.disguisedIcons.map((icon) {
              final isSelected = safety.currentDisguisedIcon?.id == icon.id;
              return ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: icon.backgroundColor,
                    borderRadius: BorderRadius.circular(8),
                    border: isSelected
                        ? Border.all(color: AppColors.primary, width: 2)
                        : null,
                  ),
                  child: Icon(
                    icon.iconData,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
                title: Text(icon.name),
                trailing: isSelected
                    ? Icon(Icons.check, color: AppColors.primary)
                    : null,
                onTap: () async {
                  HapticFeedback.lightImpact();
                  final result = await safety.applyDisguisedIcon(icon);
                  if (dialogContext.mounted) {
                    Navigator.pop(dialogContext);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(result.message)),
                    );
                  }
                },
              );
            }),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }
}
