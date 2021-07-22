import { renderHook, act } from "@testing-library/react-hooks"
import { useState, useCallback } from "react"
import useAwaitData from "."

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe("useAwaitData", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.useRealTimers()
  })

  it("should not re-render at first run", async () => {
    const render = jest.fn()
    const { result, waitForNextUpdate } = renderHook(() => {
      const result = useAwaitData(async () => {
        return await wait(2000)
      })
      render()
      return { result }
    })
    expect(render).toHaveBeenCalledTimes(1)
  })

  it("should handle fulfillments", async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      const result = useAwaitData(async () => {
        return await wait(2000)
      })
      return { result }
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(2000)
    expect(result.current.result.status).toBe("running")
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
  })

  it("should handle rejections", async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      const result = useAwaitData(async () => {
        throw await new Promise(resolve =>
          setTimeout(resolve, 2000, new Error()),
        )
      })
      return { result }
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(2000)
    expect(result.current.result.status).toBe("running")
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("rejected")
  })

  it("should handle dependencies update before the first run settles", async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      const [state, setState] = useState({})
      const update = useCallback(() => setState({}), [])
      const result = useAwaitData(async () => {
        return await wait(2000)
      }, [state])
      return { result, update } as const
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    act(result.current.update)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
  })

  it("should handle dependencies update after the first run settled", async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      const [state, setState] = useState({})
      const update = useCallback(() => setState({}), [])
      const result = useAwaitData(async () => {
        return await wait(2000)
      }, [state])
      return { result, update } as const
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
    act(result.current.update)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
  })

  it("should handle dependencies update after the first run aborted but tick isn't used", async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      const [state, setState] = useState({})
      const update = useCallback(() => setState({}), [])
      const result = useAwaitData(async () => {
        return await wait(2000)
      }, [state])
      return { result, update } as const
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    act(() => {
      result.current.result.status === "running" &&
        result.current.result.abort()
    })
    expect(result.current.result.status).toBe("aborted")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("aborted")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("aborted")
    act(result.current.update)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
  })

  it("should abort `AbortController` at abort request", async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      const [state, setState] = useState({})
      const [isAborted, setIsAborted] = useState(false)
      const update = useCallback(() => setState({}), [])
      const result = useAwaitData(
        async ({ signal }) => {
          signal.onabort = () => setIsAborted(true)
          return await wait(2000)
        },
        [state],
      )
      return { result, update, isAborted } as const
    })
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(false)
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(false)
    act(() => {
      result.current.result.status === "running" &&
        result.current.result.abort()
    })
    expect(result.current.result.status).toBe("aborted")
    expect(result.current.isAborted).toBe(true)
  })

  it("should abort `AbortController` at invalidate", async () => {
    const { result, waitForNextUpdate } = renderHook(() => {
      const [state, setState] = useState({})
      const [isAborted, setIsAborted] = useState(false)
      const update = useCallback(() => setState({}), [])
      const result = useAwaitData(
        async ({ signal }) => {
          signal.onabort = () => setIsAborted(true)
          return await wait(2000)
        },
        [state],
      )
      return { result, update, isAborted } as const
    })
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(false)
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(false)
    act(result.current.update)
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(true)
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(true)
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(true)
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
  })
})