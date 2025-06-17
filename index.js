const fs = require('fs');
const j = require('jimp'); //This package handles image manipulation.
const jimp = j.Jimp;
const parse = require('csv-parse/sync');

const manydecksendpoint = "https://decks.rereadgames.com/api/decks/"; //+ deck ID

/**
 * Loads a CSV file.
 * @param {string} file FIle path to load CSV from.
 * @returns A parsed CSV object.
 */
function loadCSV(file) {
    let data = fs.readFileSync(file).toString();
    let parsed = parse.parse(data, {columns: true, skip_empty_lines: true});
    return parsed;
}

/**
 * Creates a card png from the data put into it.
 * @param {string} type Either a white or black card.
 * @param {string} text Text displayed on the card.
 * @param {string} out Output path
 * @param {boolean} subtitle Whether to replace the standard CAH subtitle with the deck title or not.
 * @param {number} pick Amount of cards that should be picked for this card.
 */
async function createCard(type, text, out, subtitle = false, pick = 1) {
    let img = await jimp.read(`./cardassets/${type}-front.png`);
    let font= await j.loadFont(`./cardassets/cardfont-${type}.fnt`);

    let name = out.split("/")[1];
    if(fs.existsSync(`./input/${out.split("/")[1]}-icon.png`)) { //Replace the card's icon if it exists.
        img.composite(await jimp.read(`./cardassets/iconpatch-${type}.png`), 77, 571);
        img.composite(await jimp.read(`./input/${name}-icon.png`), 77, 571);
    }

    if(subtitle == true) {
        let subtitleFont = await j.loadFont(`./cardassets/subtitlefont-${type}.fnt`);
        img.composite(await jimp.read(`./cardassets/subtitlepatch-${type}.png`), 0, 0);
        img.print({font: subtitleFont, x: 132, y: img.height-105-2, text: name, align: 'top-left', maxWidth: img.width-160});
    }

    if((pick == 2 || pick == 3) && type == "black") img.composite(await jimp.read(`./cardassets/pick-${pick}.png`), 0, 0);
    
    img.print({font, x: 80, y: 80, text: text, align: 'top-left', maxWidth: img.width-160});
    await img.write(out)
}

/**
 * Gets data either from the cache, or from the ManyDecks API.
 * @param {string} ID ManyDecks deck ID
 * @returns {JSON} Response JSON
 */
async function requestManyDeck(ID) {
    try {
        let json = '';

        if(!fs.existsSync(`./manydeckscache/${ID}.json`)) { //File doesn't exist
            console.log(`Deck ${ID} is not cached. Requesting...`);
            let response = await fetch(manydecksendpoint+ID);
            json = await response.json();
            fs.writeFileSync(`./manydeckscache/${ID}.json`, JSON.stringify(json));
        } else if(new Date(fs.statSync(`./manydeckscache/${ID}.json`).birthtime.getTime() + 7*24*60*60*1000)  <= new Date()) { //Cache is older than 7 days
            console.log(`Deck ${ID} is outdated. Requesting...`);
            let response = await fetch(manydecksendpoint+ID);
            json = await response.json();
            fs.writeFileSync(`./manydeckscache/${ID}.json`, JSON.stringify(json));
        } else {
            console.log(`Deck ${ID} is cached. Loading...`);
            json = JSON.parse(fs.readFileSync(`./manydeckscache/${ID}.json`));
        }

        return json;
    } catch (error) {
        console.log(error);
        return;
        
    }
}

/**
 * Takes a ManyDecks deck and processes it into a format that this script can use.
 * @param {JSON} deck Deck Data in JSON format
 * @returns An array of card data.
 */
function processDeck(deck) {
    let i = 0;
    let data = [];
    let whiteCards = deck.responses;
    let blackCards = deck.calls;
    whiteCards.forEach(card => {
        data[i] = {
            type: "white",
            text: card,
            pick: ''
        }
        i++;
    });
    blackCards.forEach(card => {
        let string = "";
        pick = 1;

        card[0].forEach(line => {
            if(line.toString() != "[object Object]") string = string + line + " ";
            else {
                string = string + "_______ ";
                pick++;
            }
        })

        string = string.slice(0, -1);
        if(string.slice(-1) == "_") string = string + ".";

        if(pick > 1) pick = pick - 1; //Prevents double counting the first blank.

        data[i] = {
            type: "black",
            text: string,
            pick: pick
        }
        i++;
    });
    return data;
}

async function main() {
    fs.readdirSync("./input").forEach(file => {
        let subtitleList = loadCSV("./input/subtitles.csv");
        let subtitle = false;
        if(file.split(".")[1] != "csv") return;
        if(file == "subtitles.csv") return;
        if(file == "manydecks.csv") return;
        if(subtitleList.find(sub => sub.list == file)) subtitle = true;
        let outputFolder = file.split(".")[0];
        if(!fs.existsSync(`./output/${outputFolder}`)) {
            fs.mkdirSync(`./output/${outputFolder}`);
            let i = 0;
            let parsed = loadCSV(`./input/${file}`);
            parsed.forEach(card => {
                createCard(card.type, card.text, `output/${outputFolder}/card_${i}.png`, subtitle, card.pick);
                console.log(`Created card ${i}, type: ${card.type}, text: ${card.text}`);
                i++;
            });
            //console.log(data);
        } else {
            console.log(`./output/${outputFolder} already exists! Skipping...`);
            return;
        }
    })

    let manydecks = await loadCSV("./input/manydecks.csv");
    for (let deck of manydecks) {
        let name = deck.name;
        if(!fs.existsSync(`./output/${name}`)) {
            let deckData = await requestManyDeck(deck.id);
            let processedDeck = processDeck(deckData);
            let subtitle = false;
            if(deck.Subtitle == "true") subtitle = true;
            fs.mkdirSync(`./output/${name}`);
            let i = 0;

            for (let card of processedDeck) {
                createCard(card.type, card.text, `output/${name}/card_${i}.png`, subtitle, card.pick);
                console.log(`Created card ${i}, type: ${card.type}, text: ${card.text}`);
                i++;
            }
        } else {
            console.log(`./output/${name} already exists! Skipping...`);
            return;
        }
    }

    //createCard("black", "Test eeee", `output/Cards Against Humanity/output.png`, false, 3);
}

main().catch(console.error);