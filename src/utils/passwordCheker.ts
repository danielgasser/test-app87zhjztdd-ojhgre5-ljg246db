import { notify } from "./notificationService";

export const passwordChecker = (password: string | null | undefined): boolean => {
    if (!password || password.trim().length === 0) {
        notify.error("Please enter a password");
        return false;
    }

    if (password.length < 8) {
        notify.error("New password must be at least 8 characters");
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