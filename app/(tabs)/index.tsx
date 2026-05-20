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
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

const { BotModule } = NativeModules;
const isNativeAvailable = Platform.OS === "android" && !!BotModule;

interface LogEntry {
  id: string;
  message: string;
  time: string;
  type: "info" | "action" | "error" | "success";
}

function getTime() {
  const d = new Date();
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function BotScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [isRunning, setIsRunning] = useState(false);
  const [adsWatched, setAdsWatched] = useState(0);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: "0",
      message: isNativeAvailable
        ? "App pronto. Conceda as permissões e inicie o bot."
        : "⚠️ Execute o APK instalado no celular para usar o bot.",
      time: getTime(),
      type: isNativeAvailable ? "info" : "error",
    },
  ]);
  const [perms, setPerms] = useState({
    accessibility: false,
    overlay: false,
    battery: false,
  });

  const addLog = useCallback(
    (message: string, type: LogEntry["type"] = "info") => {
      setLogs((prev) => [
        { id: Date.now().toString(), message, time: getTime(), type },
        ...prev.slice(0, 99),
      ]);
      if (
        message.toLowerCase().includes("anúncio concluído") ||
        message.toLowerCase().includes("recompensa")
      ) {
        setAdsWatched((n) => n + 1);
      }
    },
    []
  );

  const checkPermissions = useCallback(() => {
    if (!isNativeAvailable) return;
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
    if (!isNativeAvailable) return;
    const emitter = new NativeEventEmitter(BotModule);
    const logSub = emitter.addListener(
      "BotLog",
      (event: { message: string; type: string }) => {
        addLog(event.message, (event.type as LogEntry["type"]) || "info");
      }
    );
    return () => logSub.remove();
  }, [addLog]);

  const handleStartStop = () => {
    if (!isNativeAvailable) {
      addLog(
        "Instale o APK no celular para usar o bot. O Expo Go não suporta módulos nativos.",
        "error"
      );
      return;
    }
    if (!perms.accessibility) {
      addLog("Conceda a permissão de Acessibilidade primeiro.", "error");
      BotModule.openAccessibilitySettings?.();
      return;
    }
    if (!perms.overlay) {
      addLog("Conceda a permissão de Sobrepor Apps primeiro.", "error");
      BotModule.openOverlaySettings?.();
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
    if (!isNativeAvailable) return;
    BotModule.openAccessibilitySettings?.();
    addLog("Abrindo configurações de Acessibilidade...", "info");
  };
  const openOverlay = () => {
    if (!isNativeAvailable) return;
    BotModule.openOverlaySettings?.();
    addLog("Abrindo configurações de Sobreposição...", "info");
  };
  const openBattery = () => {
    if (!isNativeAvailable) return;
    BotModule.requestBatteryOptimization?.();
    addLog("Abrindo configurações de Bateria...", "info");
  };

  const allGranted = perms.accessibility && perms.overlay && perms.battery;
  const s = styles(colors);

  return (
    <View style={[s.root, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Beach Tile Bot</Text>
          <Text style={s.subtitle}>Automação de recompensas</Text>
        </View>
        <View
          style={[
            s.statusBadge,
            {
              backgroundColor: isRunning
                ? "#22c55e20"
                : isNativeAvailable
                ? colors.muted
                : "#ef444420",
            },
          ]}
        >
          <View
            style={[
              s.statusDot,
              {
                backgroundColor: isRunning
                  ? "#22c55e"
                  : isNativeAvailable
                  ? "#94a3b8"
                  : "#ef4444",
              },
            ]}
          />
          <Text
            style={[
              s.statusText,
              {
                color: isRunning
                  ? "#22c55e"
                  : isNativeAvailable
                  ? colors.mutedForeground
                  : "#ef4444",
              },
            ]}
          >
            {isRunning ? "ATIVO" : isNativeAvailable ? "PARADO" : "SEM APK"}
          </Text>
        </View>
      </View>

      {/* Alert when not native */}
      {!isNativeAvailable && (
        <View style={s.alertBox}>
          <Feather name="alert-circle" size={18} color="#f59e0b" />
          <Text style={s.alertText}>
            Este app precisa ser instalado como APK no Android para funcionar. O
            Expo Go não suporta automação nativa.
          </Text>
        </View>
      )}

      {/* Stats */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: colors.card }]}>
          <Text style={[s.statValue, { color: colors.foreground }]}>
            {adsWatched}
          </Text>
          <Text style={[s.statLabel, { color: colors.mutedForeground }]}>
            Anúncios Assistidos
          </Text>
        </View>
        <View style={[s.statCard, { backgroundColor: colors.card }]}>
          <Text
            style={[
              s.statValue,
              { color: allGranted ? "#22c55e" : "#f59e0b" },
            ]}
          >
            {Object.values(perms).filter(Boolean).length}/3
          </Text>
          <Text style={[s.statLabel, { color: colors.mutedForeground }]}>
            Permissões
          </Text>
        </View>
      </View>

      {/* Permissions */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { color: colors.mutedForeground }]}>
          Permissões Necessárias
        </Text>
        <PermRow
          label="Acessibilidade"
          desc="Controlar toques em outros apps"
          granted={perms.accessibility}
          icon="accessibility"
          onPress={openAccessibility}
          colors={colors}
          disabled={!isNativeAvailable}
        />
        <PermRow
          label="Sobrepor outros Apps"
          desc="Exibir overlay sobre o jogo"
          granted={perms.overlay}
          icon="layers"
          onPress={openOverlay}
          colors={colors}
          disabled={!isNativeAvailable}
        />
        <PermRow
          label="Otimização de Bateria"
          desc="Rodar em segundo plano sem parar"
          granted={perms.battery}
          icon="battery-charging-full"
          onPress={openBattery}
          colors={colors}
          disabled={!isNativeAvailable}
        />
      </View>

      {/* Start/Stop Button */}
      <TouchableOpacity
        style={[
          s.startBtn,
          {
            backgroundColor: isRunning
              ? "#ef4444"
              : allGranted && isNativeAvailable
              ? "#22c55e"
              : "#94a3b8",
          },
        ]}
        onPress={handleStartStop}
        activeOpacity={0.85}
      >
        <Feather name={isRunning ? "square" : "play"} size={22} color="#fff" />
        <Text style={s.startBtnText}>
          {isRunning ? "Parar Bot" : "Iniciar Bot"}
        </Text>
      </TouchableOpacity>

      {!allGranted && !isRunning && isNativeAvailable && (
        <Text style={[s.permHint, { color: colors.mutedForeground }]}>
          Conceda todas as permissões para iniciar
        </Text>
      )}

      {/* Log box */}
      <View style={[s.logBox, { backgroundColor: colors.card }]}>
        <View style={s.logHeader}>
          <Text style={[s.logTitle, { color: colors.mutedForeground }]}>
            Registro de Ações
          </Text>
          <TouchableOpacity onPress={() => setLogs([])}>
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <ScrollView style={s.logScroll} showsVerticalScrollIndicator={false}>
          {logs.map((log) => (
            <View
              key={log.id}
              style={[s.logRow, { borderBottomColor: colors.border }]}
            >
              <Text style={[s.logTime, { color: "#6b7280" }]}>{log.time}</Text>
              <Text
                style={[s.logMsg, { color: logColor(log.type, colors) }]}
              >
                {log.message}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function PermRow({
  label,
  desc,
  granted,
  icon,
  onPress,
  colors,
  disabled,
}: {
  label: string;
  desc: string;
  granted: boolean;
  icon: string;
  onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  disabled?: boolean;
}) {
  return (
    <View
      style={[
        permStyles.row,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <MaterialIcons
        name={icon as any}
        size={22}
        color={granted ? "#22c55e" : disabled ? "#94a3b8" : colors.mutedForeground}
      />
      <View style={permStyles.text}>
        <Text style={[permStyles.label, { color: colors.foreground }]}>
          {label}
        </Text>
        <Text style={[permStyles.desc, { color: colors.mutedForeground }]}>
          {desc}
        </Text>
      </View>
      {granted ? (
        <Feather name="check-circle" size={20} color="#22c55e" />
      ) : (
        <TouchableOpacity
          onPress={onPress}
          disabled={disabled}
          style={[
            permStyles.grantBtn,
            { backgroundColor: disabled ? "#94a3b8" : "#3b82f6" },
          ]}
        >
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
  grantBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  grantText: { color: "#fff", fontSize: 13, fontWeight: "600" },
});

const styles = (colors: any) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingBottom: 16,
    },
    title: { fontSize: 22, fontWeight: "800", color: colors.foreground },
    subtitle: { fontSize: 13, color: colors.mutedForeground, marginTop: 2 },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
    alertBox: {
      flexDirection: "row",
      gap: 10,
      backgroundColor: "#fef3c720",
      borderColor: "#f59e0b",
      borderWidth: 1,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      alignItems: "flex-start",
    },
    alertText: {
      flex: 1,
      color: "#f59e0b",
      fontSize: 13,
      lineHeight: 19,
    },
    statsRow: {
      flexDirection: "row",
      gap: 12,
      marginBottom: 16,
    },
    statCard: {
      flex: 1,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
    },
    statValue: { fontSize: 32, fontWeight: "800" },
    statLabel: { fontSize: 12, marginTop: 4 },
    section: { marginBottom: 16 },
    sectionTitle: {
      fontSize: 11,
      fontWeight: "700",
      marginBottom: 10,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    startBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 18,
      borderRadius: 16,
      marginBottom: 8,
    },
    startBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
    permHint: { textAlign: "center", fontSize: 12, marginBottom: 12 },
    logBox: { flex: 1, borderRadius: 14, padding: 14, marginBottom: 20 },
    logHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    logTitle: {
      fontSize: 11,
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    logScroll: { flex: 1 },
    logRow: {
      flexDirection: "row",
      gap: 8,
      paddingVertical: 5,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    logTime: { fontSize: 11, minWidth: 62 },
    logMsg: { fontSize: 12, flex: 1, lineHeight: 18 },
  });
