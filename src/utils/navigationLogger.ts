/**
 * Navigation Logger for Road Test Debugging
 * 
 * Simple file-based logging to debug navigation issues during real-world testing.
 * Logs are stored locally and can be viewed/exported after the trip.
 * 
 * Usage:
 *   import { navLog } from '@/utils/navigationLogger';
 *   
 *   navLog.log('DEVIATION_CHECK', { distance: 55, threshold: 50 });
 *   navLog.log('REROUTE_TRIGGERED', { reason: 'deviation' });
 *   
 * After trip:
 *   const logs = await navLog.getLogs();
 *   await navLog.share(); // Share via share sheet
 *   await navLog.clear();
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

// Configuration
const LOG_DIR = `${FileSystem.documentDirectory}nav_logs/`;
const getLogDir = () => `${FileSystem.documentDirectory}nav_logs/`;

const MAX_LOG_FILES = 5; // Keep last 5 sessions
const MAX_ENTRIES_PER_FILE = 5000; // Prevent files from getting too large

// Log entry type
interface LogEntry {
    timestamp: string;
    elapsed: number; // ms since session start
    event: string;
    data?: Record<string, unknown>;
}

// Session state
let currentSessionFile: string | null = null;
let sessionStartTime: number = 0;
let entryCount: number = 0;
let isEnabled: boolean = true;

/**
 * Navigation Logger
 */
export const navLog = {
    /**
     * Start a new logging session
     * Call this when navigation starts
     */
    async startSession(): Promise<void> {
        try {
            if (!FileSystem.documentDirectory) {
                console.error('[NavLog] documentDirectory is null!');
                return;
            }
            // Ensure log directory exists
            const dirInfo = await FileSystem.getInfoAsync(getLogDir());
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(getLogDir(), { intermediates: true });
            }

            // Clean up old log files
            await this.cleanupOldLogs();

            // Create new session file
            const sessionId = new Date().toISOString().replace(/[:.]/g, '-');
            currentSessionFile = `${getLogDir()}nav_${sessionId}.log`;
            sessionStartTime = Date.now();
            entryCount = 0;

            // Write session header
            const header = {
                session_start: new Date().toISOString(),
                device_time: new Date().toLocaleString(),
            };
            await FileSystem.writeAsStringAsync(
                currentSessionFile,
                `=== NAVIGATION LOG SESSION ===\n${JSON.stringify(header, null, 2)}\n\n`,
                { encoding: FileSystem.EncodingType.UTF8 }
            );

            this.log('SESSION_STARTED', { file: currentSessionFile });
        } catch (error) {
            console.error('[NavLog] Failed to start session:', error);
        }
    },

    /**
     * Log an event
     * @param event - Event name (e.g., 'DEVIATION_CHECK', 'REROUTE_TRIGGERED')
     * @param data - Optional data object
     */
    async log(event: string, data?: Record<string, unknown>): Promise<void> {
        if (!isEnabled) return;

        try {
            // Auto-start session if not started
            if (!currentSessionFile) {
                await this.startSession();
            }

            if (!currentSessionFile || entryCount >= MAX_ENTRIES_PER_FILE) return;

            const entry: LogEntry = {
                timestamp: new Date().toISOString(),
                elapsed: Date.now() - sessionStartTime,
                event,
                data,
            };

            // Format: [elapsed_ms] EVENT_NAME { data }
            const elapsedSec = (entry.elapsed / 1000).toFixed(1);
            const dataStr = data ? ` ${JSON.stringify(data)}` : '';
            const line = `[${elapsedSec}s] ${event}${dataStr}\n`;

            const existing = await FileSystem.readAsStringAsync(currentSessionFile);
            await FileSystem.writeAsStringAsync(currentSessionFile, existing + line, {
                encoding: FileSystem.EncodingType.UTF8,
            });

            entryCount++;

            // Also log to console in dev
            if (__DEV__) {
                console.log(`[NavLog] ${event}`, data || '');
            }
        } catch (error) {
            console.error('[NavLog] Failed to write log:', error);
        }
    },

    /**
     * End the current logging session
     * Call this when navigation ends
     */
    async endSession(): Promise<void> {
        if (!currentSessionFile) return;

        try {
            const summary = {
                session_end: new Date().toISOString(),
                total_entries: entryCount,
                duration_seconds: Math.round((Date.now() - sessionStartTime) / 1000),
            };

            const existing = await FileSystem.readAsStringAsync(currentSessionFile);
            await FileSystem.writeAsStringAsync(
                currentSessionFile,
                existing + `\n=== SESSION END ===\n${JSON.stringify(summary, null, 2)}\n`,
                { encoding: FileSystem.EncodingType.UTF8 }
            );
            // this.log('SESSION_ENDED', summary);
            currentSessionFile = null;
            entryCount = 0;
        } catch (error) {
            console.error('[NavLog] Failed to end session:', error);
        }
    },

    /**
     * Get all logs from current session
     */
    async getLogs(): Promise<string | null> {
        if (!currentSessionFile) return null;

        try {
            const content = await FileSystem.readAsStringAsync(currentSessionFile);
            return content;
        } catch (error) {
            console.error('[NavLog] Failed to read logs:', error);
            return null;
        }
    },

    /**
     * Get list of all log files
     */
    async getLogFiles(): Promise<string[]> {
        try {
            const dirInfo = await FileSystem.getInfoAsync(getLogDir());
            if (!dirInfo.exists) return [];

            const files = await FileSystem.readDirectoryAsync(getLogDir());
            return files
                .filter(f => f.endsWith('.log'))
                .sort()
                .reverse(); // Newest first
        } catch (error) {
            console.error('[NavLog] Failed to list logs:', error);
            return [];
        }
    },

    /**
     * Read a specific log file
     */
    async readLogFile(filename: string): Promise<string | null> {
        try {
            const content = await FileSystem.readAsStringAsync(`${getLogDir()}${filename}`);
            return content;
        } catch (error) {
            console.error('[NavLog] Failed to read log file:', error);
            return null;
        }
    },

    /**
     * Share the current or most recent log file
     */
    async share(): Promise<void> {
        try {
            let fileToShare = currentSessionFile;

            // If no active session, get most recent log
            if (!fileToShare) {
                const files = await this.getLogFiles();
                if (files.length > 0) {
                    fileToShare = `${getLogDir()}${files[0]}`;
                }
            }

            if (!fileToShare) {
                console.warn('[NavLog] No log file to share');
                return;
            }

            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileToShare, {
                    mimeType: 'text/plain',
                    dialogTitle: 'Share Navigation Log',
                });
            } else {
                console.warn('[NavLog] Sharing not available on this device');
            }
        } catch (error) {
            console.error('[NavLog] Failed to share logs:', error);
        }
    },

    /**
     * Clear current session logs
     */
    async clear(): Promise<void> {
        if (currentSessionFile) {
            try {
                await FileSystem.deleteAsync(currentSessionFile, { idempotent: true });
                currentSessionFile = null;
                entryCount = 0;
            } catch (error) {
                console.error('[NavLog] Failed to clear logs:', error);
            }
        }
    },

    /**
     * Clear all log files
     */
    async clearAll(): Promise<void> {
        try {
            const dirInfo = await FileSystem.getInfoAsync(getLogDir());
            if (dirInfo.exists) {
                await FileSystem.deleteAsync(getLogDir(), { idempotent: true });
            }
            currentSessionFile = null;
            entryCount = 0;
        } catch (error) {
            console.error('[NavLog] Failed to clear all logs:', error);
        }
    },

    /**
     * Enable/disable logging
     */
    setEnabled(enabled: boolean): void {
        isEnabled = enabled;
    },

    /**
     * Check if logging is enabled
     */
    isEnabled(): boolean {
        return isEnabled;
    },

    /**
     * Clean up old log files, keeping only the most recent ones
     */
    async cleanupOldLogs(): Promise<void> {
        try {
            const files = await this.getLogFiles();
            if (files.length > MAX_LOG_FILES) {
                const filesToDelete = files.slice(MAX_LOG_FILES);
                for (const file of filesToDelete) {
                    await FileSystem.deleteAsync(`${getLogDir()}${file}`, { idempotent: true });
                }
            }
        } catch (error) {
            console.error('[NavLog] Failed to cleanup old logs:', error);
        }
    },

    /**
     * Get current session info
     */
    getSessionInfo(): { active: boolean; entryCount: number; duration: number } {
        return {
            active: currentSessionFile !== null,
            entryCount,
            duration: currentSessionFile ? Date.now() - sessionStartTime : 0,
        };
    },
};

