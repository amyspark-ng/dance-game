import { Comp } from "kaplay";

export interface uiComp extends Comp {
	focused: boolean;
	onChange(action: () => void): void;
}

export function ui(): uiComp {
	return {
		id: "ui",
		focused: false,
		onChange(action) {
			return this.on("change", action);
		},
	};
}

/** Get the current focused ui object */
export function getFocused() {
	return get("ui", { recursive: true }).find((obj) => obj.focused == true);
}
