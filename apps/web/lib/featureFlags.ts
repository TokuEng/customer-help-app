/**
 * Feature flags for conditional feature enablement
 * 
 * All feature flags should be defined here for centralized management
 */

export const featureFlags = {
  /**
   * Enable the enhanced agent chat with LangGraph and HubSpot integration
   * 
   * When enabled:
   * - Shows "Still need help?" button in chat
   * - Allows escalation to HubSpot tickets
   * - Tracks agent interactions with LangSmith
   */
  helpCenterV2Agent: process.env.NEXT_PUBLIC_FEATURE_AGENT_V2_AGENT === 'true',
  
  /**
   * Enable debug mode for agent interactions
   * 
   * When enabled:
   * - Shows confidence scores
   * - Shows detected categories
   * - Shows processing steps
   */
  agentDebugMode: process.env.NEXT_PUBLIC_AGENT_DEBUG_MODE === 'true',
} as const

/**
 * Type-safe feature flag keys
 */
export type FeatureFlagKey = keyof typeof featureFlags

/**
 * Check if a feature is enabled
 * 
 * @param flag - The feature flag to check
 * @returns Whether the feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlagKey): boolean {
  return featureFlags[flag] ?? false
}

/**
 * Get all enabled features
 * 
 * @returns Array of enabled feature flag keys
 */
export function getEnabledFeatures(): FeatureFlagKey[] {
  return (Object.keys(featureFlags) as FeatureFlagKey[])
    .filter(key => featureFlags[key])
}

/**
 * Log feature flag status (for debugging)
 */
export function logFeatureFlags(): void {
  if (typeof window !== 'undefined') {
    console.log('Feature Flags:', {
      ...featureFlags,
      enabledCount: getEnabledFeatures().length,
      enabled: getEnabledFeatures(),
    })
  }
}
