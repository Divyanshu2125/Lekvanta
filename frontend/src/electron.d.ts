// Global type declarations for the Electron context bridge API
// This is injected by electron/preload.js when running inside Electron.

export {};

declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      platform: string;

      // App & System Info
      getAppVersion: () => Promise<string>;
      getDatabaseInfo: () => Promise<{
        path: string;
        sizeKB: string;
        sizeMB: string;
        error?: string;
      }>;

      // Database Backup & Restore
      backupDatabase: (dest?: string) => Promise<{
        success: boolean;
        path?: string;
        error?: string;
        canceled?: boolean;
      }>;
      restoreDatabase: () => Promise<{
        success: boolean;
        backedUpPrevious?: string;
        error?: string;
        canceled?: boolean;
      }>;

      // Printer Management
      getPrinters: () => Promise<
        Array<{ name: string; displayName: string; isDefault: boolean; status?: number }>
      >;

      // Printing
      printThermal: (options: {
        html: string;
        printerName?: string;
        paperWidth?: string;
      }) => Promise<{ success: boolean; error?: string }>;

      printDocument: (options: {
        html: string;
        printerName?: string;
        silent?: boolean;
        copies?: number;
      }) => Promise<{ success: boolean; error?: string }>;

      // PDF Export
      savePDF: (options: {
        title?: string;
        landscape?: boolean;
      }) => Promise<{
        success: boolean;
        path?: string;
        error?: string;
        canceled?: boolean;
      }>;

      // Local Application Settings
      getAppSettings: () => Promise<Record<string, any>>;
      saveAppSettings: (settings: Record<string, any>) => Promise<{
        success: boolean;
        error?: string;
      }>;

      // System Utilities
      openPath: (filePath: string) => Promise<{ success: boolean }>;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      openLogFile: () => Promise<{ success: boolean; path?: string; error?: string }>;
    };
  }
}

