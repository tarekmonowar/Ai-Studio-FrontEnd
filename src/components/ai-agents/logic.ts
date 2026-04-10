/**
 * logic.ts — re-export barrel
 *
 * All logic has been split into focused files:
 *   - agentAction.types.ts  → AgentActionStatus, AgentActionLog
 *   - speechRecognition.types.ts → SpeechRecognitionLike and related types
 *   - styleHelpers.ts       → AgentStyleState, DEFAULT_STYLE, applyStyleUpdate, formatStyleState
 *   - messageHelpers.ts     → pushMessage, toAgentRequestMessages, resolveRouteFromPageName,
 *                             buildToolCallPreview, buildToolCallSignature
 *
 * This file re-exports everything so existing imports are not broken.
 */

export type { AgentActionLog, AgentActionStatus } from "./agentAction.types";

export type {
  SpeechRecognitionAlternative,
  SpeechRecognitionErrorEventLike,
  SpeechRecognitionEventLike,
  SpeechRecognitionLike,
  SpeechRecognitionResult,
  SpeechRecognitionResultList,
} from "./speechRecognition.types";

export {
  DEFAULT_STYLE,
  applyStyleUpdate,
  formatStyleState,
} from "./styleHelpers";
export type { AgentStyleState } from "./styleHelpers";

export {
  buildToolCallPreview,
  buildToolCallSignature,
  pushMessage,
  resolveRouteFromPageName,
  toAgentRequestMessages,
} from "./messageHelpers";
