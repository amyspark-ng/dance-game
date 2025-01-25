import { GameSave } from "../../../core/save";
import { CustomAudioPlay, Sound } from "../../../core/sound";
import { getDancer } from "../../../data/dancer";
import { utils } from "../../../utils";
import { StateGame } from "../../PlayState";
import { DANCER_POS } from "../dancer";

function pauseScratch(audio: CustomAudioPlay, duration: number = 0.15) {
	tween(audio.detune, -150, duration / 2, (p) => audio.detune = p);
	tween(audio.volume, 0, duration, (p) => audio.volume = p);
}

/** Runs when the game is paused */
export function addPauseUI() {
	const GameState = StateGame.instance;

	const baseZ = 100;
	const baseLerp = 0.5;
	let scrollindex = 0;

	function addPauseButton(buttonName: string, buttonIndex: number, buttonAction: () => void) {
		const startingY = 200;
		const buttonSpacing = 80;

		const buttonObj = add([
			text(buttonName, { size: 60 }),
			pos(-100, startingY + buttonSpacing * buttonIndex),
			anchor("left"),
			opacity(0.5),
			z(baseZ + 2),
			"pauseButton",
			{
				index: buttonIndex,
				action: buttonAction,
			},
		]);

		const baseXpos = 50;
		buttonObj.onUpdate(() => {
			const buttonLerp = (baseLerp / 2) * (buttonIndex + 1);
			if (GameState.paused) {
				const buttonXPos = baseXpos - (scrollindex == buttonIndex ? 30 : 0);
				buttonObj.pos.x = lerp(buttonObj.pos.x, buttonXPos, buttonLerp);
				buttonObj.opacity = lerp(buttonObj.opacity, 1, baseLerp);
			}
			else {
				buttonObj.pos.x = lerp(buttonObj.pos.x, -700, buttonLerp);
				buttonObj.opacity = lerp(buttonObj.opacity, 0, baseLerp);
			}

			buttonObj.opacity = lerp(buttonObj.opacity, scrollindex == buttonIndex ? 1 : 0.5, baseLerp);
		});

		return buttonObj;
	}

	// black screen
	const blackScreen = add([
		rect(width(), height()),
		pos(center()),
		anchor("center"),
		color(BLACK),
		opacity(),
		z(baseZ),
		"blackScreen",
	]);

	blackScreen.onUpdate(() => {
		blackScreen.opacity = lerp(blackScreen.opacity, GameState.paused ? 0.5 : 0, baseLerp);
	});

	// title stuff
	const title = add([
		text(GameState.song.manifest.name, { size: 60, align: "center" }),
		pos(),
		anchor("center"),
		opacity(),
		z(baseZ),
	]);

	const pausedText = add([
		text("(paused)", { size: title.textSize - 10, align: "center" }),
		pos(),
		anchor("center"),
		opacity(),
		z(baseZ),
	]);

	title.onUpdate(() => {
		pausedText.pos = lerp(pausedText.pos, title.pos.add(vec2(0, title.height)), baseLerp * 0.9);

		if (GameState.paused) {
			title.pos = lerp(title.pos, vec2(center().x, 70), baseLerp);
			title.opacity = lerp(title.opacity, 1, baseLerp);
		}
		else {
			title.pos = lerp(title.pos, vec2(center().x, -100), baseLerp);
			title.opacity = lerp(title.opacity, 0, baseLerp);
		}
		pausedText.opacity = lerp(pausedText.opacity, title.opacity, baseLerp * 0.9);
	});

	// buttons
	const inputManager = add([]);
	inputManager.onUpdate(() => {
		if (!GameState.paused) return;
		if (isKeyPressed("down")) scrollindex = utils.scrollIndex(scrollindex, 1, 3);
		else if (isKeyPressed("up")) scrollindex = utils.scrollIndex(scrollindex, -1, 3);
		else if (isKeyPressed("enter")) {
			const selectedButton = get("pauseButton").find((obj) => obj.index == scrollindex);
			if (selectedButton) selectedButton.action();
		}
	});

	const buttons = [
		addPauseButton("Resume", 0, () => {
			GameState.paused = false;
		}),
		addPauseButton("Restart", 1, () => {
			GameState.restart();
		}),
		addPauseButton("Exit to menu", 2, () => {
			GameState.exitMenu();
		}),
	];

	if (GameState.params.fromEditor) {
		buttons[2].destroy();
		buttons[2] = addPauseButton("Exit to editor", 2, () => {
			GameState.exitEditor();
		});
	}

	// dancer
	const fakeDancer = add([
		sprite(getDancer().spriteName, { anim: "idle" }),
		pos(center()),
		z(baseZ),
		anchor("center"),
		"pauseDancer",
	]);

	const fakeDancerPos = vec2(center().x + fakeDancer.width, center().y);
	fakeDancer.onUpdate(() => {
		if (GameState.paused) {
			fakeDancer.pos = lerp(fakeDancer.pos, fakeDancerPos, baseLerp);
		}
		else {
			fakeDancer.pos = lerp(fakeDancer.pos, vec2(fakeDancerPos.x, height() + fakeDancer.height), baseLerp);
		}
	});

	GameState.dancer.onUpdate(() => {
		if (GameState.paused) {
			GameState.dancer.pos = lerp(GameState.dancer.pos, center().scale(1, 2), 0.9);
			GameState.dancer.scale.x = lerp(GameState.dancer.scale.x, 0, 0.8);
		}
		else {
			GameState.dancer.pos = lerp(GameState.dancer.pos, DANCER_POS, 0.9);
			GameState.dancer.scale.x = lerp(GameState.dancer.scale.x, 1, 0.8);
		}
	});

	// EVERYTHING THAT IS ABOVE WILL RUN ONLY ONCE
	// Everything below will run everytime the pause state changes
	GameState.onPauseChange(() => {
		Sound.playSound("pauseScratch", {
			detune: GameState.paused == true ? -150 : 150,
			speed: 1,
		});

		// pause scratch sound!
		// these tweens somehow are spam-proof! good :)
		// unpaused
		if (GameState.paused == false) {
			tween(-150, 0, 0.15, (p) => GameState.conductor.audioPlay.detune = p, easings.easeOutQuint);
			GameState.conductor.audioPlay.fadeIn(Sound.musicVolume, 0.15);
		}
		// paused
		else {
			const audioName = GameState.song.manifest.uuid_DONT_CHANGE + "-audio";
			const songToScratch = Sound.playMusic(audioName);
			songToScratch.seek(GameState.conductor.timeInSeconds);
			pauseScratch(songToScratch);
		}

		// get all the objects and filter the ones that have any tag that is included in tagsToPause
		get("game").forEach((obj) => {
			obj.paused = GameState.paused;
		});
	});

	return { blackScreen, title, pausedText, buttons, fakeDancer };
}
