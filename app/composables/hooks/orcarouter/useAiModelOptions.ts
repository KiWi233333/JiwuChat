/**
 * Bridge between the OrcaRouter provider and the app's AI entry points.
 *
 * The chat client resolves AI answering through a server-provided robot list.
 * When OrcaRouter is the selected provider, the model choices for an entry
 * point must come from the OrcaRouter catalog filtered for that entry point's
 * capability and uploaded modalities — not from the robot list, and never from
 * free text.
 *
 * Entry points that OrcaRouter cannot serve keep their existing behaviour; this
 * module only adds options, it never removes another provider's.
 */

import type { OrcaCapability, OrcaInputModality } from "./core/catalog";
import type { AskAiRobotOption } from "~/composables/hooks/msg/useMsgForm";

export interface OrcaModelOption {
  label: string;
  value: string;
  /** Model id in vendor/model namespace, exactly as the catalog publishes it. */
  modelId: string;
  provider: "orcarouter";
  contextLength: number | null;
  inputModalities: OrcaInputModality[];
}

/**
 * Capability for each AI entry point in this repository, and the non-text
 * modalities it actually uploads. Entry points absent from this table are not
 * served by OrcaRouter and keep their current provider.
 */
export const ORCA_ENTRY_POINTS = {
  /** Text chat / agent answering in a group conversation. */
  chat: { capability: "chat" as OrcaCapability, modalities: ["text"] as OrcaInputModality[] },
  /** The same conversation once an image attachment is present. */
  chatWithImage: { capability: "chat" as OrcaCapability, modalities: ["text", "image"] as OrcaInputModality[] },
  /** The same conversation once a voice attachment is present. */
  chatWithAudio: { capability: "chat" as OrcaCapability, modalities: ["text", "audio"] as OrcaInputModality[] },
} as const;

export type OrcaEntryPoint = keyof typeof ORCA_ENTRY_POINTS;

/**
 * Derive the entry point from the message being composed. Attachments change
 * the requirement, which changes the filtered option list.
 */
export function entryPointFor(
  attachments: Array<{ type?: string }> = [],
): OrcaEntryPoint {
  const hasImage = attachments.some(a => a.type === "image");
  if (hasImage) {
    return "chatWithImage";
  }
  const hasAudio = attachments.some(a => a.type === "audio" || a.type === "voice");
  if (hasAudio) {
    return "chatWithAudio";
  }
  return "chat";
}

/**
 * Model options for an entry point, derived from the filtered catalog.
 * Returns an empty array when OrcaRouter is not the active provider.
 */
export function orcaOptionsForEntryPoint(
  options: ReturnType<typeof useOrcaRouter>["optionsFor"],
  entryPoint: OrcaEntryPoint,
): OrcaModelOption[] {
  const { capability, modalities } = ORCA_ENTRY_POINTS[entryPoint];
  return options(capability, modalities).map(model => ({
    label: model.name,
    value: model.id,
    modelId: model.id,
    provider: "orcarouter" as const,
    contextLength: model.contextLength,
    inputModalities: model.inputModalities,
  }));
}

/**
 * Merge OrcaRouter options into an existing robot list without disturbing it.
 * `AskAiRobotOption` carries no model id, so OrcaRouter entries are appended as
 * their own selectable rows.
 */
export function mergeAiOptions(
  existing: AskAiRobotOption[],
  orcaOptions: OrcaModelOption[],
): AskAiRobotOption[] {
  if (orcaOptions.length === 0) {
    return existing;
  }
  const extra = orcaOptions.map(option => ({
    label: option.label,
    value: option.value,
    // Namespaced so an OrcaRouter model can never collide with a robot user id.
    userId: `orcarouter:${option.modelId}`,
    avatar: "",
    username: "orcarouter",
    nickName: option.label,
    aiRobotInfo: undefined,
  })) as AskAiRobotOption[];

  return [...existing, ...extra];
}
