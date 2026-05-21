import React, { useState, useEffect, useCallback, useRef } from "react";
  import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    NativeModules,
    NativeEventEmitter,
    Platform,
    AppState,
  } from "react-native";
  import { useSafeAreaInsets } from "react-native-safe-area-context";
  import { useColors } from "@/hooks/useColors";

  const { BotModule } = NativeModules;
  const IS_NATIVE = Platform.OS === "android" && !!BotModule;

  type LogType = "info" | "action" | "error" | "success";

  interface LogEntry {
    id: string;
    message: string;
    time: string;
    type: LogType;
  }

  function now() {
    return new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function logColor(type: LogType, muted: string): string {
    if (type === "error") return "#ef4444";
    if (type === "success") return "#22c55e";
    if (type === "action") return "#3b82f6";
    return muted;
  }

  export default function BotScreen() {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    const [running, setRunning] = useState(false);
    const [adsWatched, setAdsWatched] = useState(0);
    const [accPerm, setAccPerm] = useState(false);
    const [overlayPerm, setOverlayPerm] = useState(false);
    const [batteryPerm, setBatteryPerm] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([
      {
        id: "init",
        time: now(),
        type: IS_NATIVE ? "info" : "error",
        message: IS_NATIVE
          ? "App pronto. Conceda as permissoes e inicie o bot."
          : "Use o APK instalado no Android. O Expo Go nao suporta modulos nativos.",
      },
    ]);

    const addLog = useCallback((message: string, type: LogType = "info") => {
      setLogs((prev) => [
        { id: String(Date.now()), message, time: now(), type },
        ...prev.slice(0, 99),
      ]);
      if (message.includes("recompensa") || message.includes("concluido")) {
        setAdsWatched((n) => n + 1);
      }
    }, []);

    const checkPerms = useCallback(() => {
      if (!IS_NATIVE) return;
      try {
        BotModule.checkAccessibility((ok: boolean) => setAccPerm(ok));
        BotModule.checkOverlay((ok: boolean) => setOverlayPerm(ok));
        BotModule.checkBattery((ok: boolean) => setBatteryPerm(ok));
      } catch (e) {
        /* ignore */
      }
    }, []);

    useEffect(() => {
      checkPerms();
      const sub = AppState.addEventListener("change", (s) => {
        if (s === "active") checkPerms();
      });
      return () => sub.remove();
    }, [checkPerms]);

    useEffect(() => {
      if (!IS_NATIVE) return;
      let sub: any;
      try {
        const emitter = new NativeEventEmitter(BotModule);
        sub = emitter.addListener("BotLog", (e: { message: string; type: string }) => {
          addLog(e.message, (e.type as LogType) || "info");
        });
      } catch (e) {
        /* ignore */
      }
      return () => { try { sub?.remove(); } catch (_) {} };
    }, [addLog]);

    const allPerms = accPerm && overlayPerm && batteryPerm;

    function handleStartStop() {
      if (!IS_NATIVE) {
        addLog("Instale o APK no Android para usar o bot.", "error");
        return;
      }
      if (!accPerm) {
        addLog("Falta permissao de Acessibilidade.", "error");
        try { BotModule.openAccessibilitySettings(); } catch (_) {}
        return;
      }
      if (!overlayPerm) {
        addLog("Falta permissao de Sobreposicao.", "error");
        try { BotModule.openOverlaySettings(); } catch (_) {}
        return;
      }
      if (running) {
        try { BotModule.stopBot(); } catch (_) {}
        setRunning(false);
        addLog("Bot parado.", "info");
      } else {
        try { BotModule.startBot(); } catch (_) {}
        setRunning(true);
        addLog("Bot iniciado! Abra o Beach Tile Match.", "success");
      }
    }

    const bg = colors.background;
    const card = colors.card;
    const fg = colors.foreground;
    const muted = colors.mutedForeground;
    const border = colors.border;
    const mutedBg = colors.muted;

    return (
      <View style={[st.root, { backgroundColor: bg, paddingTop: insets.top + 10 }]}>
        {/* Cabecalho */}
        <View style={st.header}>
          <View>
            <Text style={[st.title, { color: fg }]}>Beach Tile Bot</Text>
            <Text style={[st.sub, { color: muted }]}>Automacao de recompensas</Text>
          </View>
          <View style={[st.badge, { backgroundColor: running ? "#22c55e20" : mutedBg }]}>
            <View style={[st.dot, { backgroundColor: running ? "#22c55e" : "#94a3b8" }]} />
            <Text style={[st.badgeText, { color: running ? "#22c55e" : muted }]}>
              {running ? "ATIVO" : "PARADO"}
            </Text>
          </View>
        </View>

        {/* Aviso Expo Go */}
        {!IS_NATIVE && (
          <View style={st.alert}>
            <Text style={st.alertText}>
              ⚠️  Este app precisa ser instalado como APK no Android. O Expo Go nao suporta a automacao nativa.
            </Text>
          </View>
        )}

        {/* Stats */}
        <View style={st.row}>
          <View style={[st.card, { backgroundColor: card }]}>
            <Text style={[st.statNum, { color: fg }]}>{adsWatched}</Text>
            <Text style={[st.statLbl, { color: muted }]}>Anuncios</Text>
          </View>
          <View style={[st.card, { backgroundColor: card }]}>
            <Text style={[st.statNum, { color: allPerms ? "#22c55e" : "#f59e0b" }]}>
              {[accPerm, overlayPerm, batteryPerm].filter(Boolean).length}/3
            </Text>
            <Text style={[st.statLbl, { color: muted }]}>Permissoes</Text>
          </View>
        </View>

        {/* Permissoes */}
        <Text style={[st.sectionTitle, { color: muted }]}>PERMISSOES NECESSARIAS</Text>

        <PermRow
          label="Acessibilidade"
          desc="Automatizar toques no jogo"
          granted={accPerm}
          disabled={!IS_NATIVE}
          card={card} fg={fg} muted={muted} border={border}
          onPress={() => { try { BotModule?.openAccessibilitySettings(); } catch (_) {} addLog("Abrindo Acessibilidade...", "info"); }}
        />
        <PermRow
          label="Sobrepor outros apps"
          desc="Mostrar overlay sobre o jogo"
          granted={overlayPerm}
          disabled={!IS_NATIVE}
          card={card} fg={fg} muted={muted} border={border}
          onPress={() => { try { BotModule?.openOverlaySettings(); } catch (_) {} addLog("Abrindo Sobreposicao...", "info"); }}
        />
        <PermRow
          label="Otimizacao de bateria"
          desc="Manter ativo em segundo plano"
          granted={batteryPerm}
          disabled={!IS_NATIVE}
          card={card} fg={fg} muted={muted} border={border}
          onPress={() => { try { BotModule?.requestBatteryOptimization(); } catch (_) {} addLog("Abrindo Bateria...", "info"); }}
        />

        {/* Botao principal */}
        <TouchableOpacity
          style={[st.btn, { backgroundColor: running ? "#ef4444" : allPerms && IS_NATIVE ? "#22c55e" : "#94a3b8" }]}
          onPress={handleStartStop}
          activeOpacity={0.85}
        >
          <Text style={st.btnText}>{running ? "⏹  Parar Bot" : "▶  Iniciar Bot"}</Text>
        </TouchableOpacity>

        {!allPerms && !running && IS_NATIVE && (
          <Text style={[st.hint, { color: muted }]}>Conceda todas as permissoes para iniciar</Text>
        )}

        {/* Log */}
        <View style={[st.logBox, { backgroundColor: card }]}>
          <View style={st.logHead}>
            <Text style={[st.logTitle, { color: muted }]}>REGISTRO DE ACOES</Text>
            <TouchableOpacity onPress={() => setLogs([])}>
              <Text style={{ color: muted, fontSize: 12 }}>limpar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={st.logScroll} showsVerticalScrollIndicator={false}>
            {logs.map((l) => (
              <View key={l.id} style={[st.logRow, { borderBottomColor: border }]}>
                <Text style={[st.logTime, { color: "#6b7280" }]}>{l.time}</Text>
                <Text style={[st.logMsg, { color: logColor(l.type, muted) }]}>{l.message}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  interface PermProps {
    label: string;
    desc: string;
    granted: boolean;
    disabled: boolean;
    card: string;
    fg: string;
    muted: string;
    border: string;
    onPress: () => void;
  }

  function PermRow({ label, desc, granted, disabled, card, fg, muted, border, onPress }: PermProps) {
    return (
      <View style={[st.permRow, { backgroundColor: card, borderColor: border }]}>
        <View style={st.permInfo}>
          <Text style={[st.permLabel, { color: fg }]}>{label}</Text>
          <Text style={[st.permDesc, { color: muted }]}>{desc}</Text>
        </View>
        {granted ? (
          <Text style={{ color: "#22c55e", fontSize: 20 }}>✓</Text>
        ) : (
          <TouchableOpacity
            onPress={onPress}
            disabled={disabled}
            style={[st.grantBtn, { backgroundColor: disabled ? "#94a3b8" : "#3b82f6" }]}
          >
            <Text style={st.grantText}>Conceder</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const st = StyleSheet.create({
    root: { flex: 1, paddingHorizontal: 18 },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    title: { fontSize: 22, fontWeight: "800" },
    sub: { fontSize: 12, marginTop: 2 },
    badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    dot: { width: 7, height: 7, borderRadius: 4 },
    badgeText: { fontSize: 11, fontWeight: "700" },
    alert: { backgroundColor: "#fef3c720", borderColor: "#f59e0b", borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
    alertText: { color: "#f59e0b", fontSize: 13, lineHeight: 20 },
    row: { flexDirection: "row", gap: 12, marginBottom: 16 },
    card: { flex: 1, borderRadius: 14, padding: 16, alignItems: "center" },
    statNum: { fontSize: 32, fontWeight: "800" },
    statLbl: { fontSize: 12, marginTop: 4 },
    sectionTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 10 },
    permRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
    permInfo: { flex: 1 },
    permLabel: { fontSize: 14, fontWeight: "600" },
    permDesc: { fontSize: 12, marginTop: 2 },
    grantBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
    grantText: { color: "#fff", fontSize: 13, fontWeight: "600" },
    btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 18, borderRadius: 16, marginBottom: 8, marginTop: 4 },
    btnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
    hint: { textAlign: "center", fontSize: 12, marginBottom: 10 },
    logBox: { flex: 1, borderRadius: 14, padding: 14, marginBottom: 20 },
    logHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    logTitle: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
    logScroll: { flex: 1 },
    logRow: { flexDirection: "row", gap: 8, paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth },
    logTime: { fontSize: 11, minWidth: 62 },
    logMsg: { fontSize: 12, flex: 1, lineHeight: 18 },
  });
  