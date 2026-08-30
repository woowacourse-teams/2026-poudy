package com.poudy.modules.share

import android.content.ComponentName
import android.content.Intent
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class PoudyShareModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PoudyShare")

    AsyncFunction("shareAsync") { message: String ->
      val activity = appContext.throwingActivity
      val shareIntent = Intent(Intent.ACTION_SEND).apply {
        setTypeAndNormalize("text/plain")
        putExtra(Intent.EXTRA_TEXT, message)
      }
      val excludedComponents = (POUDY_COMPONENTS + activity.componentName).distinct().toTypedArray()
      val chooser = Intent.createChooser(shareIntent, null).apply {
        putExtra(Intent.EXTRA_EXCLUDE_COMPONENTS, excludedComponents)
        addCategory(Intent.CATEGORY_DEFAULT)
      }

      activity.startActivity(chooser)
    }.runOnQueue(Queues.MAIN)
  }

  private companion object {
    val POUDY_COMPONENTS = listOf(
      ComponentName("com.poudy.app", "com.poudy.app.MainActivity"),
      ComponentName("com.poudy.app.dev", "com.poudy.app.dev.MainActivity"),
    )
  }
}
