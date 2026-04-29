import {
  type HTMLAttributes,
  type DetailedHTMLProps,
  type DOMAttributes,
  useEffect,
  useContext,
  useState,
  useCallback,
  useReducer,
  useMemo,
  useRef,
} from "react";
import ZoomVideo, {
  type VideoPlayerContainer,
  type VideoPlayer,
  ConnectionState,
  ReconnectReason,
  type MediaSDKEncDecPayload,
} from "@zoom/videosdk";
import { message, Modal } from "antd";
import "antd/dist/antd.min.css";
import produce from "immer";
import Video from "./feature/video/video";
import VideoSingle from "./feature/video/video-single";
import VideoAttach from "./feature/video/video-attach";
import ZoomContext from "./context/zoom-context";
import ZoomMediaContext from "./context/media-context";
import LoadingLayer from "./component/loading-layer";
import type { MediaStream, ZoomClient } from "./index-types";

type CustomElement<T> = Partial<T & DOMAttributes<T> & { children: any }>;

export interface AppProps {
  meetingArgs: {
    topic: string;
    signature: string;
    name: string;
    password?: string;
    webEndpoint?: string;
    enforceGalleryView?: string;
    enforceVB?: string;
    customerJoinId?: string;
    lang?: string;
    useVideoPlayer?: string;
  };
}
const mediaShape = {
  audio: {
    encode: false,
    decode: false,
  },
  video: {
    encode: false,
    decode: false,
  },
  share: {
    encode: false,
    decode: false,
  },
};

type MediaShape = typeof mediaShape;
type MediaKey = keyof MediaShape;
type MediaSettings = MediaShape[MediaKey];
type MediaSettingType = keyof MediaSettings;
type WithType<Type extends string, T = {}> = T & { type: Type };

type MediaAction =
  | WithType<
      `${MediaKey}-${MediaSettingType}`,
      { payload: MediaSettings[MediaSettingType] }
    >
  | WithType<"reset-media">;

const mediaReducer = produce((draft, action: MediaAction) => {
  switch (action.type) {
    case "audio-encode": {
      draft.audio.encode = action.payload;
      break;
    }
    case "audio-decode": {
      draft.audio.decode = action.payload;
      break;
    }
    case "video-encode": {
      draft.video.encode = action.payload;
      break;
    }
    case "video-decode": {
      draft.video.decode = action.payload;
      break;
    }
    case "share-encode": {
      draft.share.encode = action.payload;
      break;
    }
    case "share-decode": {
      draft.share.decode = action.payload;
      break;
    }
    case "reset-media": {
      Object.assign(draft, { ...mediaShape });
      break;
    }
    default:
      break;
  }
}, mediaShape);

declare global {
  interface Window {
    webEndpoint: string | undefined;
    zmClient: ZoomClient | undefined;
    mediaStream: MediaStream | undefined;
    crossOriginIsolated: boolean;
    ltClient: any | undefined;
    logClient: any | undefined;
  }
  namespace JSX {
    interface IntrinsicElements {
      ["video-player"]: DetailedHTMLProps<
        HTMLAttributes<VideoPlayer>,
        VideoPlayer
      > & { class?: string };
      ["video-player-container"]: CustomElement<VideoPlayerContainer> & {
        class?: string;
      };
    }
  }
}

