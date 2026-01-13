import { useEffect, useRef } from 'react'

type BarcodeScannerProps = {
  onDetected: (code: string) => void
}

export function BarcodeScanner({ onDetected }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const lastCodeRef = useRef<string | null>(null)

  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    let detector: any = null
    const hasDetector = typeof (window as any).BarcodeDetector !== 'undefined'

    const stopStream = () => {
      stream?.getTracks().forEach((t) => t.stop())
    }

    const readFrame = async () => {
      if (cancelled || !videoRef.current || !detector) return
      try {
        const codes = await detector.detect(videoRef.current)
        if (codes?.length) {
          const code = codes[0].rawValue || codes[0].rawValue
          if (code && code !== lastCodeRef.current) {
            lastCodeRef.current = code
            navigator.vibrate?.(100)
            onDetected(code)
          }
        }
      } catch (_err) {
        // ignore detection errors
      }
      if (!cancelled) {
        requestAnimationFrame(readFrame)
      }
    }

    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        if (hasDetector) {
          detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'code_128', 'qr_code'] })
          requestAnimationFrame(readFrame)
        }
      } catch (_err) {
        // camera unavailable
      }
    }

    init()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [onDetected])

  return (
    <div className="rounded-lg border border-white/10 bg-black/40 p-3">
      <p className="text-xs text-slate-300 mb-2">Apunta la cámara al código de barras</p>
      <video ref={videoRef} className="aspect-video w-full rounded border border-white/10 bg-black" />
      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <input
          data-testid="mock-barcode-input"
          placeholder="Simular escaneo (testing)"
          className="ds-input"
          onChange={(e) => {
            const code = e.target.value
            if (code && code !== lastCodeRef.current) {
              lastCodeRef.current = code
              onDetected(code)
            }
          }}
        />
        <button
          type="button"
          className="ds-btn ds-btn-ghost text-xs px-3 py-1"
          onClick={() => {
            const input = document.querySelector<HTMLInputElement>('[data-testid=\"mock-barcode-input\"]')
            const code = input?.value ?? ''
            if (code && code !== lastCodeRef.current) {
              lastCodeRef.current = code
              onDetected(code)
            }
          }}
        >
          Simular
        </button>
      </div>
    </div>
  )
}
