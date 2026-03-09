import {
    cancelTrialReminders,
    cancelAllTrialReminders,
    scheduleTrialReminders,
} from '../trialNotificationService';
import { APP_CONFIG } from '@/config/appConfig';

// ─── Mock expo-notifications ──────────────────────────────────────────────────

const mockGetAllScheduled = jest.fn();
const mockCancelScheduled = jest.fn();
const mockScheduleNotification = jest.fn();

jest.mock('expo-notifications', () => ({
    getAllScheduledNotificationsAsync: () => mockGetAllScheduled(),
    cancelScheduledNotificationAsync: (id: string) => mockCancelScheduled(id),
    scheduleNotificationAsync: (req: unknown) => mockScheduleNotification(req),
    SchedulableTriggerInputTypes: { DATE: 'date' },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNotif(identifier: string) {
    return { identifier };
}

function futureIso(hoursFromNow: number) {
    return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

const REMINDER_HOURS = APP_CONFIG.PREMIUM.TRIAL_REMINDER_HOURS_BEFORE_EXPIRY; // [12, 6, 2]

beforeEach(() => {
    jest.clearAllMocks();
    mockCancelScheduled.mockResolvedValue(undefined);
    mockScheduleNotification.mockResolvedValue(undefined);
});

// ─── cancelTrialReminders ─────────────────────────────────────────────────────

describe('cancelTrialReminders', () => {
    it('cancels all notifications for the given feature', async () => {
        mockGetAllScheduled.mockResolvedValue([
            makeNotif('trial_reminder__advancedFilters__6h'),
            makeNotif('trial_reminder__advancedFilters__12h'),
            makeNotif('trial_reminder__routeHistory__6h'),
        ]);

        await cancelTrialReminders('advancedFilters');

        expect(mockCancelScheduled).toHaveBeenCalledTimes(2);
        expect(mockCancelScheduled).toHaveBeenCalledWith('trial_reminder__advancedFilters__6h');
        expect(mockCancelScheduled).toHaveBeenCalledWith('trial_reminder__advancedFilters__12h');
    });

    it('does not cancel notifications for other features', async () => {
        mockGetAllScheduled.mockResolvedValue([
            makeNotif('trial_reminder__routeHistory__6h'),
        ]);

        await cancelTrialReminders('advancedFilters');

        expect(mockCancelScheduled).not.toHaveBeenCalled();
    });

    it('does nothing when no notifications are scheduled', async () => {
        mockGetAllScheduled.mockResolvedValue([]);
        await cancelTrialReminders('advancedFilters');
        expect(mockCancelScheduled).not.toHaveBeenCalled();
    });

    it('does not match partial feature name prefixes', async () => {
        // "advancedFilters" must not match "advancedFiltersExtra"
        mockGetAllScheduled.mockResolvedValue([
            makeNotif('trial_reminder__advancedFiltersExtra__6h'),
        ]);

        await cancelTrialReminders('advancedFilters');

        expect(mockCancelScheduled).not.toHaveBeenCalled();
    });

    it('handles errors without throwing', async () => {
        mockGetAllScheduled.mockRejectedValue(new Error('notification error'));
        await expect(cancelTrialReminders('advancedFilters')).resolves.toBeUndefined();
    });
});

// ─── cancelAllTrialReminders ──────────────────────────────────────────────────

describe('cancelAllTrialReminders', () => {
    it('cancels all trial_reminder notifications regardless of feature', async () => {
        mockGetAllScheduled.mockResolvedValue([
            makeNotif('trial_reminder__advancedFilters__6h'),
            makeNotif('trial_reminder__routeHistory__12h'),
            makeNotif('trial_reminder__saveLocations__2h'),
            makeNotif('other_notification__something'),
        ]);

        await cancelAllTrialReminders();

        expect(mockCancelScheduled).toHaveBeenCalledTimes(3);
        expect(mockCancelScheduled).not.toHaveBeenCalledWith('other_notification__something');
    });

    it('does nothing when no trial notifications are scheduled', async () => {
        mockGetAllScheduled.mockResolvedValue([
            makeNotif('other_notification__something'),
        ]);

        await cancelAllTrialReminders();

        expect(mockCancelScheduled).not.toHaveBeenCalled();
    });

    it('handles empty notification list', async () => {
        mockGetAllScheduled.mockResolvedValue([]);
        await cancelAllTrialReminders();
        expect(mockCancelScheduled).not.toHaveBeenCalled();
    });

    it('handles errors without throwing', async () => {
        mockGetAllScheduled.mockRejectedValue(new Error('notification error'));
        await expect(cancelAllTrialReminders()).resolves.toBeUndefined();
    });
});

// ─── scheduleTrialReminders ───────────────────────────────────────────────────

describe('scheduleTrialReminders', () => {
    it('schedules one notification per reminder window', async () => {
        mockGetAllScheduled.mockResolvedValue([]);
        const expiresAt = futureIso(24); // expires 24h from now

        await scheduleTrialReminders('advancedFilters', expiresAt);

        // All 3 windows (12h, 6h, 2h) are in the future relative to a 24h expiry
        expect(mockScheduleNotification).toHaveBeenCalledTimes(REMINDER_HOURS.length);
    });

    it('uses correct identifier format: trial_reminder__feature__Xh', async () => {
        mockGetAllScheduled.mockResolvedValue([]);
        const expiresAt = futureIso(24);

        await scheduleTrialReminders('advancedFilters', expiresAt);

        const identifiers = mockScheduleNotification.mock.calls.map(
            (call) => call[0].identifier,
        );
        expect(identifiers).toContain('trial_reminder__advancedFilters__12h');
        expect(identifiers).toContain('trial_reminder__advancedFilters__6h');
        expect(identifiers).toContain('trial_reminder__advancedFilters__2h');
    });

    it('skips reminder windows already in the past', async () => {
        mockGetAllScheduled.mockResolvedValue([]);
        // Expires in 4h — the 12h and 6h windows are already past, only 2h fires
        const expiresAt = futureIso(4);

        await scheduleTrialReminders('advancedFilters', expiresAt);

        expect(mockScheduleNotification).toHaveBeenCalledTimes(1);
        expect(mockScheduleNotification.mock.calls[0][0].identifier).toBe(
            'trial_reminder__advancedFilters__2h',
        );
    });

    it('skips all reminders when trial expires immediately', async () => {
        mockGetAllScheduled.mockResolvedValue([]);
        const expiresAt = futureIso(1); // expires in 1h — all windows (12, 6, 2) are past

        await scheduleTrialReminders('advancedFilters', expiresAt);

        expect(mockScheduleNotification).not.toHaveBeenCalled();
    });

    it('sets trigger type to DATE', async () => {
        mockGetAllScheduled.mockResolvedValue([]);
        await scheduleTrialReminders('advancedFilters', futureIso(24));

        const call = mockScheduleNotification.mock.calls[0][0];
        expect(call.trigger.type).toBe('date');
        expect(call.trigger.date).toBeInstanceOf(Date);
    });

    it('includes feature and deepLink in notification data', async () => {
        mockGetAllScheduled.mockResolvedValue([]);
        await scheduleTrialReminders('advancedFilters', futureIso(24));

        const call = mockScheduleNotification.mock.calls[0][0];
        expect(call.content.data.type).toBe('trial_expiry');
        expect(call.content.data.features).toContain('advancedFilters');
        expect(call.content.data.deepLink).toBeDefined();
    });

    it('groups with existing notification at the same window', async () => {
        // routeHistory already has a 6h reminder scheduled
        mockGetAllScheduled.mockResolvedValue([
            makeNotif('trial_reminder__routeHistory__6h'),
        ]);
        const expiresAt = futureIso(24);

        await scheduleTrialReminders('advancedFilters', expiresAt);

        // The existing routeHistory 6h notif must be cancelled before rescheduling
        expect(mockCancelScheduled).toHaveBeenCalledWith('trial_reminder__routeHistory__6h');
    });

    it('grouped notification body mentions multiple features', async () => {
        mockGetAllScheduled.mockResolvedValue([
            makeNotif('trial_reminder__routeHistory__6h'),
        ]);
        const expiresAt = futureIso(24);

        await scheduleTrialReminders('advancedFilters', expiresAt);

        const grouped6hCall = mockScheduleNotification.mock.calls.find(
            (call) => call[0].identifier === 'trial_reminder__advancedFilters__6h',
        );
        expect(grouped6hCall).toBeDefined();
        expect(grouped6hCall![0].content.data.features).toHaveLength(2);
    });

    it('single-feature notification uses singular title', async () => {
        mockGetAllScheduled.mockResolvedValue([]);
        await scheduleTrialReminders('advancedFilters', futureIso(24));

        const call = mockScheduleNotification.mock.calls[0][0];
        expect(call.content.title).toContain('Trial expiring in');
    });

    it('handles errors without throwing', async () => {
        mockGetAllScheduled.mockRejectedValue(new Error('notification error'));
        await expect(
            scheduleTrialReminders('advancedFilters', futureIso(24)),
        ).resolves.toBeUndefined();
    });
});