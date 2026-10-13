package com.poudy.modules.appupdate

import android.app.Activity
import com.google.android.play.core.appupdate.AppUpdateInfo
import com.google.android.play.core.appupdate.AppUpdateManagerFactory
import com.google.android.play.core.appupdate.AppUpdateOptions
import com.google.android.play.core.install.model.AppUpdateType
import com.google.android.play.core.install.model.UpdateAvailability
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PoudyAppUpdateModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PoudyAppUpdate")

    AsyncFunction("checkUpdateAsync") { promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.resolve(NO_UPDATE)
        return@AsyncFunction
      }

      AppUpdateManagerFactory.create(context).appUpdateInfo
        .addOnSuccessListener { info -> promise.resolve(updateOf(info)) }
        .addOnFailureListener { promise.resolve(NO_UPDATE) }
    }

    AsyncFunction("startImmediateUpdateAsync") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(UNAVAILABLE)
        return@AsyncFunction
      }

      val manager = AppUpdateManagerFactory.create(activity)
      manager.appUpdateInfo
        .addOnSuccessListener { info ->
          if (!canStartImmediateUpdate(info)) {
            promise.resolve(UNAVAILABLE)
            return@addOnSuccessListener
          }

          manager.startUpdateFlow(info, activity, AppUpdateOptions.defaultOptions(AppUpdateType.IMMEDIATE))
            .addOnSuccessListener { resultCode -> promise.resolve(statusOf(resultCode)) }
            .addOnFailureListener { promise.resolve(FAILED) }
        }
        .addOnFailureListener { promise.resolve(UNAVAILABLE) }
    }.runOnQueue(Queues.MAIN)
  }

  private fun updateOf(info: AppUpdateInfo): Map<String, Any> =
    mapOf(
      "isAvailable" to (info.updateAvailability() == UpdateAvailability.UPDATE_AVAILABLE),
      "isInProgress" to (info.updateAvailability() == UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS),
      "priority" to info.updatePriority(),
    )

  private fun canStartImmediateUpdate(info: AppUpdateInfo): Boolean =
    when (info.updateAvailability()) {
      UpdateAvailability.DEVELOPER_TRIGGERED_UPDATE_IN_PROGRESS -> true
      UpdateAvailability.UPDATE_AVAILABLE -> info.isUpdateTypeAllowed(AppUpdateType.IMMEDIATE)
      else -> false
    }

  private fun statusOf(resultCode: Int): String =
    when (resultCode) {
      Activity.RESULT_OK -> UPDATED
      Activity.RESULT_CANCELED -> CANCELLED
      else -> FAILED
    }

  private companion object {
    const val UPDATED = "updated"
    const val CANCELLED = "cancelled"
    const val FAILED = "failed"
    const val UNAVAILABLE = "unavailable"
    val NO_UPDATE = mapOf("isAvailable" to false, "isInProgress" to false, "priority" to 0)
  }
}
