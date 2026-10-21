import { useCallback, useEffect, useRef, useState } from 'react'
import { db } from '../db'

export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'parsing' | 'done' | 'error'
export interface VoiceParsed { itemName: string; qty: number; unit: string; confidence: number }
interface TranscribeResponse { transcript?: string; error?: string }
interface ParseResponse { item?: string; qty?: number; unit?: string; confidence?: number; error?: string }

export function useVoice() {
  const [state, setState] = useState<VoiceState>('idle')
  const [transcript, setTranscript] = useState('')
  const [parsed, setParsed] = useState<VoiceParsed | null>(null)
  const [error, setError] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const requestIdRef = useRef(0)

  const releaseMedia = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
    recorderRef.current = null
  }, [])

  const reset = useCallback(() => {
    requestIdRef.current += 1
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    releaseMedia()
    chunksRef.current = []
    setState('idle')
    setTranscript('')
    setParsed(null)
    setError('')
  }, [releaseMedia])

  const startRecording = useCallback(async () => {
    if (state === 'recording') {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
      timerRef.current = null
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
      return
    }

    const requestId = ++requestIdRef.current
    setError('')
    setParsed(null)
    setTranscript('')
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') throw new Error('Audio recording is not supported in this browser')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (requestIdRef.current !== requestId) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      const recording = new Promise<Blob>((resolve, reject) => {
        recorder.ondataavailable = event => { if (event.data.size) chunksRef.current.push(event.data) }
        recorder.onerror = () => reject(new Error('Audio recording failed'))
        recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }))
      })
      recorder.start()
      setState('recording')
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        if (recorder.state === 'recording') recorder.stop()
      }, 4000)

      const blob = await recording
      if (requestIdRef.current !== requestId) return
      releaseMedia()
      if (!blob.size) throw new Error('No audio was recorded')

      setState('transcribing')
      const audioForm = new FormData()
      audioForm.append('audio', blob, 'recording.webm')
      const transcriptionResponse = await fetch('/api/transcribe', { method: 'POST', body: audioForm })
      const transcription = await transcriptionResponse.json() as TranscribeResponse
      if (requestIdRef.current !== requestId) return
      if (!transcriptionResponse.ok || typeof transcription.transcript !== 'string') throw new Error(transcription.error || 'Transcription failed')
      setTranscript(transcription.transcript)

      setState('parsing')
      const items = (await db.items.toArray()).flatMap(item => [item.name_hi, item.name_en, ...item.aliases])
      const parseResponse = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcription.transcript, items }),
      })
      const result = await parseResponse.json() as ParseResponse
      if (requestIdRef.current !== requestId) return
      if (!parseResponse.ok || typeof result.item !== 'string' || typeof result.qty !== 'number' || typeof result.unit !== 'string') throw new Error(result.error || 'Could not parse the spoken sale')
      setParsed({ itemName: result.item, qty: result.qty, unit: result.unit, confidence: typeof result.confidence === 'number' ? result.confidence : 0 })
      setState('done')
    } catch (cause) {
      if (requestIdRef.current !== requestId) return
      releaseMedia()
      const message = cause instanceof Error ? cause.message : 'Voice request failed'
      setError(message)
      setState('error')
    }
  }, [releaseMedia, state])

  useEffect(() => () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    releaseMedia()
  }, [releaseMedia])

  return { state, transcript, parsed, error, startRecording, reset }
}
