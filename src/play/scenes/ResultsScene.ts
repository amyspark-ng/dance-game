import { Color } from "kaplay";
// import { allSongCharts } from "../../core/loading/loader"
import { loadedSongs } from "../../core/loading/loader";
import { KaplayState } from "../../core/scenes";
import { playSound } from "../../core/sound";
import { StateSongSelect } from "../../ui/menu/songselect/SongSelectScene";
import { utils } from "../../utils";
import { Ranking, Scoring } from "../objects/scoring";
import { StateGame } from "../PlayState";

export class StateResults extends KaplayState {
	GameState: StateGame;
	constructor(GameState: StateGame) {
		super("results");
		this.GameState = GameState;
	}
}

export function getAnimsAccordingToRanking(ranking: Ranking) {
	if (ranking == "S+" || ranking == "S" || ranking == "A") return { initial: "idle", end: "victory" };
	else if (ranking == "B" || ranking == "C") return { initial: "miss", end: "victory" };
	else if (ranking == "F") return { initial: "victory", end: "miss" };
}

KaplayState.scene("results", (ResultsState: StateResults) => {
	setBackground(RED.lighten(60));

	/** Class that contains a dumb thing for each line in the tally countering */
	class tallyContainer {
		title: string;
		value: number;
		color: Color;
	}

	const tallyThings: tallyContainer[] = [
		{ title: "score", value: ResultsState.GameState.tally.score, color: WHITE },
		// { title: "total notes", value: ResultsState.GameState.songZip.notes.length, color: WHITE },
		{ title: "hit notes", value: Scoring.tally(ResultsState.GameState.tally).hitNotes(), color: WHITE },
		{ title: "awesomes", value: ResultsState.GameState.tally.awesomes, color: BLUE.lighten(50) },
		{ title: "goods", value: ResultsState.GameState.tally.goods, color: GREEN.lighten(50) },
		{ title: "ehhs", value: ResultsState.GameState.tally.ehhs, color: BLACK.lighten(50) },
		{
			title: "misses",
			value: ResultsState.GameState.tally.misses,
			color: utils.blendColors(BLUE, BLACK.lighten(50), 0.6),
		},
	];

	const initialX = 40;
	const initialY = 40;

	/** How cleared was the song */
	const cleared = Scoring.tally(ResultsState.GameState.tally).cleared();

	/** The ranking you're gonna get */
	const ranking = Scoring.tally(ResultsState.GameState.tally).ranking();

	/** The animations of the dancer according to the ranking you got */
	const anims = getAnimsAccordingToRanking(ranking);

	const drumroll = playSound("drumroll", { volume: 1 });
	const durationPerTally = drumroll.duration() / tallyThings.length;

	tallyThings.forEach((tallyT, index) => {
		wait((durationPerTally + durationPerTally * index) / 2, () => {
			const tallyKeyF = tallyT.title.charAt(0).toUpperCase() + tallyT.title.slice(1) + ": ";

			let textSize = 0;
			if (tallyT.title == "score") textSize = 60;
			else if (tallyT.title == "total notes" || tallyT.title == "hit notes") textSize = 50;
			else textSize = 40;

			const tallyText = add([
				text(tallyKeyF, { align: "left", size: textSize }),
				pos(-100, initialY + (textSize * 1.1) * index),
				anchor("left"),
				color(tallyT.color),
				{
					value: 0,
					update() {
						this.value = lerp(this.value, tallyT.value, 0.25);
						this.text = tallyKeyF + Math.round(this.value);
					},
				},
			]);

			tween(tallyText.pos.x, initialX, 1, (p) => tallyText.pos.x = p, easings.easeOutQuint);
		});
	});

	wait(drumroll.duration() * 0.1, () => {
		const yourRankingText = add([
			text("Your ranking: ", { align: "left", size: 30 }),
			pos(initialX, height() - 50),
			anchor("left"),
		]);
	});

	wait(drumroll.duration() * 0.8, () => {
		const endScale = vec2(1.2);

		const rankingObj = add([
			sprite("rank_" + ranking),
			pos(130, 395),
			scale(1.2),
			opacity(),
			anchor("center"),
		]);

		rankingObj.fadeIn(0.25);
		tween(vec2(5), endScale, 0.25, (p) => rankingObj.scale = p);
	});

	const dancer = add([
		sprite("dancer_" + ResultsState.GameState.params.dancerName),
		pos(),
		anchor("bot"),
		scale(0.8),
		z(1),
	]);

	dancer.play(anims.initial, { loop: true });

	const clearObj = add([
		text("0%", { align: "center", size: 65 }),
		pos(center().x * 1.6, height() + 70 + dancer.height),
		anchor("center"),
		z(0),
		{
			value: 0,
			update() {
				this.text = Math.round(this.value) + "%";
			},
		},
	]);

	clearObj.onUpdate(() => {
		dancer.pos.x = clearObj.pos.x;
		dancer.pos.y = clearObj.pos.y - clearObj.height / 6;
	});

	tween(clearObj.pos.y, height() - 80, drumroll.duration() / 2, (p) => clearObj.pos.y = p, easings.easeOutQuint);

	tween(clearObj.value, cleared, drumroll.duration(), (p) => {
		let oldValue = Math.round(clearObj.value);
		clearObj.value = p;
		let newValue = Math.round(clearObj.value);
		if (oldValue != newValue) playSound("noteMove", { detune: 2 * cleared });
	}, easings.easeOutCirc);

	wait(drumroll.duration() + 1, () => {
		// what happens when the dancer reacts to the ranking
		dancer.play(anims.end, { loop: true });
	});

	onKeyPress("escape", () => {
		const indexOfSong = loadedSongs.indexOf(ResultsState.GameState.song);
		KaplayState.switchState(new StateSongSelect({ index: indexOfSong }));
	});
});
