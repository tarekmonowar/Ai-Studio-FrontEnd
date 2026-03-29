export function downsampleBuffer(
  input: Float32Array,
  inputSampleRate: number,
  outputSampleRate: number,
): Float32Array {
  if (outputSampleRate >= inputSampleRate) {
    return input;
  }

  const sampleRateRatio = inputSampleRate / outputSampleRate;
  const outputLength = Math.round(input.length / sampleRateRatio);
  const output = new Float32Array(outputLength);

  let outputOffset = 0;
  let inputOffset = 0;

  while (outputOffset < output.length) {
    const nextInputOffset = Math.round((outputOffset + 1) * sampleRateRatio);
    let accumulator = 0;
    let count = 0;

    for (let i = inputOffset; i < nextInputOffset && i < input.length; i += 1) {
      accumulator += input[i];
      count += 1;
    }

    output[outputOffset] = accumulator / count;
    outputOffset += 1;
    inputOffset = nextInputOffset;
  }

  return output;
}

export function toPcm16(floatSamples: Float32Array): Int16Array {
  const pcm = new Int16Array(floatSamples.length);

  for (let i = 0; i < floatSamples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, floatSamples[i]));
    pcm[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }

  return pcm;
}

export function rmsLevel(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

export function pcm16Level(data: ArrayBuffer): number {
  const view = new Int16Array(data);
  if (!view.length) return 0;

  let sum = 0;
  for (let i = 0; i < view.length; i += 1) {
    const normalized = view[i] / 32768;
    sum += normalized * normalized;
  }

  return Math.sqrt(sum / view.length);
}
