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

// DO NOT EXPORT THESE ANYMORE (they cause infinite loops):
// export { DeepLinkManager, type DeepLinkIntent } from './DeepLinkManager'; // ❌ DELETED
// export { RouteManager, type AppRoute, type RoutingContext } from './RouteManager'; // ❌ DELETED  
// export { RouterOrchestrator } from './RouterOrchestrator'; // ❌ DELETED