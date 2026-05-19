package com.beachtilebot

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder

class BotForegroundService : Service() {

    companion object {
        const val CHANNEL_ID = "beach_tile_bot_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_START = "com.beachtilebot.ACTION_START"
        const val ACTION_STOP = "com.beachtilebot.ACTION_STOP"

        var isRunning = false
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                isRunning = false
                BotAccessibilityService.instance?.stopBot()
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                    stopForeground(STOP_FOREGROUND_REMOVE)
                } else {
                    @Suppress("DEPRECATION")
                    stopForeground(true)
                }
                stopSelf()
                BotModule.sendEvent("Servico foreground encerrado.", "info")
                return START_NOT_STICKY
            }
            else -> {
                isRunning = true
                startForeground(NOTIFICATION_ID, buildNotification())
                BotAccessibilityService.instance?.startBot()
                    ?: BotModule.sendEvent(
                        "Servico de Acessibilidade nao esta ativo. Ative nas configuracoes.",
                        "error"
                    )
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        BotAccessibilityService.instance?.stopBot()
    }

    private fun buildNotification(): Notification {
        val openIntent = packageManager.getLaunchIntentForPackage(packageName)
            ?: Intent()
        val openPending = PendingIntent.getActivity(
            this, 0, openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, BotForegroundService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPending = PendingIntent.getService(
            this, 1, stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
                .setContentTitle("Beach Tile Bot — Ativo")
                .setContentText("Coletando recompensas automaticamente em segundo plano")
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .setOngoing(true)
                .setContentIntent(openPending)
                .addAction(
                    Notification.Action.Builder(
                        null, "Parar Bot", stopPending
                    ).build()
                )
                .build()
        } else {
            @Suppress("DEPRECATION")
            android.app.Notification.Builder(this)
                .setContentTitle("Beach Tile Bot — Ativo")
                .setContentText("Coletando recompensas automaticamente em segundo plano")
                .setSmallIcon(android.R.drawable.ic_popup_sync)
                .setOngoing(true)
                .setContentIntent(openPending)
                .build()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Beach Tile Bot",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Mostra quando o bot esta coletando recompensas"
                setShowBadge(false)
                enableLights(false)
                enableVibration(false)
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }
}
