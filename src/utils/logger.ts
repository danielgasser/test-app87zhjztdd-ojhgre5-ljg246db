import Bugsnag from "@bugsnag/expo";

export const logger = {
    error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
        if (__DEV__) {
            console.error(message, error ?? '', context ? JSON.stringify(context) : '');
        }

        if (error instanceof Error) {
            Bugsnag.notify(error, (event) => {
                event.severity = 'error';
                if (context) event.addMetadata('context', context);
            });
        } else {
            Bugsnag.notify(new Error(message), (event) => {
                event.severity = 'error';
                if (context) event.addMetadata('context', context);
            });
        }
    },

    warn: (message: string, context?: Record<string, any>) => {
        if (__DEV__) {
            console.warn(message, context);
        }

        Bugsnag.notify(new Error(message), (event) => {
            event.severity = 'warning';
            if (context) event.addMetadata('context', context);
        });
    },

    info: (message: string, context?: Record<string, any>) => {
        if (__DEV__) {
            console.log(message, context);
        }
    },
};