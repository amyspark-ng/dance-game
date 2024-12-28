import { GameSave } from "../../core/gamesave";
import { transitionToScene } from "../../core/scenes";
import { fadeOut } from "../../core/transitions/fadeOutTransition";
import { paramsGameScene, StateGame } from "../PlayState";

export type paramsDeathScene = {
	GameState: StateGame;
};

export function DeathScene() {
	scene("death", (params: paramsDeathScene) => {
		setBackground(BLACK);

		add([
			text("YOU DIED"),
			anchor("center"),
			pos(center()),
			"deathText",
		]);

		add([
			sprite("dancer_" + params.GameState.params.dancer, { anim: "miss" }),
			pos(center().x - 100, center().y + 50),
			anchor("center"),
			scale(0.5),
		]);

		onKeyPress("enter", () => {
			transitionToScene(
				fadeOut,
				"game",
				{ songZip: params.GameState.song, dancer: params.GameState.params.dancer } as paramsGameScene,
			);
		});
	});
}
