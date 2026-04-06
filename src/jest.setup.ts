process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://mock.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'mock-anon-key';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY = 'test-key';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS = 'test-key';
process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_ANDROID = 'test-key';

jest.mock('@bugsnag/expo', () => ({
    start: jest.fn(),
    notify: jest.fn(),
    leaveBreadcrumb: jest.fn(),
    setUser: jest.fn(),
    addMetadata: jest.fn(),
    clearMetadata: jest.fn(),
}));

jest.mock('@2toad/profanity', () => ({
    Profanity: jest.fn().mockImplementation(() => ({
        exists: jest.fn().mockReturnValue(false),
    })),
    ProfanityOptions: jest.fn().mockImplementation(() => ({
        wholeWord: false,
    })),
}));