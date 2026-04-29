/* eslint-disable no-restricted-globals */
import React from "react";
import type { VideoClient } from "@zoom/videosdk";
import App, { type AppProps } from "./App.modified";
import ZoomContext from "./context/zoom-context";

export type Props = AppProps & {
  zoomClient: typeof VideoClient;
  active: boolean;
};

export const Wrapper = ({ zoomClient, active, ...props }: Props) => {
  return (
    <React.StrictMode>
      <ZoomContext.Provider value={zoomClient}>
        {active && <App {...props} />}
      </ZoomContext.Provider>
    </React.StrictMode>
  );
};
