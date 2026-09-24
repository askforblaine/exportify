abstract class TracksData {
  accessToken: string
  signal?: AbortSignal

  constructor(accessToken: string, signal?: AbortSignal) {
    this.accessToken = accessToken
    this.signal = signal
  }

  protected throwIfAborted() {
    if (this.signal?.aborted) {
      throw new DOMException("Export interrupted", "AbortError")
    }
  }

  abstract dataLabels(): string[]
  abstract data(): Promise<Map<string, string[]>>
}

export default TracksData
