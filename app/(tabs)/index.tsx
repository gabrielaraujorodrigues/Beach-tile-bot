import React, { useState, useEffect, useCallback } from "react";
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
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const { BotModule } = NativeModules;

interface LogEntry {
  id: string;
  message: string;
  time: string;
  type: "info" | "action" | "error" | "success";
}

function getTime() {
  const d = new Date();
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function BotScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isRunning, setIsRunning] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: "0", message: "App pronto. Conceda as permissões e inicie o bot.", time: getTime(), type: "info" },
  ]);
  const [perms, setPerms] = useState({
    accessibility: false,
    overlay: false,
    battery: false,
  });

  const addLog = useCallback((message: string, type: LogEntry["type"] = "info") => {
    setLogs((prev) => [
      { id: Date.now().toString(), message, time: getTime(), type },
      ...prev.slice(0, 99),
    ]);
    if (message.toLowerCase().includes("anúncio concluído") || message.toLowerCase().includes("recompensa")) {
      setAdsWatched((n) => n + 1);
    }
  }, []);

  const checkPermissions = useCallback(() => {
    if (Platform.OS !== "android" || !BotModule) return;
    BotModule.checkAccessibility((enabled: boolean) => {
      setPerms((p) => ({ ...p, accessibility: enabled }));
    });
    BotModule.checkOverlay((enabled: boolean) => {
      setPerms((p) => ({ ...p, overlay: enabled }));
    });
    BotModule.checkBattery((enabled: boolean) => {
      setPerms((p) => ({ ...p, battery: enabled }));
    });
  }, []);

  useEffect(() => {
    checkPermissions();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPermissions();
    });
    return () => sub.remove();
  }, [checkPermissions]);

  useEffect(() => {
    if (Platform.OS !== "android" || !BotModule) return;
    const emitter = new NativeEventEmitter(BotModule);
    const logSub = emitter.addListener("BotLog", (event: { message: string; type: string }) => {
      addLog(event.message, (event.type as LogEntry["type"]) || "info");
    });
    return () => logSub.remove();
  }, [addLog]);

  const handleStartStop = () => {
    if (!BotModule) {
      addLog("Módulo nativo não disponível. Execute como APK compilado.", "error");
      return;
    }
    if (!perms.accessibility) {
      addLog("Conceda a permissão de Acessibilidade primeiro.", "error");
      return;
    }
    if (!perms.overlay) {
      addLog("Conceda a permissão de Sobrepor Apps primeiro.", "error");
      return;
    }
    if (isRunning) {
      BotModule.stopBot();
      setIsRunning(false);
      addLog("Bot parado pelo usuário.", "info");
    } else {
      BotModule.startBot();
      setIsRunning(true);
      addLog("Bot iniciado! Abra o Beach Tile Match...", "success");
    }
  };

  const openAccessibility = () => {
    BotModule?.openAccessibilitySettings();
    addLog("Abrindo configurações de Acessibilidade...", "info");
  };
  const openOverlay = () => {
    BotModule?.openOverlaySettings();
    addLog("Abrindo configurações de Sobreposição...", "info");
  };
  const openBattery = () => {
    BotModule?.requestBatteryOptimization();
    addLog("Abrindo configurações de Bateria...", "info");
  };

  const allGranted = perms.accessibility && perms.overlay && perms.battery;

  const s = styles(colors);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Beach Tile Bot</Text>
        <View style={[s.statusBadge, { backgroundColor: isRunning ? "#22c55e" : colors.muted }]}>
          <View style={[s.statusDot, { backgroundColor: isRunning ? "#fff" : colors.mutedForeground }]} />
          <Text style={[s.statusText, { color: isRunning ? "#fff" : colors.mutedForeground }]}>
            {isRunning ? "ATIVO" : "PARADO"}
          </Text>
        </View>
      </View>

      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statValue}>{adsWatched}</Text>
          <Text style={s.statLabel}>Anúncios Assistidos</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Permissões Necessárias</Text>
        <PermRow
          label="Acessibilidade"
          desc="Controlar toques em outros apps"
          granted={perms.accessibility}
          icon="accessibility"
          onPress={openAccessibility}
          colors={colors}
        />
        <PermRow
          label="Sobrepor outros Apps"
          desc="Exibir overlay sobre o jogo"
          granted={perms.overlay}
          icon="layers"
          onPress={openOverlay}
          colors={colors}
        />
        <PermRow
          label="Otimização de Bateria"
          desc="Rodar em segundo plano sem parar"
          granted={perms.battery}
          icon="battery-charging-full"
          onPress={openBattery}
          colors={colors}
        />
      </View>

      <TouchableOpacity
        style={[s.startBtn, { backgroundColor: isRunning ? "#ef4444" : allGranted ? "#22c55e" : colors.muted }]}
        onPress={handleStartStop}
        activeOpacity={0.8}
      >
        <Feather name={isRunning ? "square" : "play"} size={22} color="#fff" />
        <Text style={s.startBtnText}>{isRunning ? "Parar Bot" : "Iniciar Bot"}</Text>
      </TouchableOpacity>

      {!allGranted && !isRunning && (
        <Text style={s.permHint}>Conceda todas as permissões para iniciar</Text>
      )}

      <View style={s.logBox}>
        <Text style={s.logTitle}>Registro de Ações</Text>
        <ScrollView style={s.logScroll} showsVerticalScrollIndicator={false}>
          {logs.map((log) => (
            <View key={log.id} style={s.logRow}>
              <Text style={[s.logTime]}>{log.time}</Text>
              <Text style={[s.logMsg, { color: logColor(log.type, colors) }]}>{log.message}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function PermRow({
  label, desc, granted, icon, onPress, colors,
}: {
  label: string; desc: string; granted: boolean; icon: string; onPress: () => void; colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <View style={[permStyles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MaterialIcons name={icon as any} size={22} color={granted ? "#22c55e" : colors.mutedForeground} />
      <View style={permStyles.text}>
        <Text style={[permStyles.label, { color: colors.foreground }]}>{label}</Text>
        <Text style={[permStyles.desc, { color: colors.mutedForeground }]}>{desc}</Text>
      </View>
      {granted ? (
        <Feather name="check-circle" size={20} color="#22c55e" />
      ) : (
        <TouchableOpacity onPress={onPress} style={[permStyles.grantBtn, { backgroundColor: "#3b82f6" }]}>
          <Text style={permStyles.grantText}>Conceder</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function logColor(type: LogEntry["type"], colors: any) {
  if (type === "error") return "#ef4444";
  if (type === "success") return "#22c55e";
  if (type === "action") return "#3b82f6";
  return colors.mutedForeground;
}

const permStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  text: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600" },
  desc: { fontSize: 12, marginTop: 2 },
  grantBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  grantText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});

const styles = (colors: any) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16 },
    title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
    statusBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5 },
    statsRow: { flexDirection: "row", marginBottom: 16 },
    statCard: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 16, alignItems: "center" },
    statValue: { fontSize: 36, fontWeight: "700", color: colors.foreground },
    statLabel: { fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    section: { marginBottom: 16 },
    sectionTitle: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
    startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 18, borderRadius: 16, marginBottom: 8 },
    startBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
    permHint: { textAlign: "center", fontSize: 12, color: colors.mutedForeground, marginBottom: 12 },
    logBox: { flex: 1, backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 20 },
    logTitle: { fontSize: 13, fontWeight: "600", color: colors.mutedForeground, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
    logScroll: { flex: 1 },
    logRow: { flexDirection: "row", gap: 8, paddingVertical: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e5e510" },
    logTime: { fontSize: 11, color: "#6b7280", minWidth: 60 },
    logMsg: { fontSize: 12, flex: 1 },
  });
