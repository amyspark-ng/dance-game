import { KaplayState } from "../KaplayState";
import { Transition } from "./Transition";

export const BlackBarsTransition = new Transition("black", (state: KaplayState) => {
	const topleft = add([
		rect(width(), height() / 2),
		pos(center().x, center().y + height() / 2),
		color(BLACK),
		anchor("top"),
		fixed(),
		stay(),
		z(999),
		timer(),
	]);

	topleft.tween(topleft.pos.y, center().y, 0.15, (p) => topleft.pos.y = p, easings.easeOutQuad);

	const botleft = add([
		rect(width(), height() / 2),
		pos(center().x, center().y - height() / 2),
		color(BLACK),
		anchor("bot"),
		fixed(),
		stay(),
		z(999),
		timer(),
	]);

	botleft.tween(botleft.pos.y, center().y, 0.15, (p) => botleft.pos.y = p, easings.easeOutQuad);

	wait(0.3, () => {
		BlackBarsTransition.finish();
		KaplayState.goScene(state);

		const sceneLeave = onSceneLeave(() => {
			sceneLeave.cancel();
			topleft.tween(
				topleft.pos.y,
				center().y + height() / 2,
				0.15,
				(p) => topleft.pos.y = p,
				easings.easeOutQuad,
			);
			botleft.tween(
				botleft.pos.y,
				center().y - height() / 2,
				0.15,
				(p) => botleft.pos.y = p,
				easings.easeOutQuad,
			);

			topleft.wait(0.15, () => {
				topleft.destroy();
				botleft.destroy();
				Transition.trigger("end");
			});
		});
	});
});
