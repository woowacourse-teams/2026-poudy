package com.poudy.modules.haptics

import android.content.Context
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.view.HapticFeedbackConstants
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PoudyHapticsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PoudyHaptics")

    AsyncFunction("performSelectionAsync") {
      val context = appContext.reactContext ?: return@AsyncFunction null
      if (!isSystemHapticFeedbackEnabled(context)) return@AsyncFunction null

      val vibrator = getVibrator(context) ?: return@AsyncFunction null
      if (!vibrator.hasVibrator()) return@AsyncFunction null

      if (supportsClickEffect(vibrator)) {
        val performed = appContext.currentActivity
          ?.window
          ?.decorView
          ?.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
          ?: false

        if (performed) return@AsyncFunction null
      }

      vibrateFallback(vibrator)
      null
    }.runOnQueue(Queues.MAIN)
  }

  private fun isSystemHapticFeedbackEnabled(context: Context): Boolean =
    Settings.System.getInt(
      context.contentResolver,
      Settings.System.HAPTIC_FEEDBACK_ENABLED,
      0,
    ) == 1

  @Suppress("DEPRECATION")
  private fun getVibrator(context: Context): Vibrator? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      context.getSystemService(VibratorManager::class.java)?.defaultVibrator
    } else {
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
    }

  private fun supportsClickEffect(vibrator: Vibrator): Boolean =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      vibrator.areAllEffectsSupported(VibrationEffect.EFFECT_CLICK) ==
        Vibrator.VIBRATION_EFFECT_SUPPORT_YES
    } else {
      true
    }

  @Suppress("DEPRECATION")
  private fun vibrateFallback(vibrator: Vibrator) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(
        VibrationEffect.createOneShot(
          FALLBACK_DURATION_MS,
          VibrationEffect.DEFAULT_AMPLITUDE,
        ),
      )
    } else {
      vibrator.vibrate(FALLBACK_DURATION_MS)
    }
  }

  private companion object {
    const val FALLBACK_DURATION_MS = 50L
  }
}
