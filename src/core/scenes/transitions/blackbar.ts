import { KaplayState, transitionFunction } from "../KaplayState";

export const BlackBarsTrans: transitionFunction = (state: new(...args: any) => KaplayState, ...args: any[]) => {
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
		KaplayState.goScene(state, ...args);

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
			});
		});
	});
};
