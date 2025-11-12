// src/providers/index.ts - FINAL VERSION THAT ACTUALLY WORKS
export {
    AuthProvider,
    useAuth,
    useIsSignedIn,
    useIsSignedOut
} from './AuthProvider';

export {
    DeepLinkProvider,
    useDeepLink
} from './DeepLinkQueue';

// Keep NavigationManager - it has real business logic for unfinished routes
export { useNavigationManager } from "./NavigationManager";
