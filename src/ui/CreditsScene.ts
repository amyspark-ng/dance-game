import { KaplayState } from "../core/scenes";

export class StateCredits extends KaplayState {
	constructor() {
		super("credits");
	}
}

KaplayState.scene("credits", (CreditsState: StateCredits) => {
	add([
		text("GAME MADE BY\nme lol"),
		anchor("center"),
		pos(center()),
	]);
});
