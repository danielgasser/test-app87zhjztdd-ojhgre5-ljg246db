import { notify } from "./notificationService";
import i18n from '@/i18n';

export const passwordChecker = (password: string | null | undefined): boolean => {
    const t = i18n.t.bind(i18n);

    if (!password || password.trim().length === 0) {
        notify.error(t('common.please_enter_a_password'));
        return false;
    }

    if (password.length < 8) {
        notify.error(t('common.new_password_must_be_at_least_8'));
        return false;
    }
    // Check for uppercase, lowercase, digit, and special character
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasDigit || !hasSpecialChar) {
        notify.error(
            "Password must contain uppercase, lowercase, number, and special character"
        );
        return false;
    }
    return true;
};