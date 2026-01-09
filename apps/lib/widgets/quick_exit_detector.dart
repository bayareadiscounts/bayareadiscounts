import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:sensors_plus/sensors_plus.dart';
import '../providers/safety_provider.dart';

/// Widget that detects quick exit gestures and triggers the panic button
/// Supports:
/// - Shake detection (mobile)
/// - Triple-tap anywhere (all platforms)
/// - Volume button combo (where supported)
class QuickExitDetector extends StatefulWidget {
  final Widget child;

  const QuickExitDetector({
    super.key,
    required this.child,
  });

  @override
  State<QuickExitDetector> createState() => _QuickExitDetectorState();
}

class _QuickExitDetectorState extends State<QuickExitDetector> {
  StreamSubscription? _accelerometerSubscription;
  DateTime? _lastShakeTime;
  int _shakeCount = 0;
  static const _shakeThreshold = 15.0; // Acceleration threshold
  static const _shakeCountThreshold = 3; // Number of shakes needed
  static const _shakeResetDuration = Duration(milliseconds: 500);

  // Triple tap detection
  int _tapCount = 0;
  Timer? _tapResetTimer;
  static const _tapResetDuration = Duration(milliseconds: 400);

  @override
  void initState() {
    super.initState();
    _initShakeDetection();
  }

  @override
  void dispose() {
    _accelerometerSubscription?.cancel();
    _tapResetTimer?.cancel();
    super.dispose();
  }

  void _initShakeDetection() {
    try {
      _accelerometerSubscription = accelerometerEventStream().listen(
        (AccelerometerEvent event) {
          _handleAccelerometerEvent(event);
        },
        onError: (e) {
          // Accelerometer not available, that's okay
        },
      );
    } catch (e) {
      // Sensors not available on this platform
    }
  }

  void _handleAccelerometerEvent(AccelerometerEvent event) {
    final acceleration = (event.x.abs() + event.y.abs() + event.z.abs()) - 9.8;

    if (acceleration > _shakeThreshold) {
      final now = DateTime.now();

      if (_lastShakeTime == null ||
          now.difference(_lastShakeTime!) > _shakeResetDuration) {
        _shakeCount = 1;
      } else {
        _shakeCount++;
      }

      _lastShakeTime = now;

      if (_shakeCount >= _shakeCountThreshold) {
        _triggerQuickExit();
        _shakeCount = 0;
      }
    }
  }

  void _handleTap() {
    _tapCount++;
    _tapResetTimer?.cancel();

    if (_tapCount >= 3) {
      _triggerQuickExit();
      _tapCount = 0;
    } else {
      _tapResetTimer = Timer(_tapResetDuration, () {
        _tapCount = 0;
      });
    }
  }

  Future<void> _triggerQuickExit() async {
    final safetyProvider = context.read<SafetyProvider>();

    if (!safetyProvider.quickExitEnabled) return;

    // Haptic feedback
    HapticFeedback.heavyImpact();

    // Execute quick exit
    await safetyProvider.executeQuickExit();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<SafetyProvider>(
      builder: (context, safety, child) {
        if (!safety.quickExitEnabled) {
          return widget.child;
        }

        return GestureDetector(
          behavior: HitTestBehavior.translucent,
          onTap: _handleTap,
          child: widget.child,
        );
      },
    );
  }
}

/// Floating quick exit button that can be shown on sensitive screens
class QuickExitButton extends StatelessWidget {
  final VoidCallback? onPressed;

  const QuickExitButton({
    super.key,
    this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Consumer<SafetyProvider>(
      builder: (context, safety, child) {
        if (!safety.quickExitEnabled) {
          return const SizedBox.shrink();
        }

        return Positioned(
          right: 16,
          bottom: 100,
          child: FloatingActionButton.small(
            heroTag: 'quick_exit',
            backgroundColor: Colors.red.shade700,
            foregroundColor: Colors.white,
            tooltip: 'Quick Exit',
            onPressed: () async {
              HapticFeedback.heavyImpact();
              if (onPressed != null) {
                onPressed!();
              } else {
                await safety.executeQuickExit();
              }
            },
            child: const Icon(Icons.close, size: 20),
          ),
        );
      },
    );
  }
}

/// App bar action button for quick exit
class QuickExitAppBarButton extends StatelessWidget {
  const QuickExitAppBarButton({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SafetyProvider>(
      builder: (context, safety, child) {
        if (!safety.quickExitEnabled) {
          return const SizedBox.shrink();
        }

        return IconButton(
          icon: const Icon(Icons.close),
          tooltip: 'Quick Exit',
          color: Colors.red.shade400,
          onPressed: () async {
            HapticFeedback.heavyImpact();
            await safety.executeQuickExit();
          },
        );
      },
    );
  }
}
