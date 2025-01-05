import { Comp, GameObj, KEvent, KEventController } from "kaplay";
import { dragger } from "../../core/plugins/features/drag";

export interface CheckComp extends Comp {
	checked: boolean;
	check(): void;
	onCheck(action: (checked: boolean) => void): KEventController;
}

export function checkbox(): CheckComp {
	return {
		checked: false,

		check() {
			this.checked = !this.checked;
			this.trigger("check", this.checked);
		},
		onCheck(action: (checked: boolean) => void) {
			return this.on("check", action);
		},
	};
}
