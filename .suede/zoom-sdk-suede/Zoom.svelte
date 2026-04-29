<script lang="ts" module>
  import type { Props as WrapperProps } from "./index.modified";
  import type { ConnectionChangePayload, VideoClient } from "@zoom/videosdk";

  export type ZoomClient = typeof VideoClient;

  export type Controls = Partial<{
    microphone: boolean;
    video: boolean;
    recording: boolean;
    screenShare: boolean;
    liveTranscription: boolean;
    liveBroadcast: boolean;
  }>;

  type Elements = {
    buttons: { color?: string; activeColor?: string };
    viewport: { color?: string };
  };

  export type Props = Omit<WrapperProps, "zoomClient" | "active"> & {
    controls?: Controls;
    onLeave?: () => void;
  } & Partial<Elements>;

  /**
   * Identify the element corresponding to ./feature/video/components/video-footer.tsx
   * @param element
   */
  const findVideoFooter = async (element: Element) => {
    let footer: Element | null | undefined = null;
    while (!footer) {
      footer = element.closest("div")?.querySelector(".video-footer");
      await new Promise((r) => setTimeout(r, 100));
    }
    return footer;
  };

  /**
   * NOTE: <span> tags have been added to ./feature/video/components/video-footer.tsx
   * to wrap all "toolbox" buttons.
   * This function maps their given `id`s to the respective control type.
   */
  const identifyController = ({
    classList,
    id,
  }: Element): keyof Controls | undefined => {
    if (!classList.contains("zoom-footer-control")) return undefined;
    if (id === "microphone-button") return "microphone";
    else if (id === "camera-button") return "video";
    else if (id === "transcription-button") return "liveTranscription";
    else if (id === "live-broadcast-button") return "liveBroadcast";
    else if (id === "screen-share-button") return "screenShare";
    else if (id.startsWith("recording-button")) return "recording";
    else if (id === "leave-button") return undefined; // Leave button always available, and thus can't be controlled
    throw new Error(`Unknown toolbar child with id: ${id}`);
  };

  const createControlsMapping = (footer: Element) => {
    const mapping: Partial<Record<keyof Controls, Element | Element[]>> = {};
    Array.from(footer.children).forEach((child) => {
      const type = identifyController(child);
      if (type) {
        if (mapping[type]) {
          Array.isArray(mapping[type])
            ? mapping[type].push(child)
            : (mapping[type] = [mapping[type] as Element, child]);
        } else mapping[type] = child;
      }
    });
    return mapping;
  };

  const supportControl = ({ classList }: Element, condition: boolean) =>
    condition ? classList.add("supported") : classList.remove("supported");

  const supportControls = (childs: Element | Element[], condition: boolean) =>
    Array.isArray(childs)
      ? childs.forEach((child) => supportControl(child, condition))
      : supportControl(childs, condition);

  const conditionallySupportControl = (child: Element, controls?: Controls) => {
    const type = identifyController(child);
    if (!type) return;
    if (!controls || controls[type]) supportControl(child, true);
    else supportControl(child, false);
  };

  const controlAddedToFooterEffect = (footer: Element, controls?: Controls) => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations)
        if (mutation.type === "childList")
          Array.from(mutation.addedNodes)
            .filter((node) => node instanceof Element)
            .forEach((element) =>
              conditionallySupportControl(element, controls)
            );
    });
    observer.observe(footer, { childList: true });
    return () => observer.disconnect();
  };
</script>

