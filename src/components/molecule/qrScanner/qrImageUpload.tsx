'use client'

import { useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/browser'
import { DecodeHintType } from '@zxing/library'
import { Button } from '@/components/atom/button'
import { Input } from '@/components/atom/input'
import type { QrScannerProps } from './types'
import { useTranslations } from 'next-intl'

export function QrImageUpload({
  onDecode,
  onError,
}: Pick<QrScannerProps, 'onDecode' | 'onError'>) {
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    const imageUrl = URL.createObjectURL(file)
    const hints = new Map()
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserQRCodeReader(hints)

    try {
      const img = new Image()
      await new Promise((resolve, reject) => {
        img.onload = resolve
        img.onerror = reject
        img.src = imageUrl
      })

      // Multi-stage detection strategy
      const decodeAttempts = [
        // 1. Original image
        () => reader.decodeFromImageElement(img),
        // 2. Resized to 800px (ZXing often works better with smaller images)
        () => decodeWithResizing(img, 800, reader),
        // 3. Resized to 400px (Even smaller for very high-res photos)
        () => decodeWithResizing(img, 400, reader),
      ]

      let resultText = ''
      let lastError: any = null

      for (const attempt of decodeAttempts) {
        try {
          const result = await attempt()
          resultText = typeof result === 'string' ? result : result.getText()
          break
        } catch (e) {
          lastError = e
        }
      }

      if (resultText) {
        console.log('QR decoded successfully:', resultText)
        onDecode(resultText)
      } else {
        throw lastError || new Error('Not found')
      }
    } catch (e) {
      console.error('QR decode error after all attempts:', e)
      onError?.(new Error(t('pair.invalidQr')))
    } finally {
      setLoading(false)
      URL.revokeObjectURL(imageUrl)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Helper function to resize and decode
  const decodeWithResizing = async (
    img: HTMLImageElement,
    maxDim: number,
    reader: BrowserQRCodeReader,
  ) => {
    const canvas = document.createElement('canvas')
    let width = img.width
    let height = img.height

    if (width > height) {
      if (width > maxDim) {
        height *= maxDim / width
        width = maxDim
      }
    } else {
      if (height > maxDim) {
        width *= maxDim / height
        height = maxDim
      }
    }

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not get canvas context')

    ctx.drawImage(img, 0, 0, width, height)
    
    // Note: decodeFromCanvas in some versions of @zxing/browser is synchronous
    // We wrap it to be sure or use it directly if it returns a Result
    const result = reader.decodeFromCanvas(canvas)
    return result
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
        data-testid="qr-image-upload-input"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        type="button"
        size="lg"
        className="w-full"
        disabled={loading}
      >
        {loading ? t('elder.uploading') : t('pair.uploadImage')}
      </Button>
    </div>
  )
}
