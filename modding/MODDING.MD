# How to mod this game????
Short MD (markdown) file that tells you the basics of modding this game

If you need any special help/have questions/have suggestions you can send me a PM on my [newgrounds](https://amyspark-ng.newgrounds.com) or my [twitter](https://x.com/amyspark_ng) 

- [Songs](#songs)
- [Dancers](#dancers)
- [Noteskins](#noteskins)
- [Scripting](#scripting) (for now there's no way)

## Songs
The actual gameplay for the game!

To make a song for the game, you have to go to the main menu, where you'll see things like songs, options and then hit the `EDITOR` button, which will send you to the EditorState

You can help yourself and check the context menu for `View` and click the help button (which you can also access pressing F1)

It contains a small guide on how to actually use the editor, keyboard shortcuts and such

In the `View` menu you'll also see the Metadata window, which you can use to put in a custom cover, audio and options for your song

When you're done, you can hit `Ctrl + Shift + S` which will save your song in a nifty little `.zip` file which other people can import in their Mod menu, where they'll be able to play your song :)

### Dancers
Ok pay real attention.
I'd recommend for you to use the [template](./template-dancer/) and base your dancer file around it since it's a manual process and it's very easy to mess something up.

A dancer file contains:
- [sprite](./template-dancer/), which should be an spritesheet that contains the frames of a dancer
- [background](./template-dancer/bg.png), your dancer will dance on
- [data file](./template-dancer/data.json) that contains the slicing and frames for the animations of the dancer, this must be in the format of a [LoadSpriteOpt](https://kaplayjs.com/doc/LoadSpriteOpt/) according to *KAPLAY*, it looks a little something like this:
```json
{
    "sliceX": 6,
    "sliceY": 2,
    "anims": {
        "idle": 0,
        "up": 1,
        "down": 2,
        "left": 3,
        "right": 4,
        "miss": 5,
        "victory": {
            "from": 6,
            "to": 11,
            "speed": 10
        }
    }
}
```
If any of the frames takes more than one frame, you can do something like this!
```json
{
    "up": {
        "from": 1,
        "to": 6, 
    }
}
```
You can also add your own animations! Which you can then trigger in a song with the `Play Anim` event

And most importantly
- [manifest](./template-dancer/manifest.toml), which actually holds the paths to the information to your dancer, you can set its metdata, the path to its information, and configure it, it must be in a `.toml` file, it looks a little like this:
```toml
name = "Dancer name here"
id = "id-(try-to-make-it-realy-unique)"
artist = "Artist that made the sprites"
sprite_path = "path-to-the-sprite.png"
sprite_data_path = "path-to-data.json"
bg_path = "bg.png"
bop_on_beat = true
bop_on_move = true
```

### Noteskins
You'll also have to do this manually! I'd recommend to follow the [template](./template-noteskin/) 

A noteskin file contains:
- [sprite](./template-noteskin/template.png), which should be an spritesheet that contains the frames of the notes
- [data file](./template-noteskin/data.json) that contains the slicing and frames for the noteskin, it'll have the directional notes, a trail and a tail, this must be in the format of a [LoadSpriteOpt](https://kaplayjs.com/doc/LoadSpriteOpt/) according to *KAPLAY*, it looks a little something like this:
```json
{
    "sliceX": 3,
    "sliceY": 4,
    "anims": {
        "left": 0,
        "left_trail": 1,
        "left_tail": 2,
        "down": 3,
        "down_trail": 4,
        "down_tail": 5,
        "up": 6,
        "up_trail": 7,
        "up_tail": 8,
        "right": 9,
        "right_trail": 10,
        "right_tail": 11
    }
}```

```
If your notes are animated (they take more than one frame) you can do something like this for them!
```json
{
    "up": {
        "from": 1,
        "to": 6, 
    }
}
```


And most importantly
- [manifest](./template-dancer/manifest.toml), which actually holds the paths to the information to your noteskin, you can set its metadata, the path to its information, and configure it, it must be in a `.toml` file, it looks a little like this:
```toml
name = "Template"
id = "template"
sprite_path = "template.png"
data_path = "data.json"
```

### Scripting
🖕
