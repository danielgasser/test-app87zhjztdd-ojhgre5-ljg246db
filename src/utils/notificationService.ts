import { SnackbarType } from '@/components/Snackbar';

// Event system for notifications
type NotificationListener = (notification: NotificationState) => void;
type ConfirmationListener = (confirmation: ConfirmationState) => void;

interface NotificationState {
    visible: boolean;
    message: string;
    type: SnackbarType;
    duration?: number;
    actionText?: string;
    onActionPress?: () => void;
    title?: string;
}

interface ConfirmationButton {
    text: string;
    onPress: () => void;
    style?: 'default' | 'destructive' | 'cancel';
}

interface ConfirmationState {
    visible: boolean;
    title: string;
    message: string;
    buttons: ConfirmationButton[];
    icon?: 'warning' | 'info' | 'question';
}

class NotificationService {
    private notificationListeners: NotificationListener[] = [];
    private confirmationListeners: ConfirmationListener[] = [];

    // Subscribe to notification events
    onNotification(listener: NotificationListener) {
        this.notificationListeners.push(listener);
        return () => {
            this.notificationListeners = this.notificationListeners.filter(
                (l) => l !== listener
            );
        };
    }

    // Subscribe to confirmation events
    onConfirmation(listener: ConfirmationListener) {
        this.confirmationListeners.push(listener);
        return () => {
            this.confirmationListeners = this.confirmationListeners.filter(
                (l) => l !== listener
            );
        };
    }

    // Show snackbar notification
    show(message: string, type: SnackbarType = 'info', duration?: number, title?: string) {
        const notification: NotificationState = {
            visible: true,
            message,
            type,
            duration,
            title,
        };
        this.notificationListeners.forEach((listener) => listener(notification));
    }

    // Show success snackbar
    success(message: string, title: string = 'Success', duration?: number) {
        this.show(message, 'success', duration);
    }

    // Show error snackbar
    warning(message: string, title: string = 'Warning', duration?: number) {
        this.show(message, 'warning', duration);
    }

    // Show error snackbar
    error(message: string, title: string = 'Error', duration?: number) {
        this.show(message, 'error', duration);
    }

    // Show info snackbar
    info(message: string, title?: string, duration?: number) {
        this.show(message, 'info', duration);
    }

    // Show snackbar with action button
    showWithAction(
        message: string,
        type: SnackbarType,
        actionText: string,
        onActionPress: () => void
    ) {
        const notification: NotificationState = {
            visible: true,
            message,
            type,
            duration: 0, // Don't auto-dismiss when there's an action
            actionText,
            onActionPress,
        };
        this.notificationListeners.forEach((listener) => listener(notification));
    }

    // Show confirmation bottom sheet (replaces Alert.alert)
    confirm(
        title: string,
        message: string,
        buttons: ConfirmationButton[],
        icon?: 'warning' | 'info' | 'question'
    ) {
        const confirmation: ConfirmationState = {
            visible: true,
            title,
            message,
            buttons,
            icon,
        };
        this.confirmationListeners.forEach((listener) => listener(confirmation));
    }
}

export const notify = new NotificationService();