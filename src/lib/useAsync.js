import { useCallback, useEffect, useState } from 'react'

export function useAsync(load, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setState((prev) => ({ ...prev, loading: true, error: null }))
    load({ signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.name !== 'AbortError') setState({ data: null, error, loading: false })
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const setData = useCallback((updater) => setState((prev) => ({ ...prev, data: typeof updater === 'function' ? updater(prev.data) : updater })), [])
  return { ...state, reload, setData }
}

export function usePageMeta(title, description) {
  useEffect(() => {
    document.title = title ? `${title} | Lephas Company Ltd` : 'Lephas Company Ltd | Transforming the future'
    if (description) {
      const tag = document.querySelector('meta[name="description"]')
      if (tag) tag.setAttribute('content', description)
    }
  }, [title, description])
}
