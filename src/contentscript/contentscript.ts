import "./contentscript.sass"
import * as browser from "webextension-polyfill"
import { FromBackgroundRuntimeMessages } from "../shared/messages"
import { handlers, Handler } from "./handlers"
import { initSentry, wrapFunctionWithSentry } from "../shared/sentry"

initSentry()

const runtimeMessagesListener = (detectedHandlers: Handler[]) => {
	const backgroundListener = (msg: FromBackgroundRuntimeMessages) => {
		if (msg.restart) {
			browser.runtime.onMessage.removeListener(backgroundListener)
			for (const handler of detectedHandlers) {
				handler.destroy()
			}
			return main()
		} else {
			for (const handler of detectedHandlers) {
				wrapFunctionWithSentry(handler.onMessage)(msg)
			}
		}
	}
	browser.runtime.onMessage.addListener(backgroundListener)
}

const main = () => {
	const detectedHandlers: Handler[] = []

	for (const handler of handlers) {
		const h = new handler()
		if (h.detect()) {
			detectedHandlers.push(h)
		}
	}
	runtimeMessagesListener(detectedHandlers)
	for (const handler of detectedHandlers) {
		handler.destroy()
		handler.run().catch((e) => console.error(e))
	}
}

main()