// Convenience logging functions for specific events
export const navLogEvents = {
    positionUpdate: (lat: number, lng: number, heading?: number) => {
        navLog.log('POSITION_UPDATE', { lat: lat.toFixed(6), lng: lng.toFixed(6), heading });
    },

    deviationCheck: (distanceFromRoute: number, threshold: number, isDeviated: boolean) => {
        navLog.log('DEVIATION_CHECK', { distanceFromRoute, threshold, isDeviated });
    },

    rerouteTriggered: (reason: string, fromLat: number, fromLng: number) => {
        navLog.log('REROUTE_TRIGGERED', { reason, fromLat, fromLng });
    },

    rerouteComplete: (success: boolean, newRouteDistance?: number) => {
        navLog.log('REROUTE_COMPLETE', { success, newRouteDistance });
    },

    saferRouteCheck: (reason: string) => {
        navLog.log('SAFER_ROUTE_CHECK', { reason });
    },

    distanceUpdate: (distanceToTurn: number, displayedDistance: number, step: number) => {
        navLog.log('DISTANCE_UPDATE', { distanceToTurn, displayedDistance, step });
    },

    stepAdvanced: (fromStep: number, toStep: number, reason: string) => {
        navLog.log('STEP_ADVANCED', { fromStep, toStep, reason });
    },

    routeSaved: (routeId: string, reason: string) => {
        navLog.log('ROUTE_SAVED', { routeId, reason });
    },

    navigationStarted: (destination: string, totalDistance: number) => {
        navLog.log('NAVIGATION_STARTED', { destination, totalDistance });
    },

    navigationEnded: (reason: string, completed: boolean) => {
        navLog.log('NAVIGATION_ENDED', { reason, completed });
    },

    appStateChange: (state: string) => {
        navLog.log('APP_STATE_CHANGE', { state });
    },

    error: (context: string, message: string) => {
        navLog.log('ERROR', { context, message });
    },
};