"use strict";
(() => {
  // src/lib/audio/worklet/pitch-processor.ts
  var PitchCaptureProcessor = class extends AudioWorkletProcessor {
    constructor(options) {
      super();
      this.writeIndex = 0;
      this.bufferSize = options.processorOptions?.bufferSize ?? 2048;
      this.buffer = new Float32Array(this.bufferSize);
    }
    process(inputs) {
      const input = inputs[0];
      const channel = input?.[0];
      if (!channel) return true;
      for (let i = 0; i < channel.length; i++) {
        this.buffer[this.writeIndex++] = channel[i];
        if (this.writeIndex >= this.bufferSize) {
          const frame = this.buffer.slice(0);
          this.port.postMessage({ type: "frame", buffer: frame }, [frame.buffer]);
          this.writeIndex = 0;
        }
      }
      return true;
    }
  };
  registerProcessor("pitch-capture-processor", PitchCaptureProcessor);
})();
