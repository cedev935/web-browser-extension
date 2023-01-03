import * as Sentry from "@sentry/browser"
import * as browser from "webextension-polyfill"
import { version } from "../../manifest.json"

export function initSentry() {
	Sentry.init({
		dsn: "https://a4bfab3486a647ea94cab5580874e008@o303567.ingest.sentry.io/6698508",
		release: version,
		ignoreErrors: ["Non-Error exception captured with keys: message", "ResizeObserver loop limit exceeded"],
		// Two errors are filtered because they are spamming Sentry (380 / 405 numbers of errors per day)
		// Here are some hints for when we'll work on fixing the Non-error https://sentry.zendesk.com/hc/en-us/articles/360057389753-Why-am-I-seeing-events-with-Non-Error-exception-or-promise-rejection-captured-with-keys-using-the-JavaScript-SDK-
		// Sentry base is price on the number volume, so at the moment, the decision taken is to ignore them.
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
