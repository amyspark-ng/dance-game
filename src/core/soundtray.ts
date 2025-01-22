import { GameObj, Key, StayComp, TimerComp } from "kaplay";
import { GameSave } from "./save";
import { Sound } from "./sound";

/**
 * "The little volume meter that pops down sometimes"
 *
 * Only contains the basic behaviour to actually add notes and make it cool you have to create a new class and extend this one
 * @example
 * ```ts
 * 	class CustomSoundTray extends SoundTray {
 * 		constructor(...) {
 * 				// here you add all your custom objects that actually do cool things
 * 		}
 * 	}
 * ```
 *
 * @param upKeys The keys  to use to increase the volume
 * @param downKeys The Keys to use to decrease the volume
 */
export class SoundTray {
	static hidden: boolean = true;
	static upKeys: Key[] = [];
	static downKeys: Key[] = [];
	/** Object that handles the behaviour of the soundtray */
	static managerObj: GameObj<StayComp | TimerComp>;
	/** The time left for the soundtray to be hidden again */
	static timeLeft: number = 1;
	/** Event handler for the onShow and onHide events */
	static eventHandler = new KEventHandler();

	static show(change: -1 | 1) {
		SoundTray.eventHandler.trigger("soundtray_show", change);
		SoundTray.timeLeft = 1;
		SoundTray.hidden = false;
	}

	static hide() {
		SoundTray.eventHandler.trigger("soundtray_hide");
		SoundTray.hidden = true;
		GameSave.save();
	}

	static onShow(action: (change: -1 | 1) => void) {
		return SoundTray.eventHandler.on("soundtray_show", action);
	}

	static onHide(action: () => void) {
		return SoundTray.eventHandler.on("soundtray_hide", action);
	}

	constructor(upKeys: Key[], downkeys: Key[]) {
		SoundTray.upKeys = upKeys;
		SoundTray.downKeys = downkeys;

		const manager = add([
			stay(),
			timer(),
			layer("cursor"),
			{
				update() {
					// is being shown
					if (!SoundTray.hidden) {
						SoundTray.timeLeft -= dt();
						if (SoundTray.timeLeft <= 0) {
							SoundTray.hide();
						}
					}

					let changeVolTune = map(GameSave.volume, 0, 1, -250, 0);

					if (isKeyPressedRepeat(SoundTray.upKeys[0])) {
						Sound.changeVolume(GameSave.volume + 0.1);
						Sound.playSound("volumeChange", { detune: changeVolTune });
						SoundTray.show(1);
					}
					else if (isKeyPressedRepeat(SoundTray.downKeys[0])) {
						Sound.changeVolume(GameSave.volume - 0.1);
						Sound.playSound("volumeChange", { detune: changeVolTune });
						SoundTray.show(-1);
					}
				},
			},
		]);
		SoundTray.managerObj = manager;
		SoundTray.hide();
	}
}

/** The custom cool sound tray
 * @param useColor Wheter to go from green to red (just as test)
 */
export class CustomSoundTray extends SoundTray {
	constructor(upKeys: Key[], downkeys: Key[], useColor: boolean = false) {
		super(upKeys, downkeys);

		let opa = 1;

		const bg = SoundTray.managerObj.add([
			rect(width() / 6, 80, { radius: 3 }),
			pos(width() / 2, 0),
			anchor("top"),
			color(BLACK),
			opacity(0.75 * opa),
			fixed(),
			z(0),
			scale(),
			"volElement",
			"parent",
			{
				update() {
					this.opacity = 0.75 * opa;
				},
			},
		]);

		bg.pos.y = -bg.height;

		bg.add([
			text("VOLUME"),
			pos(0, bg.height - 12),
			anchor("center"),
			scale(0.6),
			fixed(),
			z(1),
			opacity(opa),
			"volElement",
			{
				update() {
					this.opacity = opa;
					if (GameSave.volume > 0) {
						this.text = `VOLUME ${(Math.round(GameSave.volume * 100))}%`;
					}
					else this.text = "MUTED";
				},
			},
		]);

		// bars
		for (let i = 0; i < 10; i++) {
			bg.add([
				pos(-67 + i * 15, 30),
				rect(10, bg.height - 40, { radius: 1 }),
				opacity(opa),
				anchor("center"),
				z(2),
				scale(),
				color(useColor ? GREEN.lerp(RED, i / 10) : WHITE),
				fixed(),
				timer(),
				"volElement",
				"bar",
				{
					volume: parseFloat((0.1 * (i + 1)).toFixed(1)),
					update() {
						if (GameSave.volume.toFixed(1) < this.volume.toFixed(1)) this.opacity = 0.1 * opa;
						else this.opacity = 1 * opa;
					},
				},
			]);
		}

		const duration = 0.5;
		SoundTray.onHide(() => {
			tween(bg.pos.y, -bg.height, duration, (p) => bg.pos.y = p, easings.easeOutQuint);
			tween(opa, 0, duration, (p) => opa = p, easings.easeOutQuint);
		});

		SoundTray.onShow((change) => {
			const barWithVol = bg.get("bar").find((obj) => obj.volume == GameSave.volume);
			if (barWithVol) {
				// upping volume
				if (change == 1) {
					tween(vec2(1.25), vec2(1), 0.1, (p) => barWithVol.scale = p);
				}
				// lowering volume
				else if (change == -1) {
					tween(vec2(0.75), vec2(1), 0.1, (p) => barWithVol.scale = p);
				}
			}
			tween(bg.pos.y, 0, duration, (p) => bg.pos.y = p, easings.easeOutQuint);
			tween(opa, 1, duration, (p) => opa = p, easings.easeOutQuint);
		});
	}
}
