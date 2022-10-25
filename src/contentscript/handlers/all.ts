import { FromBackgroundRuntimeMessages } from "../../shared/messages"
import { Handler } from "./handler"

export class All extends Handler {
	public detect() {
		return true
	}

	public onMessage(_msg: FromBackgroundRuntimeMessages) {}

	public async run() {
		return
	}

	public destroy() {
		return
	}
}
