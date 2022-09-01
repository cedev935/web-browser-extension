import * as Sentry from "@sentry/browser"
import { browser } from "webextension-polyfill-ts"
import { version } from "../../manifest.json"

export function initSentry() {
	Sentry.init({
		dsn: "https://a4bfab3486a647ea94cab5580874e008@o303567.ingest.sentry.io/6698508",
		release: version,
	})
}

export function captureRuntimeErrorIfAny() {
	if (browser.runtime.lastError) {
		Sentry.captureException(browser.runtime.lastError)
	}
}

export function wrapAsyncFunctionWithSentry<F extends (...args: any[]) => Promise<unknown>>(asyncFunction: F): F {
	return (async (...args: Parameters<F>) => {
		captureRuntimeErrorIfAny()
		try {
			const result = await asyncFunction(...args)
			return result
		} catch (error) {
			Sentry.captureException(error)
		}
	}) as F
}

export function wrapFunctionWithSentry<F extends (...args: any[]) => unknown>(func: F): F {
	return ((...args: Parameters<F>) => {
		captureRuntimeErrorIfAny()
		try {
			const result = func(...args)
			return result
		} catch (error) {
			Sentry.captureException(error)
		}
	}) as F
}
