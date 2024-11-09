- Rename SongChart to ChartSong so it follows with ChartNote

- Chart Editor: Add the notifications like, song loaded, song downloaded etc etc

- Chart Editor: Add a cool dropdown (kinda like clickery) that has controls, new song and textboxes and they all open like dialogs, hopefully it won't be that bad to figure out  

- SORTA BUNCH OF STUFF like all of the input being on playstate, all of that system could be better organized
- Game: Playback speed doesn't work at all

- Chart Editor: Make camera follow the leading note in a way that it's always in the center of the grid row

- Results: Rehaul it, AGAIN, make it so it smoothly transitions from gameplay
- Results: Add combo and name of the song

- Pause: Doesn't say the song that is currently playing (bad)
- Pause: Dancer doesn't move leave fast enough so there's 2 dancers at the same time
- Pause: Sometimes the buttons stay after pausing and unpausing too fast
	Should rehaul the pause ui system it's kinda sucky

- Save: Add unlocked dancers system
- Options: Add something to the noteskins to signify which one is currently selected

<!-- - Add events for bpm changes, this can be done with having an array of ChartBPM which would have something like this
```ts
class ChartBPM {
	time: 20.6
	value: 160,
	tweenSpeed: 0,
}
```

And then a song will have an array of that and when time is reached a tween will get triggered which will be linear and will take 'tweenSpeed' seconds, and then do Conductor.changeBPM(p) -->