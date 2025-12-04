import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useViewportPriority } from '../../context/viewportPriority'

export interface ImageNodeProps {
  node: {
    type: 'image'
    src: string
    alt?: string | null
    title?: string | null
    raw?: string
    loading?: boolean
  }
  fallbackSrc?: string
  showCaption?: boolean
  lazy?: boolean
  svgMinHeight?: string | number
  usePlaceholder?: boolean
}

const DEFAULT_PROPS = {
  fallbackSrc: '',
  showCaption: false,
  lazy: true,
  svgMinHeight: '12rem',
  usePlaceholder: true,
}

export function ImageNode(rawProps: ImageNodeProps) {
  const props = { ...DEFAULT_PROPS, ...rawProps }
  const registerViewport = useViewportPriority()
  const [figureEl, setFigureEl] = useState<HTMLElement | null>(null)
  const visibilityHandleRef = useRef<ReturnType<typeof registerViewport> | null>(null)
  const [isVisible, setIsVisible] = useState(() => typeof window === 'undefined' || props.lazy === false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [fallbackTried, setFallbackTried] = useState(false)

  useEffect(() => {
    if (!props.lazy)
      return undefined
    const el = figureEl
    visibilityHandleRef.current?.destroy()
    visibilityHandleRef.current = null
    if (!el) {
      setIsVisible(false)
      return undefined
    }
    const handle = registerViewport(el, { rootMargin: '400px' })
    visibilityHandleRef.current = handle
    const initialVisible = handle.isVisible()
    if (initialVisible)
      setIsVisible(true)
    handle.whenVisible.then(() => setIsVisible(true)).catch(() => {})
    return () => {
      handle.destroy()
      visibilityHandleRef.current = null
    }
  }, [figureEl, registerViewport, props.lazy])

  useEffect(() => () => {
    visibilityHandleRef.current?.destroy()
    visibilityHandleRef.current = null
  }, [])

  const displaySrc = useMemo(() => {
    if (hasError && props.fallbackSrc)
      return props.fallbackSrc
    return props.node.src
  }, [hasError, props.fallbackSrc, props.node.src])

  useEffect(() => {
    setImageLoaded(false)
    setHasError(false)
  }, [displaySrc])

  useEffect(() => {
    setFallbackTried(false)
  }, [props.node.src])

  const isSvg = useMemo(() => /\.svg(?:\?|$)/i.test(String(displaySrc)), [displaySrc])
  const canRenderImage = !props.lazy || isVisible

  const handleImageError = () => {
    if (props.fallbackSrc && !fallbackTried) {
      setFallbackTried(true)
      setHasError(true)
    }
    else {
      setHasError(true)
    }
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
    setHasError(false)
  }

  const handleClick = (event: React.MouseEvent<HTMLImageElement>) => {
    if (!imageLoaded || hasError) {
      event.preventDefault()
      return
    }
  }

  const placeholderStyle = isSvg
    ? { minHeight: props.svgMinHeight, width: '100%' }
    : { minHeight: '6rem' }

  return (
    <figure ref={setFigureEl} className="image-node">
      <div className="image-node__inner">
        {!props.node.loading && !hasError && canRenderImage ? (
          <img
            key="image"
            src={displaySrc}
            alt={String(props.node.alt ?? props.node.title ?? '')}
            title={String(props.node.title ?? props.node.alt ?? '')}
            className={`image-node__img${imageLoaded ? ' is-loaded' : ''}`}
            style={isSvg ? { minHeight: props.svgMinHeight, width: '100%', height: 'auto', objectFit: 'contain' } : undefined}
            loading={props.lazy ? 'lazy' : 'eager'}
            decoding="async"
            tabIndex={imageLoaded ? 0 : -1}
            aria-label={props.node.alt ?? 'Preview image'}
            onError={handleImageError}
            onLoad={handleImageLoad}
            onClick={handleClick}
          />
        ) : !hasError ? (
          <div
            key="placeholder"
            className="image-node__placeholder"
            style={placeholderStyle}
          >
            {props.usePlaceholder
              ? (
                  <>
                    <span className="image-node__spinner" aria-hidden="true" />
                    <span className="image-node__placeholder-text">Loading image...</span>
                  </>
                )
              : (
                  <span className="image-node__placeholder-text">{props.node.raw ?? 'Loading image…'}</span>
                )}
          </div>
        ) : (
          <div className="image-node__error">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                fill="currentColor"
                d="M2 2h20v10h-2V4H4v9.586l5-5L14.414 14L13 15.414l-4-4l-5 5V20h8v2H2zm13.547 5a1 1 0 1 0 0 2a1 1 0 0 0 0-2m-3 1a3 3 0 1 1 6 0a3 3 0 0 1-6 0m3.625 6.757L19 17.586l2.828-2.829l1.415 1.415L20.414 19l2.829 2.828l-1.415 1.415L19 20.414l-2.828 2.829l-1.415-1.415L17.586 19l-2.829-2.828z"
              />
            </svg>
            <span className="image-node__placeholder-text">Image failed to load</span>
          </div>
        )}
      </div>
      {props.showCaption && props.node.alt && (
        <figcaption className="image-node__caption">
          {props.node.alt}
        </figcaption>
      )}
    </figure>
  )
}

export default ImageNode
