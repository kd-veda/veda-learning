/// <reference lib="webworker" />
/**
 * AudioWorkletProcessor that runs on the audio rendering thread, buffers
 * incoming microphone samples, and posts raw PCM frames back to the main
 * thread at a steady cadence for YIN analysis.
 *
 * Deliberately does NOT run YIN here: AudioWorkletProcessor.process() is
 * called on a real-time thread with a very small time budget (a 128-sample
 * quantum at 48kHz is ~2.7ms), and YIN's O(maxTau * bufferLength) difference
 * function is too heavy to guarantee inside that budget on lower-end
 * devices. Instead this processor's only job is to accumulate quanta into a
 * larger analysis-sized buffer (default 2048 samples, ~43ms @ 48kHz — long
 * enough to resolve chanting-voice fundamentals down to ~60Hz) and hand it
 * to the main thread, which runs detectPitchYin() (see ../pitchDetector.ts)
 * on requestAnimationFrame-paced callbacks instead.
 */

interface PitchProcessorOptions {
  bufferSize?: number;
}

class PitchCaptureProcessor extends AudioWorkletProcessor {
  private readonly bufferSize: number;
  private buffer: Float32Array;
  private writeIndex = 0;

  constructor(options: { processorOptions?: PitchProcessorOptions }) {
    super();
    this.bufferSize = options.processorOptions?.bufferSize ?? 2048;
    this.buffer = new Float32Array(this.bufferSize);
  }

  process(inputs: Float32Array[][]): boolean {
    const input = inputs[0];
    const channel = input?.[0];
    if (!channel) return true;

    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.writeIndex++] = channel[i];
      if (this.writeIndex >= this.bufferSize) {
        // Copy out (transferable) so the main thread owns this buffer and we
        // can safely start filling a fresh one immediately.
        const frame = this.buffer.slice(0);
        this.port.postMessage({ type: "frame", buffer: frame }, [frame.buffer]);
        this.writeIndex = 0;
      }
    }
    return true;
  }
}

registerProcessor("pitch-capture-processor", PitchCaptureProcessor);
