import { KaplayState } from "../../core/scenes/KaplayState";
import { getDancer, getDancerByName } from "../../data/dancer";
import { StateSongSelect } from "../../ui/menu/songselect/SongSelectScene";
import { makeDancer } from "../objects/dancer";
import { StateGame } from "../PlayState";

export class StateDeath extends KaplayState {
	GameState: StateGame;
	constructor(GameState: StateGame) {
		super();
		this.GameState = GameState;
	}
}

KaplayState.scene("StateDeath", (GameState: StateGame) => {
	const DeathState = new StateDeath(GameState);
	setBackground(BLACK);

	add([
		text("YOU DIED"),
		anchor("center"),
		pos(center()),
		"deathText",
	]);

	const dancer = add(makeDancer(getDancerByName(DeathState.GameState.params.dancerName).manifest.name));
	dancer.play(dancer.data.getAnim("up", true));

	onKeyPress(["backspace", "escape"], () => {
		KaplayState.switchState(StateSongSelect, DeathState.GameState.song);
	});

	onKeyPress("enter", () => {
		// TODO: Restart button
		KaplayState.switchState(StateGame, DeathState.GameState.params);
	});
});