<script lang="ts">
  import { sveltify } from "svelte-preprocess-react";
  import { Wrapper } from "./index.modified";
  import ZoomVideo from "@zoom/videosdk";
  import { flushSync, onDestroy } from "svelte";

  let { controls, buttons, viewport, onLeave, ...props }: Props = $props();

  const client = ZoomVideo.createClient();

  let container = $state<Element | null>(null);
  let videoFooter = $state<Element | null>(null);
  let left = $state(false);

  $effect(() => {
    if (!videoFooter) return;
    const mapping = createControlsMapping(videoFooter);
    // Apply initial controls state (all supported if controls is undefined)
    Object.values(mapping).forEach((element) =>
      supportControls(element, controls === undefined)
    );
    for (const key in controls) {
      const control = key as keyof Controls;
      const elements = mapping?.[control];
      if (elements) supportControls(elements, controls?.[control] ?? true);
    }
    return controlAddedToFooterEffect(videoFooter!, controls);
  });

  const dispose = () => {
    client.init = (...args) =>
      Promise.reject({
        code: -1,
        type: "INVALID_OPERATION",
        message:
          "(Custom) Client has been disposed, should not be re-inited. Instead render a new Zoom component.",
      });
    ZoomVideo.destroyClient().catch((e) => {
      console.error("Error destroying ZoomVideo client:", e);
    });
  };

  const onConnectionChange = async (payload: ConnectionChangePayload) => {
    switch (payload.state) {
      case "Closed":
        flushSync(() => (left = true));
        onLeave?.();
        dispose();
        break;
      case "Connected":
        videoFooter = await findVideoFooter(container!);
        break;
    }
  };

  $effect(() => {
    client?.on("connection-change", onConnectionChange);
    return () => client?.off("connection-change", onConnectionChange);
  });

  const react = sveltify({ Wrapper }); // Optional step, but adds type-safety

  const videoSupported = $derived(controls ? Boolean(controls.video) : true);

  onDestroy(dispose);
</script>

{#if !left}
  <div
    bind:this={container}
    style:width="100%"
    style:height="100%"
    class:no-video={!videoSupported}
    class:style-viewport={viewport?.color}
    style:--viewport-color={viewport?.color}
    class:style-buttons={buttons?.color}
    style:--buttons-color={buttons?.color}
    class:style-buttons-active={buttons?.activeColor}
    style:--buttons-active-color={buttons?.activeColor}
  >
    <react.Wrapper {...props} zoomClient={client} active={!left} />
  </div>
{/if}

<style>
  div :global(.App) {
    position: relative;
    overflow: hidden;
    width: 100% !important;
    height: 100% !important;
  }

  div :global(.viewport) {
    width: 100% !important;
    height: 100% !important;
    overflow: hidden;
  }

  div :global(.loading-layer) {
    position: absolute !important;
    top: auto !important;
    left: auto !important;
    bottom: auto !important;
    right: auto !important;
    width: 100% !important;
    height: 100% !important;
  }

  div :global(.video-footer > .zoom-footer-control) {
    transition: opacity 0.5s;
  }

  div :global(.video-footer > .zoom-footer-control:not(.supported)) {
    display: none !important;
    opacity: 0 !important;
  }

  div :global(.video-footer > .zoom-footer-control.supported),
  div :global(.video-footer > .zoom-footer-control#leave-button) {
    display: inline-flex !important;
    opacity: 1 !important;
  }

  .no-video :global(.avatar),
  .no-video :global(.avatar *),
  .no-video :global(video-player),
  .no-video :global(video-player-container),
  .no-video :global(.unified-self-view) {
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    display: none !important;
    pointer-events: none !important;
  }

  .style-viewport :global(.viewport) {
    background-color: var(--viewport-color) !important;
  }

  /** Style buttons when not hovered / active (i.e., default color) */
  .style-buttons :global(.zoom-footer-control:not(:hover) .vc-button),
  .style-buttons :global(.zoom-footer-control:not(:hover) .ant-btn),
  .style-buttons :global(.zoom-footer-control:not(:hover) .vc-dropdown-button),
  .style-buttons :global(.zoom-footer-control:not(:hover) .vc-button path),
  .style-buttons :global(.zoom-footer-control:not(:hover) .vc-button rect) {
    color: var(--buttons-color) !important;
    border-color: var(--buttons-color) !important;
    fill: var(--buttons-color) !important;
  }

  .style-buttons :global(.zoom-footer-control:hover .vc-button),
  .style-buttons :global(.zoom-footer-control:hover .ant-btn),
  .style-buttons :global(.zoom-footer-control:hover .vc-dropdown-button),
  .style-buttons :global(.zoom-footer-control:hover .vc-button path),
  .style-buttons :global(.zoom-footer-control:hover .vc-button rect) {
    color: var(--buttons-active-color) !important;
    border-color: var(--buttons-active-color) !important;
    fill: var(--buttons-active-color) !important;
  }

  .style-buttons
    :global(.zoom-footer-control:hover .vc-dropdown-button .ant-btn) {
    color: var(--buttons-color) !important;
  }

  .style-buttons
    :global(.zoom-footer-control:hover .vc-dropdown-button .ant-btn:hover) {
    color: var(--buttons-active-color) !important;
  }
</style>
