import * as Sentry from "@sentry/react-native";

export const logger = {
    error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
        // Log to console in development
        if (__DEV__) {
            console.error(message, error, context);
        }

        // Always send to Sentry
        if (context) {
            Sentry.setContext("error_context", context);
        }

        if (error instanceof Error) {
            Sentry.captureException(error);
        } else {
            Sentry.captureMessage(message, "error");
        }
    },

    warn: (message: string, context?: Record<string, any>) => {
        // Log to console in development
        if (__DEV__) {
            console.warn(message, context);
        }

        // Send to Sentry as warning
        if (context) {
            Sentry.setContext("warning_context", context);
        }
        Sentry.captureMessage(message, "warning");
    },

    info: (message: string, context?: Record<string, any>) => {
        // Only log to console, not Sentry (unless you want to)
        if (__DEV__) {
            console.log(message, context);
        }
    },
};