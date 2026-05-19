package com.beachtilebot

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.graphics.Rect
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class BotAccessibilityService : AccessibilityService() {

    private val handler = Handler(Looper.getMainLooper())
    private var isRunning = false
    private var state = BotState.IDLE

    private val BEACH_PACKAGES = listOf("beach", "tile", "match", "beachtilematch", "beachtile")

    enum class BotState {
        IDLE, SEARCHING_GIFT, CLICKING_GIFT, WAITING_DIALOG,
        CLICKING_WATCH_AD, WATCHING_AD, CLICKING_SKIP, COOLDOWN
    }

    companion object {
        var instance: BotAccessibilityService? = null
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        val info = AccessibilityServiceInfo().apply {
            eventTypes = AccessibilityEvent.TYPES_ALL_MASK
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_REPORT_VIEW_IDS or
                    AccessibilityServiceInfo.FLAG_RETRIEVE_INTERACTIVE_WINDOWS or
                    AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            notificationTimeout = 100
        }
        serviceInfo = info
        BotModule.sendEvent("Servico de Acessibilidade conectado!", "success")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (!isRunning) return
        val pkg = event.packageName?.toString() ?: return
        if (!isBeachTileMatch(pkg)) return

        when (state) {
            BotState.IDLE -> {
                state = BotState.SEARCHING_GIFT
                handler.postDelayed({ searchForGift() }, 800)
            }
            BotState.WATCHING_AD -> {
                checkForSkipButton()
            }
            else -> {}
        }
    }

    private fun isBeachTileMatch(pkg: String): Boolean =
        BEACH_PACKAGES.any { pkg.lowercase().contains(it) }

    private fun searchForGift() {
        if (!isRunning) return
        BotModule.sendEvent("Procurando botao de presente...", "action")
        val root = rootInActiveWindow ?: run {
            handler.postDelayed({ searchForGift() }, 2000)
            return
        }

        val gift = findGiftButton(root)
        if (gift != null) {
            state = BotState.CLICKING_GIFT
            BotModule.sendEvent("Presente encontrado! Clicando...", "action")
            gift.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            handler.postDelayed({ waitForDialog() }, 1500)
        } else {
            state = BotState.IDLE
            handler.postDelayed({ searchForGift() }, 2500)
        }
        root.recycle()
    }

    private fun findGiftButton(root: AccessibilityNodeInfo): AccessibilityNodeInfo? {
        val keywords = listOf("gift", "presente", "reward", "recompensa", "bonus", "present")
        val byDesc = findByDescription(root, keywords)
        if (byDesc != null) return byDesc

        val clickables = mutableListOf<AccessibilityNodeInfo>()
        collectClickable(root, clickables)

        val displayH = resources.displayMetrics.heightPixels
        val displayW = resources.displayMetrics.widthPixels

        val bottomRight = clickables.filter {
            val r = Rect()
            it.getBoundsInScreen(r)
            r.centerY() > displayH * 0.75f && r.centerX() > displayW * 0.6f
        }.maxByOrNull {
            val r = Rect()
            it.getBoundsInScreen(r)
            r.centerX() + r.centerY()
        }
        return bottomRight
    }

    private fun waitForDialog() {
        if (!isRunning) return
        state = BotState.WAITING_DIALOG
        BotModule.sendEvent("Aguardando dialogo de recompensa...", "info")
        handler.postDelayed({ searchForWatchAds() }, 1200)
    }

    private fun searchForWatchAds() {
        if (!isRunning) return
        val root = rootInActiveWindow ?: run {
            handler.postDelayed({ searchForWatchAds() }, 1000)
            return
        }

        val watchTexts = listOf(
            "Assistir Anuncios", "Assistir Anúncios", "Assistir anúncio",
            "Watch Ads", "Watch Ad", "Assistir", "Watch"
        )
        val btn = findByText(root, watchTexts)
        if (btn != null) {
            state = BotState.CLICKING_WATCH_AD
            BotModule.sendEvent("Botao Assistir Anuncios encontrado! Clicando...", "action")
            btn.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            handler.postDelayed({
                state = BotState.WATCHING_AD
                BotModule.sendEvent("Assistindo anuncio... Aguardando botao de pular.", "info")
                scheduleAdTimeout()
            }, 2000)
        } else {
            handler.postDelayed({ searchForWatchAds() }, 1500)
        }
        root.recycle()
    }

    private fun scheduleAdTimeout() {
        handler.postDelayed({
            if (state == BotState.WATCHING_AD && isRunning) {
                BotModule.sendEvent("Timeout do anuncio. Tentando fechar...", "info")
                checkForSkipButton()
                closeRewardDialog()
            }
        }, 35000)
    }

    private fun checkForSkipButton() {
        if (!isRunning || state != BotState.WATCHING_AD) return
        val root = rootInActiveWindow ?: return

        val skipTexts = listOf(
            "Skip", "SKIP", "Pular", "PULAR", "Skip Ad", "Pular anuncio",
            "Pular Anúncio", "Skip Ads", "Fechar", "Close", "CLOSE",
            "×", "✕", "✖", "Done", "OK"
        )
        val skip = findByText(root, skipTexts)
            ?: findByDescription(root, listOf("skip", "pular", "close", "fechar"))

        if (skip != null) {
            state = BotState.CLICKING_SKIP
            BotModule.sendEvent("Botao de pular encontrado! Clicando...", "action")
            skip.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            handler.postDelayed({ closeRewardDialog() }, 1200)
        }
        root.recycle()
    }

    private fun closeRewardDialog() {
        if (!isRunning) return
        BotModule.sendEvent("Fechando dialogo de recompensa...", "action")
        val root = rootInActiveWindow ?: run {
            handler.postDelayed({ closeRewardDialog() }, 1000)
            return
        }

        val closeKeywords = listOf("×", "✕", "✖", "X", "Fechar", "Close")
        val xBtn = findByDescription(root, listOf("close", "fechar", "dismiss"))
            ?: findByText(root, closeKeywords)
        xBtn?.performAction(AccessibilityNodeInfo.ACTION_CLICK)

        handler.removeCallbacksAndMessages(null)
        BotModule.sendEvent("Anuncio concluido! Recompensa obtida. Aguardando proximo ciclo...", "success")
        state = BotState.COOLDOWN
        handler.postDelayed({
            state = BotState.IDLE
            handler.postDelayed({ searchForGift() }, 4000)
        }, 6000)
        root.recycle()
    }

    private fun findByText(root: AccessibilityNodeInfo, texts: List<String>): AccessibilityNodeInfo? {
        for (text in texts) {
            val nodes = root.findAccessibilityNodeInfosByText(text)
            val clickable = nodes.firstOrNull { it.isClickable || it.isEnabled }
            if (clickable != null) return clickable
        }
        return null
    }

    private fun findByDescription(root: AccessibilityNodeInfo, keywords: List<String>): AccessibilityNodeInfo? {
        val queue = ArrayDeque<AccessibilityNodeInfo>()
        queue.add(root)
        while (queue.isNotEmpty()) {
            val node = queue.removeFirst()
            val desc = node.contentDescription?.toString()?.lowercase() ?: ""
            val txt = node.text?.toString()?.lowercase() ?: ""
            if (keywords.any { desc.contains(it) || txt.contains(it) } && node.isClickable) {
                return node
            }
            for (i in 0 until node.childCount) {
                node.getChild(i)?.let { queue.add(it) }
            }
        }
        return null
    }

    private fun collectClickable(node: AccessibilityNodeInfo, result: MutableList<AccessibilityNodeInfo>) {
        if (node.isClickable) result.add(node)
        for (i in 0 until node.childCount) {
            node.getChild(i)?.let { collectClickable(it, result) }
        }
    }

    fun startBot() {
        isRunning = true
        state = BotState.IDLE
        handler.removeCallbacksAndMessages(null)
        BotModule.sendEvent("Bot iniciado! Abra o Beach Tile Match.", "success")
        handler.postDelayed({ searchForGift() }, 2000)
    }

    fun stopBot() {
        isRunning = false
        handler.removeCallbacksAndMessages(null)
        state = BotState.IDLE
        BotModule.sendEvent("Bot parado pelo usuario.", "info")
    }

    override fun onInterrupt() {
        isRunning = false
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        isRunning = false
        handler.removeCallbacksAndMessages(null)
    }
}
