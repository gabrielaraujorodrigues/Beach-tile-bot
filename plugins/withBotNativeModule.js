const {
  withAndroidManifest,
  withDangerousMod,
  AndroidConfig,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const PACKAGE_NAME = "com.beachtilebot";
const SRC_DIR = path.join(__dirname, "android-src");

function withBotNativeModule(config) {
  config = withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const app = AndroidConfig.Manifest.getMainApplication(manifest);

    if (!app) return config;

    // Add permissions
    const permissions = [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS",
      "android.permission.FOREGROUND_SERVICE",
      "android.permission.RECEIVE_BOOT_COMPLETED",
    ];

    if (!manifest.manifest["uses-permission"]) {
      manifest.manifest["uses-permission"] = [];
    }
    for (const perm of permissions) {
      const exists = manifest.manifest["uses-permission"].some(
        (p) => p.$?.["android:name"] === perm
      );
      if (!exists) {
        manifest.manifest["uses-permission"].push({
          $: { "android:name": perm },
        });
      }
    }

    // Add accessibility service declaration
    if (!app.service) app.service = [];
    const serviceExists = app.service.some(
      (s) =>
        s.$?.["android:name"] === `.BotAccessibilityService`
    );
    if (!serviceExists) {
      app.service.push({
        $: {
          "android:name": ".BotAccessibilityService",
          "android:exported": "true",
          "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
          "android:label": "Beach Tile Bot",
        },
        "intent-filter": [
          {
            action: [
              {
                $: {
                  "android:name": "android.accessibilityservice.AccessibilityService",
                },
              },
            ],
          },
        ],
        "meta-data": [
          {
            $: {
              "android:name": "android.accessibilityservice",
              "android:resource": "@xml/accessibility_service_config",
            },
          },
        ],
      });
    }

    return config;
  });

  config = withDangerousMod(config, [
    "android",
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidRoot = path.join(projectRoot, "android");
      const pkgPath = PACKAGE_NAME.replace(/\./g, "/");
      const javaDir = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "java",
        pkgPath
      );
      const xmlDir = path.join(androidRoot, "app", "src", "main", "res", "xml");
      const valuesDir = path.join(
        androidRoot,
        "app",
        "src",
        "main",
        "res",
        "values"
      );

      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(valuesDir, { recursive: true });

      // Copy Kotlin source files
      const ktFiles = [
        "BotAccessibilityService.kt",
        "BotModule.kt",
        "BotPackage.kt",
      ];
      for (const file of ktFiles) {
        const src = path.join(SRC_DIR, file);
        const dest = path.join(javaDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }

      // Copy accessibility service config XML
      const xmlSrc = path.join(SRC_DIR, "accessibility_service_config.xml");
      const xmlDest = path.join(xmlDir, "accessibility_service_config.xml");
      if (fs.existsSync(xmlSrc)) {
        fs.copyFileSync(xmlSrc, xmlDest);
      }

      // Add string resource for accessibility service description
      const stringsPath = path.join(valuesDir, "strings.xml");
      let stringsContent = '<resources>\n    <string name="app_name">Beach Tile Bot</string>\n    <string name="accessibility_service_description">O Beach Tile Bot usa o Servico de Acessibilidade para automatizar cliques no Beach Tile Match: clica no presente, assiste anuncios e coleta recompensas automaticamente.</string>\n</resources>\n';
      if (fs.existsSync(stringsPath)) {
        const existing = fs.readFileSync(stringsPath, "utf8");
        if (!existing.includes("accessibility_service_description")) {
          stringsContent = existing.replace(
            "</resources>",
            '    <string name="accessibility_service_description">O Beach Tile Bot usa o Servico de Acessibilidade para automatizar cliques no Beach Tile Match.</string>\n</resources>'
          );
          fs.writeFileSync(stringsPath, stringsContent);
        }
      } else {
        fs.writeFileSync(stringsPath, stringsContent);
      }

      // Modify MainApplication.kt to register BotPackage
      const mainAppPath = path.join(javaDir, "MainApplication.kt");
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, "utf8");
        if (!content.includes("BotPackage")) {
          content = content.replace(
            "override fun getPackages(): List<ReactPackage> =\n          PackageList(this).packages",
            "override fun getPackages(): List<ReactPackage> {\n          val packages = PackageList(this).packages\n          packages.add(BotPackage())\n          return packages\n        }"
          );
          // Also try alternate formatting
          content = content.replace(
            "override fun getPackages(): List<ReactPackage> = PackageList(this).packages",
            "override fun getPackages(): List<ReactPackage> {\n          val packages = PackageList(this).packages\n          packages.add(BotPackage())\n          return packages\n        }"
          );
          fs.writeFileSync(mainAppPath, content);
        }
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withBotNativeModule;
