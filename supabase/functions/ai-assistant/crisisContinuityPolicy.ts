const CRISIS_WINDOW_MS = 72 * 60 * 60 * 1000;

export function crisisReadFailureDisposition(
  action: string,
  hasChatMessage: boolean,
  currentMessageHasCrisisSignal = false,
): 'proceed_crisis' | 'safe_chat_fallback' | 'block_action' {
  if (action !== 'chat' || !hasChatMessage) return 'block_action';
  // A message that itself signals danger must never be paused behind a
  // continuity read failure: classify and respond without the stored state.
  return currentMessageHasCrisisSignal ? 'proceed_crisis' : 'safe_chat_fallback';
}

export function showSafetyPanelForActiveTier(): true {
  return true;
}

export function crisisContinuityUnavailablePayload(now = Date.now()) {
  return {
    reply:
      "I can't safely verify whether we were already in a safety conversation, so I'm pausing ordinary Luna chat instead of guessing. The support options below stay available while you try again in a moment.",
    model: 'trackher-companion-script',
    shape: 'crisis_continuity_unavailable',
    crisis: {
      tier: 'crisis',
      responseCount: 1,
      showSafetyPanel: showSafetyPanelForActiveTier(),
      expiresAt: new Date(now + CRISIS_WINDOW_MS).toISOString(),
    },
  } as const;
}
