import { createContext, useContext } from "react";

export interface PreviewState {
  contextText: string;
  annotationsText: string;
  evaluatorText: string;
  setContextText: (text: string) => void;
  setAnnotationsText: (text: string) => void;
  setEvaluatorText: (text: string) => void;
  resetPreview: () => void;
}

const defaultState: PreviewState = {
  contextText: "",
  annotationsText: "",
  evaluatorText: "",
  setContextText: () => {},
  setAnnotationsText: () => {},
  setEvaluatorText: () => {},
  resetPreview: () => {},
};

const PreviewStateContext = createContext<PreviewState>(defaultState);

export const PreviewStateProvider = PreviewStateContext.Provider;

export function usePreviewState(): PreviewState {
  return useContext(PreviewStateContext);
}
