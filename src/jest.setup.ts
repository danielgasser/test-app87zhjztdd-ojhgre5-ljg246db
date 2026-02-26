process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';

jest.mock('@sentry/react-native', () => ({
    init: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    addBreadcrumb: jest.fn(),
    setUser: jest.fn(),
    setTag: jest.fn(),
    setExtra: jest.fn(),
    withScope: jest.fn(),
    wrap: jest.fn((component) => component),
    ReactNativeTracing: jest.fn(),
    ReactNavigationInstrumentation: jest.fn(),
}));