function App(props: AppProps) {
  const {
    meetingArgs: {
      topic,
      signature,
      name,
      password,
      webEndpoint: webEndpointArg,
      enforceGalleryView,
      enforceVB,
      customerJoinId,
      lang,
    },
  } = props;
  const [loading, setIsLoading] = useState(true);
  const [loadingText, setLoadingText] = useState("");
  const [isFailover, setIsFailover] = useState<boolean>(false);
  const [status, setStatus] = useState<string>("closed");
  const [mediaState, dispatch] = useReducer(mediaReducer, mediaShape);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [isSupportGalleryView, setIsSupportGalleryView] =
    useState<boolean>(false);
  const zmClient = useContext(ZoomContext);
  const hasInitialized = useRef(false);
  let webEndpoint: any;
  if (webEndpointArg) {
    webEndpoint = webEndpointArg;
  } else {
    webEndpoint = window?.webEndpoint ?? "zoom.us";
  }
  const mediaContext = useMemo(
    () => ({ ...mediaState, mediaStream }),
    [mediaState, mediaStream]
  );
  const galleryViewWithoutSAB =
    Number(enforceGalleryView) === 1 && !window.crossOriginIsolated;
  const vbWithoutSAB = Number(enforceVB) === 1 && !window.crossOriginIsolated;
  const galleryViewWithAttach = true;

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }
    const init = async () => {
      await zmClient.init("en-US", `${window.location.origin}/lib`, {
        webEndpoint,
        enforceMultipleVideos: galleryViewWithoutSAB,
        enforceVirtualBackground: vbWithoutSAB,
        stayAwake: true,
        patchJsMedia: true,
        leaveOnPageUnload: true,
      });
      try {
        setLoadingText("Joining the session...");
        await zmClient.join(topic, signature, name, password).catch((e) => {
          console.error(e);
        });
        const stream = zmClient.getMediaStream();
        setMediaStream(stream);
        setIsSupportGalleryView(stream.isSupportMultipleVideos());
        setIsLoading(false);
      } catch (e: any) {
        setIsLoading(false);
        message.error(e.reason);
      }
      hasInitialized.current = true;
    };
    init();
    return () => {
      if (hasInitialized.current && zmClient.getSessionInfo()?.isInMeeting) {
        ZoomVideo.destroyClient();
        hasInitialized.current = false;
      }
    };
  }, [
    signature,
    zmClient,
    topic,
    name,
    password,
    webEndpoint,
    galleryViewWithoutSAB,
    customerJoinId,
    lang,
    vbWithoutSAB,
  ]);

  const onConnectionChange = useCallback(
    (payload: any) => {
      if (payload.state === ConnectionState.Reconnecting) {
        setIsLoading(true);
        setIsFailover(true);
        setStatus("connecting");
        const { reason, subsessionName } = payload;
        if (reason === ReconnectReason.Failover) {
          setLoadingText("Session Disconnected,Try to reconnect");
        } else if (
          reason === ReconnectReason.JoinSubsession ||
          reason === ReconnectReason.MoveToSubsession
        ) {
          setLoadingText(`Joining ${subsessionName}...`);
        } else if (reason === ReconnectReason.BackToMainSession) {
          setLoadingText("Returning to Main Session...");
        }
      } else if (payload.state === ConnectionState.Connected) {
        setStatus("connected");
        if (isFailover) {
          setIsLoading(false);
        }
        window.zmClient = zmClient;
        window.mediaStream = zmClient.getMediaStream();

        console.log("getSessionInfo", zmClient.getSessionInfo());
      } else if (
        payload.state === ConnectionState.Closed ||
        payload.state === ConnectionState.Fail
      ) {
        setStatus("closed");
        dispatch({ type: "reset-media" });
        if (payload.state === ConnectionState.Fail) {
          Modal.error({
            title: "Join meeting failed",
            content: `Join meeting failed. reason:${payload.reason ?? ""}`,
          });
        }
        if (payload.reason === "ended by host") {
          Modal.warning({
            title: "Meeting ended",
            content: "This meeting has been ended by host",
          });
        }
      }
    },
    [isFailover, zmClient]
  );
  const onMediaSDKChange = useCallback((payload: MediaSDKEncDecPayload) => {
    const { action, type, result } = payload;
    dispatch({ type: `${type}-${action}`, payload: result === "success" });
  }, []);

  useEffect(() => {
    zmClient.on("connection-change", onConnectionChange);
    zmClient.on("media-sdk-change", onMediaSDKChange);
    return () => {
      zmClient.off("connection-change", onConnectionChange);
      zmClient.off("media-sdk-change", onMediaSDKChange);
    };
  }, [zmClient, onConnectionChange, onMediaSDKChange]);
  return (
    <div className="App">
      {loading && <LoadingLayer content={loadingText} />}
      {!loading && (
        <ZoomMediaContext.Provider value={mediaContext}>
          {isSupportGalleryView ? (
            galleryViewWithAttach ? (
              <VideoAttach />
            ) : (
              <Video />
            )
          ) : (
            <VideoSingle />
          )}
        </ZoomMediaContext.Provider>
      )}
    </div>
  );
}

export default App;
