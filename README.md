# TTS-CAHcardmaker

A script that makes CAH cards and sheets for Table Top Simulator. Like a lot of projects i make, this is just something I made for myself but decided could be useful to others.

## Credits

* [Cards Against Humanity LLC](https://www.cardsagainsthumanity.com) for creating Cards Against Humanity.
* [Tyler Gordon Hill](https://tylergordonhill.com) for the [CAH Maker](https://tylergordonhill.com/cah-maker), which proved useful in getting me started.
* ReRead Games for their [ManyDecks database](https://decks.rereadgames.com). ([Git Repository](https://github.com/Lattyware/manydecks))

## Requirements

* Built and tested with Node v18.20.3.
* Helvetica Neue Bold font

## Usage

There are two ways to use this script. One is to create a deck from a CSV file. Another, is to import a deck from the ManyDecks API.

### CSV

In `./input` create a CSV file with the name you may wish to have appear on the deck (although putting it on the deck is not required). The CSV file should have the following format:

`example.csv`:
```csv
type,text,pick
white,This is an example white card.,
white,"If you want quotes in the card's test, do it ""like this"" and make sure to have these outer quotes too. -->",
white,Ensure that there is a comma after the text. Technically a number should go there but it's not required.,
black,This is an example black card.,1
black,The last number is technically not required but you can set it to up to 3. I recommend adding 1s anyways.,2
black,"If your text includes a comma, be sure to add the outer quotes again like this.",1
black,"I reccomend grouping black and white cards together in CSV files.",3
```

If you'd like to have an icon appear for your deck, add a 49x48p PNG file to the `./input` folder that follows this format: `example-icon.png`. (Replace example with whatever the name of your CSV file is).
If you'd like subtitles or to have your cards automatically sheeted, open `./input/listoptions.csv`, put your csv file name (**with extension**) in the first column, and set either true or false for the next two: subtitles, sheet

`listoptions.csv`
```csv
list,subtitles,sheet
example.csv,true,false
```
You are now ready to run the program.

### ManyDecks

Go to [https://decks.rereadgames.com](https://decks.rereadgames.com) and find the deck you wish to import. Copy its deck ID.
Open `./input/manydecks.csv` and add a new row for your deck.

`manydecks.csv`:
```csv
id,name,Subtitle,sheet
DN77Y,The Elder Scrolls Deck,true,true
```
First column is your ID, second is the deck name, third is whether to use that name as the card subtitle, and finally an option to automatically sheet it or not.
You should be able to add an icon by creating a `deckNameHere-icon.png` in input.
You are now ready to run the program.

## Running the program

npm install` to install dependencies.

`node index.js`

The program will create `./output`, where you will find a folder with your deck name. Each card will have its own PNG that you can do whatever with, or if you enabled sheeting you may also find files named something like `black-sheet_1.png` or `white-sheet_1.png` which are sheeted for Table Top Simulator.

Each sheet is 8*5 for 40 cards each. If a sheet is not full, make sure to set the card count when importing into Table Top Simulator.

Card backs are available in `./cardassets`.
