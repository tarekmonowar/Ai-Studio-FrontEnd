export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextPlayTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();

  public async init(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({ latencyHint: "interactive" });
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  public async enqueuePcm16(
    chunk: ArrayBuffer,
    sampleRate = 24000,
  ): Promise<void> {
    if (!this.audioContext) {
      await this.init();
    }

    if (!this.audioContext) return;

    const int16 = new Int16Array(chunk);
    if (!int16.length) return;

    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i += 1) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = this.audioContext.createBuffer(
      1,
      float32.length,
      sampleRate,
    );
    audioBuffer.copyToChannel(float32, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    this.nextPlayTime = Math.max(this.nextPlayTime, now + 0.01);
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
    };
  }

  public async stop(): Promise<void> {
    this.activeSources.forEach((source) => {
      try {
        source.stop(0);
      } catch {
        // already stopped
      }
    });
    this.activeSources.clear();

    if (this.audioContext) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
  }

  public async destroy(): Promise<void> {
    await this.stop();
    if (this.audioContext) {
      await this.audioContext.close();
    }
    this.audioContext = null;
  }
}
