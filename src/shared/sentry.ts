import * as Sentry from "@sentry/browser"
import * as browser from "webextension-polyfill"
import { version } from "../../manifest.json"

export function initSentry() {
	Sentry.init({
		dsn: "https://a4bfab3486a647ea94cab5580874e008@o303567.ingest.sentry.io/6698508",
		release: version,
		// Some errors are filtered because they spam Sentry.
		// Sentry bases its price on the amount of events, so for now the decision is to ignore them.
		ignoreErrors: [
			"ResizeObserver loop limit exceeded",
			"Could not establish connection. Receiving end does not exist.",
		],
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
			Sentry.captureException(asError(error))
		}
	}) as F
}

export function wrapFunctionWithSentry<F extends (...args: any[]) => unknown>(func: F): F {
	return ((...args: Parameters<F>) => {
		try {
			captureRuntimeErrorIfAny()
			return func(...args)
		} catch (error) {
			Sentry.captureException(asError(error))
		}
	}) as F
}

function asError<T>(value: T): (T & Error) | Error {
	if (value instanceof Error) {
		return value
	}
	if (value instanceof Object) {
		const error = new Error(JSON.stringify(value))
		return Object.assign(error, value)
	}
	return new Error(String(value))
}
