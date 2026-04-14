/// <reference types="vite/client" />

export {}

declare global {
  interface Window {
    /** Drag payload from Studio catalog rows into the DAW drop zone */
    __studioTrack?: import('./lib/types').Track
  }
}
