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
    const render = jest.fn()
    const { result, waitForNextUpdate } = renderHook(() => {
      const result = useAwaitData(async () => {
        return await wait(2000)
      })
      render()
      return { result }
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(2000)
    expect(result.current.result.status).toBe("running")
    expect(render).toHaveBeenCalledTimes(1)
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
    expect(render).toHaveBeenCalledTimes(2)
  })

  it("should handle rejections", async () => {
    const render = jest.fn()
    const { result, waitForNextUpdate } = renderHook(() => {
      const result = useAwaitData(async () => {
        throw await new Promise(resolve =>
          setTimeout(resolve, 2000, new Error()),
        )
      })
      render()
      return { result }
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(2000)
    expect(result.current.result.status).toBe("running")
    expect(render).toHaveBeenCalledTimes(1)
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("rejected")
    expect(render).toHaveBeenCalledTimes(2)
  })

  it("should handle dependencies update before the first run settles", async () => {
    const render = jest.fn()
    const { result, waitForNextUpdate } = renderHook(() => {
      const [state, setState] = useState({})
      const update = useCallback(() => setState({}), [])
      const result = useAwaitData(async () => {
        return await wait(2000)
      }, [state])
      render()
      return { result, update } as const
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    expect(render).toHaveBeenCalledTimes(1)
    act(result.current.update)
    // State change + result update (for the new abort function)
    expect(render).toHaveBeenCalledTimes(3)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
    expect(render).toHaveBeenCalledTimes(4)
  })

  it("should handle dependencies update after the first run settled", async () => {
    const render = jest.fn()
    const { result, waitForNextUpdate } = renderHook(() => {
      const [state, setState] = useState({})
      const update = useCallback(() => setState({}), [])
      const result = useAwaitData(async () => {
        return await wait(2000)
      }, [state])
      render()
      return { result, update } as const
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    expect(render).toHaveBeenCalledTimes(1)
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
    expect(render).toHaveBeenCalledTimes(2)
    act(result.current.update)
    expect(render).toHaveBeenCalledTimes(4)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
    expect(render).toHaveBeenCalledTimes(5)
  })

  it("should handle dependencies update after the first run aborted but tick isn't used", async () => {
    const render = jest.fn()
    const { result, waitForNextUpdate } = renderHook(() => {
      const [state, setState] = useState({})
      const update = useCallback(() => setState({}), [])
      const result = useAwaitData(async () => {
        return await wait(2000)
      }, [state])
      render()
      return { result, update } as const
    })
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    expect(render).toHaveBeenCalledTimes(1)
    act(() => {
      result.current.result.status === "running" &&
        result.current.result.abort()
    })
    expect(result.current.result.status).toBe("aborted")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("aborted")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("aborted")
    expect(render).toHaveBeenCalledTimes(2)
    act(result.current.update)
    expect(render).toHaveBeenCalledTimes(4)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    await waitForNextUpdate()
    expect(result.current.result.status).toBe("fulfilled")
    expect(render).toHaveBeenCalledTimes(5)
  })

  it("should abort `AbortController` at abort request", async () => {
    const render = jest.fn()
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
      render()
      return { result, update, isAborted } as const
    })
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(false)
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(false)
    expect(render).toHaveBeenCalledTimes(1)
    act(() => {
      result.current.result.status === "running" &&
        result.current.result.abort()
    })
    expect(result.current.result.status).toBe("aborted")
    expect(result.current.isAborted).toBe(true)
    expect(render).toHaveBeenCalledTimes(2)
  })

  it("should abort `AbortController` at invalidate", async () => {
    const render = jest.fn()
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
      render()
      return { result, update, isAborted } as const
    })
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(false)
    jest.advanceTimersByTime(1000)
    expect(result.current.result.status).toBe("running")
    expect(result.current.isAborted).toBe(false)
    expect(render).toHaveBeenCalledTimes(1)
    act(result.current.update)
    expect(render).toHaveBeenCalledTimes(3)
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
    expect(render).toHaveBeenCalledTimes(4)
  })
})