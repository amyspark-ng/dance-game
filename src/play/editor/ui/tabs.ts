import { Vec2 } from "kaplay";
import { MenuBar, MenuItem } from "./menubar";
import addTab from "./tabs/baseTab";
import eventTab from "./tabs/eventTab";
import { songTab } from "./tabs/songTab";
import { syncTab } from "./tabs/syncTab";

/** Class to handle the tabs found in the {@link MenuBar.bars `TopMenuButton.buttons`} TopMenu (for the chart editor) */
export class EditorTab {
	/** The title of the tab */
	title: string;

	/** Wheter the tab should be or not */
	visible: boolean = false;

	/** The center position of the tab */
	pos: Vec2 = center();

	/** The make for the tab */
	addFunc: typeof addTab;

	/** Is a static object that holds all of the tabs in the view {@link MenuBar `TopMenuButton`} */
	static tabs = {
		"SongInfo": new EditorTab("Song info", songTab),
		"Sync": new EditorTab("Sync", syncTab),
		"Notes": new EditorTab("Notes"),
		"Events": new EditorTab("Events", eventTab),
	};

	static HEADER_COLOR = rgb(30, 29, 36);
	static BODY_COLOR = rgb(43, 42, 51);

	static ui = {
		ACCENT: BLUE,
		BODY_OUTLINE: EditorTab.HEADER_COLOR.darken(20),
		BODY: EditorTab.HEADER_COLOR.darken(10),
	};

	/** Find a tab game object by its instance */
	static findTab(instance: EditorTab) {
		return get("editorTab").find((editorTabObj: ReturnType<typeof addTab>) => editorTabObj.data == instance);
	}

	/** Function that handles the addition for all the editor tabs in the chart editor */
	static setup() {
		const arrayOfItems: MenuItem[] = [];
		Object.values(EditorTab.tabs).forEach((tabInstance, index) => {
			arrayOfItems.push({
				text: tabInstance.title,
				checked: false,
				action: () => {
					tabInstance.visible = !tabInstance.visible;
					arrayOfItems[index].checked = tabInstance.visible;
				},
			});
		});

		// // then this sets up the top menu button
		MenuBar.bars.View.items = arrayOfItems;

		// and this goes each frame and checks if a tab should be or should not be
		onUpdate(() => {
			Object.values(EditorTab.tabs).forEach((tabInstance) => {
				const tabObjWithTab = EditorTab.findTab(tabInstance);

				if (tabInstance.visible == true && !tabObjWithTab) {
					if (tabInstance.addFunc) {
						const tab = tabInstance.addFunc(tabInstance);
						tab.pos = tabInstance.pos;
					}
				}
				else if (tabInstance.visible == false && tabObjWithTab) tabObjWithTab.destroy();
			});
		});
	}

	constructor(title: string, addFunc?: typeof addTab) {
		this.title = title;
		this.addFunc = addFunc;
	}
}
