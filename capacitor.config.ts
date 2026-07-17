import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fablab.inventoryapp",
  appName: "InventoryAPP",
  webDir: "dist/mobile",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
    },
  },
};

export default config;
