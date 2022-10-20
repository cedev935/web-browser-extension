import * as Sentry from "@sentry/browser"
import { browser } from "webextension-polyfill-ts"
import { version } from "../../manifest.json"

export function initSentry() {
	Sentry.init({
		dsn: "https://a4bfab3486a647ea94cab5580874e008@o303567.ingest.sentry.io/6698508",
		release: version,
		ignoreErrors: ["Non-Error exception captured", "ResizeObserver loop limit exceeded"],
	})
}

export function captureRuntimeErrorIfAny() {
	const { lastError } = browser.runtime
	if (!lastError) {
		return
	}
	if (lastError instanceof Error) {
		Sentry.captureException(lastError)
		return
	}
	if (lastError instanceof Event) {
		Sentry.captureEvent(lastError as Sentry.Event)
		return
	}
	if (lastError instanceof Object) {
		Sentry.captureMessage(JSON.stringify(lastError))
		return
	}
	Sentry.captureMessage(String(lastError))
}

export function wrapAsyncFunctionWithSentry<F extends (...args: any[]) => Promise<unknown>>(asyncFunction: F): F {
	return (async (...args: Parameters<F>) => {
		try {
			captureRuntimeErrorIfAny()
			const result = await asyncFunction(...args)
			return result
		} catch (error) {
			Sentry.captureException(error)
		}
	}) as F
}

export function wrapFunctionWithSentry<F extends (...args: any[]) => unknown>(func: F): F {
	return ((...args: Parameters<F>) => {
		try {
			captureRuntimeErrorIfAny()
			return func(...args)
		} catch (error) {
			Sentry.captureException(error)
		}
	}) as F
}
