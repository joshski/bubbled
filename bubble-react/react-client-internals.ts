import * as ReactNamespace from "react";
import type { Dispatch, SetStateAction } from "react";

export interface BubbleReactHookDispatcher {
  useState<TValue>(
    initialState: TValue | (() => TValue),
  ): [TValue, Dispatch<SetStateAction<TValue>>];
}

export interface BubbleReactClientInternals {
  H: BubbleReactHookDispatcher | Record<string, unknown> | null;
}

const UNSUPPORTED_REACT_INTERNALS_ERROR =
  "bubble-react could not access the React client hook dispatcher internals";

export function readReactClientInternals(
  reactNamespace: typeof ReactNamespace & {
    __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE?: BubbleReactClientInternals;
  } = ReactNamespace,
): BubbleReactClientInternals {
  const internals =
    reactNamespace.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE;

  if (internals === undefined) {
    throw new Error(UNSUPPORTED_REACT_INTERNALS_ERROR);
  }

  return internals;
}
