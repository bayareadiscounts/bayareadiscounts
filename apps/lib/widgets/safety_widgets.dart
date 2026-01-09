import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/safety_provider.dart';
import '../services/safety_service.dart';
import '../config/theme.dart';

/// Incognito mode indicator banner
class IncognitoIndicator extends StatelessWidget {
  const IncognitoIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SafetyProvider>(
      builder: (context, safety, child) {
        if (!safety.isIncognitoSession) {
          return const SizedBox.shrink();
        }

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          color: Colors.grey.shade900,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.visibility_off,
                size: 16,
                color: Colors.grey.shade400,
              ),
              const SizedBox(width: 8),
              Text(
                'Incognito Mode - History not saved',
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey.shade400,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Network privacy indicator
class NetworkPrivacyIndicator extends StatelessWidget {
  final bool compact;

  const NetworkPrivacyIndicator({
    super.key,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<SafetyProvider>(
      builder: (context, safety, child) {
        if (!safety.networkWarningsEnabled || safety.networkStatus == null) {
          return const SizedBox.shrink();
        }

        final status = safety.networkStatus!;

        if (compact) {
          return Tooltip(
            message: status.warning ?? status.suggestion ?? status.connectionType,
            child: Icon(
              status.icon,
              size: 18,
              color: status.indicatorColor,
            ),
          );
        }

        // Only show warning for WiFi connections
        if (status.level != NetworkPrivacyLevel.caution) {
          return const SizedBox.shrink();
        }

        return Container(
          margin: const EdgeInsets.all(8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.orange.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.orange.withValues(alpha: 0.3)),
          ),
          child: Row(
            children: [
              Icon(status.icon, color: Colors.orange, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      status.connectionType,
                      style: const TextStyle(
                        fontWeight: FontWeight.w600,
                        fontSize: 13,
                      ),
                    ),
                    if (status.warning != null)
                      Text(
                        status.warning!,
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                  ],
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close, size: 18),
                onPressed: () {
                  // Dismiss for this session
                  safety.setNetworkWarningsEnabled(false);
                },
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Safety tips dialog for sensitive programs
class SafetyTipsDialog extends StatelessWidget {
  final String? category;
  final String programName;
  final VoidCallback onContinue;

  const SafetyTipsDialog({
    super.key,
    this.category,
    required this.programName,
    required this.onContinue,
  });

  static Future<void> showIfNeeded({
    required BuildContext context,
    required String? category,
    required List<String>? eligibility,
    required String programName,
    required VoidCallback onContinue,
  }) async {
    final safety = context.read<SafetyProvider>();

    if (!safety.showSafetyTips) {
      onContinue();
      return;
    }

    if (!safety.isProgramSensitive(category, eligibility)) {
      onContinue();
      return;
    }

    await showDialog(
      context: context,
      builder: (context) => SafetyTipsDialog(
        category: category,
        programName: programName,
        onContinue: () {
          Navigator.pop(context);
          onContinue();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final safety = context.read<SafetyProvider>();
    final tips = safety.getSafetyTips(category);
    final theme = Theme.of(context);

    return AlertDialog(
      title: Row(
        children: [
          Icon(Icons.shield, color: AppColors.primary),
          const SizedBox(width: 12),
          const Expanded(child: Text('Safety First')),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Before contacting $programName, please consider these safety tips:',
              style: theme.textTheme.bodyMedium,
            ),
            const SizedBox(height: 16),
            ...tips.map((tip) => Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Icon(
                          tip.icon,
                          size: 18,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              tip.title,
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            Text(
                              tip.description,
                              style: theme.textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                )),
            const Divider(),
            Row(
              children: [
                Checkbox(
                  value: false,
                  onChanged: (value) {
                    if (value == true) {
                      safety.setShowSafetyTips(false);
                    }
                  },
                ),
                Expanded(
                  child: Text(
                    'Don\'t show safety tips again',
                    style: theme.textTheme.bodySmall,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: onContinue,
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primary,
            foregroundColor: Colors.white,
          ),
          child: const Text('I\'m in a Safe Place'),
        ),
      ],
    );
  }
}

/// Safety mode toggle card for settings
class SafetyModeCard extends StatelessWidget {
  const SafetyModeCard({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Consumer<SafetyProvider>(
      builder: (context, safety, child) {
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: safety.isIncognitoSession
                  ? [Colors.grey.shade800, Colors.grey.shade900]
                  : [AppColors.primary.withValues(alpha: 0.1), AppColors.primary.withValues(alpha: 0.05)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: safety.isIncognitoSession
                  ? Colors.grey.shade700
                  : AppColors.primary.withValues(alpha: 0.2),
            ),
          ),
          child: Material(
            color: Colors.transparent,
            child: InkWell(
              borderRadius: BorderRadius.circular(16),
              onTap: () async {
                if (safety.isIncognitoSession) {
                  await safety.endIncognitoSession();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Incognito mode ended')),
                    );
                  }
                } else {
                  safety.startIncognitoSession();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Incognito mode started - history won\'t be saved'),
                      ),
                    );
                  }
                }
              },
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: safety.isIncognitoSession
                            ? Colors.grey.shade700
                            : AppColors.primary.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        safety.isIncognitoSession
                            ? Icons.visibility_off
                            : Icons.visibility,
                        color: safety.isIncognitoSession
                            ? Colors.white
                            : AppColors.primary,
                        size: 24,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            safety.isIncognitoSession
                                ? 'Incognito Mode Active'
                                : 'Start Incognito Session',
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 15,
                              color: safety.isIncognitoSession
                                  ? Colors.white
                                  : (isDark ? AppColors.darkText : AppColors.lightText),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            safety.isIncognitoSession
                                ? 'Tap to end session and clear data'
                                : 'Browse without saving history',
                            style: TextStyle(
                              fontSize: 13,
                              color: safety.isIncognitoSession
                                  ? Colors.grey.shade400
                                  : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                            ),
                          ),
                        ],
                      ),
                    ),
                    Icon(
                      Icons.chevron_right,
                      color: safety.isIncognitoSession
                          ? Colors.grey.shade500
                          : AppColors.primary,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}
