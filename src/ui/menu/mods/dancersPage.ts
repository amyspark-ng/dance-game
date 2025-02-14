import { ModsState } from "./ModState";

export function dancersPage(state: ModsState) {
	add([
		text("DANCERS", { size: 40, align: "center" }),
		pos(center().x, 40),
		anchor("center"),
		"title",
		"page",
	]);
}
